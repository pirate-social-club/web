import * as React from "react";

export type AppRoute =
  | { kind: "home"; path: "/" }
  | { kind: "your-communities"; path: "/your-communities" }
  | { kind: "verify"; path: "/verify" }
  | { kind: "create-post"; path: "/submit" }
  | { kind: "community"; path: string; communityId: string }
  | { kind: "community-settings"; path: string; communityId: string }
  | { kind: "community-moderation"; path: string; communityId: string }
  | {
      kind: "community-moderation-case";
      path: string;
      communityId: string;
      moderationCaseId: string;
    }
  | { kind: "create-community"; path: "/communities/new" }
  | { kind: "post"; path: string; postId: string }
  | { kind: "inbox"; path: "/inbox" }
  | { kind: "me"; path: "/me" }
  | { kind: "user"; path: string; userId: string }
  | { kind: "onboarding"; path: "/onboarding" }
  | { kind: "auth"; path: "/auth" }
  | { kind: "auth-device"; path: "/auth/device" }
  | { kind: "not-found"; path: string };

const NAVIGATION_EVENT = "pirate:navigate";
const HOME_ROUTE: AppRoute = { kind: "home", path: "/" };

let cachedPathname = "/";
let cachedRoute: AppRoute = HOME_ROUTE;
let virtualPathname: string | null = null;

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function matchRoute(pathname: string): AppRoute {
  const normalized = normalizePathname(pathname);

  if (normalized === "/") {
    return { kind: "home", path: "/" };
  }

  if (normalized === "/your-communities") {
    return { kind: "your-communities", path: normalized };
  }

  if (normalized === "/verify") {
    return { kind: "verify", path: normalized };
  }

  if (normalized === "/submit") {
    return { kind: "create-post", path: normalized };
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

  if (normalized === "/auth") {
    return { kind: "auth", path: normalized };
  }

  if (normalized === "/auth/device") {
    return { kind: "auth-device", path: normalized };
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 2 && segments[0] === "c") {
    return {
      kind: "community",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 3 && segments[0] === "c" && segments[2] === "settings") {
    return {
      kind: "community-settings",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 3 && segments[0] === "c" && segments[2] === "moderation") {
    return {
      kind: "community-moderation",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length === 4 && segments[0] === "c" && segments[2] === "moderation") {
    return {
      kind: "community-moderation-case",
      path: normalized,
      communityId: decodeURIComponent(segments[1]),
      moderationCaseId: decodeURIComponent(segments[3]),
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
      kind: "user",
      path: normalized,
      userId: decodeURIComponent(segments[1]),
    };
  }

  return { kind: "not-found", path: normalized };
}

function getEffectivePathname(): string {
  return virtualPathname ?? normalizePathname(window.location.pathname);
}

function getCurrentRoute(): AppRoute {
  const pathname = getEffectivePathname();

  if (pathname === cachedPathname) {
    return cachedRoute;
  }

  cachedPathname = pathname;
  cachedRoute = pathname === "/" ? HOME_ROUTE : matchRoute(pathname);

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
  const nextPath = normalizePathname(path.split("?")[0]);

  if (virtualPathname != null) {
    virtualPathname = nextPath;
  }
  window.history.pushState({}, "", path);

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useRoute(initialPathname?: string): AppRoute {
  const initialRoute = React.useMemo(
    () => (initialPathname ? matchRoute(initialPathname) : HOME_ROUTE),
    [initialPathname],
  );

  React.useEffect(() => {
    if (initialPathname) {
      virtualPathname = normalizePathname(initialPathname);
      cachedPathname = virtualPathname;
      cachedRoute = matchRoute(virtualPathname);
    }
    return () => {
      if (initialPathname) {
        virtualPathname = null;
      }
    };
  }, [initialPathname]);

  return React.useSyncExternalStore(
    subscribeToNavigation,
    getCurrentRoute,
    () => initialRoute,
  );
}
