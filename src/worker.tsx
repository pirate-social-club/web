import { except, render, route } from "rwsdk/router";
import { defineApp, type RequestInfo } from "rwsdk/worker";

import { PirateApp } from "@/app";
import type { AppContext, SeoMetadata, ThemeMode } from "@/app/app-context";
import { COMMUNITY_MODERATION_SECTIONS, SETTINGS_SECTIONS } from "@/app/route-definitions";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { Document } from "@/app/document";
import { matchRoute } from "@/app/router";
import { PRIVACY_POLICY_SOURCE } from "@/legal/privacy-policy";
import { TERMS_OF_SERVICE_SOURCE } from "@/legal/terms-of-service";
import { ACCOUNT_DELETION_SOURCE } from "@/legal/account-deletion";
import { CHILD_SAFETY_SOURCE } from "@/legal/child-safety";
import type { PublicAgentResolution, PublicProfileResolution } from "@/worker-public.types";
import {
  applyDiscoveryHeaders,
  buildAgentSkillResponse,
  buildAgentSkillsIndexResponse,
  buildApiCatalogResponse,
  buildApiDocsResponse,
  buildMarkdownForPage,
  buildMarkdownResponse,
  buildMcpServerCardResponse,
  buildOAuthAuthorizationServerResponse,
  buildOAuthProtectedResourceResponse,
  buildOpenApiResponse,
  buildOpenIdConfigurationResponse,
  buildRobotsResponse,
  buildSitemapResponse,
  buildWebBotAuthDirectoryResponse,
  getDiscoveryContext,
  markdownRequested,
  type WebBotAuthEnv,
} from "@/lib/agent-discovery";
import {
  authenticateHnsForwarderRequest,
  resolveEffectiveRequestUrl,
  resolveForwardedCommunityRouteSegment,
  type HnsForwardedOriginEnv,
} from "@/lib/hns-forwarded-origin";
import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  resolveRequestLocale,
  type UiLocaleCode,
} from "@/lib/ui-locale-core";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { getLocaleMessages } from "@/locales";
import { applySecurityHeaders } from "@/lib/security/csp";
import { buildVersionResponse, type BuildVersionEnv } from "@/lib/build-version";
import { telegramCommunityJoinRedirect } from "@/lib/telegram-join-redirect";
import {
  buildAgentSeoMetadata,
  buildOpenGraphUrl,
  buildCommunitySeoMetadata,
  buildPostSeoMetadata,
  buildProfileSeoMetadata,
  resolveSharePreviewQueryValue,
  shouldAlwaysResolveEntitySeo,
  type PublicCommunityPreviewResponse,
  type PublicPostResponse,
} from "@/lib/share-metadata";

type AppRequestInfo = RequestInfo<any, AppContext>;

const SEO_METADATA_TIMEOUT_MS = 9000;
const SEO_METADATA_USER_AGENT_PATTERN =
  /(bot|crawler|spider|facebookexternalhit|twitterbot|xbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|embedly|pinterest|preview)/i;
const SHARE_LOCALE_QUERY_KEYS = ["locale", "lang"] as const;

function acceptLanguageTags(acceptLanguageHeader: string | null): string[] {
  return (acceptLanguageHeader ?? "")
    .split(",")
    .flatMap((part) => {
      const tag = part.trim().split(";")[0]?.trim();
      return tag ? [tag] : [];
    });
}

function parseThemeCookie(cookieHeader: string | null): ThemeMode {
  const match = cookieHeader?.match(/(?:^|;\s*)theme=(dark|light|system)(?:;|$)/);
  return (match?.[1] as ThemeMode | undefined) ?? "dark";
}

function resolveLocaleQueryOverride(url: URL): Exclude<UiLocaleCode, "pseudo"> | null {
  for (const key of SHARE_LOCALE_QUERY_KEYS) {
    const value = url.searchParams.get(key)?.trim().toLowerCase();
    if (!value) {
      continue;
    }
    if (value === "ar" || value.startsWith("ar-")) return "ar";
    if (value === "zh" || value.startsWith("zh-")) return "zh";
    if (value === "en" || value.startsWith("en-")) return "en";
  }

  return null;
}

