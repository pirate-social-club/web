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
  Scroll,
  Shield,
  Television,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";

import type { AppRoute } from "@/app/router";
import { navigate } from "@/app/router";
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

export function usesHeaderlessDesktopLayout(route: AppRoute): boolean {
  return route.kind === "home"
    || route.kind === "community-feed"
    || route.kind === "live"
    || route.kind === "chat"
    || route.kind === "chat-new"
    || route.kind === "chat-conversation"
    || route.kind === "chat-target"
    || route.kind === "inbox"
    || route.kind === "create-post-global";
}

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

function formatCommunitySidebarLabel(
  communityId?: string | null,
  routeSlug?: string | null,
): string {
  const trimmedSlug = routeSlug?.trim();
  if (trimmedSlug) {
    const normalizedSlug = trimmedSlug.toLowerCase().startsWith("c/")
      ? trimmedSlug.slice(2)
      : trimmedSlug;
    return formatCommunityRouteLabel(communityId?.trim() || "unknown", normalizedSlug);
  }

  const trimmedId = communityId?.trim() ?? "";
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
 * Recent communities are unbounded upstream: they merge every community the
 * viewer has visited with every one they created. Rendering all of them pushes
 * the section's trailing actions (see-all, create) out of the scroll viewport,
 * so the sidebar shows a bounded window and defers the full list to
 * /your-communities.
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
          label: formatCommunitySidebarLabel(community.communityId, community.routeSlug),
          onSelect: () => navigate(buildCommunityPath(community.communityId, community.routeSlug)),
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
          label: formatCommunitySidebarLabel(community.communityId, community.routeSlug),
          onSelect: () => navigate(buildCommunityModerationEntryPath(community.communityId, isMobileWeb, community.routeSlug)),
        })),
      });
    }
  }

  return sections;
}

export function buildVideoPrimaryItems(messages: ShellMessages["appSidebar"]): AppSidebarPrimaryItem[] {
  return [
    {
      id: "home",
      icon: House,
      label: messages.videoForYouLabel,
      onSelect: () => navigate("/"),
    },
    {
      id: "community-feed",
      icon: Compass,
      label: messages.videoExploreLabel,
      onSelect: () => navigate("/feed"),
    },
    {
      id: "live",
      icon: Television,
      label: messages.videoLiveLabel,
      onSelect: () => navigate("/live"),
    },
    {
      id: "chat",
      icon: ChatCircle,
      label: messages.videoChatLabel,
      onSelect: () => navigate("/chat"),
    },
    {
      id: "upload",
      icon: UploadSimple,
      label: messages.videoUploadLabel,
      onSelect: () => navigate("/submit"),
    },
    {
      id: "activity",
      icon: Bell,
      label: messages.videoActivityLabel,
      onSelect: () => navigate("/inbox"),
    },
  ];
}

export function buildResourceItems(messages: ShellMessages["appSidebar"]) {
  return messages.resourceItems.map((item) => ({
    ...item,
    icon: resourceIcons[item.id as ResourceLinkId],
    onSelect: () => {
      if (item.id === "advertise") {
        navigate(ADVERTISING_ROUTE_PATH);
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
      return "popular";
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
      return undefined;
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
