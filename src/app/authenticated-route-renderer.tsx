"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { HomePage } from "./authenticated-routes/home-routes";
import { toCommunityFeedItem, toHomeFeedItem } from "./authenticated-helpers/post-presentation";
import { applyPostVote } from "./authenticated-helpers/post-vote";
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
  return React.lazy(async () => {
    const mod = await loader();
    const component = mod[exportName];

    if (!component) {
      throw new Error(`Route module is missing export "${String(exportName)}".`);
    }

    return {
      default: component as React.ComponentType<any>,
    };
  });
}

const LazyYourCommunitiesPage = lazyRouteModule(
  () => import("./authenticated-routes/home-routes"),
  "YourCommunitiesPage",
);
const LazyVideoHomePage = lazyRouteModule(
  () => import("./authenticated-routes/video-home-route"),
  "VideoHomePage",
);
const LazyCommunityLandingRoutePage = lazyRouteModule(
  () => import("./community-landing-route"),
  "CommunityLandingRoutePage",
);
const LazyCreatePostPage = lazyRouteModule(
  () => import("./authenticated-routes/create-post-route"),
  "CreatePostPage",
);
const LazyCreatePostGlobalPage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "CreatePostGlobalPage",
);
const LazyCrosspostPage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "CrosspostPage",
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
const LazyTelegramAccountLinkRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/telegram-account-link-route"),
  "TelegramAccountLinkRoutePage",
);
const LazyPostPage = lazyRouteModule(() => import("./authenticated-routes/post-route"), "PostPage");
const LazyLiveRoomRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/live-room-route"),
  "LiveRoomRoutePage",
);
const LazyLiveIndexPage = lazyRouteModule(
  () => import("./authenticated-routes/live-index-route"),
  "LiveIndexPage",
);
const LazyReplayDraftRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/replay-draft-route"),
  "ReplayDraftRoutePage",
);
const LazyKaraokeRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/karaoke-route"),
  "KaraokeRoutePage",
);
const LazyKaraokeLeaderboardRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/karaoke-leaderboard-route"),
  "KaraokeLeaderboardRoutePage",
);
const LazyStudyRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/study-route"),
  "StudyRoutePage",
);
const LazyStreaksRoutePage = lazyRouteModule(
  () => import("./authenticated-routes/streaks-route"),
  "StreaksRoutePage",
);
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
const LazyBookingHostSettingsPage = lazyRouteModule(
  () => import("./authenticated-routes/booking-host-settings-route"),
  "BookingHostSettingsPage",
);
const LazyBookingPublicPage = lazyRouteModule(
  () => import("./authenticated-routes/booking-public-route"),
  "BookingPublicPage",
);
const LazyBookingCheckoutPage = lazyRouteModule(
  () => import("./authenticated-routes/booking-checkout-route"),
  "BookingCheckoutPage",
);
const LazyBookingManagementPage = lazyRouteModule(
  () => import("./authenticated-routes/booking-management-route"),
  "BookingManagementPage",
);
const LazyBookingSessionPage = lazyRouteModule(
  () => import("./authenticated-routes/booking-session-route"),
  "BookingSessionPage",
);
const LazyOnboardingPage = lazyRouteModule(
  () => import("./authenticated-routes/onboarding-route"),
  "OnboardingPage",
);
const LazyAuthorizeDevicePage = lazyRouteModule(
  () => import("./authenticated-routes/authorize-device-route"),
  "AuthorizeDevicePage",
);
const LazyNotFoundPage = lazyRouteModule(
  () => import("./authenticated-routes/misc-routes"),
  "NotFoundPage",
);

export {
  applyPostVote,

  buildThreadCommentTreeFromItems,

  createThreadCommentNode,
  loadThreadCommentTree,
  mergeThreadCommentNodes,

  toCommunityFeedItem,
  toHomeFeedItem,
};

export type {  ThreadCommentNode };

function renderAuthenticatedRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <LazyVideoHomePage />;
    case "community-videos":
      return <LazyVideoHomePage communityId={route.communityId} importedRootHostname={route.importedRootHostname} />;
    case "community-landing":
      return <LazyCommunityLandingRoutePage communityId={route.communityId} />;
    case "live":
      return <LazyLiveIndexPage />;
    case "community-feed":
      return <HomePage />;
    case "popular":
      return <HomePage initialSort="best" />;
    case "your-communities":
      return <LazyYourCommunitiesPage />;
    case "create-post-global":
      return (
        <LazyCreatePostGlobalPage
          renderCreatePost={(communityId: string, initialDraft: Partial<CreatePostDraftState> | undefined, onCommunityNotFound: () => void) => <LazyCreatePostPage communityId={communityId} initialDraft={initialDraft} onCommunityNotFound={onCommunityNotFound} />}
        />
      );
    case "create-post":
      return <LazyCreatePostPage communityId={route.communityId} />;
    case "community-moderation-index":
      return <LazyCommunityModerationIndexPage communityId={route.communityId} />;
    case "community-moderation":
      return <LazyCommunityModerationPage communityId={route.communityId} section={route.section} />;
    case "community":
      return (
        <LazyCommunityPage
          communityId={route.communityId}
          importedRootHostname={route.importedRootHostname}
          isImportedRoot={route.isImportedRoot}
          showSovereignOpenAppAction={route.isImportedRoot && route.path === "/"}
        />
      );
    case "create-community":
      return <LazyCreateCommunityPage />;
    case "telegram-account-link":
      return <LazyTelegramAccountLinkRoutePage />;
    case "post":
      return <LazyPostPage postId={route.postId} />;
    case "post-replay-draft":
      return <LazyReplayDraftRoutePage postId={route.postId} />;
    case "post-karaoke":
      return <LazyKaraokeRoutePage postId={route.postId} />;
    case "post-karaoke-leaderboard":
      return <LazyKaraokeLeaderboardRoutePage postId={route.postId} />;
    case "post-study":
      return <LazyStudyRoutePage postId={route.postId} />;
    case "post-streaks":
      return <LazyStreaksRoutePage postId={route.postId} />;
    case "live-room":
      return <LazyLiveRoomRoutePage postId={route.postId} />;
    case "crosspost":
      return <LazyCrosspostPage postId={route.postId} />;
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
    case "booking-host-settings":
      return <LazyBookingHostSettingsPage />;
    case "booking-public":
      return <LazyBookingPublicPage communityId={route.communityId} hostUserId={route.hostUserId} />;
    case "booking-checkout":
      return <LazyBookingCheckoutPage communityId={route.communityId} hostUserId={route.hostUserId} />;
    case "booking-management":
      return <LazyBookingManagementPage sourceCommunityId={route.sourceCommunityId} role={route.role} />;
    case "booking-session":
      return <LazyBookingSessionPage bookingId={route.bookingId} />;

    case "settings-index":
      return <LazyCurrentUserSettingsIndexPage />;
    case "settings":
      return <LazyCurrentUserSettingsPage activeTab={route.section} />;
    case "onboarding":
      return <LazyOnboardingPage />;
    case "authorize-device":
      return <LazyAuthorizeDevicePage />;
    case "not-found":
      return <LazyNotFoundPage path={route.path} />;
    case "public-profile":
    case "public-agent":
    case "telegram-mini-app":
    case "telegram-exchange":
    case "telegram-self-return":
    case "telegram-join":
    case "telegram-community":
    case "telegram-verify":
    case "telegram-post":
      return null;
  }
}

export function AuthenticatedRouteRenderer({ route }: { route: AppRoute }) {
  return <>{renderAuthenticatedRoute(route)}</>;
}
