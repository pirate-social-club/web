export function buildCommunityPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return `/c/${encodeURIComponent(routeSlug || communityId)}`;
}
