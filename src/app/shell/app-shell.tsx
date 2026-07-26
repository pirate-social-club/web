"use client";

import * as React from "react";
import { Flag, Plus } from "@phosphor-icons/react";

import type { AppRoute } from "@/app/router";
import { isNativePublicIdentityRoute, navigate, navigateOrReload, useRoute } from "@/app/router";
import { AppSidebar } from "@/components/compositions/app/app-sidebar/app-sidebar";
import { Button } from "@/components/primitives/button";
import { SidebarInset, SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Toaster, toast } from "@/components/primitives/sonner";
import { ApiProvider, useSessionRevalidation } from "@/lib/api";
import { PirateQueryProvider } from "@/lib/query/query-client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useSession } from "@/lib/api/session-store";
import { PirateAuthProvider } from "@/components/auth/privy-provider";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { useAssistantUnreadCount } from "@/lib/chat/chat-assistant-client";
import { useNotificationBadges } from "@/lib/notifications/use-notification-badges";
import { useNotificationSummary } from "@/lib/notifications/use-notification-summary";
import { useSidebarCommunities } from "@/lib/owned-communities";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { resolveLocaleDirection } from "@/lib/ui-locale-core";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages, type ShellMessages } from "@/locales";

import { AppShellHeader, AppShellMobileNav } from "./app-shell-header";
import { AppSearchDialog } from "./app-search-dialog";
import { DesktopChatWidgetProvider } from "./desktop-chat-widget";
import { RootErrorBoundary } from "./root-error-boundary";
import { RouteContentFallback } from "./route-content-fallback";
import {
  activeSidebarItem,
  buildCodeItems,
  buildMediaSpineItems,
  buildResourceItems,
  buildSidebarSections,
} from "./sidebar-sections";
import { resolveSessionAvatarFallback } from "./session-avatar";
import { useShellMobileLayout } from "./use-shell-mobile-layout";

const LazyAuthenticatedRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/authenticated-route-renderer");
  return { default: mod.AuthenticatedRouteRenderer };
});

const LazyPublicRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/public-route-renderer");
  return { default: mod.PublicRouteRenderer };
});

const LazyTelegramMiniAppHomePage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppHomePage };
});

const LazyTelegramMiniAppExchangePage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppExchangePage };
});

const LazyTelegramMiniAppSelfReturnPage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppSelfReturnPage };
});

const LazyTelegramMiniAppVerifyPage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppVerifyPage };
});

const LazyTelegramMiniAppCommunityPage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppCommunityPage };
});

const LazyTelegramMiniAppPostPage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppPostPage };
});

function SessionRevalidator({ children }: { children: React.ReactNode }) {
  const { revalidate } = useSessionRevalidation();
  const session = useSession();

  React.useEffect(() => {
    if (session) {
      void revalidate();
    }
  }, [revalidate, session]);

  return <>{children}</>;
}

function AnalyticsRouteTracker({ route }: { route: AppRoute }) {
  React.useEffect(() => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : route.path;
    trackAnalyticsEvent({
      eventName: "page_viewed",
      properties: { pathname },
    });

    if (route.kind === "home" || route.kind === "community-feed" || route.kind === "popular") {
      trackAnalyticsEvent({ eventName: "home_feed_viewed" });
    } else if (route.kind === "community") {
      trackAnalyticsEvent({
        eventName: "community_viewed",
        communityId: route.communityId,
      });
    } else if (route.kind === "post") {
      trackAnalyticsEvent({
        eventName: "thread_viewed",
        postId: route.postId,
      });
    } else if (route.kind === "create-post") {
      trackAnalyticsEvent({
        eventName: "post_composer_opened",
        communityId: route.communityId,
        properties: { entrypoint: "community" },
      });
    } else if (route.kind === "create-post-global") {
      trackAnalyticsEvent({
        eventName: "post_composer_opened",
        properties: { entrypoint: "global" },
      });
    } else if (route.kind === "create-community") {
      trackAnalyticsEvent({ eventName: "community_create_started" });
    } else if (route.kind === "inbox") {
      trackAnalyticsEvent({ eventName: "notification_inbox_viewed" });
    }
  }, [route]);

  return null;
}

