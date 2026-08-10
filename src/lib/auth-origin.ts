const CANONICAL_AUTH_HOSTNAMES = new Set([
  "pirate.sc",
  "www.pirate.sc",
  "app.pirate",
  "app.dankmeme",
  "app.jazleeuw",
  "staging.pirate.sc",
  "localhost",
  "127.0.0.1",
]);

/**
 * Returns true if the given hostname (or current window.location.hostname)
 * is a canonical interactive app origin where Privy auth is expected to work.
 *
 * During the authority rollout, established app.<root> origins remain listed
 * explicitly while new origins require the gateway's trusted interactive
 * marker. Other namespace, profile, and Spaces-resolved origins show an
 * "Open in Pirate" CTA instead of attempting Privy connect.
 */
export function isCanonicalAuthOrigin(hostname?: string, walletInteractive?: boolean): boolean {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : ""))
    .trim()
    .toLowerCase()
    .replace(/\.+$/u, "");

  if (CANONICAL_AUTH_HOSTNAMES.has(host)) return true;
  if (
    /^app\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(host)
    && (walletInteractive ?? (
      typeof document !== "undefined"
      && document.documentElement.dataset.hnsWalletInteractive === "1"
    ))
  ) return true;
  if (host.endsWith(".localhost")) return true;
  if (host.endsWith(".staging.pirate.sc")) return true;
  return false;
}

/**
 * Build a canonical Pirate web URL that preserves the current path and query.
 * Used for "Open in Pirate" redirects when the user is on a non-canonical
 * origin and tries an auth-required action.
 */
export function buildCanonicalAuthUrl(
  pathname?: string,
  search?: string,
): string {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  return `https://pirate.sc${path}${query}`;
}
