import { matchRoute } from "@/app/router";

type FeedCommunity = {
  community_id?: string;
  route_slug?: string | null;
  updated_at?: string | null;
};

type FeedPost = {
  post_id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type LocalizedPostLike = {
  post?: FeedPost | null;
};

type HomeFeedItemLike = {
  community?: FeedCommunity | null;
  post?: LocalizedPostLike | null;
};

type HomeFeedResponseLike = {
  items?: HomeFeedItemLike[];
  top_communities?: FeedCommunity[];
  next_cursor?: string | null;
};

type AgentSkillDefinition = {
  description: string;
  markdown: string;
  name: string;
};

type WebMcpToolCard = {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
};

export type DiscoveryContext = {
  apiOrigin: string;
  appOrigin: string;
  canonicalUrl: string;
  isIndexable: boolean;
  pathname: string;
  routeKind: ReturnType<typeof matchRoute>["kind"] | "api-docs";
};

const INDEXED_STATIC_PATHS = ["/", "/docs/api", "/privacy", "/terms"] as const;
const MAX_SITEMAP_FEED_PAGES = 3;
const MAX_SITEMAP_FEED_ITEMS = 150;
const WEB_MCP_TOOLS: WebMcpToolCard[] = [
  {
    name: "open_home_feed",
    description: "Open Pirate's home feed.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "open_community",
    description: "Open a Pirate community page by route slug or community ID.",
    inputSchema: {
      type: "object",
      properties: {
        communityId: { type: "string", description: "Community route slug or community ID." },
      },
      required: ["communityId"],
    },
  },
  {
    name: "open_post",
    description: "Open a Pirate post by post ID.",
    inputSchema: {
      type: "object",
      properties: {
        postId: { type: "string", description: "Pirate post ID." },
      },
      required: ["postId"],
    },
  },
  {
    name: "open_profile",
    description: "Open a Pirate public profile by handle label.",
    inputSchema: {
      type: "object",
      properties: {
        handleLabel: { type: "string", description: "Pirate handle label." },
      },
      required: ["handleLabel"],
    },
  },
  {
    name: "read_home_feed",
    description: "Read structured items from Pirate's public home feed without DOM scraping.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20 },
        sort: { type: "string", enum: ["best", "new", "top"] },
      },
    },
  },
];
const AGENT_SKILLS: AgentSkillDefinition[] = [
  {
    name: "api-catalog",
    description: "Discover Pirate's public API catalog, OpenAPI description, docs, and health endpoints.",
    markdown: `---
name: api-catalog
description: Discover Pirate's public API catalog, OpenAPI description, docs, and health endpoints.
---

# Pirate API Catalog

Use this skill when you need the authoritative discovery entrypoint for Pirate's public API.

## Workflow

1. Fetch \`/.well-known/api-catalog\`.
2. Read the \`service-desc\` link for the OpenAPI description.
3. Read the \`service-doc\` link for human-oriented API docs.
4. Use the \`status\` link to verify API health before deeper calls.
`,
  },
  {
    name: "link-headers",
    description: "Use HTTP Link headers on Pirate HTML responses to discover API and documentation resources.",
    markdown: `---
name: link-headers
description: Use HTTP Link headers on Pirate HTML responses to discover API and documentation resources.
---

# Pirate Link Headers

Use this skill when you already have an HTML response from Pirate and want to discover machine-readable resources without scraping the DOM.

## Workflow

1. Inspect the response \`Link\` headers.
2. Follow \`rel="api-catalog"\` to Pirate's API catalog.
3. Follow \`rel="service-desc"\` for OpenAPI.
4. Follow \`rel="service-doc"\` for API documentation.
`,
  },
  {
    name: "markdown-negotiation",
    description: "Request Pirate pages as markdown by sending Accept: text/markdown.",
    markdown: `---
name: markdown-negotiation
description: Request Pirate pages as markdown by sending Accept: text/markdown.
---

# Pirate Markdown Negotiation

Use this skill when you want a token-efficient markdown representation of a Pirate page.

## Workflow

1. Send \`Accept: text/markdown\` with the page request.
2. Expect \`Content-Type: text/markdown; charset=utf-8\`.
3. Read the optional \`x-markdown-tokens\` header for a lightweight size estimate.
4. Treat HTML as the default response when markdown is not requested.
`,
  },
  {
    name: "sitemap",
    description: "Use Pirate's sitemap to discover canonical homepage, community, post, and API-doc URLs.",
    markdown: `---
name: sitemap
description: Use Pirate's sitemap to discover canonical homepage, community, post, and API-doc URLs.
---

# Pirate Sitemap

Use this skill when you need canonical Pirate URLs instead of inferred or duplicate paths.

## Workflow

1. Fetch \`/sitemap.xml\`.
2. Prefer URLs listed there over alternate hostnames or querystring variants.
3. Use \`/robots.txt\` to confirm the sitemap location.
4. Re-fetch the sitemap when you need newly published public content.
`,
  },
  {
    name: "webmcp",
    description: "Prefer Pirate's WebMCP tools for structured browser actions when the page exposes them.",
    markdown: `---
name: webmcp
description: Prefer Pirate's WebMCP tools for structured browser actions when the page exposes them.
---

# Pirate WebMCP

Use this skill when browsing Pirate in a WebMCP-capable browser.

## Workflow

1. Check for WebMCP tools on page load.
2. Prefer WebMCP tools over raw DOM clicking when a suitable tool exists.
3. Use the navigation tools to open Pirate feeds, communities, posts, or profiles.
4. Use the feed inspection tool to read public home-feed items in structured form.
`,
  },
];

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

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export function applyDiscoveryHeaders(headers: Headers, ctx: DiscoveryContext): void {
  headers.append("Link", `<${ctx.canonicalUrl}>; rel="canonical"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog")}>; rel="api-catalog"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/openapi.json")}>; rel="service-desc"; type="application/vnd.oai.openapi+json"`);
  headers.append("Link", `<${absoluteUrl(ctx.appOrigin, "/docs/api")}>; rel="service-doc"; type="text/html"`);
  headers.append("Vary", "Accept");

  if (!ctx.isIndexable) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value: string): string {
  return escapeXml(value);
}

