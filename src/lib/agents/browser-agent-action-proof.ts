"use client";

import type { AgentActionProof } from "@pirate/api-contracts";

const CANONICAL_VERSION = "pirate-agent-action-proof-v2";
const SIGNATURE_VERSION = "pirate-agent-action-signature-v2";
const textEncoder = new TextEncoder();

type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

function ensureBrowserCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("This browser does not support secure agent signing.");
  }
  return subtle;
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/g, "");
}

function compareUtf8Ascending(left: string, right: string): number {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    const leftByte = leftBytes[index];
    const rightByte = rightBytes[index];
    if (leftByte !== rightByte) {
      return leftByte - rightByte;
    }
  }

  return leftBytes.length - rightBytes.length;
}

function sortJsonValue(value: CanonicalJson): CanonicalJson {
  return sortJsonValueWithSeen(value, new WeakSet<object>());
}

function sortJsonValueWithSeen(value: CanonicalJson, seen: WeakSet<object>): CanonicalJson {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValueWithSeen(item, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) {
      throw new Error("Agent action proof body cannot contain circular references.");
    }
    seen.add(value);
    const entries = Object.entries(value).sort(([left], [right]) => compareUtf8Ascending(left, right));
    return Object.fromEntries(entries.map(([key, child]) => [key, sortJsonValueWithSeen(child, seen)]));
  }
  return value;
}

function resolveCanonicalUrl(value: string): URL {
  const trimmed = value.trim();
  try {
    return new URL(trimmed);
  } catch {
    const browserOrigin = globalThis.location?.origin;
    if (!browserOrigin) {
      throw new Error("Agent action proof URLs must be absolute when browser origin is unavailable.");
    }
    return new URL(trimmed, browserOrigin);
  }
}

function canonicalizeBody(body: unknown): string {
  if (body == null || body === "") {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  return JSON.stringify(sortJsonValue(body as CanonicalJson));
}

function canonicalizeQuery(searchParams: URLSearchParams): string {
  const pairs = Array.from(searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyCompare = compareUtf8Ascending(leftKey, rightKey);
    if (keyCompare !== 0) {
      return keyCompare;
    }
    return compareUtf8Ascending(leftValue, rightValue);
  });

  return pairs
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function arrayBufferToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function hexFromArrayBuffer(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function decodePemBase64(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function canonicalizeAgentActionProofRequest(input: {
  method: string;
  url: string;
  body?: unknown;
}): string {
  const url = resolveCanonicalUrl(input.url);
  const method = input.method.trim().toUpperCase();
  const origin = url.origin;
  const path = normalizePath(url.pathname);
  const query = canonicalizeQuery(url.searchParams);
  const body = canonicalizeBody(input.body);

  return [
    CANONICAL_VERSION,
    method,
    origin,
    path,
    query,
    body,
  ].join("\n");
}

export function canonicalizeAgentActionProofSignaturePayload(input: {
  nonce: string;
  signedAt: number;
  canonicalRequestHash: string;
}): string {
  return [
    SIGNATURE_VERSION,
    input.nonce.trim(),
    String(input.signedAt),
    input.canonicalRequestHash.trim(),
  ].join("\n");
}

export async function computeAgentActionProofHash(input: {
  method: string;
  url: string;
  body?: unknown;
}): Promise<string> {
  const subtle = ensureBrowserCrypto();
  const canonical = canonicalizeAgentActionProofRequest(input);
  const digest = await subtle.digest("SHA-256", textEncoder.encode(canonical));
  return hexFromArrayBuffer(digest);
}

export async function buildAgentActionProof(input: {
  method: string;
  url: string;
  body?: unknown;
  privateKeyPem: string;
}): Promise<AgentActionProof> {
  const subtle = ensureBrowserCrypto();
  const signedAt = Math.floor(Date.now() / 1000);
  const nonce = globalThis.crypto.randomUUID();
  const canonicalRequestHash = await computeAgentActionProofHash({
    method: input.method,
    url: input.url,
    body: input.body,
  });
  const signaturePayload = canonicalizeAgentActionProofSignaturePayload({
    nonce,
    signedAt,
    canonicalRequestHash,
  });
  const privateKey = await subtle.importKey(
    "pkcs8",
    decodePemBase64(input.privateKeyPem),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("Ed25519", privateKey, textEncoder.encode(signaturePayload));

  return {
    nonce,
    signed_at: signedAt,
    canonical_request_hash: canonicalRequestHash,
    signature: arrayBufferToBase64(signature),
  };
}