function resolveRequestUiLocale(
  url: URL,
  acceptLanguageHeader: string | null,
): Exclude<UiLocaleCode, "pseudo"> {
  return resolveLocaleQueryOverride(url) ?? resolveRequestLocale(acceptLanguageHeader);
}

function shouldResolveSeoMetadata(request: Request, route: ReturnType<typeof matchRoute>): boolean {
  if (shouldAlwaysResolveEntitySeo(route)) {
    return true;
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  return SEO_METADATA_USER_AGENT_PATTERN.test(userAgent);
}

function buildPublicApiUrl(apiOrigin: string, path: string, locale: UiLocaleCode | null): string {
  const url = new URL(path, apiOrigin);
  if (locale && locale !== "pseudo") {
    url.searchParams.set("locale", resolveLocaleLanguageTag(locale));
  }
  return url.toString();
}

function buildHomeFeedPreloadUrl(apiOrigin: string, contentLocale: string): string {
  const url = new URL("/feed/home/public", apiOrigin);
  url.searchParams.set("locale", contentLocale);
  url.searchParams.set("sort", "best");
  return url.toString();
}

async function fetchPublicJson<T>(
  apiOrigin: string,
  path: string,
  locale: UiLocaleCode | null,
  signal?: AbortSignal,
): Promise<T> {
  const languageTag = locale && locale !== "pseudo" ? resolveLocaleLanguageTag(locale) : null;
  const response = await fetch(buildPublicApiUrl(apiOrigin, path, locale), {
    headers: {
      accept: "application/json",
      ...(languageTag ? { "accept-language": languageTag } : {}),
    },
    redirect: "manual",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Public metadata lookup failed with status ${response.status}`);
  }
  return await response.json() as T;
}

async function resolveRouteSeoMetadata(input: {
  apiOrigin: string;
  appOrigin: string;
  locale: UiLocaleCode;
  route: ReturnType<typeof matchRoute>;
  signal?: AbortSignal;
}): Promise<SeoMetadata | null> {
  try {
    if (input.route.kind === "community" || input.route.kind === "telegram-community") {
      const preview = await fetchPublicJson<PublicCommunityPreviewResponse>(
        input.apiOrigin,
        `/public-communities/${encodeURIComponent(input.route.communityId)}?preview=seo`,
        input.locale,
        input.signal,
      );
      return buildCommunitySeoMetadata({
        appOrigin: input.appOrigin,
        locale: input.locale,
        preview,
      });
    }

    if (
      input.route.kind === "post"
      || input.route.kind === "telegram-post"
      || input.route.kind === "live-room"
      || input.route.kind === "post-karaoke"
      || input.route.kind === "crosspost"
    ) {
      const postResponse = await fetchPublicJson<PublicPostResponse>(
        input.apiOrigin,
        `/public-posts/${encodeURIComponent(input.route.postId)}`,
        input.locale,
        input.signal,
      );
      let community: PublicCommunityPreviewResponse | null = postResponse.community ?? null;
      const communityId = postResponse.post.community;
      if (!community && communityId) {
        try {
          community = await fetchPublicJson<PublicCommunityPreviewResponse>(
            input.apiOrigin,
            `/public-communities/${encodeURIComponent(communityId)}?preview=seo`,
            input.locale,
            input.signal,
          );
        } catch {
          community = null;
        }
      }
      return buildPostSeoMetadata({
        appOrigin: input.appOrigin,
        community,
        locale: input.locale,
        postResponse,
      });
    }

    if (input.route.kind === "public-profile") {
      const resolution = await fetchPublicJson<PublicProfileResolution>(
        input.apiOrigin,
        `/public-profiles/${encodeURIComponent(input.route.handleLabel)}`,
        input.locale,
        input.signal,
      );
      return buildProfileSeoMetadata({
        appOrigin: input.appOrigin,
        locale: input.locale,
        resolution,
      });
    }

    if (input.route.kind === "public-agent") {
      const resolution = await fetchPublicJson<PublicAgentResolution>(
        input.apiOrigin,
        `/public-agents/${encodeURIComponent(input.route.handleLabel)}`,
        input.locale,
        input.signal,
      );
      return buildAgentSeoMetadata({
        appOrigin: input.appOrigin,
        locale: input.locale,
        resolution,
      });
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveRouteSeoMetadataWithinBudget(input: {
  apiOrigin: string;
  appOrigin: string;
  locale: UiLocaleCode;
  route: ReturnType<typeof matchRoute>;
}): Promise<SeoMetadata | null> {
  const controller = new AbortController();
  let timedOut = false;
  const metadataPromise = resolveRouteSeoMetadata({
    ...input,
    signal: controller.signal,
  });
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve(null);
    }, SEO_METADATA_TIMEOUT_MS);
  });
  try {
    return await Promise.race([metadataPromise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (timedOut) {
      void metadataPromise.catch(() => null);
    }
  }
}

function AppRoutePage(requestInfo: AppRequestInfo) {
  const url = new URL(requestInfo.ctx.effectiveUrl ?? requestInfo.request.url);
  const importedRootCommunityId = url.pathname === "/"
    ? resolveForwardedCommunityRouteSegment(requestInfo.request)
    : null;

  return (
    <PirateApp
      initialDir={requestInfo.ctx.dir}
      initialHost={url.hostname}
      initialImportedRootCommunityId={importedRootCommunityId}
      initialLocale={requestInfo.ctx.locale}
      initialPath={url.pathname}
    />
  );
}

async function proxyTelegramSessionRequest(request: Request, effectiveUrl: string): Promise<Response> {
  const sourceUrl = new URL(effectiveUrl);
  const discovery = getDiscoveryContext(sourceUrl);
  const targetUrl = new URL(`${sourceUrl.pathname}${sourceUrl.search}`, discovery.apiOrigin);
  const headers = new Headers();

  for (const key of [
    "accept",
    "authorization",
    "content-type",
    "x-pirate-anonymous-id",
    "x-pirate-session-id",
  ]) {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.clone().arrayBuffer();
  const upstream = await fetch(targetUrl.toString(), {
    body,
    headers,
    method: request.method,
    redirect: "manual",
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  return new Response(upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

function PrivacyRoutePage() {
  return <LegalDocumentPage source={PRIVACY_POLICY_SOURCE} />;
}

function TermsRoutePage() {
  return <LegalDocumentPage source={TERMS_OF_SERVICE_SOURCE} />;
}

function AccountDeletionRoutePage() {
  return <LegalDocumentPage source={ACCOUNT_DELETION_SOURCE} />;
}

function ChildSafetyRoutePage() {
  return <LegalDocumentPage source={CHILD_SAFETY_SOURCE} />;
}

function ServerErrorFallback({
  locale,
}: {
  locale: Exclude<UiLocaleCode, "pseudo">;
}) {
  const copy = getLocaleMessages(locale, "shell").rootError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full border border-border-soft bg-muted text-muted-foreground"
        >
          <span className="text-2xl font-semibold leading-none">!</span>
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-tight">{copy.title}</h1>
          <p className="text-base leading-7 text-muted-foreground">{copy.description}</p>
        </div>
        <a
          className="inline-flex h-11 items-center justify-center rounded-full bg-secondary px-5 py-2 text-base font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/85"
          href="/"
        >
          {copy.homeLabel}
        </a>
      </div>
    </main>
  );
}

function resolveServerErrorLocale(
  locale: UiLocaleCode | undefined,
  url: URL,
  acceptLanguageHeader: string | null,
): Exclude<UiLocaleCode, "pseudo"> {
  if (locale && locale !== "pseudo") {
    return locale;
  }

  return resolveRequestUiLocale(url, acceptLanguageHeader);
}

function summarizeRouteError(error: unknown, includeStack: boolean): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(includeStack && error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    message: typeof error === "string" ? error : "Non-Error route failure",
    name: typeof error,
  };
}

const app = defineApp<AppRequestInfo>([
  except((error, { ctx, request }) => {
    const url = new URL(request.url);
    console.error("[server-error] unhandled route error", {
      error: summarizeRouteError(error, import.meta.env.DEV),
      path: url.pathname,
    });

    const locale = resolveServerErrorLocale(ctx.locale, url, request.headers.get("accept-language"));
    return <ServerErrorFallback locale={locale} />;
  }),
  async ({ ctx, request, response, rw }) => {
    const effectiveUrl = resolveEffectiveRequestUrl(request);
    const url = new URL(effectiveUrl);
    const discovery = getDiscoveryContext(effectiveUrl);
    const hasLocaleOverride = resolveLocaleQueryOverride(url) !== null;
    const locale = resolveRequestUiLocale(url, request.headers.get("accept-language"));
    const forwardedCommunityRoot = url.pathname === "/"
      ? resolveForwardedCommunityRouteSegment(request)
      : null;
    const route = forwardedCommunityRoot
      ? {
          kind: "community" as const,
          path: "/" as const,
          communityId: forwardedCommunityRoot,
          isImportedRoot: true,
        }
      : matchRoute(url.pathname, url.hostname);
    const expectsEntitySeoMetadata = shouldAlwaysResolveEntitySeo(route);

    ctx.effectiveUrl = effectiveUrl;
    ctx.appOrigin = discovery.appOrigin;
    ctx.canonicalUrl = discovery.canonicalUrl;
    ctx.expectsEntitySeoMetadata = expectsEntitySeoMetadata;
    ctx.locale = locale;
    ctx.dir = resolveLocaleDirection(locale);
    ctx.homeFeedPreloadUrl = route.kind === "home"
      ? buildHomeFeedPreloadUrl(
        discovery.apiOrigin,
        resolveViewerContentLocale({
          uiLocale: locale,
          browserLocales: acceptLanguageTags(request.headers.get("accept-language")),
        }),
      )
      : undefined;
    ctx.isIndexable = discovery.isIndexable;
    const seoMetadata = shouldResolveSeoMetadata(request, route)
      ? await resolveRouteSeoMetadataWithinBudget({
        apiOrigin: discovery.apiOrigin,
        appOrigin: discovery.appOrigin,
        locale,
        route,
      })
      : null;
    ctx.seoMetadata = seoMetadata
      ? {
          ...seoMetadata,
          url: buildOpenGraphUrl(
            discovery.canonicalUrl,
            locale,
            hasLocaleOverride,
            resolveSharePreviewQueryValue(url),
          ),
        }
      : null;
    if (expectsEntitySeoMetadata && !ctx.seoMetadata) {
      response.headers.set("cache-control", "no-store");
    }
    ctx.theme = parseThemeCookie(request.headers.get("cookie"));
    applyDiscoveryHeaders(response.headers, discovery);
    applySecurityHeaders(response.headers, rw.nonce, {
      dev: import.meta.env.DEV,
      reportOnly: import.meta.env.VITE_CSP_REPORT_ONLY === "true",
    });
  },
  render(Document, [
    route("/robots.txt", ({ ctx, request }) => buildRobotsResponse(ctx.effectiveUrl ?? request.url)),
    route("/sitemap.xml", ({ ctx, request }) => buildSitemapResponse(ctx.effectiveUrl ?? request.url)),
    route("/openapi.json", ({ ctx, request }) => buildOpenApiResponse(ctx.effectiveUrl ?? request.url)),
    route("/docs/api", ({ ctx, request }) => buildApiDocsResponse(ctx.effectiveUrl ?? request.url, markdownRequested(request))),
    route("/.well-known/api-catalog", ({ ctx, request }) => buildApiCatalogResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/oauth-protected-resource", ({ ctx, request }) => buildOAuthProtectedResourceResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/oauth-authorization-server", ({ ctx, request }) => buildOAuthAuthorizationServerResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/openid-configuration", ({ ctx, request }) => buildOpenIdConfigurationResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/mcp/server-card.json", ({ ctx, request }) => buildMcpServerCardResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/agent-skills/index.json", ({ ctx, request }) => buildAgentSkillsIndexResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/agent-skills/:skillName/SKILL.md", ({ params }) => buildAgentSkillResponse(params.skillName)),
    route("/delete-account", AccountDeletionRoutePage),
    route("/child-safety", ChildSafetyRoutePage),
    route("/privacy", PrivacyRoutePage),
    route("/terms", TermsRoutePage),
    route("/telegram/session/exchange", ({ ctx, request }) =>
      proxyTelegramSessionRequest(request, ctx.effectiveUrl ?? request.url)
    ),
    route("/telegram/session/auto-exchange", ({ ctx, request }) =>
      proxyTelegramSessionRequest(request, ctx.effectiveUrl ?? request.url)
    ),
    route("/", AppRoutePage),
    route("/popular", AppRoutePage),
    route("/advertise", AppRoutePage),
    route("/tg", AppRoutePage),
    route("/tg/exchange", AppRoutePage),
    route("/tg/self-return", AppRoutePage),
    route("/tg/self-return/:communityId", AppRoutePage),
    route("/tg/join/:communityId", ({ ctx, params, request }) =>
      telegramCommunityJoinRedirect({
        apiOrigin: getDiscoveryContext(ctx.effectiveUrl ?? request.url).apiOrigin,
        communityId: params.communityId,
        effectiveUrl: ctx.effectiveUrl ?? request.url,
      })
    ),
    route("/tg/verify/:communityId", AppRoutePage),
    route("/tg/c/:communityId", AppRoutePage),
    route("/tg/p/:postId", AppRoutePage),
    route("/your-communities", AppRoutePage),
    route("/communities/new", AppRoutePage),
    route("/submit", AppRoutePage),
    route("/c/:communityId/submit", AppRoutePage),
    route("/c/:communityId/bookings", AppRoutePage),
    route("/c/:communityId/bookings/:bookingId/session", AppRoutePage),
    route("/c/:communityId/book/:hostUserId", AppRoutePage),
    route("/c/:communityId/book/:hostUserId/checkout", AppRoutePage),
    route("/book/:hostUserId", AppRoutePage),
    route("/book/:hostUserId/checkout", AppRoutePage),
    route("/c/:communityId/mod", AppRoutePage),
    ...COMMUNITY_MODERATION_SECTIONS.map((section) =>
      route(`/c/:communityId/mod/${section}`, AppRoutePage)
    ),
    route("/c/:communityId", AppRoutePage),
    route("/p/:postId/crosspost", AppRoutePage),
    route("/p/:postId/live", AppRoutePage),
    route("/p/:postId/karaoke", AppRoutePage),
    route("/p/:postId", AppRoutePage),
    route("/inbox", AppRoutePage),
    route("/chat", AppRoutePage),
    route("/chat/new", AppRoutePage),
    route("/chat/c/:conversationId", AppRoutePage),
    route("/chat/to/:target", AppRoutePage),
    route("/me", AppRoutePage),
    route("/wallet", AppRoutePage),
    route("/bookings", AppRoutePage),
    route("/bookings/:bookingId/session", AppRoutePage),
    route("/settings", AppRoutePage),
    route("/settings/wallet", AppRoutePage),
    route("/settings/bookings", AppRoutePage),
    ...SETTINGS_SECTIONS.map((section) =>
      route(`/settings/${section}`, AppRoutePage)
    ),
    route("/u/:handleLabel", AppRoutePage),
    route("/a/:handleLabel", AppRoutePage),
    route("/onboarding", AppRoutePage),
    route("/authorize-device", AppRoutePage),
  ]),
]);

export default {
  async fetch(request: Request, env: Env, cf: AppRequestInfo["cf"]) {
    request = authenticateHnsForwarderRequest(request, env as HnsForwardedOriginEnv);
    const initialEffectiveUrl = resolveEffectiveRequestUrl(request);
    const initialPathname = new URL(initialEffectiveUrl).pathname;
    if (initialPathname === "/__version") {
      return buildVersionResponse("web", env as BuildVersionEnv);
    }
    if (initialPathname === "/.well-known/http-message-signatures-directory") {
      return buildWebBotAuthDirectoryResponse(request, env as WebBotAuthEnv);
    }

    const response = await app.fetch(request, env, cf);
    if (!markdownRequested(request)) {
      return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("text/html")) {
      return response;
    }

    const effectiveUrl = resolveEffectiveRequestUrl(request);
    const ctx = getDiscoveryContext(effectiveUrl);
    const markdown = buildMarkdownForPage(effectiveUrl);
    const markdownResponse = buildMarkdownResponse(markdown, ctx, response.status);

    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === "content-type") continue;
      if (key.toLowerCase() === "content-length") continue;
      if (key.toLowerCase() === "link") continue;
      if (key.toLowerCase() === "vary") continue;
      if (key.toLowerCase() === "x-robots-tag") continue;
      if (key.toLowerCase() === "x-markdown-tokens") continue;
      markdownResponse.headers.append(key, value);
    }

    return markdownResponse;
  },
};
