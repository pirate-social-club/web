"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { toCommunityFeedItem, toHomeFeedItem, type HomeFeedEntry } from "./authenticated-routes/post-presentation";
import { applyPostVote } from "./authenticated-routes/post-vote";
import { buildSongListingRequest, buildSongPostRequest, resolveComposerSubmitState } from "./authenticated-routes/song-submit";
import { createThreadCommentNode, mergeThreadCommentNodes, type ThreadCommentNode } from "./authenticated-routes/thread-state";

function lazyRouteModule<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return React.lazy(async () => ({
    default: (await loader())[exportName] as React.ComponentType<any>,
  }));
}

const LazyHomePage = lazyRouteModule(() => import("./authenticated-routes/home-routes"), "HomePage");
const LazyYourCommunitiesPage = lazyRouteModule(
  () => import("./authenticated-routes/home-routes"),
  "YourCommunitiesPage",
);
const LazyCreatePostPage = lazyRouteModule(
  () => import("./authenticated-routes/create-post-route"),
  "CreatePostPage",
);
const LazyCreatePostGlobalPage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "CreatePostGlobalPage",
);
const LazyCommunityModerationPage = lazyRouteModule(
  () => import("./authenticated-routes/moderation-route"),
  "CommunityModerationPage",
);
const LazyCommunityModerationIndexPage = lazyRouteModule(
  () => import("./authenticated-routes/moderation-route"),
  "CommunityModerationIndexPage",
);
const LazyCommunityPage = lazyRouteModule(
  () => import("./authenticated-routes/community-route"),
  "CommunityPage",
);
const LazyCreateCommunityPage = lazyRouteModule(
  () => import("./authenticated-routes/create-community-route"),
  "CreateCommunityPage",
);
const LazyPostPage = lazyRouteModule(() => import("./authenticated-routes/post-route"), "PostPage");
const LazyInboxPlaceholderPage = lazyRouteModule(
  () => import("./authenticated-routes/inbox-route"),
  "InboxPlaceholderPage",
);
const LazyCurrentUserProfilePage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserProfilePage",
);
const LazyCurrentUserSettingsPage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserSettingsPage",
);
const LazyOnboardingPage = lazyRouteModule(
  () => import("./authenticated-routes/onboarding-route"),
  "OnboardingPage",
);
const LazyNotFoundPage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "NotFoundPage",
);

export {
  applyPostVote,
  buildSongListingRequest,
  buildSongPostRequest,
  createThreadCommentNode,
  mergeThreadCommentNodes,
  resolveComposerSubmitState,
  toCommunityFeedItem,
  toHomeFeedItem,
};

export type { HomeFeedEntry, ThreadCommentNode };

export function renderAuthenticatedRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <LazyHomePage />;
    case "your-communities":
      return <LazyYourCommunitiesPage />;
    case "create-post-global":
      return (
        <LazyCreatePostGlobalPage
          renderCreatePost={(communityId: string) => <LazyCreatePostPage communityId={communityId} />}
        />
      );
    case "create-post":
      return <LazyCreatePostPage communityId={route.communityId} />;
    case "community-moderation-index":
      return <LazyCommunityModerationIndexPage communityId={route.communityId} />;
    case "community-moderation":
      return <LazyCommunityModerationPage communityId={route.communityId} section={route.section} />;
    case "community":
      return <LazyCommunityPage communityId={route.communityId} />;
    case "create-community":
      return <LazyCreateCommunityPage />;
    case "post":
      return <LazyPostPage postId={route.postId} />;
    case "inbox":
      return <LazyInboxPlaceholderPage />;
    case "me":
      return <LazyCurrentUserProfilePage />;
    case "settings":
      return <LazyCurrentUserSettingsPage activeTab={route.section} />;
    case "onboarding":
      return <LazyOnboardingPage />;
    case "not-found":
      return <LazyNotFoundPage path={route.path} />;
    case "public-profile":
    case "public-agent":
      return null;
  }
}

export function AuthenticatedRouteRenderer({ route }: { route: AppRoute }) {
  return <>{renderAuthenticatedRoute(route)}</>;
}
