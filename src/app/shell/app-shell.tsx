"use client";

import * as React from "react";

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
import { readCommunityPresentation } from "@/lib/community-presentation-contract";
import { getLocaleMessages, type ShellMessages } from "@/locales";

import { AppShellHeader, AppShellMobileNav } from "./app-shell-header";
import { routeOwnsContentSpacing } from "./app-shell-route-spacing";
import { AppSearchDialog } from "./app-search-dialog";
import { DesktopChatWidgetProvider } from "./desktop-chat-widget";
import { RootErrorBoundary } from "./root-error-boundary";
import { RouteContentFallback } from "./route-content-fallback";
import {
  activeSidebarItem,
  buildCodeItems,
  buildMediaSections,
  buildMediaSpineItems,
  buildResourceItems,
  buildSidebarSections,
  isSovereignCommunityRoute,
  resolveSovereignOrigins,
  usesStandaloneRouteShell,
} from "./sidebar-sections";
import { resolveSessionAvatarFallback } from "./session-avatar";
import { useShellMobileLayout } from "./use-shell-mobile-layout";
import { GlobalVideoExperienceProvider } from "@/app/video-experience/video-experience-provider";
import { SovereignRouteBoundary } from "@/app/sovereign-route-boundary";
import {
  InitialPublicCommunityProvider,
  type InitialPublicCommunity,
  usePublicCommunityQuery,
} from "@/lib/query/public-community-query";

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

const LazyTelegramMiniAppStudyPage = React.lazy(async () => {
  const mod = await import("@/app/telegram-mini-app/telegram-mini-app-route");
  return { default: mod.TelegramMiniAppStudyPage };
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
    } else if (route.kind === "community" || route.kind === "community-videos" || route.kind === "community-landing") {
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
  const { locale } = useUiLocale();
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
  const isSovereignOrigin = isSovereignCommunityRoute(route);
  const sovereignOrigins = resolveSovereignOrigins(route);
  const sovereignRootOrigin = sovereignOrigins?.root ?? null;
  const sovereignAppOrigin = sovereignOrigins?.app ?? null;
  const navigateAccountPath = (path: "/me" | "/wallet") => {
    if (sovereignAppOrigin) {
      window.location.assign(`${sovereignAppOrigin}${path}`);
      return;
    }
    navigateOrReload(path);
  };
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
        navigateAccountPath("/me");
        return;
      }
      if (connect) {
        connect();
        return;
      }
      toast.info(copy.appHeader.connectUnavailableToast);
    },
    onWalletSelect: () => navigateAccountPath("/wallet"),
    profileLabel: copy.mobileFooter.profileLabel,
    unreadActivityCount: clientReady && session ? unreadNotificationCount : 0,
    unreadChatCount: clientReady && session ? unreadChatCount : 0,
    walletLabel: copy.mobileFooter.walletLabel,
  });
  const resourceItems = buildResourceItems(copy.appSidebar);
  const presentationCommunityId = isSovereignCommunityRoute(route) ? route.communityId : null;
  const presentation = usePublicCommunityQuery(presentationCommunityId, locale).data;
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isChatRoute = route.kind === "chat"
    || route.kind === "chat-target"
    || route.kind === "chat-conversation"
    || route.kind === "chat-new";
  const isPublicRoute = route.kind === "public-profile" || route.kind === "public-agent";
  const useStandaloneRouteShell = usesStandaloneRouteShell(route, isMobileLayout);
  // Temporary: these routes own their own page shell padding.
  // Remove this once all routes are converted.
  const routeOwnsSpacing = routeOwnsContentSpacing(route);
  const mediaSections = buildMediaSections(copy.appSidebar, sections);
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
                brandAccentColor={readCommunityPresentation(presentation).branding.accent_color}
                brandHref={sovereignRootOrigin ? `${sovereignRootOrigin}/` : undefined}
                brandImageSrc={presentation?.avatar_ref ?? null}
                brandLabel={isSovereignOrigin
                  ? presentation?.display_name ?? "Community"
                  : copy.appSidebar.brandLabel}
                homeAriaLabel={copy.appSidebar.homeAriaLabel}
                isSovereignOrigin={isSovereignOrigin}
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
                  isSovereignOrigin={isSovereignOrigin}
                  mobileMediaOverlay={route.kind === "home" || (
                    route.kind === "community-videos" && isSovereignOrigin
                  )}
                  onSearchClick={() => setSearchOpen(true)}
                  route={route}
                  sovereignInteractiveOrigin={sovereignAppOrigin}
                  unreadChatCount={unreadChatCount}
                  unreadNotificationCount={unreadNotificationCount}
                />
                <main
                  className={cn(
                    "flex min-h-0 w-full flex-1",
                    !routeOwnsSpacing && "px-3 pb-24 pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-5 md:pb-8 md:pt-6 lg:px-8",
                    isChatRoute && "md:overflow-hidden",
                  )}
                >
                  <React.Suspense fallback={<RouteContentFallback route={route} />}>
                    {isPublicRoute
                      || (
                        (route.kind === "community" || route.kind === "community-videos" || route.kind === "community-landing")
                        && (!session || ("isImportedRoot" in route && route.isImportedRoot))
                      )
                      || (route.kind === "post" && !session)
                      ? <LazyPublicRouteRenderer route={route} />
                      : <LazyAuthenticatedRouteRenderer route={route} />}
                  </React.Suspense>
                </main>
                <AppShellMobileNav
                  copy={copy}
                  route={route}
                  unreadChatCount={unreadChatCount}
                  unreadNotificationCount={unreadNotificationCount}
                />
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
  initialImportedRootCommunityRoute,
  initialPublicCommunity,
  initialPath,
}: {
  initialHost?: string;
  initialImportedRootCommunityId?: string | null;
  initialImportedRootCommunityRoute?: string | null;
  initialPublicCommunity?: InitialPublicCommunity | null;
  initialPath?: string;
}) {
  const { locale } = useUiLocale();
  const route = useRoute(
    initialPath,
    initialHost,
    initialImportedRootCommunityId,
    initialImportedRootCommunityRoute,
  );
  const session = useSession();
  const effectiveLocale = locale;
  const effectiveDir = resolveLocaleDirection(effectiveLocale);
  const copy = getLocaleMessages(effectiveLocale, "shell");
  const useStandalonePublicProfileShell = isNativePublicIdentityRoute(route);
  const isTelegramMiniAppRoute = route.kind === "telegram-mini-app" || route.kind === "telegram-exchange" || route.kind === "telegram-self-return" || route.kind === "telegram-join" || route.kind === "telegram-verify" || route.kind === "telegram-community" || route.kind === "telegram-post" || route.kind === "telegram-study";
  const shouldDeferPrivyUntilConnect =
    route.kind === "create-community"
    || (!session && (
      route.kind === "home"
      || route.kind === "community-feed"
      || route.kind === "popular"
      || route.kind === "community"
      || route.kind === "community-videos"
      || route.kind === "community-landing"
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
          <InitialPublicCommunityProvider value={initialPublicCommunity}>
          <GlobalVideoExperienceProvider>
            <AnalyticsRouteTracker route={route} />
            <SovereignRouteBoundary route={route}>
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
                    : route.kind === "telegram-study"
                      ? <LazyTelegramMiniAppStudyPage communityId={route.communityId} postId={route.postId} />
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
            </SovereignRouteBoundary>
          </GlobalVideoExperienceProvider>
          </InitialPublicCommunityProvider>
        </ApiProvider>
      </PirateQueryProvider>
    </RootErrorBoundary>
  );
}
