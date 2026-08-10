import type { AppRoute } from "@/app/router";

export function getRoutePostId(route: AppRoute): string | null {
  return "postId" in route ? route.postId : null;
}

export function isPostOutsideSovereignScope(
  route: AppRoute,
  postCommunityId: string,
): boolean {
  return Boolean(
    route.sovereignCommunityId
    && postCommunityId !== route.sovereignCommunityId,
  );
}

export function mustFailClosedOnSovereignScopeError(route: AppRoute): boolean {
  return Boolean(route.sovereignCommunityId && getRoutePostId(route));
}
