"use client";

import * as React from "react";

import type { AppRoute } from "@/app/router";
import { isNativePublicIdentityRoute, navigate, useRoute } from "@/app/router";
import { AppSidebar, type AppSidebarPrimaryItem } from "@/components/compositions/app/app-sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Toaster } from "@/components/primitives/sonner";
import { ApiProvider, useSessionRevalidation } from "@/lib/api";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useSession } from "@/lib/api/session-store";
import { PirateAuthProvider } from "@/components/auth/privy-provider";
import { useAssistantUnreadCount } from "@/lib/chat/chat-assistant-client";
import { useNotificationBadges } from "@/lib/notifications/use-notification-badges";
import { useNotificationSummary } from "@/lib/notifications/use-notification-summary";
import { useSidebarCommunities } from "@/lib/owned-communities";
import { resolveLocaleDirection } from "@/lib/ui-locale-core";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages, type ShellMessages } from "@/locales";

import { AppShellHeader, AppShellMobileNav } from "./app-shell-header";
import { ChatOnboardingPrep } from "./chat-onboarding-prep";
import { DesktopChatWidgetProvider } from "./desktop-chat-widget";
import { RootErrorBoundary } from "./root-error-boundary";
import { RouteContentFallback } from "./route-content-fallback";
import {
  activeSidebarItem,
  buildCodeItems,
  buildPrimaryItems,
  buildResourceItems,
  buildSidebarSections,
} from "./sidebar-sections";
import { useShellMobileLayout } from "./use-shell-mobile-layout";

const LazyAuthenticatedRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/authenticated-route-renderer");
  return { default: mod.AuthenticatedRouteRenderer };
});

const LazyPublicRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/public-route-renderer");
  return { default: mod.PublicRouteRenderer };
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

    if (route.kind === "home" || route.kind === "popular") {
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
  isCommunityModerationRoute,
  primaryItems,
  route,
  session,
}: {
  copy: ShellMessages;
  effectiveDir: "ltr" | "rtl";
  isCommunityModerationRoute: boolean;
  primaryItems: AppSidebarPrimaryItem[];
  route: AppRoute;
  session: ReturnType<typeof useSession>;
}) {
  const isMobileLayout = useShellMobileLayout();
  const notificationSummary = useNotificationSummary();
  const unreadChatCount = useAssistantUnreadCount();
  const { moderatedCommunities, recentCommunities } = useSidebarCommunities();
  const codeItems = buildCodeItems(copy.appSidebar);
  const sections = buildSidebarSections(copy.appSidebar, recentCommunities, moderatedCommunities);
  const resourceItems = buildResourceItems(copy.appSidebar);
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
  );
  const isChatRoute = route.kind === "chat"
    || route.kind === "chat-target"
    || route.kind === "chat-conversation"
    || route.kind === "chat-new";
  const isPublicRoute = route.kind === "public-profile" || route.kind === "public-agent";
  const useStandaloneRouteShell = isCommunityModerationRoute || isMobileStandaloneRoute;
  // Temporary: migrated routes own their own page shell padding.
  // Remove this once all routes are converted.
  const isMigratedRoute = route.kind === "home" || route.kind === "popular" || route.kind === "wallet";
  const unreadNotificationCount = notificationSummary.open_task_count + notificationSummary.unread_activity_count;
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
        {isMobileStandaloneRoute ? null : (
          <AppShellHeader
            copy={copy}
            route={route}
            unreadChatCount={unreadChatCount}
            unreadNotificationCount={unreadNotificationCount}
          />
        )}
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
                brandLabel={copy.appSidebar.brandLabel}
                homeAriaLabel={copy.appSidebar.homeAriaLabel}
                codeItems={codeItems}
                codeLabel={copy.appSidebar.codeLabel}
                onHomeClick={() => navigate("/")}
                onNavigate={navigate}
                primaryItems={primaryItems}
                resourceItems={resourceItems}
                resourcesLabel={copy.appSidebar.resourcesLabel}
                sections={sections}
                side="start"
              />
              <SidebarInset className="min-h-0">
                <main
                  className={cn(
                    "flex min-h-0 w-full flex-1",
                    !isMigratedRoute && "px-3 pb-24 pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-5 md:pb-8 md:pt-6 lg:px-8",
                    isChatRoute && "md:overflow-hidden",
                  )}
                >
                  <React.Suspense fallback={<RouteContentFallback route={route} />}>
                    {isPublicRoute || ((route.kind === "community" || route.kind === "post") && !session)
                      ? <LazyPublicRouteRenderer route={route} />
                      : <LazyAuthenticatedRouteRenderer route={route} />}
                  </React.Suspense>
                </main>
                {isMobileStandaloneRoute ? null : (
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

export function PirateAppShell({ initialHost, initialPath }: { initialHost?: string; initialPath?: string }) {
  const { locale } = useUiLocale();
  const route = useRoute(initialPath, initialHost);
  const session = useSession();
  const effectiveLocale = locale;
  const effectiveDir = resolveLocaleDirection(effectiveLocale);
  const copy = getLocaleMessages(effectiveLocale, "shell");
  const isCommunityModerationRoute = route.kind === "community-moderation" || route.kind === "community-moderation-index";
  const useStandalonePublicProfileShell = isNativePublicIdentityRoute(route);
  const shouldDeferPrivyUntilConnect =
    route.kind === "create-community"
    || (!session && (
      route.kind === "home"
      || route.kind === "popular"
      || route.kind === "community"
      || route.kind === "wallet"
      || route.kind === "post"
    ));
  const primaryItems = buildPrimaryItems(copy.appSidebar);

  return (
    <RootErrorBoundary
      description={copy.rootError.description}
      homeLabel={copy.rootError.homeLabel}
      title={copy.rootError.title}
    >
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
        ) : (
          <PirateAuthProvider deferPrivyUntilConnect={shouldDeferPrivyUntilConnect}>
            <SessionRevalidator>
              <ChatOnboardingPrep />
              <NotificationShell
                copy={copy}
                effectiveDir={effectiveDir}
                isCommunityModerationRoute={isCommunityModerationRoute}
                primaryItems={primaryItems}
                route={route}
                session={session}
              />
            </SessionRevalidator>
          </PirateAuthProvider>
        )}
      </ApiProvider>
    </RootErrorBoundary>
  );
}
