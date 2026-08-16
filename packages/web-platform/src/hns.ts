export type HostSurface = "canonical" | "sovereign-app" | "sovereign-apex";

export function hostName(host: string): string {
  return host.split(":", 1)[0].toLowerCase().replace(/\.+$/u, "");
}

export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "127.0.0.1"
    || hostname.startsWith("127.");
}

export function classifyHost(host: string): HostSurface {
  const hostname = hostName(host);
  if (hostname === "pirate.sc" || hostname === "www.pirate.sc" || isLocalHost(hostname)) {
    return "canonical";
  }
  if (hostname.startsWith("app.") && hostname.endsWith(".hns")) return "sovereign-app";
  if (hostname.endsWith(".hns")) return "sovereign-apex";
  return "canonical";
}

export function deriveCommunitySlug(host: string, trustedForwarder: boolean, forwardedRoute?: string | null): string | null {
  const route = forwardedRoute?.split(",", 1)[0]?.trim();
  if (trustedForwarder && route) return route;

  const hostname = hostName(host);
  if (!hostname.endsWith(".hns")) return null;
  const withoutSuffix = hostname.slice(0, -4);
  return withoutSuffix.startsWith("app.") ? withoutSuffix.slice(4) || null : withoutSuffix || null;
}
