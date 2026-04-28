import { matchRoute } from "@/app/router";

import type { DiscoveryContext } from "./types";

const INDEXED_STATIC_PATHS = ["/", "/docs/api", "/privacy", "/terms"] as const;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("127.");
}

export function resolveAppOrigin(url: URL): string {
  const hostname = url.hostname.toLowerCase();

  if (hostname === "www.pirate.sc") {
    return "https://pirate.sc";
  }

  if (isLocalHost(hostname)) {
    return `${url.protocol}//${url.host}`;
  }

  return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}`;
}

export function resolveApiOriginFromHostname(hostname: string): string {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (isLocalHost(normalizedHostname) || normalizedHostname.endsWith(".localhost")) {
    return "http://127.0.0.1:8787";
  }

  if (
    normalizedHostname === "staging.pirate.sc"
    || normalizedHostname.endsWith(".staging.pirate.sc")
  ) {
    return "https://api-staging.pirate.sc";
  }

  if (normalizedHostname === "app.pirate") {
    return "https://api.pirate";
  }

  return "https://api.pirate.sc";
}

export function buildCanonicalUrl(url: URL): string {
  return `${resolveAppOrigin(url)}${normalizePathname(url.pathname)}`;
}

export function buildCommunityPath(communityId: string, routeSlug?: string | null): string {
  const target = routeSlug?.trim() || communityId.trim();
  return `/c/${encodeURIComponent(target)}`;
}

export function getDiscoveryContext(input: URL | string): DiscoveryContext {
  const url = typeof input === "string" ? new URL(input) : input;
  const pathname = normalizePathname(url.pathname);
  const route = pathname === "/docs/api" ? { kind: "api-docs" as const } : matchRoute(pathname, url.hostname);
  const isIndexable = pathname === "/docs/api"
    || INDEXED_STATIC_PATHS.includes(pathname as (typeof INDEXED_STATIC_PATHS)[number])
    || route.kind === "community"
    || route.kind === "post"
    || route.kind === "public-profile"
    || route.kind === "public-agent";

  return {
    apiOrigin: resolveApiOriginFromHostname(url.hostname),
    appOrigin: resolveAppOrigin(url),
    canonicalUrl: buildCanonicalUrl(url),
    isIndexable,
    pathname,
    routeKind: route.kind,
  };
}

export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export function applyDiscoveryHeaders(headers: Headers, ctx: DiscoveryContext): void {
  headers.append("Link", `<${ctx.canonicalUrl}>; rel="canonical"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog")}>; rel="api-catalog"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/openapi.json")}>; rel="service-desc"; type="application/vnd.oai.openapi+json"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/docs/api")}>; rel="service-doc"; type="text/html"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/.well-known/oauth-authorization-server")}>; rel="oauth-authorization-server"; type="application/json"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/.well-known/http-message-signatures-directory")}>; rel="http-message-signatures-directory"; type="application/http-message-signatures-directory+json"`);
  headers.append("Vary", "Accept");

  if (!ctx.isIndexable) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export function escapeHtml(value: string): string {
  return escapeXml(value);
}

export function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}

export function textResponse(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": `${contentType}; charset=utf-8`,
    },
  });
}

export function jsonResponse(body: unknown, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": `${contentType}; charset=utf-8`,
    },
  });
}

export function bytesToBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function bytesToBase64Url(value: ArrayBuffer | Uint8Array): string {
  return bytesToBase64(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function structuredFieldString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}
