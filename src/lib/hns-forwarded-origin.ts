const DEFAULT_TRUSTED_HNS_FORWARDER_IPS = ["173.199.93.117"];
const HNS_APP_HOSTS = new Set(["app.pirate"]);

export type HnsForwardedOriginEnv = {
  HNS_FORWARDER_TRUSTED_IPS?: string;
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
    .map((entry) => entry.trim())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_TRUSTED_HNS_FORWARDER_IPS);
}

function isTrustedForwarder(request: Request, env: HnsForwardedOriginEnv): boolean {
  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  return !!connectingIp && parseTrustedIps(env).has(connectingIp);
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
