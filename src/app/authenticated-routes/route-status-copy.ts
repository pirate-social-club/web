"use client";

export type RouteStatusCopyKey =
  | "community"
  | "create-community"
  | "create-post"
  | "home"
  | "moderation"
  | "onboarding"
  | "post"
  | "profile"
  | "settings";

const ROUTE_STATUS_COPY: Record<RouteStatusCopyKey, {
  auth: string;
  failure: string;
  incomplete: string;
  title?: string;
  strings?: Record<string, string>;
}> = {
  "community": {
    auth: "Reconnect to load this community again.",
    failure: "The community could not be loaded right now.",
    incomplete: "The community response was incomplete. Try loading it again.",
    title: "Community",
    strings: {
      createPost: "Create Post",
      modTools: "Mod Tools",
    },
  },
  "create-community": {
    auth: "Reconnect to create a community.",
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
    auth: "Reconnect to open the post composer again.",
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
    auth: "Reconnect to load your home feed.",
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
  "moderation": {
    auth: "Reconnect to open mod tools.",
    failure: "This moderation page could not be loaded right now.",
    incomplete: "The community response was incomplete.",
    title: "Moderator tools",
    strings: {
      accessRequiredDescription: "Only community moderators can open this page.",
      accessRequiredTitle: "Moderator access required",
    },
  },
  "onboarding": {
    auth: "Reconnect to continue onboarding.",
    failure: "The onboarding flow could not be loaded right now.",
    incomplete: "The onboarding response was incomplete. Try loading it again.",
  },
  "post": {
    auth: "Reconnect to load this post again.",
    failure: "The post could not be loaded right now.",
    incomplete: "The post response was incomplete. Try loading it again.",
    title: "Post",
  },
  "profile": {
    auth: "Reconnect to load your profile again.",
    failure: "The profile could not be loaded right now.",
    incomplete: "The profile response was incomplete. Try loading it again.",
    title: "Profile",
  },
  "settings": {
    auth: "Reconnect to load your settings again.",
    failure: "The settings page could not be loaded right now.",
    incomplete: "The settings response was incomplete. Try loading it again.",
    title: "Settings",
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