function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}

function textResponse(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": `${contentType}; charset=utf-8`,
    },
  });
}

function jsonResponse(body: unknown, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=600",
      "content-type": `${contentType}; charset=utf-8`,
    },
  });
}

async function fetchPublicHomeFeed(ctx: DiscoveryContext): Promise<HomeFeedResponseLike | null> {
  const entries: HomeFeedItemLike[] = [];
  const communities = new Map<string, FeedCommunity>();
  let nextCursor: string | null = null;

  for (let pageIndex = 0; pageIndex < MAX_SITEMAP_FEED_PAGES; pageIndex += 1) {
    const endpoint = new URL("/feed/home", ctx.apiOrigin);
    endpoint.searchParams.set("sort", "new");
    endpoint.searchParams.set("limit", "50");
    if (nextCursor) {
      endpoint.searchParams.set("cursor", nextCursor);
    }

    const response = await fetch(endpoint.toString(), {
      headers: { accept: "application/json" },
    }).catch(() => null);
    if (!response?.ok) {
      return entries.length > 0
        ? { items: entries, top_communities: [...communities.values()], next_cursor: nextCursor }
        : null;
    }

    const payload = await response.json() as HomeFeedResponseLike;
    for (const item of payload.items ?? []) {
      entries.push(item);
      if (item.community?.community_id) {
        communities.set(item.community.community_id, item.community);
      }
      if (entries.length >= MAX_SITEMAP_FEED_ITEMS) {
        return {
          items: entries,
          top_communities: [...communities.values()],
          next_cursor: payload.next_cursor ?? null,
        };
      }
    }

    for (const community of payload.top_communities ?? []) {
      if (community.community_id) {
        communities.set(community.community_id, community);
      }
    }

    nextCursor = payload.next_cursor ?? null;
    if (!nextCursor) {
      return {
        items: entries,
        top_communities: [...communities.values()],
        next_cursor: null,
      };
    }
  }

  return { items: entries, top_communities: [...communities.values()], next_cursor: nextCursor };
}

export async function buildSitemapResponse(input: URL | string): Promise<Response> {
  const ctx = getDiscoveryContext(input);
  const urlSet = new Map<string, string | null>();

  urlSet.set(absoluteUrl(ctx.appOrigin, "/"), new Date().toISOString());
  urlSet.set(absoluteUrl(ctx.appOrigin, "/docs/api"), new Date().toISOString());

  const homeFeed = await fetchPublicHomeFeed(ctx);
  for (const community of homeFeed?.top_communities ?? []) {
    if (!community.community_id) continue;
    urlSet.set(
      absoluteUrl(ctx.appOrigin, buildCommunityPath(community.community_id, community.route_slug)),
      normalizeTimestamp(community.updated_at),
    );
  }

  for (const item of homeFeed?.items ?? []) {
    const community = item.community;
    const post = item.post?.post;

    if (community?.community_id) {
      urlSet.set(
        absoluteUrl(ctx.appOrigin, buildCommunityPath(community.community_id, community.route_slug)),
        normalizeTimestamp(community.updated_at),
      );
    }

    if (post?.post_id) {
      urlSet.set(
        absoluteUrl(ctx.appOrigin, `/p/${encodeURIComponent(post.post_id)}`),
        normalizeTimestamp(post.updated_at ?? post.created_at),
      );
    }
  }

  const entries = [...urlSet.entries()]
    .map(([loc, lastmod]) => `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n  </url>`)
    .join("\n");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
}

