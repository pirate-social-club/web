import * as React from "react";

import {
  COMMUNITY_MODERATION_SECTIONS,
  SETTINGS_SECTIONS,
  type CommunityModerationSectionName,
  type SettingsSection,
} from "@/app/route-definitions";
import {
  canonicalizeCommunityRouteSegment,
  encodeCommunityRouteSegment,
} from "@/lib/community-routing";
import { extractPublicProfileHost } from "@/lib/public-host";

export type AppRoute =
  | { kind: "home"; path: "/" }
  | { kind: "popular"; path: "/popular" }
  | { kind: "public-profile"; path: string; handleLabel: string; hostSuffix?: string | null }
  | { kind: "public-agent"; path: string; handleLabel: string; hostSuffix?: string | null }
  | { kind: "your-communities"; path: "/your-communities" }
  | { kind: "wallet"; path: "/wallet" }
  | { kind: "settings-index"; path: "/settings" }
  | { kind: "settings"; path: string; section: SettingsSection }
  | { kind: "create-post"; path: string; communityId: string }
  | { kind: "create-post-global"; path: "/submit" }
  | { kind: "community-moderation-index"; path: string; communityId: string }
  | { kind: "community-moderation"; path: string; communityId: string; section: CommunityModerationSectionName }
  | { kind: "community"; path: string; communityId: string }
  | { kind: "create-community"; path: "/communities/new" }
  | { kind: "post"; path: string; postId: string }
  | { kind: "inbox"; path: "/inbox" }
  | { kind: "chat"; path: "/chat" }
  | { kind: "chat-new"; path: "/chat/new" }
  | { kind: "chat-conversation"; path: string; conversationId: string }
  | { kind: "chat-target"; path: string; target: string }
  | { kind: "advertise"; path: "/advertise" }
  | { kind: "me"; path: "/me" }
  | { kind: "onboarding"; path: "/onboarding" }
  | { kind: "not-found"; path: string };

const NAVIGATION_EVENT = "pirate:navigate";
const HOME_ROUTE: AppRoute = { kind: "home", path: "/" };
let cachedPathname = "/";
let cachedHostname = "";
let cachedRoute: AppRoute = HOME_ROUTE;

