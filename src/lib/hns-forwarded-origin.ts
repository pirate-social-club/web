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

export function resolveEffectiveRequestUrl(request: Request, env: HnsForwardedOriginEnv = {}): string {
  const url = new URL(request.url);
  const forwardedHost = normalizeHost(
    request.headers.get("x-pirate-hns-host") ?? request.headers.get("x-forwarded-host"),
  );

  if (!forwardedHost || !HNS_APP_HOSTS.has(forwardedHost) || !isTrustedForwarder(request, env)) {
    return url.toString();
  }

  url.protocol = "https:";
  url.hostname = forwardedHost;
  url.port = "";
  return url.toString();
}
