import * as React from "react";

import {
  COMMUNITY_MODERATION_SECTIONS,
  SETTINGS_SECTIONS,
  type CommunityModerationSectionName,
  type SettingsSection,
} from "@/app/route-definitions";

export type AppRoute =
  | { kind: "home"; path: "/" }
  | { kind: "public-profile"; path: string; handleLabel: string; hostSuffix?: string | null }
  | { kind: "your-communities"; path: "/your-communities" }
  | { kind: "settings"; path: string; section: SettingsSection }
  | { kind: "create-post"; path: string; communityId: string }
  | { kind: "create-post-global"; path: "/submit" }
  | { kind: "community-moderation-index"; path: string; communityId: string }
  | { kind: "community-moderation"; path: string; communityId: string; section: CommunityModerationSectionName }
  | { kind: "community"; path: string; communityId: string }
  | { kind: "create-community"; path: "/communities/new" }
  | { kind: "post"; path: string; postId: string }
  | { kind: "inbox"; path: "/inbox" }
  | { kind: "me"; path: "/me" }
  | { kind: "onboarding"; path: "/onboarding" }
  | { kind: "not-found"; path: string };

const NAVIGATION_EVENT = "pirate:navigate";
const HOME_ROUTE: AppRoute = { kind: "home", path: "/" };
const RESERVED_PUBLIC_PROFILE_HOSTS = new Set([
  "www",
  "api",
  "api-staging",
  "spaces",
  "app",
  "admin",
  "assets",
  "static",
  "cdn",
  "dev",
  "staging",
]);
const PUBLIC_PROFILE_HOST_SUFFIXES = ["pirate", "localhost"];

let cachedPathname = "/";
let cachedHostname = "";
let cachedRoute: AppRoute = HOME_ROUTE;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function extractPublicProfileHost(
  hostname: string,
): { handleLabel: string; hostSuffix: string } | null {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/u, "");
  if (!normalizedHostname || normalizedHostname === "localhost") {
    return null;
  }

  for (const hostSuffix of PUBLIC_PROFILE_HOST_SUFFIXES) {
    if (!normalizedHostname.endsWith(`.${hostSuffix}`)) {
      continue;
    }

    const subdomain = normalizedHostname.slice(0, -(hostSuffix.length + 1));
    if (!subdomain || subdomain.includes(".") || RESERVED_PUBLIC_PROFILE_HOSTS.has(subdomain)) {
      return null;
    }

    return {
      handleLabel: subdomain,
      hostSuffix,
    };
  }

  return null;
}

export function matchRoute(pathname: string, hostname?: string): AppRoute {
  const normalized = normalizePathname(pathname);
  const publicProfileHost = hostname ? extractPublicProfileHost(hostname) : null;

  if (publicProfileHost) {
    return {
      kind: "public-profile",
      path: normalized,
      handleLabel: publicProfileHost.handleLabel,
      hostSuffix: publicProfileHost.hostSuffix,
    };
  }

  if (normalized === "/") {
    return { kind: "home", path: "/" };
  }

  if (normalized === "/your-communities") {
    return { kind: "your-communities", path: normalized };
  }

  if (normalized === "/settings") {
    return { kind: "settings", path: normalized, section: "profile" };
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

  if (normalized === "/onboarding") {
    return { kind: "onboarding", path: normalized };
  }

  if (normalized === "/submit") {
    return { kind: "create-post-global", path: normalized };
  }

  const segments = normalized.split("/").filter(Boolean);

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

  if (segments.length === 2 && segments[0] === "u") {
    return {
      kind: "public-profile",
      path: normalized,
      handleLabel: decodeURIComponent(segments[1]),
      hostSuffix: null,
    };
  }

  return { kind: "not-found", path: normalized };
}

function getCurrentRoute(): AppRoute {
  const pathname = normalizePathname(window.location.pathname);
  const hostname = window.location.hostname.toLowerCase();

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
  const nextPath = normalizePathname(path);
  const currentPath = normalizePathname(window.location.pathname);

  if (currentPath === nextPath) return;

  window.history.pushState({}, "", nextPath);
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useRoute(initialPathname?: string, initialHostname?: string): AppRoute {
  const initialRoute = React.useMemo(() => {
    if (typeof window !== "undefined") {
      cachedPathname = normalizePathname(window.location.pathname);
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
