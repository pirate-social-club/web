"use client";

import * as React from "react";
import type { AppRoute } from "@/app/router";
import { navigate } from "@/app/router";
import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app/app-shell-chrome/mobile-footer-nav";
import { IconButton } from "@/components/primitives/icon-button";
import { toast } from "@/components/primitives/sonner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import type { ShellMessages } from "@/locales";

import { Plus } from "@phosphor-icons/react";
import { activeMobileNav, resolveCreatePostPath, resolveMobileBackPath } from "./sidebar-sections";
import { resolveSessionAvatarFallback, resolveSessionHeaderHandle } from "./session-avatar";
import { useChatLauncher } from "./use-chat-launcher";

function showSearchUnavailable(message: string) {
  toast.info(message);
}

function showConnectUnavailable(message: string) {
  toast.info(message);
}

function routeUsesMobileFooter(route: AppRoute): boolean {
  return route.kind !== "post"
    && route.kind !== "create-post"
    && route.kind !== "create-post-global"
    && route.kind !== "create-community"
    && route.kind !== "settings-index"
    && route.kind !== "settings"
    && route.kind !== "community-moderation"
    && route.kind !== "community-moderation-index"
    && route.kind !== "public-profile"
    && route.kind !== "public-agent"
    && route.kind !== "chat-target"
    && route.kind !== "chat-conversation"
    && route.kind !== "chat-new";
}

function routeUsesMobileCreateAction(route: AppRoute): boolean {
  return route.kind === "home"
    || route.kind === "popular";
}

function resolveMobileHeaderTitle({
  copy,
  route,
  session,
}: {
  copy: ShellMessages;
  route: AppRoute;
  session: ReturnType<typeof useSession>;
}): string | null {
  switch (route.kind) {
    case "home":
      return "Pirate";
    case "popular":
      return copy.appSidebar.feedSortBestLabel;
    case "inbox":
      return copy.mobileFooter.inboxLabel;
    case "chat":
    case "chat-new":
    case "chat-conversation":
    case "chat-target":
      return copy.mobileFooter.chatLabel;
    case "wallet":
      return copy.mobileFooter.walletLabel;
    case "me":
      return resolveSessionHeaderHandle(session, copy.mobileFooter.profileLabel);
    case "public-profile":
    case "public-agent":
      return route.handleLabel;
    case "settings-index":
    case "settings":
      return "Settings";
    default:
      return null;
  }
}

function navigateBack(fallbackPath: string): void {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallbackPath);
}

