import type { DiscoveryContext, HomeFeedItemLike, HomeFeedResponseLike, FeedCommunity } from "./types";
import {
  absoluteUrl,
  buildCommunityPath,
  escapeXml,
  getDiscoveryContext,
  normalizeTimestamp,
  textResponse,
  xmlResponse,
} from "./shared";

const MAX_SITEMAP_FEED_PAGES = 3;
const MAX_SITEMAP_FEED_ITEMS = 150;

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
