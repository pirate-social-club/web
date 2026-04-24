"use client";

import * as React from "react";
import type { AppRoute } from "@/app/router";
import { navigate } from "@/app/router";
import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import { toast } from "@/components/primitives/sonner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import type { ShellMessages } from "@/locales";

import { activeMobileNav, resolveCreatePostPath, resolveMobileBackPath } from "./sidebar-sections";
import { resolveSessionAvatarFallback, resolveSessionHeaderHandle } from "./session-avatar";

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
    && route.kind !== "community-moderation"
    && route.kind !== "community-moderation-index"
    && route.kind !== "public-profile"
    && route.kind !== "public-agent";
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
    case "inbox":
      return copy.mobileFooter.inboxLabel;
    case "wallet":
      return copy.mobileFooter.walletLabel;
    case "me":
      return resolveSessionHeaderHandle(session, copy.mobileFooter.profileLabel);
    case "public-profile":
    case "public-agent":
      return route.handleLabel;
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
  hasUnread,
}: {
  copy: ShellMessages;
  route: AppRoute;
  hasUnread: boolean;
}) {
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const clientReady = useClientHydrated();
  const avatarFallback = resolveSessionAvatarFallback(session, copy.appHeader.defaultAvatarFallback);
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;
  const showConnectAction = clientReady && !session;
  const createPostPath = resolveCreatePostPath(route);
  const mobileBackPath = resolveMobileBackPath(route);
  const disableCreateAction = !clientReady;
  const isPublicProfileRoute = route.kind === "public-profile" || route.kind === "public-agent";
  const useAppSidebarTrigger = route.kind !== "community-moderation" && route.kind !== "community-moderation-index" && !isPublicProfileRoute;
  const mobileTrailingContent = isPublicProfileRoute || (clientReady && session && routeUsesMobileFooter(route))
    ? <div className="h-11 w-11" aria-hidden="true" />
    : undefined;
  const mobileHeaderTitle = resolveMobileHeaderTitle({ copy, route, session });

  return (
    <AppHeader
      avatarFallback={avatarFallback}
      disableCreateAction={disableCreateAction}
      hideMobileBrand
      labels={{
        backAriaLabel: copy.appHeader.backAriaLabel,
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
      onCreateClick={createPostPath ? () => navigate(createPostPath) : undefined}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onConnectClick={() => connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onSearchClick={() => showSearchUnavailable(copy.appHeader.searchUnavailableToast)}
      onWalletClick={() => session ? navigate("/wallet") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      showCreateAction={clientReady && !!session}
      showNotificationsAction={clientReady && !!session}
      showNotificationsDot={hasUnread}
      showConnectAction={showConnectAction}
      showProfileAction={clientReady}
      showWalletAction={clientReady && !!session}
      useSidebarTrigger={useAppSidebarTrigger}
      userAvatarSrc={avatarSrc}
    />
  );
}

export function AppShellMobileNav({
  copy,
  route,
  hasUnread,
}: {
  copy: ShellMessages;
  route: AppRoute;
  hasUnread: boolean;
}) {
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const clientReady = useClientHydrated();
  const avatarFallback = resolveSessionAvatarFallback(session, copy.appHeader.defaultAvatarFallback);
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;
  const createPostPath = resolveCreatePostPath(route);
  const disableCreateAction = !clientReady;

  return (
    <MobileFooterNav
      activeItem={activeMobileNav(route)}
      avatarFallback={avatarFallback}
      disableCreateAction={disableCreateAction}
      labels={{
        create: copy.mobileFooter.createLabel,
        home: copy.mobileFooter.homeLabel,
        inbox: copy.mobileFooter.inboxLabel,
        inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
        primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
        profile: copy.mobileFooter.profileLabel,
        profileAriaLabel: copy.mobileFooter.profileAriaLabel,
        wallet: copy.mobileFooter.walletLabel,
        walletAriaLabel: copy.mobileFooter.walletAriaLabel,
      }}
      onCreateClick={createPostPath ? () => navigate(createPostPath) : undefined}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      onWalletClick={() => session ? navigate("/wallet") : connect ? connect() : showConnectUnavailable(copy.appHeader.connectUnavailableToast)}
      showInboxDot={hasUnread}
      userAvatarSrc={avatarSrc}
    />
  );
}