function NotificationShell({
  copy,
  effectiveDir,
  route,
  session,
}: {
  copy: ShellMessages;
  effectiveDir: "ltr" | "rtl";
  route: AppRoute;
  session: ReturnType<typeof useSession>;
}) {
  const isMobileLayout = useShellMobileLayout();
  const { connect } = usePiratePrivyRuntime();
  // SSR and the first hydration render see a null session even for signed-in viewers, so gating
  // the Connect CTA on the session alone flashes it for people who already have one. Wait for
  // client hydration; signed-out viewers get the button one paint later instead.
  const clientReady = useClientHydrated();
  const notificationSummary = useNotificationSummary();
  const unreadChatCount = useAssistantUnreadCount();
  const unreadNotificationCount = notificationSummary.open_task_count + notificationSummary.unread_activity_count;
  const { moderatedCommunities, recentCommunities } = useSidebarCommunities();
  const codeItems = buildCodeItems(copy.appSidebar);
  const sections = buildSidebarSections(copy.appSidebar, recentCommunities, moderatedCommunities, isMobileLayout);
  // Profile and Wallet used to live in the desktop header; with the headerless media
  // layout they belong in the sidebar spine instead. Profile anchors the bottom of the
  // spine, below Wallet and Upload, and shows the signed-in viewer's real avatar
  // (TikTok-style) once hydration confirms a session; signed-out viewers keep the
  // generic icon and get the connect flow on select. The unread badges the desktop
  // header used to carry ride the Chat and Activity spine items instead.
  const primaryItems = buildMediaSpineItems(copy.appSidebar, {
    avatarFallback: resolveSessionAvatarFallback(session, copy.appHeader.defaultAvatarFallback),
    avatarSeed: clientReady && session ? session.profile?.id ?? null : null,
    avatarSrc: clientReady && session ? session.profile?.avatar_ref ?? null : undefined,
    onProfileSelect: () => {
      if (session) {
        navigateOrReload("/me");
        return;
      }
      if (connect) {
        connect();
        return;
      }
      toast.info(copy.appHeader.connectUnavailableToast);
    },
    onWalletSelect: () => navigateOrReload("/wallet"),
    profileLabel: copy.mobileFooter.profileLabel,
    unreadActivityCount: clientReady && session ? unreadNotificationCount : 0,
    unreadChatCount: clientReady && session ? unreadChatCount : 0,
    walletLabel: copy.mobileFooter.walletLabel,
  });
  const resourceItems = buildResourceItems(copy.appSidebar);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isMobileStandaloneRoute = isMobileLayout && (
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
    || route.kind === "community-moderation"
    || route.kind === "community-moderation-index"
    );
  const isStandaloneViewerRoute = route.kind === "live-room" || route.kind === "post-karaoke" || route.kind === "post-karaoke-leaderboard" || route.kind === "post-study" || route.kind === "post-streaks";
  const isChatRoute = route.kind === "chat"
    || route.kind === "chat-target"
    || route.kind === "chat-conversation"
    || route.kind === "chat-new";
  const isCommunityModerationRoute = route.kind === "community-moderation"
    || route.kind === "community-moderation-index";
  const isPublicRoute = route.kind === "public-profile" || route.kind === "public-agent";
  const useStandaloneRouteShell = isMobileStandaloneRoute || isStandaloneViewerRoute;
  // Temporary: migrated routes own their own page shell padding.
  // Remove this once all routes are converted.
  const isMigratedRoute = route.kind === "home" || route.kind === "community-feed" || route.kind === "popular" || route.kind === "wallet";
  const recentSection = sections.find((section) => section.id === "recent");
  const mediaSections = [
    {
      action: {
        ariaLabel: copy.appSidebar.createCommunityLabel,
        icon: Plus,
        onSelect: () => navigateOrReload("/communities/new"),
      },
      defaultOpen: true,
      id: "communities",
      items: [
        {
          icon: Flag,
          id: "your-communities",
          label: copy.appSidebar.yourCommunitiesLabel,
          onSelect: () => navigateOrReload("/your-communities"),
        },
        ...(recentSection?.items ?? []),
      ],
      label: copy.appSidebar.sections.find((section) => section.id === "communities")?.label ?? "Communities",
    },
    ...sections.filter((section) => section.id !== "recent"),
  ];
  useNotificationBadges(unreadNotificationCount);

  return (
    <SidebarProvider
        className={cn(
          "flex-col",
          isChatRoute && "md:h-svh md:min-h-0 md:overflow-hidden",
        )}
        defaultOpen
        dir={effectiveDir}
        style={{
          "--sidebar-width": "15.5rem",
          "--sidebar-width-mobile": "18rem",
          "--sidebar-width-icon": "3.75rem",
        } as React.CSSProperties}
      >
        <DesktopChatWidgetProvider>
        <div
          className={cn(
            "flex min-h-0 w-full flex-1",
            isChatRoute && "md:overflow-hidden",
          )}
        >
          {useStandaloneRouteShell ? (
            <main className="flex min-h-0 w-full flex-1">
              <React.Suspense fallback={<RouteContentFallback route={route} />}>
                <LazyAuthenticatedRouteRenderer route={route} />
              </React.Suspense>
            </main>
          ) : (
            <>
              <AppSidebar
                activeItemId={activeSidebarItem(route)}
                appearance="media"
                brandLabel={copy.appSidebar.brandLabel}
                homeAriaLabel={copy.appSidebar.homeAriaLabel}
                mediaAction={clientReady && !session ? (
                  <Button
                    className="w-full"
                    onClick={() => connect ? connect() : toast.info(copy.appHeader.connectUnavailableToast)}
                  >
                    {copy.appHeader.connectLabel}
                  </Button>
                ) : undefined}
                codeItems={codeItems}
                codeLabel={copy.appSidebar.codeLabel}
                onHomeClick={() => navigateOrReload("/")}
                onNavigate={navigateOrReload}
                onSearchClick={() => setSearchOpen(true)}
                primaryItems={primaryItems}
                resourceItems={resourceItems}
                resourcesLabel={copy.appSidebar.resourcesLabel}
                searchLabel={copy.appHeader.searchPlaceholder}
                sections={mediaSections}
                side="start"
              />
              <AppSearchDialog
                onNavigate={navigate}
                onOpenChange={setSearchOpen}
                open={searchOpen}
              />
              <SidebarInset className="min-h-0">
                <AppShellHeader
                  copy={copy}
                  mobileMediaOverlay={route.kind === "home"}
                  onSearchClick={() => setSearchOpen(true)}
                  route={route}
                  unreadChatCount={unreadChatCount}
                  unreadNotificationCount={unreadNotificationCount}
                />
                <main
                  className={cn(
                    "flex min-h-0 w-full flex-1",
                    !isMigratedRoute && "px-3 pb-24 pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-5 md:pb-8 md:pt-6 lg:px-8",
                    isChatRoute && "md:overflow-hidden",
                    isCommunityModerationRoute && "md:overflow-y-auto",
                  )}
                >
                  <React.Suspense fallback={<RouteContentFallback route={route} />}>
                    {isPublicRoute
                      || (route.kind === "community" && (route.isImportedRoot || !session))
                      || (route.kind === "post" && !session)
                      ? <LazyPublicRouteRenderer route={route} />
                      : <LazyAuthenticatedRouteRenderer route={route} />}
                  </React.Suspense>
                </main>
                {isMobileStandaloneRoute || isStandaloneViewerRoute ? null : (
                  <AppShellMobileNav
                    copy={copy}
                    route={route}
                    unreadChatCount={unreadChatCount}
                    unreadNotificationCount={unreadNotificationCount}
                  />
                )}
              </SidebarInset>
            </>
          )}
        </div>
          <Toaster />
        </DesktopChatWidgetProvider>
    </SidebarProvider>
  );
}

