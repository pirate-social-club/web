"use client";

import QRCode from "qrcode";

const VERY_BRIDGE_API_ORIGIN = "https://bridge.very.org/api/v1";
const VERY_DEEPLINK_BASE = "veros://verify";

export type VeryBridgeCreateInput = {
  appId: string;
  context: string;
  typeId: string;
  query: string;
};

export type VeryBridgeClientSession = {
  bridgeSessionId: string;
  key: string;
  qrUrl: string;
  qrDataUrl: string;
};

export type VeryBridgeSessionStatus =
  | { status: "initialized" | "received" }
  | { status: "completed"; response: { iv: string; payload: string } }
  | { status: "error"; userMessage?: string };

export function normalizeVeryBridgeQuery(query: unknown): string | null {
  if (typeof query === "string") {
    return query;
  }

  if (!query || typeof query !== "object") {
    return null;
  }

  try {
    return JSON.stringify(query);
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function buildVeryBridgeQrUrl(input: {
  bridgeSessionId: string;
  key: string;
}): string {
  const params = new URLSearchParams({
    action: "verify",
    key: input.key,
    sessionId: input.bridgeSessionId,
  });

  return `${VERY_DEEPLINK_BASE}?${params.toString()}`;
}

export async function createVeryBridgeSession(input: VeryBridgeCreateInput): Promise<VeryBridgeClientSession> {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify({
      appId: input.appId,
      idpContext: input.context,
      idpQuery: input.query,
      idpTypeId: input.typeId,
    })),
  );

  const response = await fetch(`${VERY_BRIDGE_API_ORIGIN}/sessions`, {
    method: "POST",
    body: JSON.stringify({
      iv: bytesToBase64(iv),
      payload: bytesToBase64(new Uint8Array(encryptedPayload)),
    }),
  });
  const body = await response.json() as { sessionId?: string; userMessage?: string };

  if (!response.ok || !body.sessionId) {
    throw new Error(body.userMessage || "Could not create Very bridge session");
  }

  const keyBase64 = bytesToBase64(new Uint8Array(exportedKey));
  const qrUrl = buildVeryBridgeQrUrl({
    bridgeSessionId: body.sessionId,
    key: keyBase64,
  });

  return {
    bridgeSessionId: body.sessionId,
    key: keyBase64,
    qrDataUrl: await QRCode.toDataURL(qrUrl, {
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
      margin: 1,
      width: 300,
    }),
    qrUrl,
  };
}

export async function getVeryBridgeSessionStatus(bridgeSessionId: string): Promise<VeryBridgeSessionStatus> {
  const response = await fetch(`${VERY_BRIDGE_API_ORIGIN}/session/${encodeURIComponent(bridgeSessionId)}`);
  return await response.json() as VeryBridgeSessionStatus;
}

export async function decryptVeryBridgeProof(input: {
  key: string;
  payload: string;
  iv: string;
}): Promise<string> {
  const rawKey = base64ToBytes(input.key);
  const iv = base64ToBytes(input.iv);
  const payload = base64ToBytes(input.payload);
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "AES-GCM" },
    true,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(payload),
  );

  return new TextDecoder().decode(decrypted);
}
