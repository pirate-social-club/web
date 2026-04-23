import { render, route } from "rwsdk/router";
import { defineApp, type RequestInfo } from "rwsdk/worker";

import { PirateApp } from "@/app";
import type { AppContext, ThemeMode } from "@/app/app-context";
import { COMMUNITY_MODERATION_SECTIONS, SETTINGS_SECTIONS } from "@/app/route-definitions";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { Document } from "@/app/document";
import { PRIVACY_POLICY_SOURCE } from "@/legal/privacy-policy";
import { TERMS_OF_SERVICE_SOURCE } from "@/legal/terms-of-service";
import {
  applyDiscoveryHeaders,
  buildAgentSkillResponse,
  buildAgentSkillsIndexResponse,
  buildApiCatalogResponse,
  buildApiDocsResponse,
  buildMarkdownForPage,
  buildMarkdownResponse,
  buildMcpServerCardResponse,
  buildOpenApiResponse,
  buildRobotsResponse,
  buildSitemapResponse,
  getDiscoveryContext,
  markdownRequested,
} from "@/lib/agent-discovery";
import { resolveEffectiveRequestUrl } from "@/lib/hns-forwarded-origin";
import {
  resolveLocaleDirection,
  resolveRequestLocale,
} from "@/lib/ui-locale-core";
import { applyFrameDenyHeader } from "@/lib/security-headers";

type AppRequestInfo = RequestInfo<any, AppContext>;

const CSP_HEADER = "Content-Security-Policy";
const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

function buildContentSecurityPolicy(nonce: string): string {
  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://platform.x.com https://platform.twitter.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    [
      "child-src",
      "https://auth.privy.io",
      "https://verify.walletconnect.com",
      "https://verify.walletconnect.org",
    ].join(" "),
    [
      "frame-src",
      "https://auth.privy.io",
      "https://verify.walletconnect.com",
      "https://verify.walletconnect.org",
      "https://challenges.cloudflare.com",
      "https://platform.x.com",
      "https://platform.twitter.com",
      "https://syndication.twitter.com",
      "https://x.com",
      "https://twitter.com",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ].join(" "),
    [
      "connect-src",
      "'self'",
      "https://api.pirate",
      "https://api.pirate.sc",
      "https://api-staging.pirate.sc",
      "https://auth.privy.io",
      "wss://relay.walletconnect.com",
      "wss://relay.walletconnect.org",
      "wss://www.walletlink.org",
      "https://*.rpc.privy.systems",
      "https://explorer-api.walletconnect.com",
      "https://api.ethfollow.xyz",
      "https://mainnet.base.org",
      "https://sepolia.base.org",
      "https://eth.merkle.io",
      "https://11155111.rpc.thirdweb.com",
      "https://mainnet.optimism.io",
      "https://sepolia.optimism.io",
      "https://mainnet.storyrpc.io",
      "https://aeneid.storyrpc.io",
      "https://g.w.lavanet.xyz",
      "https://api.very.org",
      "https://bridge.very.org",
      "https://verify.very.org",
      "https://platform.x.com",
      "https://platform.twitter.com",
      "https://syndication.twitter.com",
      "https://x.com",
      "https://twitter.com",
    ].join(" "),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

function applyCspHeaders(headers: Headers, nonce: string): void {
  if (import.meta.env.DEV) {
    return;
  }

  applyFrameDenyHeader(headers);
  headers.set(
    import.meta.env.VITE_CSP_REPORT_ONLY === "true" ? CSP_REPORT_ONLY_HEADER : CSP_HEADER,
    buildContentSecurityPolicy(nonce),
  );
}

function parseThemeCookie(cookieHeader: string | null): ThemeMode {
  const match = cookieHeader?.match(/(?:^|;\s*)theme=(dark|light|system)(?:;|$)/);
  return (match?.[1] as ThemeMode | undefined) ?? "dark";
}

function AppRoutePage(requestInfo: AppRequestInfo) {
  const url = new URL(requestInfo.ctx.effectiveUrl ?? requestInfo.request.url);

  return (
    <PirateApp
      initialDir={requestInfo.ctx.dir}
      initialHost={url.hostname}
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

const app = defineApp<AppRequestInfo>([
  ({ ctx, request, response, rw }) => {
    const effectiveUrl = resolveEffectiveRequestUrl(request);
    const discovery = getDiscoveryContext(effectiveUrl);
    const locale = resolveRequestLocale(request.headers.get("accept-language"));

    ctx.effectiveUrl = effectiveUrl;
    ctx.appOrigin = discovery.appOrigin;
    ctx.canonicalUrl = discovery.canonicalUrl;
    ctx.locale = locale;
    ctx.dir = resolveLocaleDirection(locale);
    ctx.isIndexable = discovery.isIndexable;
    ctx.theme = parseThemeCookie(request.headers.get("cookie"));
    applyDiscoveryHeaders(response.headers, discovery);
    applyCspHeaders(response.headers, rw.nonce);
  },
  render(Document, [
    route("/robots.txt", ({ ctx, request }) => buildRobotsResponse(ctx.effectiveUrl ?? request.url)),
    route("/sitemap.xml", ({ ctx, request }) => buildSitemapResponse(ctx.effectiveUrl ?? request.url)),
    route("/openapi.json", ({ ctx, request }) => buildOpenApiResponse(ctx.effectiveUrl ?? request.url)),
    route("/docs/api", ({ ctx, request }) => buildApiDocsResponse(ctx.effectiveUrl ?? request.url, markdownRequested(request))),
    route("/.well-known/api-catalog", ({ ctx, request }) => buildApiCatalogResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/mcp/server-card.json", ({ ctx, request }) => buildMcpServerCardResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/agent-skills/index.json", ({ ctx, request }) => buildAgentSkillsIndexResponse(ctx.effectiveUrl ?? request.url)),
    route("/.well-known/agent-skills/:skillName/SKILL.md", ({ params }) => buildAgentSkillResponse(params.skillName)),
    route("/privacy", PrivacyRoutePage),
    route("/terms", TermsRoutePage),
    route("/", AppRoutePage),
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
