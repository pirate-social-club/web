import { matchRoute } from "@/app/router";

import type { DiscoveryContext } from "./types";
import {
  absoluteUrl,
  applyDiscoveryHeaders,
  escapeHtml,
  getDiscoveryContext,
  textResponse,
} from "./shared";

function buildApiDocsMarkdown(ctx: DiscoveryContext): string {
  return `# Pirate API

Canonical docs URL: ${absoluteUrl(ctx.appOrigin, "/docs/api")}

## Discovery

- API catalog: ${absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog")}
- OpenAPI: ${absoluteUrl(ctx.appOrigin, "/openapi.json")}
- Health: ${ctx.apiOrigin}/health
- Sitemap: ${absoluteUrl(ctx.appOrigin, "/sitemap.xml")}

## Base URL

\`${ctx.apiOrigin}\`

## Core endpoints

- \`GET /health\`
- \`POST /auth/session/exchange\`
- \`GET /feed/home\`
- \`GET /public-communities/{communityId}\`
- \`GET /public-communities/{communityId}/posts\`
- \`GET /public-posts/{postId}\`
- \`GET /public-profiles/{handleLabel}\`

## Notes

- HTML stays the default response for browsers.
- Send \`Accept: text/markdown\` to get markdown from Pirate HTML pages.
- Public discovery metadata lives under \`/.well-known/\`.
`;
}

function buildHtmlPage(title: string, canonicalUrl: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="color-scheme" content="dark" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #121212;
        --panel: #181818;
        --text: #f3f3f3;
        --muted: #a5a5a5;
        --accent: #ff7a18;
        --border: #292929;
      }
      body {
        margin: 0;
        font: 16px/1.6 ui-sans-serif, system-ui, sans-serif;
        background: radial-gradient(circle at top, rgba(255, 122, 24, 0.12), transparent 32%), var(--bg);
        color: var(--text);
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      section {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 24px;
      }
      h1, h2 { margin: 0 0 16px; }
      h2 { font-size: 20px; margin-top: 24px; }
      p, li { margin: 0 0 12px; }
      a { color: var(--accent); }
      code {
        font: 0.95em ui-monospace, SFMono-Regular, monospace;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        padding: 0.15em 0.35em;
      }
      ul { padding-inline-start: 20px; }
    </style>
  </head>
  <body>
    <main>
      <section>${body}</section>
    </main>
  </body>
</html>`;
}

export function buildApiDocsResponse(input: URL | string, markdownRequested: boolean): Response {
  const ctx = getDiscoveryContext(input);
  const markdown = buildApiDocsMarkdown(ctx);

  if (markdownRequested) {
    return buildMarkdownResponse(markdown, ctx);
  }

  const html = buildHtmlPage(
    "Pirate API",
    ctx.canonicalUrl,
    `<h1>Pirate API</h1>
<p>Discovery-first API docs for Pirate's public surface.</p>
<h2>Discovery</h2>
<ul>
  <li><a href="${escapeHtml(absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog"))}">API catalog</a></li>
  <li><a href="${escapeHtml(absoluteUrl(ctx.appOrigin, "/openapi.json"))}">OpenAPI</a></li>
  <li><a href="${escapeHtml(`${ctx.apiOrigin}/health`)}">Health</a></li>
</ul>
<h2>Base URL</h2>
<p><code>${escapeHtml(ctx.apiOrigin)}</code></p>
<h2>Core endpoints</h2>
<ul>
  <li><code>GET /health</code></li>
  <li><code>POST /auth/session/exchange</code></li>
  <li><code>GET /feed/home</code></li>
  <li><code>GET /public-communities/{communityId}</code></li>
  <li><code>GET /public-communities/{communityId}/posts</code></li>
  <li><code>GET /public-posts/{postId}</code></li>
  <li><code>GET /public-profiles/{handleLabel}</code></li>
</ul>`,
  );

  const response = textResponse(html, "text/html");
  applyDiscoveryHeaders(response.headers, ctx);
  return response;
}

function estimateMarkdownTokens(markdown: string): string {
  const words = markdown.trim().split(/\s+/u).filter(Boolean).length;
  return String(words);
}

export function buildMarkdownResponse(markdown: string, ctx: DiscoveryContext, status = 200): Response {
  const response = new Response(markdown, {
    status,
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": estimateMarkdownTokens(markdown),
    },
  });
  applyDiscoveryHeaders(response.headers, ctx);
  return response;
}

export function markdownRequested(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return /(^|,)\s*text\/markdown(?:\s*;|,|$)/iu.test(accept) || accept.includes("text/markdown");
}

export function buildMarkdownForPage(input: URL | string): string {
  const ctx = getDiscoveryContext(input);
  const route = matchRoute(ctx.pathname, new URL(typeof input === "string" ? input : input.toString()).hostname);

  switch (ctx.pathname) {
    case "/":
      return `# Pirate

Canonical URL: ${ctx.canonicalUrl}

Pirate is a community-native social app with public community pages, public posts, public profiles, and authenticated creation and moderation flows.

## Useful resources

- API catalog: ${absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog")}
- API docs: ${absoluteUrl(ctx.appOrigin, "/docs/api")}
- OpenAPI: ${absoluteUrl(ctx.appOrigin, "/openapi.json")}
- Sitemap: ${absoluteUrl(ctx.appOrigin, "/sitemap.xml")}
- Agent skills: ${absoluteUrl(ctx.appOrigin, "/.well-known/agent-skills/index.json")}
`;
    case "/docs/api":
      return buildApiDocsMarkdown(ctx);
    default:
      if (route.kind === "community") {
        return `# Pirate Community

Canonical URL: ${ctx.canonicalUrl}

This is Pirate's public community page for \`${route.communityId}\`.

## Related resources

- Community API: ${ctx.apiOrigin}/public-communities/${encodeURIComponent(route.communityId)}
- Community posts API: ${ctx.apiOrigin}/public-communities/${encodeURIComponent(route.communityId)}/posts
`;
      }

      if (route.kind === "post") {
        return `# Pirate Post

Canonical URL: ${ctx.canonicalUrl}

This is Pirate's public post page for \`${route.postId}\`.

## Related resources

- Public post API: ${ctx.apiOrigin}/public-posts/${encodeURIComponent(route.postId)}
`;
      }

      if (route.kind === "public-profile") {
        return `# Pirate Profile

Canonical URL: ${ctx.canonicalUrl}

This is Pirate's public profile page for \`${route.handleLabel}\`.

## Related resources

- Public profile API: ${ctx.apiOrigin}/public-profiles/${encodeURIComponent(route.handleLabel)}
`;
      }

      if (route.kind === "public-agent") {
        return `# Pirate Agent

Canonical URL: ${ctx.canonicalUrl}

This is Pirate's public agent page for \`${route.handleLabel}\`.

## Related resources

- Public agent API: ${ctx.apiOrigin}/public-agents/${encodeURIComponent(route.handleLabel)}
`;
      }

      return `# Pirate

Canonical URL: ${ctx.canonicalUrl}

Pirate returned this page in markdown because the request preferred \`text/markdown\`.
`;
  }
}
