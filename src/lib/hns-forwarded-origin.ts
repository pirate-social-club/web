const DEFAULT_TRUSTED_HNS_FORWARDER_IPS = ["173.199.93.117"];
const HNS_APP_HOSTS = new Set(["app.pirate"]);
const TRUSTED_FORWARDER_HEADER = "x-pirate-hns-trusted-forwarder";
const FORWARDER_TOKEN_HEADER = "x-pirate-hns-forwarder-token";

export type HnsForwardedOriginEnv = {
  HNS_FORWARDER_TRUSTED_IPS?: string;
  HNS_FORWARDER_AUTH_TOKEN?: string;
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

function isTrustedForwarder(request: Request, env: HnsForwardedOriginEnv): boolean {
  if (request.headers.get(TRUSTED_FORWARDER_HEADER) === "1") {
    return true;
  }

  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  return !!connectingIp && parseTrustedIps(env).has(connectingIp);
}

async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const workerSubtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (first: ArrayBuffer, second: ArrayBuffer) => boolean;
  };
  if (typeof workerSubtle.timingSafeEqual === "function") {
    return workerSubtle.timingSafeEqual(providedHash, expectedHash);
  }

  // Bun's Web Crypto implementation does not expose the Workers extension used
  // above, so keep local tests on the same fixed-length, non-short-circuit path.
  const providedBytes = new Uint8Array(providedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let index = 0; index < providedBytes.length; index += 1) {
    mismatch |= providedBytes[index]! ^ expectedBytes[index]!;
  }
  return mismatch === 0;
}

export async function authenticateHnsForwarderRequest(
  request: Request,
  env: HnsForwardedOriginEnv = {},
): Promise<Request> {
  const headers = new Headers(request.headers);
  const token = env.HNS_FORWARDER_AUTH_TOKEN?.trim();
  const forwardedToken = headers.get(FORWARDER_TOKEN_HEADER)?.trim();

  headers.delete(TRUSTED_FORWARDER_HEADER);
  headers.delete(FORWARDER_TOKEN_HEADER);

  if (token && forwardedToken && await secretsMatch(forwardedToken, token)) {
    headers.set(TRUSTED_FORWARDER_HEADER, "1");
  }

  return new Request(request, { headers });
}

function isTrustedForwardedHnsHost(hostname: string): boolean {
  if (HNS_APP_HOSTS.has(hostname)) {
    return true;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/u
    .test(hostname);
}

export function resolveEffectiveRequestUrl(request: Request, env: HnsForwardedOriginEnv = {}): string {
  const url = new URL(request.url);
  const pirateHnsHost = normalizeHost(request.headers.get("x-pirate-hns-host"));
  const fallbackForwardedHost = normalizeHost(request.headers.get("x-forwarded-host"));
  const forwardedHost = pirateHnsHost ?? fallbackForwardedHost;

  const hostAllowed = pirateHnsHost
    ? isTrustedForwardedHnsHost(pirateHnsHost)
    : !!fallbackForwardedHost && HNS_APP_HOSTS.has(fallbackForwardedHost);

  if (!forwardedHost || !hostAllowed || !isTrustedForwarder(request, env)) {
    return url.toString();
  }

  url.protocol = "https:";
  url.hostname = forwardedHost;
  url.port = "";
  return url.toString();
}

export function resolveForwardedCommunityRouteSegment(
  request: Request,
  env: HnsForwardedOriginEnv = {},
): string | null {
  const routeSegment = request.headers.get("x-pirate-hns-community-id")
    ?? request.headers.get("x-pirate-hns-community-route");
  const normalized = routeSegment?.split(",")[0]?.trim() ?? "";
  if (!normalized || !isTrustedForwarder(request, env)) {
    return null;
  }

  return normalized;
}

export function resolveForwardedWalletInteractive(
  request: Request,
  env: HnsForwardedOriginEnv = {},
): boolean {
  return isTrustedForwarder(request, env)
    && request.headers.get("x-pirate-hns-wallet-interactive")?.trim() === "1";
}
