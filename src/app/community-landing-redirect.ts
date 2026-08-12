import type { CommunityPreview } from "@pirate/api-contracts";

export function communityLandingPath(preview: CommunityPreview): string {
  const routeSegment = preview.route_slug || preview.id;
  return `/c/${encodeURIComponent(routeSegment)}/threads`;
}

export function communityLandingRedirectResponse(input: {
  effectiveUrl: string;
  preview: CommunityPreview;
}): Response {
  const redirectUrl = new URL(input.effectiveUrl);
  redirectUrl.pathname = communityLandingPath(input.preview);
  const hasQuery = redirectUrl.search.length > 0;
  return new Response(null, {
    headers: {
      "cache-control": hasQuery ? "no-store" : "public, max-age=0, must-revalidate",
      "cdn-cache-control": hasQuery ? "no-store" : "public, max-age=600, stale-while-revalidate=3600",
      ...(!hasQuery ? { "cache-tag": `community:${input.preview.id}` } : {}),
      location: redirectUrl.toString(),
    },
    status: 302,
  });
}
