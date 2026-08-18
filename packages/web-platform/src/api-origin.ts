function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("127.");
}

export type ApiExecutionEnvironment = "local" | "staging" | "production";

/** Resolve the API origin from a public Web hostname. */
export function resolveApiOriginFromHostname(hostname: string): string {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (isLocalHost(normalizedHostname) || normalizedHostname.endsWith(".localhost")) {
    return "http://127.0.0.1:8787";
  }
  if (
    normalizedHostname === "staging.pirate.sc" ||
    normalizedHostname.endsWith(".staging.pirate.sc")
  ) {
    return "https://api-staging.pirate.sc";
  }
  return "https://api.pirate.sc";
}

/** Resolve an API origin without allowing local or staging execution to fall through to production. */
export function resolveApiOriginFromExecution(
  hostname: string,
  environment: ApiExecutionEnvironment,
): string {
  if (environment === "local") return "http://127.0.0.1:8787";
  if (environment === "staging") return "https://api-staging.pirate.sc";
  return resolveApiOriginFromHostname(hostname);
}
