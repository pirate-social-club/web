"use client";

import * as React from "react";

import { replaceRoute } from "@/app/router";
import { PublicRouteLoadingState, PublicRouteMessageState } from "@/app/public-route-states";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { usePublicCommunityQuery } from "@/lib/query/public-community-query";

export function CommunityLandingRoutePage({ communityId }: { communityId: string }) {
  const locale = useRouteContentLocale();
  const community = usePublicCommunityQuery(communityId, locale);

  React.useEffect(() => {
    if (!community.data || typeof window === "undefined") return;
    const routeSegment = community.data.route_slug || community.data.id;
    const surface = community.data.default_surface === "videos" ? "videos" : "threads";
    replaceRoute(
      `/c/${encodeURIComponent(routeSegment)}/${surface}${window.location.search}${window.location.hash}`,
    );
  }, [community.data]);

  if (community.isError) {
    return (
      <PublicRouteMessageState
        description="This community could not be loaded."
        title="Community unavailable"
      />
    );
  }
  return <PublicRouteLoadingState />;
}
