const encoder = new TextEncoder();

/**
 * Internal React -> Solid service-binding authentication.
 *
 * This is deliberately separate from the HNS forwarder envelope. The React
 * Worker authenticates HNS first, then signs the already-sanitized request
 * that crosses the private service binding. Solid must not be reachable as an
 * unauthenticated public origin.
 */
export const SOLID_EDGE_AUTH_VERSION = "v1" as const;
export const SOLID_EDGE_SIGNATURE_HEADER = "x-pirate-solid-edge-signature";
export const SOLID_EDGE_TIMESTAMP_HEADER = "x-pirate-solid-edge-timestamp";
export const SOLID_EDGE_MAX_BODY_BYTES = 2 * 1024 * 1024;
export const SOLID_EDGE_DEFAULT_CLOCK_SKEW_SECONDS = 300;
export const SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS = 3_600;
export const SOLID_EDGE_MIN_KEY_BYTES = 32;

const HNS_CONTEXT_HEADERS = [
  "x-pirate-hns-trusted-forwarder",
  "x-pirate-hns-host",
  "x-pirate-hns-root",
  "x-pirate-hns-community-id",
  "x-pirate-hns-community-route",
  "x-pirate-hns-subdomain",
  "x-pirate-hns-wallet-interactive",
] as const;

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/** Headers that describe the private dispatch seam, never the public response. */
function isInternalResponseHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === "set-cookie"
    || HOP_BY_HOP_RESPONSE_HEADERS.has(lower)
    || lower.startsWith("x-seam-")
    || lower.startsWith("x-solid-")
    || lower.startsWith("x-pirate-solid-")
    || lower.startsWith("x-internal-");
}

export interface SolidEdgeAuthEnv {
  SOLID_EDGE_HMAC_KEY?: string;
  SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS?: string;
}

export type SolidEdgeAuthFailure =
  | "configuration"
  | "duplicate-header"
  | "missing-signature"
  | "malformed-signature"
  | "malformed-timestamp"
  | "stale-signature"
  | "body-too-large"
  | "signature-mismatch"
  | "aborted";

export type SolidEdgeVerification =
  | { ok: true; request: Request; timestampSeconds: number }
  | { ok: false; reason: SolidEdgeAuthFailure };

export interface SolidEdgeSigningInput {
  request: Request;
  key: string;
  nowMs?: number;
  maxBodyBytes?: number;
}

export interface SolidEdgeVerificationInput extends SolidEdgeAuthEnv {
  request: Request;
  nowMs?: number;
  maxBodyBytes?: number;
}

function singleHeaderValue(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  if (value === null) return null;
  const trimmed = value.trim();
  // Headers.get() joins repeated field-lines with a comma. Auth metadata is
  // single-valued; accepting the first item would let an attacker smuggle a
  // second timestamp/signature past an intermediary with different parsing.
  return trimmed.includes(",") ? null : trimmed;
}

function firstHeaderValue(headers: Headers, name: string): string {
  return headers.get(name)?.split(",", 1)[0]?.trim() ?? "";
}

function isValidKey(key: string): boolean {
  return encoder.encode(key).byteLength >= SOLID_EDGE_MIN_KEY_BYTES;
}

