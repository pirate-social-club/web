"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { HomePage } from "./authenticated-routes/home-routes";
import { toCommunityFeedItem, toHomeFeedItem, type HomeFeedEntry } from "./authenticated-helpers/post-presentation";
import { applyPostVote } from "./authenticated-helpers/post-vote";
import { buildAssetListingRequest, resolveComposerSubmitState } from "./authenticated-helpers/asset-submit";
import { buildSongPostRequest } from "./authenticated-helpers/song-submit";
import {
  buildThreadCommentTreeFromItems,
  createThreadCommentNode,
  loadThreadCommentTree,
  mergeThreadCommentNodes,
  type ThreadCommentNode,
} from "./authenticated-state/thread-state";
import type { CreatePostDraftState } from "./authenticated-state/create-post-draft-state";

function lazyRouteModule<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return React.lazy(async () => ({
    default: (await loader())[exportName] as React.ComponentType<any>,
  }));
}

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
const LazyAdvertisePage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "AdvertisePage",
);
const LazyChatPage = lazyRouteModule(
  () => import("./chat/chat-route"),
  "ChatPage",
);
const LazyCurrentUserProfilePage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserProfilePage",
);
const LazyCurrentUserSettingsPage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserSettingsPage",
);
const LazyCurrentUserSettingsIndexPage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserSettingsIndexPage",
);
const LazyCurrentUserWalletPage = lazyRouteModule(
  () => import("./authenticated-routes/profile-settings-routes"),
  "CurrentUserWalletPage",
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
  buildAssetListingRequest,
  buildThreadCommentTreeFromItems,
  buildSongPostRequest,
  createThreadCommentNode,
  loadThreadCommentTree,
  mergeThreadCommentNodes,
  resolveComposerSubmitState,
  toCommunityFeedItem,
  toHomeFeedItem,
};

export type { HomeFeedEntry, ThreadCommentNode };

export function renderAuthenticatedRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "popular":
      return <HomePage initialSort="best" />;
    case "your-communities":
      return <LazyYourCommunitiesPage />;
    case "create-post-global":
      return (
        <LazyCreatePostGlobalPage
          renderCreatePost={(communityId: string, initialDraft?: Partial<CreatePostDraftState>) => <LazyCreatePostPage communityId={communityId} initialDraft={initialDraft} />}
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
    case "advertise":
      return <LazyAdvertisePage />;
    case "chat":
      return <LazyChatPage mode={{ kind: "list" }} />;
    case "chat-new":
      return <LazyChatPage mode={{ kind: "new" }} />;
    case "chat-conversation":
      return <LazyChatPage mode={{ kind: "conversation", conversationId: route.conversationId }} />;
    case "chat-target":
      return <LazyChatPage mode={{ kind: "target", target: route.target }} />;
    case "me":
      return <LazyCurrentUserProfilePage />;
    case "wallet":
      return <LazyCurrentUserWalletPage />;
    case "settings-index":
      return <LazyCurrentUserSettingsIndexPage />;
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
