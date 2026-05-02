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

function isLocalHostname(hostname: string): boolean {
  return (
    !hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "127.0.0.1"
    || hostname.startsWith("127.")
  );
}

function isHnsHostname(hostname: string): boolean {
  if (!hostname || isLocalHostname(hostname)) {
    return false;
  }

  if (hostname.endsWith(".pirate")) {
    return true;
  }

  return !hostname.includes(".") && /^[a-z0-9-]+$/u.test(hostname);
}

function getBrowserHostname(): string {
  return typeof window !== "undefined" ? window.location.hostname : "";
}

export function resolveApiBaseUrl(hostname?: string | null): string {
  const explicitBaseUrl = readExplicitApiBaseUrl();
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const providedHostname = (hostname ?? "").trim().toLowerCase();
  const browserHostname = getBrowserHostname().trim().toLowerCase();

  const resolvedHostname = (providedHostname && (!isLocalHostname(providedHostname) || isLocalHostname(browserHostname))
    ? providedHostname
    : browserHostname)
    .trim()
    .toLowerCase();

  if (isLocalHostname(resolvedHostname)) {
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

  if (isHnsHostname(resolvedHostname)) {
    return "https://api.pirate.sc";
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
