"use client";

export type RouteStatusCopyKey =
  | "community"
  | "create-community"
  | "create-post"
  | "home"
  | "inbox"
  | "moderation"
  | "onboarding"
  | "post"
  | "profile"
  | "settings"
  | "wallet"
  | "your-communities";

const ROUTE_STATUS_COPY: Record<RouteStatusCopyKey, {
  auth: string;
  failure: string;
  incomplete: string;
  title?: string;
  strings?: Record<string, string>;
}> = {
  "community": {
    auth: "Sign in to view this community.",
    failure: "The community could not be loaded right now.",
    incomplete: "The community response was incomplete. Try loading it again.",
    title: "Community",
    strings: {
      createPost: "Create Post",
      modTools: "Mod Tools",
    },
  },
  "create-community": {
    auth: "Sign in to create a community.",
    failure: "The create community page could not be loaded right now.",
    incomplete: "The create community response was incomplete. Try loading it again.",
    strings: {
      verifyDescription: "Verify before creating a community.",
      verifyPendingDescription: "Complete your palm scan to continue.",
      verifyPendingTitle: "Finish verification",
      verifyStartDescription: "Scan your palm to prove you're human. No photos or data is saved.",
      verifyStartTitle: "Verify",
      reopenVerification: "Reopen verification",
      startVerification: "Start verification",
    },
  },
  "create-post": {
    auth: "Sign in to create a post.",
    failure: "The post composer could not be loaded right now.",
    incomplete: "The community response was incomplete. Try loading the composer again.",
    title: "Create post",
    strings: {
      backToCommunity: "Back to community",
      membershipRequiredDescription: "Only community members can publish posts here.",
      membershipRequiredTitle: "Join this community before posting",
    },
  },
  "home": {
    auth: "Sign in to view your home feed.",
    failure: "The home feed could not be loaded right now.",
    incomplete: "The home feed response was incomplete. Try loading it again.",
    strings: {
      createCommunity: "Create community",
      emptyHomeBody: "Join a community or create one to start building your home feed.",
      emptyHomeTitle: "No posts yet",
      emptyYourCommunitiesBody: "Communities you create or join show up here.",
      emptyYourCommunitiesTitle: "No communities yet",
    },
  },
  "inbox": {
    auth: "Sign in to view your inbox.",
    failure: "The inbox could not be loaded right now.",
    incomplete: "The inbox response was incomplete. Try loading it again.",
    title: "Inbox",
  },
  "moderation": {
    auth: "Sign in to access mod tools.",
    failure: "This moderation page could not be loaded right now.",
    incomplete: "The community response was incomplete.",
    title: "Moderator tools",
    strings: {
      accessRequiredDescription: "Only community moderators can open this page.",
      accessRequiredTitle: "Moderator access required",
    },
  },
  "onboarding": {
    auth: "Sign in to continue onboarding.",
    failure: "The onboarding flow could not be loaded right now.",
    incomplete: "The onboarding response was incomplete. Try loading it again.",
  },
  "post": {
    auth: "Sign in to view this post.",
    failure: "The post could not be loaded right now.",
    incomplete: "The post response was incomplete. Try loading it again.",
    title: "Post",
  },
  "profile": {
    auth: "Sign in to view your profile.",
    failure: "The profile could not be loaded right now.",
    incomplete: "The profile response was incomplete. Try loading it again.",
    title: "Profile",
  },
  "settings": {
    auth: "Sign in to access settings.",
    failure: "The settings page could not be loaded right now.",
    incomplete: "The settings response was incomplete. Try loading it again.",
    title: "Settings",
  },
  "wallet": {
    auth: "Sign in to view your wallet.",
    failure: "The wallet could not be loaded right now.",
    incomplete: "The wallet response was incomplete. Try loading it again.",
    title: "Wallet",
  },
  "your-communities": {
    auth: "Sign in to view your communities.",
    failure: "Your communities could not be loaded right now.",
    incomplete: "Your communities response was incomplete. Try loading it again.",
    title: "Your Communities",
  },
};

export function getRouteAuthDescription(key: RouteStatusCopyKey): string {
  return ROUTE_STATUS_COPY[key].auth;
}

export function getRouteFailureDescription(key: RouteStatusCopyKey): string {
  return ROUTE_STATUS_COPY[key].failure;
}

export function getRouteIncompleteDescription(key: RouteStatusCopyKey): string {
  return ROUTE_STATUS_COPY[key].incomplete;
}

export function getRouteTitle(key: RouteStatusCopyKey): string | undefined {
  return ROUTE_STATUS_COPY[key].title;
}

export function getRouteString(
  key: RouteStatusCopyKey,
  stringKey: string,
  fallback: string,
): string {
  return ROUTE_STATUS_COPY[key].strings?.[stringKey] ?? fallback;
}
