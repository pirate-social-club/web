const DEFAULT_TRUSTED_HNS_FORWARDER_IPS = ["94.103.168.161"];
const HNS_APP_HOSTS = new Set(["app.pirate"]);
const TRUSTED_FORWARDER_HEADER = "x-pirate-hns-trusted-forwarder";
const FORWARDER_TOKEN_HEADER = "x-pirate-hns-forwarder-token";
const FORWARDER_SIGNATURE_HEADER = "x-pirate-hns-forwarder-signature";
const FORWARDER_TIMESTAMP_HEADER = "x-pirate-hns-forwarder-timestamp";
const FORWARDER_PATH_HEADER = "x-pirate-hns-forwarder-path";
const FORWARDER_SIGNATURE_VERSION = "v1";
const DEFAULT_MAX_CLOCK_SKEW_SECONDS = 300;
const MAX_CONFIGURABLE_CLOCK_SKEW_SECONDS = 3_600;
const MIN_FORWARDER_HMAC_KEY_BYTES = 32;
const encoder = new TextEncoder();

export type HnsForwardedOriginEnv = {
  HNS_FORWARDER_TRUSTED_IPS?: string;
  HNS_FORWARDER_HMAC_KEY?: string;
  HNS_FORWARDER_HMAC_PREVIOUS_KEY?: string;
  HNS_FORWARDER_MAX_CLOCK_SKEW_SECONDS?: string;
  HNS_FORWARDER_AUTH_TOKEN?: string;
};

export type HnsForwarderAuthenticationResult = {
  rejection: "authentication" | "configuration" | null;
  request: Request;
};

function normalizeHost(value: string | null): string | null {
  const host = value?.split(",")[0]?.trim().toLowerCase().replace(/\.+$/u, "") ?? "";
  if (!host) {
    return null;
  }

  try {
    return new URL(`https://${host}`).hostname;
  } catch {
    return null;
  }
}

function parseTrustedIps(env: HnsForwardedOriginEnv): Set<string> {
  const configured = env.HNS_FORWARDER_TRUSTED_IPS
    ?.split(",")
    .flatMap((entry) => {
      const ip = entry.trim();
      return ip ? [ip] : [];
    });

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_TRUSTED_HNS_FORWARDER_IPS);
}

function isTrustedForwarderSource(request: Request, env: HnsForwardedOriginEnv): boolean {
  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  return !!connectingIp && parseTrustedIps(env).has(connectingIp);
}

function isTrustedForwarder(request: Request): boolean {
  return request.headers.get(TRUSTED_FORWARDER_HEADER) === "1";
}

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

function singleHeaderValue(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  // Headers.get() joins repeated field-lines with a comma. Forwarder auth
  // metadata is single-valued; never choose the first value from an
  // attacker-controlled duplicate envelope.
  return trimmed.includes(",") ? "" : trimmed;
}

function canonicalizeForwarderContext(input: {
  request: Request;
  host: string;
  pathAndQuery: string;
  timestamp: string;
}): string {
  return JSON.stringify([
    "pirate-hns-forwarder-v1",
    input.timestamp,
    input.request.method.toUpperCase(),
    input.host,
    input.pathAndQuery,
    firstHeaderValue(input.request.headers.get("x-pirate-hns-root")),
    firstHeaderValue(input.request.headers.get("x-pirate-hns-community-id")),
    firstHeaderValue(input.request.headers.get("x-pirate-hns-community-route")),
    firstHeaderValue(input.request.headers.get("x-pirate-hns-subdomain")),
  ]);
}

function timingSafeEqualText(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.byteLength, rightBytes.byteLength);
  let mismatch = leftBytes.byteLength ^ rightBytes.byteLength;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function parseClockSkewSeconds(env: HnsForwardedOriginEnv): number {
  const configured = Number(env.HNS_FORWARDER_MAX_CLOCK_SKEW_SECONDS);
  if (!Number.isInteger(configured) || configured < 1) {
    return DEFAULT_MAX_CLOCK_SKEW_SECONDS;
  }
  return Math.min(configured, MAX_CONFIGURABLE_CLOCK_SKEW_SECONDS);
}

function isValidHmacKey(value: string): boolean {
  return encoder.encode(value).byteLength >= MIN_FORWARDER_HMAC_KEY_BYTES;
}

function signatureBytes(value: string): Uint8Array<ArrayBuffer> | null {
  const match = value.match(new RegExp(`^${FORWARDER_SIGNATURE_VERSION}=([0-9a-f]{64})$`, "u"));
  if (!match?.[1]) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(match[1].slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifyForwarderSignature(input: {
  canonical: string;
  secret: string;
  signature: Uint8Array<ArrayBuffer>;
}): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, input.signature, encoder.encode(input.canonical));
}

