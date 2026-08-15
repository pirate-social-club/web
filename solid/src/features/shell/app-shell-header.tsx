import type { JSX } from "@solidjs/web";

import {
  AppHeader,
  IconPlus,
  IconButton,
  MobileFooterNav,
  Type,
  type FooterNavItemId,
} from "../../design-system";

/** Minimal route model for the shell chrome: the kind union the React shell
    switches on, plus the fields those branches read. The host router maps its
    routes onto this shape. */
export interface ShellRoute {
  kind:
    | "home"
    | "popular"
    | "community"
    | "community-feed"
    | "community-moderation"
    | "community-moderation-index"
    | "post"
    | "create-post"
    | "create-post-global"
    | "create-community"
    | "settings-index"
    | "settings"
    | "public-profile"
    | "public-agent"
    | "chat"
    | "chat-target"
    | "chat-conversation"
    | "chat-new"
    | "inbox"
    | "wallet"
    | "me"
    | "advertise"
    | (string & {});
  path: string;
  communityId?: string;
  handleLabel?: string;
}

export interface ShellViewer {
  id: string;
  displayName?: string | null;
  handleLabel?: string | null;
  avatarRef?: string | null;
}

/** Copy the shell header resolves titles from; all labels optional with
    English defaults so stories stay offline. */
export interface ShellHeaderTitles {
  communityFeedLabel?: string;
  feedSortBestLabel?: string;
  inboxLabel?: string;
  chatLabel?: string;
  walletLabel?: string;
  profileLabel?: string;
  settingsLabel?: string;
}

function routeUsesMobileFooter(route: ShellRoute): boolean {
  return route.kind !== "post"
    && route.kind !== "create-post"
    && route.kind !== "create-post-global"
    && route.kind !== "create-community"
    && route.kind !== "settings-index"
    && route.kind !== "settings"
    && route.kind !== "public-profile"
    && route.kind !== "public-agent"
    && route.kind !== "chat-target"
    && route.kind !== "chat-conversation"
    && route.kind !== "chat-new";
}

function routeUsesMobileCreateAction(route: ShellRoute): boolean {
  return route.kind === "home"
    || route.kind === "community-feed"
    || route.kind === "popular";
}

