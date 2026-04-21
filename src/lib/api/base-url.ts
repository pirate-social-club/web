import { DEFAULT_BASE_URL } from "./client";

function readExplicitApiBaseUrl(): string | null {
  const value = import.meta.env.VITE_PIRATE_API_BASE_URL;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveEnvironmentFallback(): string {
  const appEnvironment = String(import.meta.env.VITE_PIRATE_APP_ENV ?? "").toLowerCase();
  if (appEnvironment === "staging" || appEnvironment === "stage" || appEnvironment === "preprod") {
    return "https://api-staging.pirate.sc";
  }

  if (appEnvironment === "prod" || appEnvironment === "production") {
    return "https://api.pirate.sc";
  }

  return DEFAULT_BASE_URL;
}

export function resolveApiBaseUrl(hostname?: string | null): string {
  const explicitBaseUrl = readExplicitApiBaseUrl();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const resolvedHostname = (hostname
    ?? (typeof window !== "undefined" ? window.location.hostname : ""))
    .trim()
    .toLowerCase();

  if (
    !resolvedHostname
    || resolvedHostname === "localhost"
    || resolvedHostname.endsWith(".localhost")
    || resolvedHostname === "127.0.0.1"
    || resolvedHostname.startsWith("127.")
  ) {
    return DEFAULT_BASE_URL;
  }

  if (
    resolvedHostname === "staging.pirate.sc"
    || resolvedHostname.endsWith(".staging.pirate.sc")
  ) {
    return "https://api-staging.pirate.sc";
  }

  if (
    resolvedHostname === "pirate.sc"
    || resolvedHostname === "www.pirate.sc"
    || resolvedHostname.endsWith(".pirate.sc")
  ) {
    return "https://api.pirate.sc";
  }

  if (resolvedHostname === "app.pirate") {
    return "https://api.pirate";
  }

  return resolveEnvironmentFallback();
}

export function resolveApiUrl(path: string, hostname?: string | null): string {
  if (/^https?:\/\//u.test(path)) {
    return path;
  }

  const baseUrl = resolveApiBaseUrl(hostname);
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
