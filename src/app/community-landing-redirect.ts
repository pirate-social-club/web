import type { CommunityPreview } from "@pirate/api-contracts";

export function communityLandingPath(preview: CommunityPreview): string {
  const routeSegment = preview.route_slug || preview.id;
  return `/c/${encodeURIComponent(routeSegment)}/threads`;
}

export function communityLandingRedirectResponse(input: {
  effectiveUrl: string;
  preview: CommunityPreview;
  sovereignPresentation: boolean;
}): Response {
  const redirectUrl = new URL(input.effectiveUrl);
  redirectUrl.pathname = communityLandingPath(input.preview);
  const cacheable = !input.sovereignPresentation && redirectUrl.search.length === 0;
  return new Response(null, {
    headers: {
      "cache-control": cacheable ? "public, max-age=0, must-revalidate" : "no-store",
      "cdn-cache-control": cacheable ? "public, max-age=600, stale-while-revalidate=3600" : "no-store",
      ...(cacheable ? { "cache-tag": `community:${input.preview.id}` } : {}),
      location: redirectUrl.toString(),
    },
    status: 302,
  });
}
