import { except, render, route } from "rwsdk/router";
import { defineApp, type RequestInfo } from "rwsdk/worker";
import type { CommunityPreview, LocalizedPostResponse } from "@pirate/api-contracts";

import { PirateApp } from "@/app";
import type { AppContext, SeoMetadata, ThemeMode } from "@/app/app-context";
import { COMMUNITY_MODERATION_SECTIONS, SETTINGS_SECTIONS } from "@/app/route-definitions";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { Document } from "@/app/document";
import { matchRoute } from "@/app/router";
import { PRIVACY_POLICY_SOURCE } from "@/legal/privacy-policy";
import { TERMS_OF_SERVICE_SOURCE } from "@/legal/terms-of-service";
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
import { getLocaleMessages } from "@/locales";
import { applySecurityHeaders } from "@/lib/security/csp";
import { buildVersionResponse, type BuildVersionEnv } from "@/lib/build-version";

type AppRequestInfo = RequestInfo<any, AppContext>;

type PublicCommunityPreviewResponse = CommunityPreview & {
  omitted_surfaces?: unknown;
  links?: unknown;
};

type PublicPostResponse = LocalizedPostResponse & {
  omitted_surfaces?: unknown;
  links?: unknown;
};

const META_DESCRIPTION_MAX_LENGTH = 180;
const SEO_METADATA_TIMEOUT_MS = 650;
const SEO_METADATA_USER_AGENT_PATTERN =
  /(bot|crawler|spider|facebookexternalhit|twitterbot|xbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|embedly|pinterest|preview)/i;
const SHARE_LOCALE_QUERY_KEYS = ["locale", "lang"] as const;

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

function shouldResolveSeoMetadata(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  return SEO_METADATA_USER_AGENT_PATTERN.test(userAgent);
}

function buildOpenGraphUrl(canonicalUrl: string, locale: UiLocaleCode, hasLocaleOverride: boolean): string {
  if (!hasLocaleOverride) {
    return canonicalUrl;
  }

  const url = new URL(canonicalUrl);
  url.searchParams.set("locale", resolveLocaleLanguageTag(locale));
  return url.toString();
}

