const RESERVED_PUBLIC_PROFILE_HOSTS = new Set([
  "www",
  "api",
  "api-staging",
  "spaces",
  "app",
  "admin",
  "assets",
  "static",
  "cdn",
  "chat",
  "dev",
  "staging",
]);

const PUBLIC_PROFILE_HOST_SUFFIXES = ["pirate", "clawitzer", "localhost"];

export function extractPublicProfileHost(
  hostname: string,
): { handleLabel: string; hostSuffix: string } | null {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/u, "");
  if (!normalizedHostname || normalizedHostname === "localhost") {
    return null;
  }

  for (const hostSuffix of PUBLIC_PROFILE_HOST_SUFFIXES) {
    if (!normalizedHostname.endsWith(`.${hostSuffix}`)) {
      continue;
    }

    const subdomain = normalizedHostname.slice(0, -(hostSuffix.length + 1));
    if (!subdomain || subdomain.includes(".") || RESERVED_PUBLIC_PROFILE_HOSTS.has(subdomain)) {
      return null;
    }

    return {
      handleLabel: subdomain,
      hostSuffix,
    };
  }

  return null;
}
