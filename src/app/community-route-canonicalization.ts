import { replaceRoute } from "@/app/router";
import { buildCanonicalCommunityRoutePathname } from "@/lib/community-routing";

export function replaceWithCanonicalCommunityRoute(communityId: string, routeSlug?: string | null): void {
  if (typeof window === "undefined") return;

  const nextPathname = buildCanonicalCommunityRoutePathname(
    window.location.pathname,
    communityId,
    routeSlug,
  );
  if (!nextPathname) return;

  replaceRoute(`${nextPathname}${window.location.search}${window.location.hash}`);
}
