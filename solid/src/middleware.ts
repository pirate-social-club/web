import routes from "virtual:file-routes";
import { createAPIHandler } from "filesystem-routing/api";
import { getRequestEvent } from "@solidjs/web";
import { env } from "cloudflare:workers";
import {
  authenticateHnsForwarderRequest,
  buildSolidContentSecurityPolicy,
  classifySolidHost,
  deriveCommunitySlug,
  fetchWithTimeout,
  hostName,
  resolveSolidRequestDisposition,
  SOLID_UPSTREAM_TIMEOUT_MS,
  isLocalHost,
  resolveApiOriginFromExecution,
} from "@pirate/web-platform";
import type { HnsForwardedOriginEnv } from "@pirate/web-platform";
import type { HostContext } from "./lib/host-context";
import { createApiClient } from "./lib/api/client";
import { normalizePublicVideoFeed } from "./lib/api/public-feed";
import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  resolveRequestUiLocale,
} from "./lib/ui-locale-core";

function makeNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

type SolidWorkerEnv = HnsForwardedOriginEnv & {
  PUBLIC?: Fetcher;
  SOLID_ENV?: string;
  SOLID_STAGING_HOST?: string;
};

function makeHostContext(request: Request, configuredStagingHost?: string): HostContext {
  const host = request.headers.get("host") ?? "";
  const surface = classifySolidHost(host, configuredStagingHost);
  const trusted = request.headers.get("x-pirate-hns-trusted-forwarder") === "1";
  const forwardingMetadataPresent = trusted && Boolean(
    request.headers.get("x-pirate-hns-community-id")?.trim()
      || request.headers.get("x-pirate-hns-community-route")?.trim(),
  );
  return {
    surface,
    communitySlug: deriveCommunitySlug(
      host,
      trusted,
      request.headers.get("x-pirate-hns-community-route"),
    ),
    importedRoot: surface === "sovereign-apex",
    forwardingMetadataPresent,
  };
}

async function seamMiddleware(request: Request, next: () => Promise<Response>) {
  const event = getRequestEvent();
  if (!event) return next();

  const runtimeEnv = env as SolidWorkerEnv;
  const forwarding = await authenticateHnsForwarderRequest(request, runtimeEnv);
  request = forwarding.request;
  if (forwarding.rejection) {
    return new Response(
      forwarding.rejection === "configuration"
        ? "HNS forwarder authentication is not configured."
        : "HNS forwarder authentication failed.",
      {
        status: forwarding.rejection === "configuration" ? 503 : 403,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }

  const nonce = makeNonce();
  const hostContext = makeHostContext(request, runtimeEnv.SOLID_STAGING_HOST);
  const surface = hostContext.surface;
  const url = new URL(request.url);
  const seamEnabled = import.meta.env.MODE === "development"
    && (runtimeEnv.SOLID_ENV === undefined || runtimeEnv.SOLID_ENV === "local");
  const disposition = resolveSolidRequestDisposition({
    pathname: url.pathname,
    surface,
    forwardingMetadataPresent: hostContext.forwardingMetadataPresent,
    seamEnabled,
  });
  if (disposition.kind === "reject") {
    return new Response("Not found", {
      status: disposition.status,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "x-solid-route-outcome": disposition.reason,
      },
    });
  }
  if (disposition.kind === "redirect") {
    const target = new URL(request.url);
    target.hostname = `app.${hostName(request.headers.get("host") ?? "")}`;
    return Response.redirect(target, disposition.status);
  }

  const uiLocale = resolveRequestUiLocale(url, request.headers.get("accept-language"));
  const hostname = hostName(request.headers.get("host") ?? url.hostname);
  const apiEnvironment = runtimeEnv.SOLID_ENV === "staging"
    ? "staging"
    : runtimeEnv.SOLID_ENV === "production"
      ? "production"
      : "local";
  event.locals.cspNonce = nonce;
  event.locals.apiOrigin = resolveApiOriginFromExecution(hostname, apiEnvironment);
  event.locals.hostContext = hostContext;
  event.locals.seamHost = surface;
  event.locals.uiLocale = uiLocale;
  event.locals.uiDirection = resolveLocaleDirection(uiLocale);

  if (url.pathname === "/") {
    try {
      const feed = await createApiClient({
        request,
        fetchImpl: (input, init) => fetchWithTimeout(fetch, input, init, SOLID_UPSTREAM_TIMEOUT_MS),
      }).getJson<unknown>(
        `/feed/home/videos/public?locale=${encodeURIComponent(resolveLocaleLanguageTag(uiLocale))}&sort=best`,
      );
      event.locals.publicVideoFeed = normalizePublicVideoFeed(feed);
    } catch {
      // The route still renders its signed-out empty/error state when the
      // public read is unavailable; SSR must not hang on an optional feed.
      event.locals.publicVideoFeed = { items: [], next_cursor: null };
    }
  }

  if (url.pathname === "/seam/api" && url.searchParams.get("feed") === "1") {
    const feed = await createApiClient({
      request,
      fetchImpl: (input, init) => fetchWithTimeout(fetch, input, init, SOLID_UPSTREAM_TIMEOUT_MS),
    }).getJson<unknown>(
      `/feed/home/videos/public?locale=${encodeURIComponent(resolveLocaleLanguageTag(uiLocale))}&sort=best`,
    );
    const items = Array.isArray(feed)
      ? feed.length
      : feed && typeof feed === "object" && "items" in feed && Array.isArray(feed.items)
        ? feed.items.length
        : 0;
    event.locals.apiFeedResult = { ok: true, itemCount: items };
  }

  if (url.pathname === "/seam/binding") {
    const binding = runtimeEnv.PUBLIC;
    if (!binding) {
      event.locals.bindingResult = JSON.stringify({ ok: false, error: "PUBLIC binding missing" });
    } else {
      const upstream = await fetchWithTimeout(
        (input, init) => binding.fetch(input, init),
        "https://public.internal/seam/ping",
        undefined,
        SOLID_UPSTREAM_TIMEOUT_MS,
      );
      event.locals.bindingResult = JSON.stringify({ ok: true, upstream: await upstream.json() });
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set(
    "content-security-policy",
    buildSolidContentSecurityPolicy({ nonce, allowLocalApiOrigin: isLocalHost(hostname) }),
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(self), geolocation=()");
  headers.set("x-frame-options", "DENY");
  headers.set("x-seam-host-surface", surface);
  const status = event.locals.routeStatus ?? response.status;
  return new Response(response.body, { status, statusText: response.statusText, headers });
}

export default [seamMiddleware, createAPIHandler(routes)];
