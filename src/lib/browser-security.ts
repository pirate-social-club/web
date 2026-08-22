import { isHnsHostname, isLocalHostname } from "./api/hns-hostname";

export function originCanUseCredentials(protocol: string, hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (isLocalHostname(normalizedHostname)) return true;
  return protocol !== "http:" || !isHnsHostname(normalizedHostname);
}

/**
 * Plain HTTP HNS pages are not secure contexts. Do not put a bearer token or
 * ambient credentials on requests initiated from one, even if a caller asks
 * for an authenticated API operation.
 */
export function browserCanUseCredentials(): boolean {
  if (typeof window === "undefined" || !window.location) return true;
  return originCanUseCredentials(window.location.protocol, window.location.hostname);
}
