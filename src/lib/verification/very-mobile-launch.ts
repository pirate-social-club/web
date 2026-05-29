import type { VerificationSession } from "@pirate/api-contracts";

type VeryWidgetLaunch = NonNullable<NonNullable<VerificationSession["launch"]>["very_widget"]>;

export type VeryMobileBridgeSession = {
  key: string;
  keyObject: CryptoKey;
  sessionId: string;
};

export type VeryBridgeSessionStatus = {
  response?: {
    iv?: string;
    payload?: string;
  };
  status?: "initialized" | "received" | "completed" | "error";
  userMessage?: string;
};

const VERY_BRIDGE_API_URL = "https://bridge.very.org/api/v1/";
const VERY_APP_VERIFY_URL = "veros://verify";

function fetchForVerification(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    return window.fetch(input, init);
  }
  return fetch(input, init);
}

function encodeBase64(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateKeyIv() {
  const key = await crypto.subtle.generateKey(
    {
      length: 256,
      name: "AES-GCM",
    },
    true,
    ["encrypt"],
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  return {
    iv,
    key,
    keyBase64: encodeBase64(exportedKey),
  };
}

async function encryptPayload(
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
  payload: object,
): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  return crypto.subtle.encrypt(
    {
      iv,
      name: "AES-GCM",
    },
    key,
    encoded,
  );
}

async function decryptPayload(
  key: CryptoKey,
  ivBase64: string,
  encryptedBase64: string,
): Promise<string> {
  const iv = new Uint8Array(decodeBase64(ivBase64)) as Uint8Array<ArrayBuffer>;
  const encryptedData = decodeBase64(encryptedBase64);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      iv,
      name: "AES-GCM",
    },
    key,
    encryptedData,
  );
  return new TextDecoder().decode(decryptedBuffer);
}

export function buildVeryMobileLaunchHref(session: Pick<VeryMobileBridgeSession, "key" | "sessionId">): string {
  const params = new URLSearchParams();
  params.set("sessionId", session.sessionId);
  params.set("key", session.key);
  params.set("action", "verify");
  return `${VERY_APP_VERIFY_URL}?${params.toString()}`;
}

export async function createVeryMobileBridgeSession(launch: VeryWidgetLaunch): Promise<VeryMobileBridgeSession> {
  const { iv, key, keyBase64 } = await generateKeyIv();
  const encrypted = await encryptPayload(key, iv, {
    appId: launch.app_id,
    idpContext: launch.context,
    idpQuery: JSON.stringify(launch.query),
    idpTypeId: launch.type_id,
  });
  const response = await fetchForVerification(`${VERY_BRIDGE_API_URL}sessions`, {
    body: JSON.stringify({
      iv: encodeBase64(iv.buffer),
      payload: encodeBase64(encrypted),
    }),
    method: "POST",
  });
  const result = await response.json() as { sessionId?: string; userMessage?: string };
  if (!result.sessionId) {
    throw new Error(result.userMessage || "Very bridge session was not returned");
  }

  return {
    key: keyBase64,
    keyObject: key,
    sessionId: result.sessionId,
  };
}

export async function getVeryMobileBridgeSessionStatus(sessionId: string): Promise<VeryBridgeSessionStatus> {
  const response = await fetchForVerification(`${VERY_BRIDGE_API_URL}session/${encodeURIComponent(sessionId)}`);
  return await response.json() as VeryBridgeSessionStatus;
}

export async function decryptVeryBridgeProof(
  session: Pick<VeryMobileBridgeSession, "keyObject">,
  response: NonNullable<VeryBridgeSessionStatus["response"]>,
): Promise<string> {
  if (!response.iv || !response.payload) {
    throw new Error("Very bridge completion response is incomplete");
  }

  return await decryptPayload(
    session.keyObject,
    response.iv,
    response.payload,
  );
}

export async function verifyVeryProof(proof: string, verifyUrl: string): Promise<{ status?: string }> {
  const response = await fetchForVerification(verifyUrl, {
    body: JSON.stringify({ proof }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  return await response.json() as { status?: string };
}
