import type { CommunityPreview } from "@pirate/api-contracts";

export function communityLandingRedirectResponse(input: {
  effectiveUrl: string;
  preview: CommunityPreview;
}): Response {
  const routeSegment = input.preview.route_slug || input.preview.id;
  const surface = input.preview.default_surface === "videos" ? "videos" : "threads";
  const redirectUrl = new URL(input.effectiveUrl);
  redirectUrl.pathname = `/c/${encodeURIComponent(routeSegment)}/${surface}`;
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