export function resolveCreatePostPath(route: ShellRoute): string | null {
  if (route.kind === "community") {
    const routeSegment = route.path.replace(/^\/c\//u, "").replace(/\/+$/u, "");
    return `/c/${routeSegment}/submit`;
  }
  if (route.kind === "create-post" || route.kind === "create-post-global") {
    return route.path;
  }
  return "/submit";
}

export function resolveMobileBackPath(route: ShellRoute): string | null {
  if (route.kind === "community") return "/";
  if (route.kind === "community-moderation" && route.communityId) {
    return `/c/${route.communityId}/moderation`;
  }
  if (route.kind === "community-moderation-index" && route.communityId) {
    return `/c/${route.communityId}`;
  }
  if (route.kind === "advertise") return "/";
  return null;
}

export function activeMobileNav(route: ShellRoute): FooterNavItemId {
  if (route.kind === "inbox") return "inbox";
  if (
    route.kind === "chat" ||
    route.kind === "chat-new" ||
    route.kind === "chat-conversation" ||
    route.kind === "chat-target"
  ) {
    return "chat";
  }
  if (route.kind === "wallet") return "wallet";
  if (route.kind === "me" || route.kind === "public-profile" || route.kind === "public-agent") {
    return "profile";
  }
  return "home";
}

/**
 * The media overlay drops the centre title so nothing sits on top of the
 * video that isn't a control. Every other route keeps its title.
 */
export function resolveMobileHeaderTitle(options: {
  mediaOverlay?: boolean;
  route: ShellRoute;
  titles?: ShellHeaderTitles;
  viewer?: ShellViewer | null;
}): string | null {
  const { mediaOverlay = false, route, titles, viewer } = options;
  if (mediaOverlay) return null;
  switch (route.kind) {
    case "home":
      return "Pirate";
    case "community-feed":
      return titles?.communityFeedLabel ?? "Community feed";
    case "popular":
      return titles?.feedSortBestLabel ?? "Popular";
    case "inbox":
      return titles?.inboxLabel ?? "Inbox";
    case "chat":
    case "chat-new":
    case "chat-conversation":
    case "chat-target":
      return titles?.chatLabel ?? "Chat";
    case "wallet":
      return titles?.walletLabel ?? "Wallet";
    case "me":
      return viewer?.handleLabel ?? titles?.profileLabel ?? "Profile";
    case "public-profile":
    case "public-agent":
      return route.handleLabel ?? null;
    case "settings-index":
    case "settings":
      return titles?.settingsLabel ?? "Settings";
    default:
      return null;
  }
}

export interface AppShellHeaderProps {
  isSovereignOrigin?: boolean;
  labels?: Parameters<typeof AppHeader>[0]["labels"];
  mobileMediaOverlay?: boolean;
  onChatClick?: () => void;
  onConnectClick?: () => void;
  /** Host navigation adapter; replaces the React router calls. */
  onNavigate?: (path: string) => void;
  onSearchClick?: () => void;
  route: ShellRoute;
  titles?: ShellHeaderTitles;
  unreadChatCount?: number;
  unreadNotificationCount: number;
  viewer?: ShellViewer | null;
}

/**
 * Shell header adapter: maps the current route and viewer onto the DS
 * AppHeader. All navigation and auth are callbacks.
 */
export function AppShellHeader(props: AppShellHeaderProps) {
  const navigate = (path: string) => props.onNavigate?.(path);
  const viewer = () => props.viewer ?? null;
  const signedIn = () => viewer() !== null;
  const avatarFallback = () =>
    viewer()?.displayName?.trim() || viewer()?.handleLabel?.trim() || "Pirate User";

  const createPostPath = () => resolveCreatePostPath(props.route);
  const mobileBackPath = () => resolveMobileBackPath(props.route);
  const isPublicProfileRoute = () =>
    props.route.kind === "public-profile" || props.route.kind === "public-agent";
  const showMobileCreateAction = () =>
    signedIn() && routeUsesMobileCreateAction(props.route);
  const isChatRoute = () =>
    props.route.kind === "chat" ||
    props.route.kind === "chat-new" ||
    props.route.kind === "chat-conversation" ||
    props.route.kind === "chat-target";
  const mobileHeaderTitle = () =>
    resolveMobileHeaderTitle({
      mediaOverlay: props.mobileMediaOverlay,
      route: props.route,
      titles: props.titles,
      viewer: viewer(),
    });

  const mobileHeaderAction = (): JSX.Element | undefined =>
    props.route.kind === "chat" ? (
      <IconButton
        aria-label="New message"
        onClick={() => navigate("/chat/new")}
        variant="ghost"
      >
        <IconPlus class="size-6" />
      </IconButton>
    ) : undefined;

  const mobileTrailingContent = (): JSX.Element | undefined =>
    mobileHeaderAction() ??
    (props.route.kind === "community" ||
    isPublicProfileRoute() ||
    (signedIn() && routeUsesMobileFooter(props.route) && !showMobileCreateAction()) ? (
      <div class="size-11" aria-hidden="true" />
    ) : undefined);

  return (
    <AppHeader
      avatarFallback={avatarFallback()}
      class="md:hidden"
      hideDesktopConnectAction
      hideBrand={props.isSovereignOrigin ?? false}
      hideMobileBrand
      labels={props.labels}
      mobileCenterContent={
        mobileHeaderTitle() ? (
          <Type as="div" variant="h4" class="max-w-full truncate text-center">
            {mobileHeaderTitle()}
          </Type>
        ) : undefined
      }
      mobileAppearance={props.mobileMediaOverlay ? "media-overlay" : "default"}
      mobileTrailingContent={mobileTrailingContent()}
      onBackClick={
        mobileBackPath()
          ? () => navigate(mobileBackPath()!)
          : isPublicProfileRoute()
            ? () => navigate("/")
            : undefined
      }
      onChatClick={() => {
        if (isChatRoute()) {
          navigate("/chat");
        } else {
          props.onChatClick?.();
        }
      }}
      onCreateClick={() => navigate(createPostPath()!)}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onConnectClick={() => props.onConnectClick?.()}
      onProfileClick={() => (signedIn() ? navigate("/me") : props.onConnectClick?.())}
      onSearchClick={() => props.onSearchClick?.()}
      onWalletClick={() => navigate("/wallet")}
      showCreateAction={signedIn()}
      showChatAction={signedIn()}
      showMobileCreateAction={showMobileCreateAction()}
      showNotificationsAction={signedIn()}
      unreadChatCount={props.unreadChatCount}
      unreadNotificationsCount={props.unreadNotificationCount}
      showConnectAction={!signedIn()}
      showProfileAction
      showWalletAction={signedIn()}
      useSidebarTrigger={!mobileBackPath() && !isPublicProfileRoute()}
      userAvatarSeed={viewer()?.id}
      userAvatarSrc={viewer()?.avatarRef ?? undefined}
    />
  );
}

export interface AppShellMobileNavProps {
  labels?: Parameters<typeof MobileFooterNav>[0]["labels"];
  onConnectClick?: () => void;
  onNavigate?: (path: string) => void;
  route: ShellRoute;
  unreadChatCount?: number;
  unreadNotificationCount: number;
  viewer?: ShellViewer | null;
}

export function AppShellMobileNav(props: AppShellMobileNavProps) {
  const navigate = (path: string) => props.onNavigate?.(path);
  const viewer = () => props.viewer ?? null;

  return (
    <MobileFooterNav
      activeItem={activeMobileNav(props.route)}
      avatarFallback={
        viewer()?.displayName?.trim() || viewer()?.handleLabel?.trim() || "Pirate User"
      }
      labels={props.labels}
      onChatClick={() => navigate("/chat")}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() =>
        viewer() ? navigate("/me") : props.onConnectClick?.()}
      onWalletClick={() => navigate("/wallet")}
      unreadChatCount={props.unreadChatCount}
      unreadInboxCount={props.unreadNotificationCount}
      userAvatarSeed={viewer()?.id}
      userAvatarSrc={viewer()?.avatarRef ?? undefined}
    />
  );
}
