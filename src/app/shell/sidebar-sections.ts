import {
  Code,
  FileCode,
  Fire,
  Flag,
  GitBranch,
  GithubLogo,
  Globe,
  House,
  Megaphone,
  Newspaper,
  Plus,
  Robot,
  Scroll,
  Shield,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";

import type { AppRoute } from "@/app/router";
import { navigate } from "@/app/router";
import {
  buildCommunityModerationIndexPath,
  buildDefaultCommunityModerationPath,
} from "@/app/authenticated-helpers/moderation-helpers";
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
  blog: Newspaper,
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

function formatCommunitySidebarLabel(
  communityId: string,
  routeSlug?: string | null,
): string {
  const trimmedSlug = routeSlug?.trim();
  if (trimmedSlug) {
    const normalizedSlug = trimmedSlug.toLowerCase().startsWith("c/")
      ? trimmedSlug.slice(2)
      : trimmedSlug;
    return formatCommunityRouteLabel(communityId, normalizedSlug);
  }

  const trimmedId = communityId.trim();
  if (!trimmedId) return "c/unknown";
  if (trimmedId.length <= 14) return `c/${trimmedId}`;
  return `c/${trimmedId.slice(0, 7)}...${trimmedId.slice(-4)}`;
}

export function buildSidebarSections(
  messages: ShellMessages["appSidebar"],
  recentCommunities: SidebarCommunitySummary[],
  moderatedCommunities: SidebarCommunitySummary[],
): AppSidebarSection[] {
  const getSectionLabel = (sectionId: string, fallback: string) =>
    messages.sections.find((section) => section.id === sectionId)?.label ?? fallback;
  const sections: AppSidebarSection[] = [];

  if (recentCommunities.length > 0) {
    sections.push({
      id: "recent",
      label: getSectionLabel("recent", "Recent"),
      defaultOpen: true,
      items: recentCommunities.map((community) => ({
        avatarSrc: community.avatarSrc,
        id: `c/${community.communityId}`,
        label: formatCommunitySidebarLabel(community.communityId, community.routeSlug),
        onSelect: () => navigate(buildCommunityPath(community.communityId, community.routeSlug)),
      })),
    });
  }

  if (moderatedCommunities.length > 0) {
    sections.push({
      id: "moderation",
      label: getSectionLabel("moderation", "Moderation"),
      defaultOpen: true,
      items: moderatedCommunities.map((community) => ({
        avatarSrc: community.avatarSrc,
        id: `moderation/${community.communityId}`,
        label: formatCommunitySidebarLabel(community.communityId, community.routeSlug),
        onSelect: () => navigate(buildDefaultCommunityModerationPath(community.communityId, community.routeSlug)),
      })),
    });
  }

  return sections;
}

export function buildPrimaryItems(messages: ShellMessages["appSidebar"]): AppSidebarPrimaryItem[] {
  return [
    {
      id: "home",
      icon: House,
      label: messages.homeLabel,
      onSelect: () => navigate("/"),
    },
    {
      id: "popular",
      icon: Fire,
      label: messages.feedSortBestLabel,
      onSelect: () => navigate("/popular"),
    },
    {
      id: "your-communities",
      icon: Flag,
      label: messages.yourCommunitiesLabel,
      onSelect: () => navigate("/your-communities"),
    },
    {
      id: "agents",
      icon: Robot,
      label: messages.agentsLabel,
      onSelect: () => navigate("/settings/agents"),
    },
    {
      id: "create-community",
      icon: Plus,
      label: messages.createCommunityLabel,
      onSelect: () => navigate("/communities/new"),
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
    case "wallet":
      return undefined;
    case "your-communities":
      return "your-communities";
    case "settings-index":
      return undefined;
    case "settings":
      return route.section === "agents" ? "agents" : undefined;
    case "community":
    case "create-post":
      return `c/${route.communityId}`;
    case "create-post-global":
      return undefined;
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