export function buildRobotsResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);
  return textResponse(`User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(ctx.appOrigin, "/sitemap.xml")}\n`, "text/plain");
}

export function buildOpenApiDocument(input: URL | string): Record<string, unknown> {
  const ctx = getDiscoveryContext(input);

  return {
    openapi: "3.1.0",
    info: {
      title: "Pirate API Discovery Surface",
      version: "2026-04-19",
      description: "Public discovery document for Pirate's current public and session bootstrap API surface.",
    },
    servers: [
      {
        url: ctx.apiOrigin,
        description: ctx.apiOrigin.includes("staging") ? "Staging API" : "Primary API",
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          operationId: "health",
          responses: {
            "200": {
              description: "Service health",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                    },
                    required: ["ok"],
                  },
                },
              },
            },
          },
        },
      },
      "/auth/session/exchange": {
        post: {
          summary: "Exchange an upstream proof for a Pirate session token",
          operationId: "sessionExchange",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    proof: { type: "object" },
                  },
                  required: ["proof"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Session created or resumed",
            },
          },
        },
      },
      "/feed/home": {
        get: {
          summary: "Read the public home feed",
          operationId: "homeFeed",
          parameters: [
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["best", "new", "top"] } },
          ],
          responses: {
            "200": { description: "Public home feed items" },
          },
        },
      },
      "/public-communities/{communityId}": {
        get: {
          summary: "Read a public community preview",
          operationId: "publicCommunity",
          parameters: [
            { name: "communityId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Community preview" },
          },
        },
      },
      "/public-communities/{communityId}/posts": {
        get: {
          summary: "List public posts for a community",
          operationId: "publicCommunityPosts",
          parameters: [
            { name: "communityId", in: "path", required: true, schema: { type: "string" } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "sort", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public community feed" },
          },
        },
      },
      "/public-posts/{postId}": {
        get: {
          summary: "Read a public post",
          operationId: "publicPost",
          parameters: [
            { name: "postId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public post" },
          },
        },
      },
      "/public-profiles/{handleLabel}": {
        get: {
          summary: "Read a public profile",
          operationId: "publicProfile",
          parameters: [
            { name: "handleLabel", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Public profile" },
          },
        },
      },
    },
  };
}

export function buildOpenApiResponse(input: URL | string): Response {
  return jsonResponse(buildOpenApiDocument(input), "application/vnd.oai.openapi+json");
}

export function buildApiCatalogResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    linkset: [
      {
        anchor: `${ctx.apiOrigin}/`,
        "service-desc": [
          {
            href: absoluteUrl(ctx.appOrigin, "/openapi.json"),
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          {
            href: absoluteUrl(ctx.appOrigin, "/docs/api"),
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${ctx.apiOrigin}/health`,
            type: "application/json",
          },
        ],
      },
    ],
  }, "application/linkset+json");
}

export function buildMcpServerCardResponse(input: URL | string): Response {
  const ctx = getDiscoveryContext(input);

  return jsonResponse({
    serverInfo: {
      name: "Pirate WebMCP",
      version: "2026-04-23",
    },
    transport: {
      type: "webmcp",
      endpoint: ctx.appOrigin,
    },
    capabilities: {
      tools: {
        listChanged: false,
        available: WEB_MCP_TOOLS,
      },
      resources: {
        listChanged: false,
        available: [
          {
            name: "Pirate API catalog",
            uri: absoluteUrl(ctx.appOrigin, "/.well-known/api-catalog"),
            mimeType: "application/linkset+json",
          },
          {
            name: "Pirate OpenAPI description",
            uri: absoluteUrl(ctx.appOrigin, "/openapi.json"),
            mimeType: "application/vnd.oai.openapi+json",
          },
        ],
      },
      prompts: {
        listChanged: false,
        available: [],
      },
    },
  });
}

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

async function digestFor(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", payload);
  const hex = [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

function findAgentSkill(name: string): AgentSkillDefinition | null {
  return AGENT_SKILLS.find((skill) => skill.name === name) ?? null;
}

export async function buildAgentSkillsIndexResponse(input: URL | string): Promise<Response> {
  const skills = await Promise.all(AGENT_SKILLS.map(async (skill) => ({
    name: skill.name,
    type: "skill-md",
    description: skill.description,
    url: `/.well-known/agent-skills/${skill.name}/SKILL.md`,
    digest: await digestFor(skill.markdown),
  })));

  return jsonResponse({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills,
  });
}

export function buildAgentSkillResponse(skillName: string): Response {
  const skill = findAgentSkill(skillName);
  if (!skill) {
    return new Response("Not found", { status: 404 });
  }

  return textResponse(skill.markdown, "text/markdown");
}
