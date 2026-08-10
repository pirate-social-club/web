import { replaceRoute } from "@/app/router";
import { buildCanonicalCommunityRoutePathname } from "@/lib/community-routing";

export function replaceWithCanonicalCommunityRoute(
  communityId: string,
  routeSlug?: string | null,
  surface?: "threads" | "videos",
): void {
  if (typeof window === "undefined") return;

  const nextPathname = buildCanonicalCommunityRoutePathname(
    window.location.pathname,
    communityId,
    routeSlug,
  );
  if (!nextPathname) return;

  const surfacePathname = surface && !nextPathname.endsWith(`/${surface}`)
    ? `${nextPathname}/${surface}`
    : nextPathname;
  replaceRoute(`${surfacePathname}${window.location.search}${window.location.hash}`);
}
