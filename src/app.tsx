"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { type AppRoute, navigate, useRoute } from "@/app/router";
import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import {
  AppSidebar,
  type AppSidebarPrimaryItem,
  type AppSidebarSection,
} from "@/components/compositions/app-sidebar/app-sidebar";
import { Toaster, toast } from "@/components/primitives/sonner";
import { Spinner } from "@/components/primitives/spinner";
import { SidebarInset, SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { ApiProvider, useSessionRevalidation } from "@/lib/api";
import { PirateAuthProvider, usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { useSession } from "@/lib/api/session-store";
import { useNotificationSummary } from "@/lib/notifications/use-notification-summary";
import { useSidebarCommunities, type SidebarCommunitySummary } from "@/lib/owned-communities";
import { resolveResourceHref } from "@/lib/resource-links";
import { UiLocaleProvider, useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleDirection, type UiDirection, type UiLocaleCode } from "@/lib/ui-locale-core";
import { buildCommunityPath } from "@/lib/community-routing";
import { getLocaleMessages, type ShellMessages } from "@/locales";
import { buildCommunityModerationIndexPath } from "@/app/authenticated-routes/moderation-helpers";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";

const LazyAuthenticatedRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/authenticated-route-renderer");
  return { default: mod.AuthenticatedRouteRenderer };
});

const LazyPublicRouteRenderer = React.lazy(async () => {
  const mod = await import("@/app/public-route-renderer");
  return { default: mod.PublicRouteRenderer };
});

function buildCreatePostPath(communityId: string): string {
  return `/c/${encodeURIComponent(communityId)}/submit`;
}

function resolveCreatePostPath(route: AppRoute): string | null {
  if (route.kind === "community") {
    return buildCreatePostPath(route.communityId);
  }

  if (route.kind === "create-post") {
    return route.path;
  }

  if (route.kind === "create-post-global") {
    return route.path;
  }

  return "/submit";
}

function resolveMobileBackPath(route: AppRoute): string | null {
  if (route.kind === "community-moderation") {
    return buildCommunityModerationIndexPath(route.communityId);
  }

  if (route.kind === "community-moderation-index") {
    return buildCommunityPath(route.communityId);
  }

  return null;
}

function useClientReady(): boolean {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}

function formatCommunitySidebarLabel(
  communityId: string,
  routeSlug?: string | null,
): string {
  const trimmedSlug = routeSlug?.trim();
  if (trimmedSlug) {
    return trimmedSlug.toLowerCase().startsWith("c/") ? trimmedSlug : `c/${trimmedSlug}`;
  }

  const trimmedId = communityId.trim();
  if (!trimmedId) return "c/unknown";
  if (trimmedId.length <= 14) return `c/${trimmedId}`;
  return `c/${trimmedId.slice(0, 7)}…${trimmedId.slice(-4)}`;
}

function buildSidebarSections(
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
        onSelect: () => navigate(buildCommunityModerationIndexPath(community.communityId)),
      })),
    });
  }

  return sections;
}

function buildPrimaryItems(messages: ShellMessages["appSidebar"]): AppSidebarPrimaryItem[] {
  return [
    {
      id: "home",
      icon: House,
      label: messages.homeLabel,
      onSelect: () => navigate("/"),
    },
    {
      id: "your-communities",
      icon: Flag,
      label: messages.yourCommunitiesLabel,
      onSelect: () => navigate("/your-communities"),
    },
    {
      id: "create-community",
      icon: Plus,
      label: messages.createCommunityLabel,
      onSelect: () => navigate("/communities/new"),
    },
  ];
}

function buildResourceItems(messages: ShellMessages["appSidebar"]) {
  return messages.resourceItems.map((item) => ({
    ...item,
    onSelect: () => {
      const href = resolveResourceHref(item.id);
      if (!href || typeof window === "undefined") return;
      window.location.assign(href);
    },
  }));
}