export function isNativePublicIdentityRoute(route: AppRoute): boolean {
  return (
    (route.kind === "public-profile" || route.kind === "public-agent")
    && route.hostSuffix != null
  );
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function matchRoute(pathname: string, hostname?: string): AppRoute {
  const normalized = normalizePathname(pathname);
  const publicProfileHost = hostname ? extractPublicProfileHost(hostname) : null;

  if (publicProfileHost) {
    return {
      kind: publicProfileHost.hostSuffix === "clawitzer" ? "public-agent" : "public-profile",
      path: normalized,
      handleLabel: publicProfileHost.handleLabel,
      hostSuffix: publicProfileHost.hostSuffix,
    };
  }

  if (normalized === "/") {
    return { kind: "home", path: "/" };
  }

  if (normalized === "/popular") {
    return { kind: "popular", path: "/popular" };
  }

  if (normalized === "/your-communities") {
    return { kind: "your-communities", path: normalized };
  }

  if (normalized === "/wallet") {
    return { kind: "wallet", path: normalized };
  }

  if (normalized === "/settings") {
    return { kind: "settings-index", path: normalized };
  }

  if (normalized === "/communities/new") {
    return { kind: "create-community", path: normalized };
  }

  if (normalized === "/me") {
    return { kind: "me", path: normalized };
  }

  if (normalized === "/inbox") {
    return { kind: "inbox", path: normalized };
  }

  if (normalized === "/chat") {
    return { kind: "chat", path: normalized };
  }

  if (normalized === "/chat/new") {
    return { kind: "chat-new", path: normalized };
  }

  if (normalized === "/advertise") {
    return { kind: "advertise", path: normalized };
  }

  if (normalized === "/onboarding") {
    return { kind: "onboarding", path: normalized };
  }

  if (normalized === "/submit") {
    return { kind: "create-post-global", path: normalized };
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 2 && segments[0] === "settings" && segments[1] === "wallet") {
    return { kind: "wallet", path: "/wallet" };
  }

  if (segments.length === 2 && segments[0] === "settings") {
    if (SETTINGS_SECTIONS.includes(segments[1] as SettingsSection)) {
      return {
        kind: "settings",
        path: normalized,
        section: segments[1] as SettingsSection,
      };
    }
  }

  if (segments.length === 3 && segments[0] === "c" && segments[2] === "mod") {
    return {
      kind: "community-moderation-index",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 4 && segments[0] === "c" && segments[2] === "mod") {
    if (COMMUNITY_MODERATION_SECTIONS.includes(segments[3] as CommunityModerationSectionName)) {
      return {
        kind: "community-moderation",
        path: normalized,
        communityId: decodeURIComponent(segments[1]),
        section: segments[3] as CommunityModerationSectionName,
      };
    }
  }

  if (segments.length === 3 && segments[0] === "c" && segments[2] === "submit") {
    return {
      kind: "create-post",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 2 && segments[0] === "c") {
    return {
      kind: "community",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 2 && segments[0] === "p") {
    return {
      kind: "post",
      path: normalized,
      postId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 3 && segments[0] === "chat" && segments[1] === "c") {
    return {
      kind: "chat-conversation",
      path: normalized,
      conversationId: decodeURIComponent(segments[2]),
    };
  }

  if (segments.length === 3 && segments[0] === "chat" && segments[1] === "to") {
    return {
      kind: "chat-target",
      path: normalized,
      target: decodeURIComponent(segments[2]),
    };
  }

  if (segments.length === 2 && segments[0] === "u") {
    return {
      kind: "public-profile",
      path: normalized,
      handleLabel: decodeURIComponent(segments[1]),
      hostSuffix: null,
    };
  }

  if (segments.length === 2 && segments[0] === "a") {
    return {
      kind: "public-agent",
      path: normalized,
      handleLabel: decodeURIComponent(segments[1]),
      hostSuffix: null,
    };
  }

  return { kind: "not-found", path: normalized };
}

export function canonicalizeRoutePathname(pathname: string, hostname?: string): string {
  const normalized = normalizePathname(pathname);
  const route = matchRoute(normalized, hostname);
  return getCanonicalCommunityRoutePathname(route) ?? normalized;
}

function getCanonicalCommunityRoutePathname(route: AppRoute): string | null {
  if (
    route.kind !== "community" &&
    route.kind !== "create-post" &&
    route.kind !== "community-moderation-index" &&
    route.kind !== "community-moderation"
  ) {
    return null;
  }

  const canonicalCommunityId = canonicalizeCommunityRouteSegment(route.communityId);
  if (canonicalCommunityId === route.communityId) {
    return null;
  }

  const communityPath = `/c/${encodeCommunityRouteSegment(canonicalCommunityId)}`;
  if (route.kind === "create-post") {
    return `${communityPath}/submit`;
  }
  if (route.kind === "community-moderation-index") {
    return `${communityPath}/mod`;
  }
  if (route.kind === "community-moderation") {
    return `${communityPath}/mod/${route.section}`;
  }

  return communityPath;
}

function replaceCurrentPathname(pathname: string): void {
  window.history.replaceState({}, "", `${pathname}${window.location.search}${window.location.hash}`);
}

function getCurrentRoute(): AppRoute {
  let pathname = normalizePathname(window.location.pathname);
  const hostname = window.location.hostname.toLowerCase();
  const canonicalPathname = canonicalizeRoutePathname(pathname, hostname);
  if (canonicalPathname !== pathname) {
    replaceCurrentPathname(canonicalPathname);
    pathname = canonicalPathname;
  }

  if (pathname === cachedPathname && hostname === cachedHostname) {
    return cachedRoute;
  }

  cachedPathname = pathname;
  cachedHostname = hostname;
  cachedRoute = matchRoute(pathname, hostname);

  return cachedRoute;
}

function subscribeToNavigation(onStoreChange: () => void): () => void {
  const handle = () => onStoreChange();

  window.addEventListener("popstate", handle);
  window.addEventListener(NAVIGATION_EVENT, handle);

  return () => {
    window.removeEventListener("popstate", handle);
    window.removeEventListener(NAVIGATION_EVENT, handle);
  };
}

export function navigate(path: string): void {
  const nextUrl = new URL(path, window.location.origin);
  const nextPath = normalizePathname(nextUrl.pathname);
  const nextHref = `${nextPath}${nextUrl.search}${nextUrl.hash}`;
  const currentPath = normalizePathname(window.location.pathname);
  const currentHref = `${currentPath}${window.location.search}${window.location.hash}`;

  if (currentHref === nextHref) return;

  window.history.pushState({}, "", nextHref);
  if (nextPath !== currentPath) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useRoute(initialPathname?: string, initialHostname?: string): AppRoute {
  const initialRoute = React.useMemo(() => {
    if (typeof window !== "undefined") {
      cachedPathname = canonicalizeRoutePathname(window.location.pathname, window.location.hostname);
      if (cachedPathname !== normalizePathname(window.location.pathname)) {
        replaceCurrentPathname(cachedPathname);
      }
      cachedHostname = window.location.hostname.toLowerCase();
      cachedRoute = matchRoute(cachedPathname, cachedHostname);
      return cachedRoute;
    }

    return initialPathname ? matchRoute(initialPathname, initialHostname) : HOME_ROUTE;
  }, [initialHostname, initialPathname]);

  const liveRoute = React.useSyncExternalStore(
    subscribeToNavigation,
    getCurrentRoute,
    () => initialRoute,
  );

  return liveRoute;
}
