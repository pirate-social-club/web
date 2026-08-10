"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { AppRoute } from "@/app/router";
import { FullPageSpinner, NotFoundRouteState, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";
import { getRoutePostId, isPostOutsideSovereignScope } from "@/app/sovereign-route-scope";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";

export function SovereignRouteBoundary({
  children,
  route,
}: {
  children: React.ReactNode;
  route: AppRoute;
}) {
  const api = useApi();
  const postId = getRoutePostId(route);
  const expectedCommunityId = route.sovereignCommunityId ?? null;
  const scopeQuery = useQuery({
    enabled: Boolean(expectedCommunityId && postId),
    queryKey: ["sovereign-post-scope", expectedCommunityId, postId],
    queryFn: async () => {
      if (!postId || !expectedCommunityId) {
        return false;
      }
      const response = await api.publicPosts.get(postId);
      return !isPostOutsideSovereignScope(route, response.post.community);
    },
    retry: false,
    staleTime: 60_000,
  });

  if (!expectedCommunityId || !postId) {
    return <>{children}</>;
  }
  if (scopeQuery.isPending) {
    return <FullPageSpinner />;
  }
  if (scopeQuery.error) {
    if (isApiNotFoundError(scopeQuery.error)) {
      return <NotFoundRouteState path={route.path} />;
    }
    return (
      <RouteLoadFailureState
        description="The post scope could not be verified."
        title="Unable to load this post"
      />
    );
  }
  if (!scopeQuery.data) {
    return <NotFoundRouteState path={route.path} />;
  }

  return <>{children}</>;
}