export function AppShellHeader({
  copy,
  route,
  unreadChatCount = 0,
  unreadNotificationCount,
}: {
  copy: ShellMessages;
  route: AppRoute;
  unreadChatCount?: number;
  unreadNotificationCount: number;
}) {
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const clientReady = useClientHydrated();
  const chatLauncher = useChatLauncher();
  const avatarFallback = resolveSessionAvatarFallback(session, copy.appHeader.defaultAvatarFallback);
  const avatarSeed = session?.profile?.user_id;
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;
  const showConnectAction = clientReady && !session;
  const createPostPath = resolveCreatePostPath(route);
  const mobileBackPath = resolveMobileBackPath(route);
  const disableCreateAction = !clientReady;
  const isPublicProfileRoute = route.kind === "public-profile" || route.kind === "public-agent";
  const showMobileCreateAction = clientReady && !!session && routeUsesMobileCreateAction(route);
  const useAppSidebarTrigger = !mobileBackPath
    && route.kind !== "community-moderation"
    && route.kind !== "community-moderation-index"
    && !isPublicProfileRoute;
  const mobileHeaderAction = route.kind === "chat" ? (
    <IconButton aria-label="New message" onClick={() => navigate("/chat/new")} variant="ghost">
      <Plus className="size-6" weight="bold" />
    </IconButton>
  ) : undefined;
  const mobileTrailingContent = mobileHeaderAction ?? (route.kind === "community" || isPublicProfileRoute || (clientReady && session && routeUsesMobileFooter(route) && !showMobileCreateAction)
    ? <div className="h-11 w-11" aria-hidden="true" />
    : undefined);
  const mobileHeaderTitle = resolveMobileHeaderTitle({ copy, route, session });
  const isChatRoute = route.kind === "chat"
    || route.kind === "chat-new"
    || route.kind === "chat-conversation"
    || route.kind === "chat-target";
  const handleChatClick = React.useCallback(() => {
    if (!isChatRoute) {
      chatLauncher.toggleList();
      return;
    }

    navigate("/chat");
  }, [chatLauncher, isChatRoute]);

  return (
    <AppHeader
      avatarFallback={avatarFallback}
      disableCreateAction={disableCreateAction}
      hideMobileBrand
      labels={{
        backAriaLabel: copy.appHeader.backAriaLabel,
        chatAriaLabel: copy.mobileFooter.chatAriaLabel,
        connectLabel: copy.appHeader.connectLabel,
        createLabel: copy.appHeader.createLabel,
        homeAriaLabel: copy.appHeader.homeAriaLabel,
        notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
        openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
        profileAriaLabel: copy.appHeader.profileAriaLabel,
        searchAriaLabel: copy.appHeader.searchAriaLabel,
        searchPlaceholder: copy.appHeader.searchPlaceholder,
        walletAriaLabel: copy.appHeader.walletAriaLabel,
      }}
      mobileCenterContent={mobileHeaderTitle ? (
        <Type as="div" variant="h4" className="max-w-full truncate text-center">
          {mobileHeaderTitle}
        </Type>
      ) : undefined}
      mobileTrailingContent={mobileTrailingContent}
      onBackClick={mobileBackPath ? () => navigate(mobileBackPath) : isPublicProfileRoute ? () => navigateBack("/") : undefined}
      onChatClick={handleChatClick}
      onCreateClick={createPostPath ? () => navigate(createPostPath) : undefined}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onConnectClick={() => connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onSearchClick={() => showSearchUnavailable(copy.appHeader.searchUnavailableToast)}
      onWalletClick={() => navigate("/wallet")}
      showCreateAction={clientReady && !!session}
      showChatAction={clientReady && !!session}
      showMobileCreateAction={showMobileCreateAction}
      showNotificationsAction={clientReady && !!session}
      unreadChatCount={unreadChatCount}
      unreadNotificationsCount={unreadNotificationCount}
      showConnectAction={showConnectAction}
      showProfileAction={clientReady}
      showWalletAction={clientReady && !!session}
      useSidebarTrigger={useAppSidebarTrigger}
      userAvatarSeed={avatarSeed}
      userAvatarSrc={avatarSrc}
    />
  );
}

export function AppShellMobileNav({
  copy,
  route,
  unreadChatCount = 0,
  unreadNotificationCount,
}: {
  copy: ShellMessages;
  route: AppRoute;
  unreadChatCount?: number;
  unreadNotificationCount: number;
}) {
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const clientReady = useClientHydrated();
  const avatarFallback = resolveSessionAvatarFallback(session, copy.appHeader.defaultAvatarFallback);
  const avatarSeed = session?.profile?.user_id;
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;

  return (
    <MobileFooterNav
      activeItem={activeMobileNav(route)}
      avatarFallback={avatarFallback}
      labels={{
        chat: copy.mobileFooter.chatLabel,
        chatAriaLabel: copy.mobileFooter.chatAriaLabel,
        home: copy.mobileFooter.homeLabel,
        inbox: copy.mobileFooter.inboxLabel,
        inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
        primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
        profile: copy.mobileFooter.profileLabel,
        profileAriaLabel: copy.mobileFooter.profileAriaLabel,
        wallet: copy.mobileFooter.walletLabel,
        walletAriaLabel: copy.mobileFooter.walletAriaLabel,
      }}
      onChatClick={() => navigate("/chat")}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onWalletClick={() => navigate("/wallet")}
      unreadChatCount={unreadChatCount}
      unreadInboxCount={unreadNotificationCount}
      userAvatarSeed={avatarSeed}
      userAvatarSrc={avatarSrc}
    />
  );
}
