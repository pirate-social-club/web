"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { renderRoute } from "@/app/pages";
import { type AppRoute, navigate, useRoute } from "@/app/router";
import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import {
  AppSidebar,
  type AppSidebarPrimaryItem,
  type AppSidebarSection,
} from "@/components/compositions/app-sidebar/app-sidebar";
import { PirateAuthProvider, usePirateAuth } from "@/components/compositions/pirate-auth/pirate-auth-provider";
import { Toaster, toast } from "@/components/primitives/sonner";
import { SidebarInset, SidebarProvider } from "@/components/primitives/sidebar";
import {
  getCommunityById,
  getYourCommunitiesFeed,
  listCommunities,
  listDiscoverableCommunities,
  type PirateApiCommunity,
} from "@/lib/pirate-api";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages, type ShellMessages } from "@/locales";
import { cn } from "@/lib/utils";

function formatCommunityLabel(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return `c/${slug || "community"}`;
}

function dedupeCommunities(communities: PirateApiCommunity[]): PirateApiCommunity[] {
  const items = new Map<string, PirateApiCommunity>();

  for (const community of communities) {
    items.set(community.community_id, community);
  }

  return [...items.values()];
}

async function loadCommunitiesByIds(input: {
  accessToken?: string | null;
  ids: string[];
  signal?: AbortSignal;
}): Promise<PirateApiCommunity[]> {
  const ids = [...new Set(input.ids.map((value) => value.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return [];
  }

  const communities = await Promise.all(ids.map(async (communityId) => {
    try {
      return await getCommunityById({
        communityId,
        accessToken: input.accessToken,
        signal: input.signal,
      });
    } catch {
      return null;
    }
  }));

  return communities.filter((community): community is PirateApiCommunity => community != null);
}

function buildSidebarSections(
  messages: ShellMessages["appSidebar"],
  input: {
    allCommunities: PirateApiCommunity[];
    recentCommunities: PirateApiCommunity[];
  },
): AppSidebarSection[] {
  const recentCommunities = input.recentCommunities.map((community) => ({
    id: `c/${community.community_id}`,
    label: formatCommunityLabel(community.display_name),
    onSelect: () => navigate(`/c/${community.community_id}`),
  }));
  const allCommunities = input.allCommunities.map((community) => ({
    id: `c/${community.community_id}`,
    label: formatCommunityLabel(community.display_name),
    onSelect: () => navigate(`/c/${community.community_id}`),
  }));

  return [
    {
      id: "recent",
      label: messages.sections.find((section) => section.id === "recent")?.label ?? "Recent",
      defaultOpen: true,
      items: recentCommunities,
    },
    {
      id: "communities",
      label:
        messages.sections.find((section) => section.id === "communities")?.label
        ?? "Communities",
      defaultOpen: true,
      items: allCommunities,
    },
  ];
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

function activeSidebarItem(route: AppRoute): string | undefined {
  switch (route.kind) {
    case "home":
      return "home";
    case "your-communities":
      return "your-communities";
    case "community":
      return `c/${route.communityId}`;
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
  if (route.kind === "create-community" || route.kind === "create-post") return "create";
  if (route.kind === "me" || route.kind === "user") return "profile";
  return "home";
}

function usesStandaloneLayout(route: AppRoute): boolean {
  return route.kind === "auth-device";
}

function hideHeaderOnMobile(route: AppRoute): boolean {
  return route.kind === "me"
    || route.kind === "user"
    || route.kind === "create-post";
}

function hideMobileNavOnMobile(route: AppRoute): boolean {
  return route.kind === "create-post";
}

function showSearchUnavailable(message: string) {
  toast.info(message);
}

const CONNECTED_AVATAR_FALLBACK = "Connected wallet";

function logShellAuth(details: Record<string, unknown>) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info("[pirate-shell]", details);
}

function AppShellHeader({
  copy,
}: {
  copy: ShellMessages;
}) {
  const {
    connect,
    isAuthenticated,
    isBrowserAuthenticated,
    isConfigured,
    isConnecting,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();

  React.useEffect(() => {
    logShellAuth({
      isAuthenticated,
      isBrowserAuthenticated,
      isConfigured,
      isConnecting,
      runtimeErrorMessage,
      runtimeStatus,
      surface: "header",
    });
  }, [isAuthenticated, isBrowserAuthenticated, isConfigured, isConnecting, runtimeErrorMessage, runtimeStatus]);

  return (
    <AppHeader
      avatarFallback={isBrowserAuthenticated ? CONNECTED_AVATAR_FALLBACK : "Pirate"}
      connectLoading={isConnecting}
      hasBrowserAuth={isBrowserAuthenticated}
      isAuthenticated={isAuthenticated}
      labels={{
        connectLabel: copy.appHeader.connectLabel,
        createLabel: copy.appHeader.createLabel,
        homeAriaLabel: copy.appHeader.homeAriaLabel,
        notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
        openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
        profileAriaLabel: copy.appHeader.profileAriaLabel,
        searchAriaLabel: copy.appHeader.searchAriaLabel,
        searchPlaceholder: copy.appHeader.searchPlaceholder,
        verifyLabel: copy.appHeader.verifyLabel,
      }}
      onConnectClick={isConfigured ? connect : undefined}
      onCreateClick={() => navigate("/submit")}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onProfileClick={() => navigate("/me")}
      onSearchClick={() => showSearchUnavailable(copy.appHeader.searchUnavailableToast)}
      onVerifyClick={() => navigate("/verify")}
      useSidebarTrigger
      userAvatarSrc={null}
    />
  );
}

function AppShellMobileNav({
  copy,
  route,
}: {
  copy: ShellMessages;
  route: AppRoute;
}) {
  const {
    connect,
    isAuthenticated,
    isBrowserAuthenticated,
    isConfigured,
    isConnecting,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();

  React.useEffect(() => {
    logShellAuth({
      isAuthenticated,
      isBrowserAuthenticated,
      isConfigured,
      isConnecting,
      route: route.kind,
      runtimeErrorMessage,
      runtimeStatus,
      surface: "mobile-nav",
    });
  }, [isAuthenticated, isBrowserAuthenticated, isConfigured, isConnecting, route.kind, runtimeErrorMessage, runtimeStatus]);

  return (
    <MobileFooterNav
      activeItem={activeMobileNav(route)}
      avatarFallback={isBrowserAuthenticated ? CONNECTED_AVATAR_FALLBACK : "Pirate"}
      hasBrowserAuth={isBrowserAuthenticated}
      isAuthenticated={isAuthenticated}
      labels={{
        create: copy.mobileFooter.createLabel,
        home: copy.mobileFooter.homeLabel,
        inbox: copy.mobileFooter.inboxLabel,
        inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
        primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
        profile: copy.mobileFooter.profileLabel,
        profileAriaLabel: copy.mobileFooter.profileAriaLabel,
      }}
      onCreateClick={() => navigate("/submit")}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() => navigate("/me")}
      userAvatarSrc={null}
    />
  );
}

function PirateAppShell({ initialPath }: { initialPath?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const route = useRoute(initialPath);
  const { accessToken } = usePirateAuth();
  const routeHidesMobileHeader = hideHeaderOnMobile(route);
  const routeHidesMobileNav = hideMobileNavOnMobile(route);
  const [sidebarCommunityState, setSidebarCommunityState] = React.useState<{
    allCommunities: PirateApiCommunity[];
    recentCommunities: PirateApiCommunity[];
  }>({
    allCommunities: [],
    recentCommunities: [],
  });
  const primaryItems = buildPrimaryItems(copy.appSidebar);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const setState = (value: {
      allCommunities: PirateApiCommunity[];
      recentCommunities: PirateApiCommunity[];
    }) => {
      if (!cancelled && !controller.signal.aborted) {
        setSidebarCommunityState(value);
      }
    };

    void (async () => {
      if (accessToken) {
        const [ownedCommunities, joinedFeed] = await Promise.all([
          listCommunities({
            accessToken,
            signal: controller.signal,
          }).then((response) => response.items).catch(() => []),
          getYourCommunitiesFeed({
            accessToken,
            signal: controller.signal,
          }).catch(() => ({ items: [], next_cursor: null })),
        ]);

        const recentCommunities = await loadCommunitiesByIds({
          accessToken,
          ids: joinedFeed.items.map((item) => item.post.community_id),
          signal: controller.signal,
        });

        let allCommunities = dedupeCommunities([
          ...recentCommunities,
          ...ownedCommunities,
        ]);

        if (allCommunities.length === 0) {
          const discoverable = await listDiscoverableCommunities({
            accessToken,
            signal: controller.signal,
          }).then((response) => response.items).catch(() => []);
          allCommunities = dedupeCommunities(discoverable);
        }

        setState({
          allCommunities,
          recentCommunities: recentCommunities.slice(0, 2),
        });
        return;
      }

      const discoverable = await listDiscoverableCommunities({
        signal: controller.signal,
      }).then((response) => response.items).catch(() => []);

      setState({
        allCommunities: dedupeCommunities(discoverable),
        recentCommunities: discoverable.slice(0, 2),
      });
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  const sections = React.useMemo(
    () => buildSidebarSections(copy.appSidebar, sidebarCommunityState),
    [copy.appSidebar, sidebarCommunityState],
  );

  if (usesStandaloneLayout(route)) {
    return (
      <>
        {renderRoute(route)}
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        activeItemId={activeSidebarItem(route)}
        brandLabel={copy.appSidebar.brandLabel}
        homeAriaLabel={copy.appSidebar.homeAriaLabel}
        onHomeClick={() => navigate("/")}
        primaryItems={primaryItems}
        resourceItems={copy.appSidebar.resourceItems}
        resourcesLabel={copy.appSidebar.resourcesLabel}
        sections={sections}
      />
      <SidebarInset className="min-h-dvh">
        <div className={cn(routeHidesMobileHeader && "hidden md:block")}>
          <AppShellHeader copy={copy} />
        </div>
        <main
          className={cn(
            "flex w-full flex-1 pb-24 md:pb-8 md:pt-6",
            routeHidesMobileHeader ? "pt-[env(safe-area-inset-top)]" : "pt-[calc(env(safe-area-inset-top)+5rem)]",
            "mx-auto max-w-[96rem] px-3 md:px-5 lg:px-8",
          )}
        >
          {renderRoute(route)}
        </main>
        <div className={cn(routeHidesMobileNav && "hidden md:block")}>
          <AppShellMobileNav copy={copy} route={route} />
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export function PirateApp({ initialPath }: { initialPath?: string }) {
  return (
    <PirateAuthProvider>
      <PirateAppShell initialPath={initialPath} />
    </PirateAuthProvider>
  );
}