function activeSidebarItem(route: AppRoute): string | undefined {
  switch (route.kind) {
    case "home":
      return "home";
    case "your-communities":
      return "your-communities";
    case "community":
      return `c/${route.communityId}`;
    case "create-post":
      return `c/${route.communityId}`;
    case "create-post-global":
      return undefined;
    case "create-community":
      return "create-community";
    default:
      return undefined;
  }
}

function activeMobileNav(
  route: AppRoute,
): ComponentProps<typeof MobileFooterNav>["activeItem"] {
  if (route.kind === "inbox") return "inbox";
  if (route.kind === "create-post" || route.kind === "create-post-global") return "create";
  if (route.kind === "me" || route.kind === "public-profile") return "profile";
  return "home";
}

function showSearchUnavailable(message: string) {
  toast.info(message);
}

function showConnectUnavailable() {
  toast.info("Connect is not configured for this environment.");
}

function resolveSessionAvatarFallback(session: ReturnType<typeof useSession>) {
  const displayName = session?.profile?.display_name?.trim();

  if (displayName) {
    return displayName;
  }

  const handleLabel = session?.profile?.global_handle?.label?.trim();

  if (handleLabel) {
    return handleLabel;
  }

  return "Pirate User";
}

function AppShellHeader({
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
  const clientReady = useClientReady();
  const avatarFallback = resolveSessionAvatarFallback(session);
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;
  const showConnectAction = clientReady && !session;
  const createPostPath = resolveCreatePostPath(route);
  const mobileBackPath = resolveMobileBackPath(route);
  const disableCreateAction = !clientReady;
  const hideHeaderBrand = route.kind === "community-moderation" || route.kind === "community-moderation-index";
  const useAppSidebarTrigger = route.kind !== "community-moderation" && route.kind !== "community-moderation-index";

  return (
    <AppHeader
      avatarFallback={avatarFallback}
      disableCreateAction={disableCreateAction}
      hideBrand={hideHeaderBrand}
      labels={{
        backAriaLabel: "Back",
        connectLabel: copy.appHeader.connectLabel,
        createLabel: copy.appHeader.createLabel,
        homeAriaLabel: copy.appHeader.homeAriaLabel,
        notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
        openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
        profileAriaLabel: copy.appHeader.profileAriaLabel,
        searchAriaLabel: copy.appHeader.searchAriaLabel,
        searchPlaceholder: copy.appHeader.searchPlaceholder,
      }}
      onBackClick={mobileBackPath ? () => navigate(mobileBackPath) : undefined}
      onCreateClick={createPostPath ? () => navigate(createPostPath) : undefined}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onConnectClick={() => connect ? connect() : showConnectUnavailable()}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable()}
      onSearchClick={() => showSearchUnavailable(copy.appHeader.searchUnavailableToast)}
      showCreateAction={clientReady && !!session}
      showNotificationsAction={clientReady && !!session}
      showNotificationsDot={hasUnread}
      showConnectAction={showConnectAction}
      showProfileAction={clientReady}
      useSidebarTrigger={useAppSidebarTrigger}
      userAvatarSrc={avatarSrc}
    />
  );
}

function AppShellMobileNav({
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
  const clientReady = useClientReady();
  const avatarFallback = resolveSessionAvatarFallback(session);
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
      }}
      onCreateClick={createPostPath ? () => navigate(createPostPath) : undefined}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() => session ? navigate("/me") : connect ? connect() : showConnectUnavailable()}
      showInboxDot={hasUnread}
      userAvatarSrc={avatarSrc}
    />
  );
}

function RouteContentFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center" aria-busy="true">
      <Spinner className="size-6" />
    </div>
  );
}

function useShellMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = React.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
  });

  React.useEffect(() => {
    const mobileWidthQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const update = () => {
      setIsMobileLayout(mobileWidthQuery.matches);
    };

    mobileWidthQuery.addEventListener("change", update);
    update();

    return () => {
      mobileWidthQuery.removeEventListener("change", update);
    };
  }, []);

  return isMobileLayout;
}

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
  const { moderatedCommunities, recentCommunities } = useSidebarCommunities();
  const sections = buildSidebarSections(copy.appSidebar, recentCommunities, moderatedCommunities);
  const resourceItems = buildResourceItems(copy.appSidebar);
  const isMobileCreatePostRoute = isMobileLayout && (route.kind === "create-post" || route.kind === "create-post-global");
  const useStandaloneRouteShell = isCommunityModerationRoute || isMobileCreatePostRoute;

  return (
    <SidebarProvider
      className="flex-col"
      defaultOpen
      dir={effectiveDir}
      style={{
        "--sidebar-width": "15.5rem",
        "--sidebar-width-icon": "3.75rem",
      } as React.CSSProperties}
    >
      <>
        {isMobileCreatePostRoute ? null : <AppShellHeader copy={copy} route={route} hasUnread={notificationSummary.has_unread} />}
        <div className="flex min-h-0 w-full flex-1">
          {useStandaloneRouteShell ? (
            <main className="flex min-h-0 w-full flex-1">
              <React.Suspense fallback={<RouteContentFallback />}>
                <LazyAuthenticatedRouteRenderer route={route} />
              </React.Suspense>
            </main>
          ) : (
            <>
              <AppSidebar
                activeItemId={activeSidebarItem(route)}
                brandLabel={copy.appSidebar.brandLabel}
                homeAriaLabel={copy.appSidebar.homeAriaLabel}
                onHomeClick={() => navigate("/")}
                primaryItems={primaryItems}
                resourceItems={resourceItems}
                resourcesLabel={copy.appSidebar.resourcesLabel}
                sections={sections}
                side="start"
              />
              <SidebarInset className="min-h-0">
                <main className="flex w-full flex-1 px-3 pb-24 pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-5 md:pb-8 md:pt-6 lg:px-8">
                  <React.Suspense fallback={<RouteContentFallback />}>
                    {(route.kind === "community" || route.kind === "post") && !session
                      ? <LazyPublicRouteRenderer route={route} />
                      : <LazyAuthenticatedRouteRenderer route={route} />}
                  </React.Suspense>
                </main>
                {isMobileCreatePostRoute ? null : <AppShellMobileNav copy={copy} route={route} hasUnread={notificationSummary.has_unread} />}
              </SidebarInset>
            </>
          )}
        </div>
        <Toaster />
      </>
    </SidebarProvider>
  );
}

function PirateAppShell({ initialHost, initialPath }: { initialHost?: string; initialPath?: string }) {
  const { locale } = useUiLocale();
  const route = useRoute(initialPath, initialHost);
  const session = useSession();
  const effectiveLocale = locale;
  const effectiveDir = resolveLocaleDirection(effectiveLocale);
  const copy = getLocaleMessages(effectiveLocale, "shell");
  const isCommunityModerationRoute = route.kind === "community-moderation" || route.kind === "community-moderation-index";
  const isPublicProfileRoute = route.kind === "public-profile";
  const primaryItems = buildPrimaryItems(copy.appSidebar);

  return (
    <ApiProvider initialHost={initialHost}>
      {isPublicProfileRoute ? (
        <>
          <main className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
              <React.Suspense fallback={<RouteContentFallback />}>
                {route.kind === "public-profile" ? <LazyPublicRouteRenderer route={route} /> : null}
              </React.Suspense>
            </div>
          </main>
          <Toaster />
        </>
      ) : (
        <PirateAuthProvider>
          <SessionRevalidator>
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
  );
}

export function PirateApp({
  initialDir = "ltr",
  initialHost,
  initialLocale = "en",
  initialPath,
}: {
  initialDir?: UiDirection;
  initialHost?: string;
  initialLocale?: UiLocaleCode;
  initialPath?: string;
}) {
  return (
    <UiLocaleProvider dir={initialDir} locale={initialLocale}>
      <PirateAppShell initialHost={initialHost} initialPath={initialPath} />
    </UiLocaleProvider>
  );
}
