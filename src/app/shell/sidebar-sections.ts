import {
  Bell,
  ChatCircle,
  Code,
  Compass,
  FileCode,
  Flag,
  GitBranch,
  GithubLogo,
  Globe,
  House,
  Megaphone,
  Newspaper,
  Plus,
  Scroll,
  Shield,
  Television,
  Trash,
  UploadSimple,
  User,
  Wallet,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";

import type { AppRoute } from "@/app/router";
import { navigateOrReload } from "@/app/router";
import {
  buildCommunityModerationEntryPath,
  buildCommunityModerationIndexPath,
} from "@/app/authenticated-helpers/moderation-paths";
import type {
  AppSidebarPrimaryItem,
  AppSidebarSection,
} from "@/components/compositions/app/app-sidebar/app-sidebar";
import type { MobileFooterNav } from "@/components/compositions/app/app-shell-chrome/mobile-footer-nav";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { ADVERTISING_ROUTE_PATH } from "@/lib/advertising";
import type { SidebarCommunitySummary } from "@/lib/owned-communities";
import { prefersNativeRadicleLinks, resolveResourceHref } from "@/lib/resource-links";
import type { ResourceLinkId } from "@/lib/resource-links";
import type { ShellMessages } from "@/locales";

const resourceIcons = {
  advertise: Megaphone,
  "account-deletion": Trash,
  blog: Newspaper,
  "child-safety": Flag,
  "privacy-policy": Shield,
  "source-freedom-browser": Globe,
  "source-github": GithubLogo,
  "source-radicle-api": Code,
  "source-radicle-contracts": FileCode,
  "source-radicle-web": GitBranch,
  "terms-of-service": Scroll,
} satisfies Record<ResourceLinkId, typeof House>;

export function resolveCreatePostPath(route: AppRoute): string | null {
  if (route.kind === "community") {
    const routeSegment = route.path.replace(/^\/c\//u, "").replace(/\/+$/u, "");
    return `${buildCommunityPath(route.communityId, routeSegment)}/submit`;
  }

  if (route.kind === "create-post") {
    return route.path;
  }

  if (route.kind === "create-post-global") {
    return route.path;
  }

  return "/submit";
}

export function resolveMobileBackPath(route: AppRoute): string | null {
  if (route.kind === "community") {
    return "/";
  }

  if (route.kind === "community-moderation") {
    return buildCommunityModerationIndexPath(route.communityId);
  }

  if (route.kind === "community-moderation-index") {
    return buildCommunityPath(route.communityId);
  }

  if (route.kind === "advertise") {
    return "/";
  }

  return null;
}

export function usesStandaloneRouteShell(route: AppRoute, isMobileLayout: boolean): boolean {
  // Community moderation renders its own shell (including its sidebar) on every
  // viewport. Keeping it standalone prevents the app sidebar from rendering
  // alongside the moderation sidebar.
  if (route.kind === "community-moderation" || route.kind === "community-moderation-index") {
    return true;
  }

  if (
    route.kind === "live-room"
    || route.kind === "post-karaoke"
    || route.kind === "post-karaoke-leaderboard"
    || route.kind === "post-study"
    || route.kind === "post-streaks"
  ) {
    return true;
  }

  return isMobileLayout && (
    route.kind === "post"
    || route.kind === "create-post"
    || route.kind === "create-post-global"
    || route.kind === "create-community"
    || route.kind === "onboarding"
    || route.kind === "settings-index"
    || route.kind === "settings"
    || route.kind === "chat-target"
    || route.kind === "chat-conversation"
    || route.kind === "chat-new"
  );
}

function formatCommunitySidebarLabel(
  communityId?: string | null,
  routeSlug?: string | null,
  displayName?: string | null,
): string {
  const trimmedSlug = routeSlug?.trim();
  if (trimmedSlug) {
    const normalizedSlug = trimmedSlug.toLowerCase().startsWith("c/")
      ? trimmedSlug.slice(2)
      : trimmedSlug;
    return formatCommunityRouteLabel(communityId?.trim() || "unknown", normalizedSlug);
  }

  const trimmedId = communityId?.trim() ?? "";
  // Unverified communities have no slug; show the display name when it is a
  // real name rather than the ID fallback set by owned-communities. A name that
  // starts with "c/" is skipped: rendered bare it would impersonate a community
  // route, and without a slug there is no such route to reach.
  const trimmedName = displayName?.trim() ?? "";
  if (trimmedName && trimmedName !== trimmedId && !trimmedName.toLowerCase().startsWith("c/")) {
    return trimmedName;
  }

  if (!trimmedId) return "c/unknown";
  if (trimmedId.length <= 14) return `c/${trimmedId}`;
  return `c/${trimmedId.slice(0, 7)}...${trimmedId.slice(-4)}`;
}

function hasCommunityId(
  community: SidebarCommunitySummary,
): community is SidebarCommunitySummary & { communityId: string } {
  return typeof community.communityId === "string" && community.communityId.trim().length > 0;
}

/**
 * Recent communities are unbounded upstream: useSidebarCommunities merges every
 * community the viewer has visited with every one they created, and the sidebar
 * body scrolls. Rendering all of them pushes the Communities section — and every
 * section below it — out of the viewport for anyone in many communities, so the
 * spine shows a bounded window and defers the full list to /your-communities.
 */
export const MAX_SIDEBAR_RECENT_COMMUNITIES = 6;

export function buildSidebarSections(
  messages: ShellMessages["appSidebar"],
  recentCommunities: SidebarCommunitySummary[],
  moderatedCommunities: SidebarCommunitySummary[],
  isMobileWeb: boolean,
): AppSidebarSection[] {
  const getSectionLabel = (sectionId: string, fallback: string) =>
    messages.sections.find((section) => section.id === sectionId)?.label ?? fallback;
  const sections: AppSidebarSection[] = [];

  if (recentCommunities.length > 0) {
    const validRecentCommunities = recentCommunities
      .filter(hasCommunityId)
      .slice(0, MAX_SIDEBAR_RECENT_COMMUNITIES);
    if (validRecentCommunities.length > 0) {
      sections.push({
        id: "recent",
        label: getSectionLabel("recent", "Recent"),
        defaultOpen: true,
        items: validRecentCommunities.map((community) => ({
          avatarSrc: community.avatarSrc,
          id: `c/${community.communityId}`,
          label: formatCommunitySidebarLabel(community.communityId, community.routeSlug, community.displayName),
          onSelect: () => navigateOrReload(buildCommunityPath(community.communityId, community.routeSlug)),
        })),
      });
    }
  }

  if (moderatedCommunities.length > 0) {
    const validModeratedCommunities = moderatedCommunities.filter(hasCommunityId);
    if (validModeratedCommunities.length > 0) {
      sections.push({
        id: "moderation",
        label: getSectionLabel("moderation", "Moderation"),
        defaultOpen: true,
        items: validModeratedCommunities.map((community) => ({
          avatarSrc: community.avatarSrc,
          id: `moderation/${community.communityId}`,
          label: formatCommunitySidebarLabel(community.communityId, community.routeSlug, community.displayName),
          onSelect: () => navigateOrReload(buildCommunityModerationEntryPath(community.communityId, isMobileWeb, community.routeSlug)),
        })),
      });
    }
  }

  return sections;
}

/**
 * The desktop media sidebar's section list: the recent-communities rows promoted into a
 * "Communities" section that owns the create-community action, followed by every other
 * section untouched.
 *
 * The section deliberately carries no "Your Communities" row. The header already reads
 * "Communities", and the nested-item renderer ignores `icon`, so such a row draws as bare
 * avatar-less text that reads as a duplicate subheading. `/your-communities` stays reachable
 * by URL. `emptyLabel` covers the resulting empty state: the section cannot be dropped when
 * it has no items, because its `+` is the only create-community entry point in the spine.
 */
export function buildMediaSections(
  messages: ShellMessages["appSidebar"],
  sections: AppSidebarSection[],
): AppSidebarSection[] {
  const recentSection = sections.find((section) => section.id === "recent");
  return [
    {
      action: {
        ariaLabel: messages.createCommunityLabel,
        icon: Plus,
        onSelect: () => navigateOrReload("/communities/new"),
      },
      defaultOpen: true,
      emptyLabel: messages.communitiesEmptyLabel,
      id: "communities",
      items: recentSection?.items ?? [],
      label: messages.sections.find((section) => section.id === "communities")?.label ?? "Communities",
    },
    ...sections.filter((section) => section.id !== "recent"),
  ];
}

export function buildVideoPrimaryItems(messages: ShellMessages["appSidebar"]): AppSidebarPrimaryItem[] {
  return [
    {
      id: "home",
      icon: House,
      label: messages.videoForYouLabel,
      onSelect: () => navigateOrReload("/"),
    },
    {
      id: "community-feed",
      icon: Compass,
      label: messages.videoExploreLabel,
      onSelect: () => navigateOrReload("/feed"),
    },
    {
      id: "live",
      icon: Television,
      label: messages.videoLiveLabel,
      onSelect: () => navigateOrReload("/live"),
    },
    {
      id: "chat",
      icon: ChatCircle,
      label: messages.videoChatLabel,
      onSelect: () => navigateOrReload("/chat"),
    },
    {
      id: "activity",
      icon: Bell,
      label: messages.videoActivityLabel,
      onSelect: () => navigateOrReload("/inbox"),
    },
    {
      id: "upload",
      icon: UploadSimple,
      label: messages.videoUploadLabel,
      onSelect: () => navigateOrReload("/submit"),
    },
  ];
}

/**
 * The full media spine: the six destination items with Wallet and Profile restored from the
 * retired desktop header. Wallet slots in ahead of Upload and Profile anchors the bottom,
 * below both, showing the signed-in viewer's real avatar (TikTok-style). `avatarSrc` left
 * `undefined` keeps the generic Profile icon (signed out or pre-hydration). Unread counts
 * ride the Chat and Activity items, replacing the badges the desktop header used to carry.
 */
export function buildMediaSpineItems(
  messages: ShellMessages["appSidebar"],
  account: {
    avatarFallback: string;
    avatarSeed?: string | null;
    avatarSrc?: string | null;
    onProfileSelect: () => void;
    onWalletSelect: () => void;
    profileLabel: string;
    unreadActivityCount?: number;
    unreadChatCount?: number;
    walletLabel: string;
  },
): AppSidebarPrimaryItem[] {
  const baseItems = buildVideoPrimaryItems(messages).map((item) => {
    if (item.id === "chat") return { ...item, badgeCount: account.unreadChatCount };
    if (item.id === "activity") return { ...item, badgeCount: account.unreadActivityCount };
    return item;
  });
  return [
    ...baseItems.filter((item) => item.id !== "upload"),
    {
      icon: Wallet,
      id: "wallet",
      label: account.walletLabel,
      onSelect: account.onWalletSelect,
    },
    ...baseItems.filter((item) => item.id === "upload"),
    {
      avatarFallback: account.avatarFallback,
      avatarSeed: account.avatarSeed ?? null,
      avatarSrc: account.avatarSrc,
      icon: User,
      id: "profile",
      label: account.profileLabel,
      onSelect: account.onProfileSelect,
    },
  ];
}

export function buildResourceItems(messages: ShellMessages["appSidebar"]) {
  return messages.resourceItems.map((item) => ({
    ...item,
    icon: resourceIcons[item.id as ResourceLinkId],
    onSelect: () => {
      if (item.id === "advertise") {
        navigateOrReload(ADVERTISING_ROUTE_PATH);
        return;
      }

      const href = resolveResourceHref(item.id, {
        preferNativeRadicle: prefersNativeRadicleLinks(),
      });
      if (!href || typeof window === "undefined") return;
      window.location.assign(href);
    },
  }));
}

export function buildCodeItems(messages: ShellMessages["appSidebar"]) {
  return messages.codeItems.map((item) => ({
    ...item,
    icon: resourceIcons[item.id as ResourceLinkId],
    onSelect: () => {
      const href = resolveResourceHref(item.id, {
        preferNativeRadicle: prefersNativeRadicleLinks(),
      });
      if (!href || typeof window === "undefined") return;
      window.location.assign(href);
    },
  }));
}

export function activeSidebarItem(route: AppRoute): string | undefined {
  switch (route.kind) {
    case "home":
      return "home";
    case "popular":
      // Best is a sort of the For You feed, not a separate desktop spine destination.
      return "home";
    case "community-feed":
      return "community-feed";
    case "live":
      return "live";
    case "chat":
    case "chat-new":
    case "chat-conversation":
    case "chat-target":
      return "chat";
    case "inbox":
      return "activity";
    case "wallet":
      return "wallet";
    case "me":
      return "profile";
    case "your-communities":
      return "your-communities";
    case "settings-index":
      return undefined;
    case "settings":
      if (route.section === "agents") return "agents";
      if (route.section === "domains") return "names";
      return undefined;
    case "community":
    case "create-post":
      return `c/${route.communityId}`;
    case "create-post-global":
      return "upload";
    case "create-community":
      return "create-community";
    case "advertise":
      return "advertise";
    default:
      return undefined;
  }
}

export function activeMobileNav(
  route: AppRoute,
): ComponentProps<typeof MobileFooterNav>["activeItem"] {
  if (route.kind === "inbox") return "inbox";
  if (route.kind === "chat" || route.kind === "chat-new" || route.kind === "chat-conversation" || route.kind === "chat-target") return "chat";
  if (route.kind === "wallet") return "wallet";
  if (route.kind === "me" || route.kind === "public-profile" || route.kind === "public-agent") return "profile";
  return "home";
}