function normalizeMetaText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function truncateMetaDescription(value: string | null | undefined): string | null {
  const normalized = normalizeMetaText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= META_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}...`;
}

function resolvePublicImageUrl(value: string | null | undefined, appOrigin: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = trimmed.startsWith("/") ? new URL(trimmed, appOrigin) : new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function firstPublicImageUrl(values: Array<string | null | undefined>, appOrigin: string): string | null {
  for (const value of values) {
    const imageUrl = resolvePublicImageUrl(value, appOrigin);
    if (imageUrl) {
      return imageUrl;
    }
  }
  return null;
}

function firstPostMediaImageUrl(post: LocalizedPostResponse["post"], appOrigin: string): string | null {
  for (const media of post.media_refs ?? []) {
    if (media.mime_type && !media.mime_type.toLowerCase().startsWith("image/")) {
      continue;
    }
    const imageUrl = resolvePublicImageUrl(media.storage_ref, appOrigin);
    if (imageUrl) {
      return imageUrl;
    }
  }
  return null;
}

function buildPublicApiUrl(apiOrigin: string, path: string, locale: UiLocaleCode | null): string {
  const url = new URL(path, apiOrigin);
  if (locale && locale !== "pseudo") {
    url.searchParams.set("locale", resolveLocaleLanguageTag(locale));
  }
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

function buildCommunitySeoMetadata(input: {
  appOrigin: string;
  locale: UiLocaleCode;
  preview: PublicCommunityPreviewResponse;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes");
  const title = `${input.preview.display_name} • Pirate`;
  const description = truncateMetaDescription(input.preview.description)
    ?? copy.home.emptyHomeBody;
  const imageUrl = firstPublicImageUrl([
    input.preview.banner_ref,
    input.preview.avatar_ref,
  ], input.appOrigin);

  return {
    description,
    imageUrl,
    title,
    type: "website",
  };
}

function buildPostSeoMetadata(input: {
  appOrigin: string;
  community: PublicCommunityPreviewResponse | null;
  locale: UiLocaleCode;
  postResponse: PublicPostResponse;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes");
  const post = input.postResponse.post;
  const titleText = normalizeMetaText(input.postResponse.translated_title ?? post.title)
    ?? normalizeMetaText(post.link_og_title)
    ?? copy.post.fallbackTitle;
  const description = truncateMetaDescription(
    input.postResponse.translated_body
      ?? input.postResponse.translated_caption
      ?? post.body
      ?? post.caption
      ?? post.link_og_title
      ?? input.community?.description
      ?? null,
  ) ?? copy.post.description;
  const imageUrl = firstPostMediaImageUrl(post, input.appOrigin)
    ?? firstPublicImageUrl([
      post.link_og_image_url,
      input.community?.banner_ref,
      input.community?.avatar_ref,
    ], input.appOrigin);

  return {
    description,
    imageUrl,
    title: `${titleText} • Pirate`,
    type: "article",
  };
}

function getPublicIdentityHandleLabel(input: {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
}): string {
  return input.primary_public_handle?.label ?? input.global_handle.label;
}

function buildProfileSeoMetadata(input: {
  appOrigin: string;
  locale: UiLocaleCode;
  resolution: PublicProfileResolution;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes").publicProfile;
  const handle = getPublicIdentityHandleLabel(input.resolution.profile);
  const displayName = normalizeMetaText(input.resolution.profile.display_name) ?? handle;
  const communityCount = input.resolution.created_communities.length;
  const description = truncateMetaDescription(input.resolution.profile.bio)
    ?? (communityCount > 0
      ? communityCount === 1
        ? copy.createdCommunityMeta.replace("{handle}", handle)
        : copy.createdCommunitiesMeta
            .replace("{handle}", handle)
            .replace("{count}", String(communityCount))
      : copy.defaultMeta.replace("{handle}", handle));
  const imageUrl = firstPublicImageUrl([
    input.resolution.profile.cover_ref,
    input.resolution.profile.avatar_ref,
  ], input.appOrigin);

  return {
    description,
    imageUrl,
    title: `${displayName} • Pirate`,
    type: "profile",
  };
}

function buildAgentSeoMetadata(input: {
  locale: UiLocaleCode;
  resolution: PublicAgentResolution;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes").publicAgent;
  const handle = input.resolution.agent.handle.label_display;
  const displayName = normalizeMetaText(input.resolution.agent.display_name) ?? handle;
  const ownerHandle = getPublicIdentityHandleLabel(input.resolution.owner);
  const description = `${handle} ${copy.ownerLabel.toLowerCase()} ${ownerHandle}.`;

  return {
    description,
    imageUrl: null,
    title: `${displayName} • Pirate Agent`,
    type: "profile",
  };
}

async function resolveRouteSeoMetadata(input: {
  apiOrigin: string;
  appOrigin: string;
  locale: UiLocaleCode;
  route: ReturnType<typeof matchRoute>;
  signal?: AbortSignal;
}): Promise<SeoMetadata | null> {
  try {
    if (input.route.kind === "community") {
      const preview = await fetchPublicJson<PublicCommunityPreviewResponse>(
        input.apiOrigin,
        `/public-communities/${encodeURIComponent(input.route.communityId)}`,
        input.locale,
        input.signal,
      );
      return buildCommunitySeoMetadata({
        appOrigin: input.appOrigin,
        locale: input.locale,
        preview,
      });
    }

    if (input.route.kind === "post") {
      const postResponse = await fetchPublicJson<PublicPostResponse>(
        input.apiOrigin,
        `/public-posts/${encodeURIComponent(input.route.postId)}`,
        input.locale,
        input.signal,
      );
      let community: PublicCommunityPreviewResponse | null = null;
      const communityId = postResponse.post.community;
      if (communityId) {
        try {
          community = await fetchPublicJson<PublicCommunityPreviewResponse>(
            input.apiOrigin,
            `/public-communities/${encodeURIComponent(communityId)}`,
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

function PrivacyRoutePage() {
  return <LegalDocumentPage source={PRIVACY_POLICY_SOURCE} />;
}

function TermsRoutePage() {
  return <LegalDocumentPage source={TERMS_OF_SERVICE_SOURCE} />;
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

    ctx.effectiveUrl = effectiveUrl;
    ctx.appOrigin = discovery.appOrigin;
    ctx.canonicalUrl = discovery.canonicalUrl;
    ctx.locale = locale;
    ctx.dir = resolveLocaleDirection(locale);
    ctx.isIndexable = discovery.isIndexable;
    const seoMetadata = shouldResolveSeoMetadata(request)
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
          url: buildOpenGraphUrl(discovery.canonicalUrl, locale, hasLocaleOverride),
        }
      : null;
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
    route("/privacy", PrivacyRoutePage),
    route("/terms", TermsRoutePage),
    route("/", AppRoutePage),
    route("/popular", AppRoutePage),
    route("/advertise", AppRoutePage),
    route("/your-communities", AppRoutePage),
    route("/communities/new", AppRoutePage),
    route("/submit", AppRoutePage),
    route("/c/:communityId/submit", AppRoutePage),
    route("/c/:communityId/mod", AppRoutePage),
    ...COMMUNITY_MODERATION_SECTIONS.map((section) =>
      route(`/c/:communityId/mod/${section}`, AppRoutePage)
    ),
    route("/c/:communityId", AppRoutePage),
    route("/p/:postId", AppRoutePage),
    route("/inbox", AppRoutePage),
    route("/chat", AppRoutePage),
    route("/chat/new", AppRoutePage),
    route("/chat/c/:conversationId", AppRoutePage),
    route("/chat/to/:target", AppRoutePage),
    route("/me", AppRoutePage),
    route("/wallet", AppRoutePage),
    route("/settings", AppRoutePage),
    route("/settings/wallet", AppRoutePage),
    ...SETTINGS_SECTIONS.map((section) =>
      route(`/settings/${section}`, AppRoutePage)
    ),
    route("/u/:handleLabel", AppRoutePage),
    route("/a/:handleLabel", AppRoutePage),
    route("/onboarding", AppRoutePage),
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