function parseClockSkewSeconds(value?: string): number {
  const configured = Number(value);
  if (!Number.isInteger(configured) || configured < 1) {
    return SOLID_EDGE_DEFAULT_CLOCK_SKEW_SECONDS;
  }
  return Math.min(configured, SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}

function parseSignature(value: string): Uint8Array<ArrayBuffer> | null {
  // A SHA-256 HMAC is exactly 32 bytes, represented by 43 unpadded base64url
  // characters. Reject hex, padded base64, whitespace, and alternate versions.
  const match = new RegExp(`^${SOLID_EDGE_AUTH_VERSION}=([A-Za-z0-9_-]{43})$`, "u").exec(value);
  if (!match?.[1]) return null;
  const normalized = match[1].replace(/-/gu, "+").replace(/_/gu, "/");
  try {
    const binary = atob(`${normalized}=`);
    if (binary.length !== 32) return null;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function requestPathAndQuery(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

function hnsContext(headers: Headers): string[] {
  return HNS_CONTEXT_HEADERS.map(header => firstHeaderValue(headers, header));
}

/**
 * Canonical bytes signed by the React Worker and verified by Solid.
 * JSON array framing prevents delimiter ambiguity and keeps URL encoding
 * meaningful: changing `%2F`, query order, or the effective host changes the
 * signature rather than being silently normalized at the boundary.
 */
export function canonicalizeSolidEdgeRequest(input: {
  request: Request;
  timestampSeconds: number;
  bodyDigestHex: string;
}): string {
  return JSON.stringify([
    "pirate-solid-edge-auth-v1",
    input.timestampSeconds,
    input.request.method.toUpperCase(),
    input.request.url,
    requestPathAndQuery(input.request),
    input.bodyDigestHex,
    hnsContext(new Headers(input.request.headers)),
  ]);
}

async function bodyDigestHex(
  request: Request,
  maxBodyBytes: number,
): Promise<{ digestHex: string } | { tooLarge: true } | { aborted: true }> {
  if (request.method === "GET" || request.method === "HEAD" || !request.body) {
    return { digestHex: "" };
  }

  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 0) {
    return { tooLarge: true };
  }

  const reader = request.clone().body?.getReader();
  if (!reader) return { digestHex: "" };
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value instanceof Uint8Array
        ? new Uint8Array(next.value)
        : new Uint8Array(next.value);
      size += chunk.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return { aborted: true };
    throw error;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", body));
  return { digestHex: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("") };
}

async function importSigningKey(key: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/** Add the private binding signature without exposing the shared key. */
export async function signSolidEdgeRequest(input: SolidEdgeSigningInput): Promise<Request> {
  if (!isValidKey(input.key)) throw new Error("Solid edge HMAC key is not configured");
  if (input.request.signal.aborted) throw new DOMException("The operation was aborted", "AbortError");
  const timestampSeconds = Math.floor((input.nowMs ?? Date.now()) / 1_000);
  const body = await bodyDigestHex(input.request, input.maxBodyBytes ?? SOLID_EDGE_MAX_BODY_BYTES);
  if ("tooLarge" in body) throw new RangeError("Solid edge request body is too large to sign");
  if ("aborted" in body) throw new DOMException("The operation was aborted", "AbortError");
  const canonical = canonicalizeSolidEdgeRequest({
    request: input.request,
    timestampSeconds,
    bodyDigestHex: body.digestHex,
  });
  const key = await importSigningKey(input.key, "sign");
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(canonical)));
  const headers = new Headers(input.request.headers);
  headers.set(SOLID_EDGE_TIMESTAMP_HEADER, String(timestampSeconds));
  headers.set(SOLID_EDGE_SIGNATURE_HEADER, `${SOLID_EDGE_AUTH_VERSION}=${bytesToBase64Url(signature)}`);
  return new Request(input.request, { headers });
}

/**
 * Verify before any Solid application, API, KV, or asset work. The returned
 * request has the one-use auth headers removed before it reaches SSR.
 */
export async function verifySolidEdgeRequest(
  input: SolidEdgeVerificationInput,
): Promise<SolidEdgeVerification> {
  const key = input.SOLID_EDGE_HMAC_KEY?.trim() ?? "";
  if (!isValidKey(key)) return { ok: false, reason: "configuration" };
  if (input.request.signal.aborted) return { ok: false, reason: "aborted" };

  const headers = new Headers(input.request.headers);
  const rawSignature = singleHeaderValue(headers, SOLID_EDGE_SIGNATURE_HEADER);
  const rawTimestamp = singleHeaderValue(headers, SOLID_EDGE_TIMESTAMP_HEADER);
  if ((headers.has(SOLID_EDGE_SIGNATURE_HEADER) && rawSignature === null)
    || (headers.has(SOLID_EDGE_TIMESTAMP_HEADER) && rawTimestamp === null)) {
    return { ok: false, reason: "duplicate-header" };
  }
  if (!rawSignature || !rawTimestamp) return { ok: false, reason: "missing-signature" };
  const signature = parseSignature(rawSignature);
  if (!signature) return { ok: false, reason: "malformed-signature" };
  if (!/^\d+$/u.test(rawTimestamp)) return { ok: false, reason: "malformed-timestamp" };
  const timestampSeconds = Number(rawTimestamp);
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1_000);
  const skew = parseClockSkewSeconds(input.SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > skew) {
    return { ok: false, reason: "stale-signature" };
  }

  const body = await bodyDigestHex(input.request, input.maxBodyBytes ?? SOLID_EDGE_MAX_BODY_BYTES);
  if ("tooLarge" in body) return { ok: false, reason: "body-too-large" };
  if ("aborted" in body) return { ok: false, reason: "aborted" };
  const canonical = canonicalizeSolidEdgeRequest({
    request: input.request,
    timestampSeconds,
    bodyDigestHex: body.digestHex,
  });
  const verificationKey = await importSigningKey(key, "verify");
  // Web Crypto performs the comparison inside the platform primitive; do not
  // replace this with a direct string/byte equality check.
  if (!await crypto.subtle.verify("HMAC", verificationKey, signature, encoder.encode(canonical))) {
    return { ok: false, reason: "signature-mismatch" };
  }

  headers.delete(SOLID_EDGE_SIGNATURE_HEADER);
  headers.delete(SOLID_EDGE_TIMESTAMP_HEADER);
  return {
    ok: true,
    request: new Request(input.request, { headers }),
    timestampSeconds,
  };
}

/** Remove private seam and transport headers before a Solid response reaches a client. */
export function sanitizeSolidResponse(response: Response): Response {
  const headers = new Headers();
  for (const [name, value] of response.headers.entries()) {
    if (!isInternalResponseHeader(name)) headers.append(name, value);
  }
  const body = response.status === 204 || response.status === 205 || response.status === 304
    ? null
    : response.body;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
