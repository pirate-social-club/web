"use client";

import type { ReactNode } from "react";

import type { AppRoute } from "@/app/router";
import {
  applyPostVote,
  buildSongListingRequest,
  buildSongPostRequest,
  CommunityModerationPage,
  CommunityPage,
  createThreadCommentNode,
  CreateCommunityPage,
  CreatePostGlobalPage,
  CreatePostPage,
  CurrentUserProfilePage,
  CurrentUserSettingsPage,
  HomePage,
  InboxPlaceholderPage,
  mergeThreadCommentNodes,
  NotFoundPage,
  OnboardingPage,
  PostPage,
  resolveComposerSubmitState,
  toCommunityFeedItem,
  toHomeFeedItem,
  YourCommunitiesPage,
} from "./authenticated-routes";
import type {
  HomeFeedEntry,
  ThreadCommentNode,
} from "./authenticated-routes";

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

export function renderAuthenticatedRoute(route: AppRoute): ReactNode {
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "your-communities":
      return <YourCommunitiesPage />;
    case "create-post-global":
      return <CreatePostGlobalPage renderCreatePost={(communityId) => <CreatePostPage communityId={communityId} />} />;
    case "create-post":
      return <CreatePostPage communityId={route.communityId} />;
    case "community-moderation":
      return <CommunityModerationPage communityId={route.communityId} section={route.section} />;
    case "community":
      return <CommunityPage communityId={route.communityId} />;
    case "create-community":
      return <CreateCommunityPage />;
    case "post":
      return <PostPage postId={route.postId} />;
    case "inbox":
      return <InboxPlaceholderPage />;
    case "me":
      return <CurrentUserProfilePage />;
    case "settings":
      return <CurrentUserSettingsPage activeTab={route.section} />;
    case "onboarding":
      return <OnboardingPage />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
    case "public-profile":
      return null;
  }
}

export function AuthenticatedRouteRenderer({ route }: { route: AppRoute }) {
  return <>{renderAuthenticatedRoute(route)}</>;
}
