"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { PostPage } from "@/app/authenticated-routes";
import { PublicAgentRoutePage } from "@/app/public-agent-route";
import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { PublicProfileRoutePage } from "@/app/public-profile-route";
import { CommunityLandingRoutePage } from "@/app/community-landing-route";
import { VideoHomePage } from "@/app/authenticated-routes/video-home-route";

function renderPublicRoute(
  route: Extract<AppRoute, { kind: "public-profile" | "public-agent" | "community-landing" | "community-videos" | "community" | "post" }>,
): React.ReactNode {
  switch (route.kind) {
    case "community-landing":
      return <CommunityLandingRoutePage communityId={route.communityId} />;
    case "community-videos":
      return <VideoHomePage communityId={route.communityId} importedRootHostname={route.importedRootHostname} />;
    case "community":
      return <PublicCommunityRoutePage communityId={route.communityId} importedRootHostname={route.importedRootHostname} isImportedRoot={route.isImportedRoot} />;
    case "post":
      return <PostPage postId={route.postId} />;
    case "public-profile":
      return (
        <PublicProfileRoutePage
          handleLabel={route.handleLabel}
          hostSuffix={route.hostSuffix}
          key={route.path}
        />
      );
    case "public-agent":
      return (
        <PublicAgentRoutePage
          appOrigin={route.hostSuffix == null
            ? typeof window !== "undefined"
              ? `${window.location.protocol}//${window.location.host}`
              : "https://pirate.sc"
            : route.hostSuffix === "localhost"
              ? typeof window !== "undefined"
                ? `${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ""}`
                : "http://localhost:5173"
              : "https://pirate.sc"}
          handleLabel={route.handleLabel}
        />
      );
  }
}

export function PublicRouteRenderer({
  route,
}: {
  route: Extract<AppRoute, { kind: "public-profile" | "public-agent" | "community-landing" | "community-videos" | "community" | "post" }>;
}) {
  return <>{renderPublicRoute(route)}</>;
}