export async function authenticateHnsForwarderRequest(
  request: Request,
  env: HnsForwardedOriginEnv = {},
  nowMs: number = Date.now(),
): Promise<HnsForwarderAuthenticationResult> {
  const headers = new Headers(request.headers);
  const rawForwardedHost = headers.get("x-pirate-hns-host");
  const forwardedHost = normalizeHost(rawForwardedHost);
  const signature = signatureBytes(singleHeaderValue(headers.get(FORWARDER_SIGNATURE_HEADER)));
  const timestamp = singleHeaderValue(headers.get(FORWARDER_TIMESTAMP_HEADER));
  const pathAndQuery = singleHeaderValue(headers.get(FORWARDER_PATH_HEADER));
  const requestUrl = new URL(request.url);
  const actualPathAndQuery = `${requestUrl.pathname}${requestUrl.search}`;
  const forwardedToken = singleHeaderValue(headers.get(FORWARDER_TOKEN_HEADER));
  const signedEnvelopePresent = headers.has(FORWARDER_SIGNATURE_HEADER)
    || headers.has(FORWARDER_TIMESTAMP_HEADER)
    || headers.has(FORWARDER_PATH_HEADER);

  headers.delete(TRUSTED_FORWARDER_HEADER);
  headers.delete(FORWARDER_TOKEN_HEADER);
  headers.delete(FORWARDER_SIGNATURE_HEADER);
  headers.delete(FORWARDER_TIMESTAMP_HEADER);
  headers.delete(FORWARDER_PATH_HEADER);

  const sanitizedRequest = () => new Request(request, { headers });
  if (!rawForwardedHost || !isTrustedForwarderSource(request, env)) {
    return { rejection: null, request: sanitizedRequest() };
  }

  const currentKey = env.HNS_FORWARDER_HMAC_KEY?.trim() ?? "";
  const previousKey = env.HNS_FORWARDER_HMAC_PREVIOUS_KEY?.trim() ?? "";
  const configuredToken = env.HNS_FORWARDER_AUTH_TOKEN?.trim() ?? "";
  const hmacConfigured = isValidHmacKey(currentKey) && (!previousKey || isValidHmacKey(previousKey));
  if (!hmacConfigured && !configuredToken) {
    return { rejection: "configuration", request: sanitizedRequest() };
  }

  const legacyVerified = !!configuredToken && !!forwardedToken && timingSafeEqualText(forwardedToken, configuredToken);
  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(nowMs / 1_000);
  const hmacEnvelopeValid = hmacConfigured
    && !!forwardedHost
    && !!signature
    && pathAndQuery.startsWith("/")
    && pathAndQuery === actualPathAndQuery
    && /^\d+$/u.test(timestamp)
    && Number.isSafeInteger(timestampSeconds)
    && Math.abs(nowSeconds - timestampSeconds) <= parseClockSkewSeconds(env);
  let verified = false;
  if (hmacEnvelopeValid && forwardedHost && signature) {
    const canonical = canonicalizeForwarderContext({ request, host: forwardedHost, pathAndQuery, timestamp });
    const candidateKeys = previousKey ? [currentKey, previousKey] : [currentKey];
    for (const secret of candidateKeys) {
      if (await verifyForwarderSignature({ canonical, secret, signature })) {
        verified = true;
        break;
      }
    }
  }

  // During the compatibility window, an old gateway may send only the legacy
  // token. Once any signed-envelope header is present, however, it must verify
  // completely; otherwise a bad or replayed HMAC could silently downgrade to
  // the bearer token that is dual-emitted alongside it.
  const authenticated = signedEnvelopePresent ? verified : legacyVerified;
  if (!authenticated) {
    return { rejection: "authentication", request: sanitizedRequest() };
  }

  headers.set(TRUSTED_FORWARDER_HEADER, "1");
  return { rejection: null, request: sanitizedRequest() };
}

function isTrustedForwardedHnsHost(hostname: string): boolean {
  if (HNS_APP_HOSTS.has(hostname)) {
    return true;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/u
    .test(hostname);
}

export function resolveEffectiveRequestUrl(request: Request): string {
  const url = new URL(request.url);
  const pirateHnsHost = normalizeHost(request.headers.get("x-pirate-hns-host"));
  const fallbackForwardedHost = normalizeHost(request.headers.get("x-forwarded-host"));
  const forwardedHost = pirateHnsHost ?? fallbackForwardedHost;

  const hostAllowed = pirateHnsHost
    ? isTrustedForwardedHnsHost(pirateHnsHost)
    : !!fallbackForwardedHost && HNS_APP_HOSTS.has(fallbackForwardedHost);

  if (!forwardedHost || !hostAllowed || !isTrustedForwarder(request)) {
    return url.toString();
  }

  url.protocol = "https:";
  url.hostname = forwardedHost;
  url.port = "";
  return url.toString();
}

export function resolveForwardedCommunityRouteSegment(
  request: Request,
): string | null {
  const routeSegment = request.headers.get("x-pirate-hns-community-id")
    ?? request.headers.get("x-pirate-hns-community-route");
  const normalized = routeSegment?.split(",")[0]?.trim() ?? "";
  if (!normalized || !isTrustedForwarder(request)) {
    return null;
  }

  return normalized;
}

export function resolveForwardedCommunityRouteSlug(request: Request): string | null {
  const normalized = request.headers.get("x-pirate-hns-community-route")
    ?.split(",")[0]?.trim() ?? "";
  if (!normalized || !isTrustedForwarder(request)) {
    return null;
  }
  return normalized;
}

export function resolveForwardedWalletInteractive(
  request: Request,
): boolean {
  return isTrustedForwarder(request)
    && request.headers.get("x-pirate-hns-wallet-interactive")?.trim() === "1";
}
