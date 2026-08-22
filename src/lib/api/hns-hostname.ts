// The API origin a browser can reach when it is visiting an HNS host. The .sc
// registry publishes no DS records for commercial registrations, so dual-root
// browsers cannot produce timely authenticated ICANN evidence for
// api.pirate.sc; api.pirate resolves and DANE-verifies natively on the HNS
// trust chain.
export const HNS_API_ORIGIN = "https://api.pirate";

export function isLocalHostname(hostname: string): boolean {
  return (
    !hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "127.0.0.1"
    || hostname.startsWith("127.")
  );
}

export function isHnsHostname(hostname: string): boolean {
  if (!hostname || isLocalHostname(hostname)) {
    return false;
  }

  if (hostname.endsWith(".pirate") || hostname.endsWith(".clawitzer")) {
    return true;
  }

  if (!hostname.includes(".")) {
    return /^[a-z0-9-]+$/u.test(hostname);
  }

  // Imported HNS roots use the dashboard-compatible app.<root> origin.
  // Keep other subdomains on their normal ICANN routing until a host is
  // explicitly recognized as an HNS application origin.
  const labels = hostname.split(".");
  return labels.length === 2 && labels[0] === "app" && /^[a-z0-9-]+$/u.test(labels[1]);
}

/**
 * Resolves the API origin a browser navigating `hostname` can actually reach.
 * HNS visitors get the HNS API origin; every other host keeps the caller's
 * (usually discovery-derived) origin.
 */
export function resolveBrowserReachableApiOrigin(hostname: string, fallbackOrigin: string): string {
  return isHnsHostname(hostname.trim().toLowerCase()) ? HNS_API_ORIGIN : fallbackOrigin;
}
