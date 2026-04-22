export function buildCommunityPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return `/c/${encodeCommunityRouteSegment(routeSlug || communityId)}`;
}

function encodeCommunityRouteSegment(value: string): string {
  return encodeURIComponent(value).replace(/^%40/u, "@");
}