export function PirateAppShell({
  initialHost,
  initialImportedRootCommunityId,
  initialPath,
}: {
  initialHost?: string;
  initialImportedRootCommunityId?: string | null;
  initialPath?: string;
}) {
  const { locale } = useUiLocale();
  const route = useRoute(initialPath, initialHost, initialImportedRootCommunityId);
  const session = useSession();
  const effectiveLocale = locale;
  const effectiveDir = resolveLocaleDirection(effectiveLocale);
  const copy = getLocaleMessages(effectiveLocale, "shell");
  const useStandalonePublicProfileShell = isNativePublicIdentityRoute(route);
  const isTelegramMiniAppRoute = route.kind === "telegram-mini-app" || route.kind === "telegram-exchange" || route.kind === "telegram-self-return" || route.kind === "telegram-join" || route.kind === "telegram-verify" || route.kind === "telegram-community" || route.kind === "telegram-post";
  const shouldDeferPrivyUntilConnect =
    route.kind === "create-community"
    || (!session && (
      route.kind === "home"
      || route.kind === "community-feed"
      || route.kind === "popular"
      || route.kind === "community"
      || route.kind === "wallet"
      || route.kind === "post"
      || route.kind === "live-room"
    ));

  return (
    <RootErrorBoundary
      description={copy.rootError.description}
      homeLabel={copy.rootError.homeLabel}
      resetKey={route.path}
      title={copy.rootError.title}
    >
      <PirateQueryProvider>
        <ApiProvider initialHost={initialHost}>
          <AnalyticsRouteTracker route={route} />
          {useStandalonePublicProfileShell ? (
            <>
              <main className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-8">
                <PageContainer>
                  <React.Suspense fallback={<RouteContentFallback route={route} />}>
                    {route.kind === "public-profile" || route.kind === "public-agent" ? <LazyPublicRouteRenderer route={route} /> : null}
                  </React.Suspense>
                </PageContainer>
              </main>
              <Toaster />
            </>
          ) : isTelegramMiniAppRoute ? (
            <PirateAuthProvider>
              <React.Suspense fallback={<RouteContentFallback route={route} />}>
                {route.kind === "telegram-community"
                  ? <LazyTelegramMiniAppCommunityPage communityId={route.communityId} />
                  : route.kind === "telegram-verify"
                    ? <LazyTelegramMiniAppVerifyPage communityId={route.communityId} />
                  : route.kind === "telegram-post"
                    ? <LazyTelegramMiniAppPostPage postId={route.postId} />
                  : route.kind === "telegram-exchange"
                    ? <LazyTelegramMiniAppExchangePage />
                  : route.kind === "telegram-self-return"
                    ? <LazyTelegramMiniAppSelfReturnPage communityId={route.communityId} />
                  : <LazyTelegramMiniAppHomePage />}
              </React.Suspense>
              <Toaster />
            </PirateAuthProvider>
          ) : (
            <PirateAuthProvider deferPrivyUntilConnect={shouldDeferPrivyUntilConnect}>
              <SessionRevalidator>
                <NotificationShell
                  copy={copy}
                  effectiveDir={effectiveDir}
                  route={route}
                  session={session}
                />
              </SessionRevalidator>
            </PirateAuthProvider>
          )}
        </ApiProvider>
      </PirateQueryProvider>
    </RootErrorBoundary>
  );
}
