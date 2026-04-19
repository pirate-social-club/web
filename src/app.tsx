"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { renderAuthenticatedRoute } from "@/app/authenticated-route-renderer";
import { renderPublicRoute } from "@/app/public-route-renderer";
import { type AppRoute, navigate, useRoute } from "@/app/router";
import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import {
  AppSidebar,
  type AppSidebarPrimaryItem,
  type AppSidebarSection,
} from "@/components/compositions/app-sidebar/app-sidebar";
import { Toaster, toast } from "@/components/primitives/sonner";
import { SidebarInset, SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { ApiProvider, useSessionRevalidation } from "@/lib/api";
import { PirateAuthProvider, usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { useKnownCommunities } from "@/lib/known-communities-store";
import { useSession } from "@/lib/api/session-store";
import { useNotificationSummary } from "@/lib/notifications/use-notification-summary";
import { UiLocaleProvider, useUiLocale } from "@/lib/ui-locale";
import { isUiLocaleCode, resolveLocaleDirection, type UiDirection, type UiLocaleCode } from "@/lib/ui-locale-core";
import { getLocaleMessages, type ShellMessages } from "@/locales";

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

function useClientReady(): boolean {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  return ready;
}

function formatCommunitySidebarLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "c/unknown";
  if (trimmed.toLowerCase().startsWith("c/")) return trimmed;
  return `c/${trimmed}`;
}

function buildSidebarSections(
  messages: ShellMessages["appSidebar"],
  communities: ReturnType<typeof useKnownCommunities>,
): AppSidebarSection[] {
  if (communities.length === 0) {
    return [];
  }

  return [
    {
      id: "recent",
      label:
        messages.sections.find((section) => section.id === "recent")?.label
        ?? "Recent",
      defaultOpen: true,
      items: communities.map((community) => ({
        avatarSrc: community.avatarSrc,
        id: `c/${community.communityId}`,
        label: formatCommunitySidebarLabel(community.displayName),
        onSelect: () => navigate(`/c/${community.communityId}`),
      })),
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
  dir,
  route,
  hasUnread,
}: {
  copy: ShellMessages;
  dir: "ltr" | "rtl";
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
  const disableCreateAction = !clientReady;
  const useAppSidebarTrigger = route.kind !== "community-moderation";

  return (
    <AppHeader
      avatarFallback={avatarFallback}
      disableCreateAction={disableCreateAction}
      dir={dir}
      labels={{
        connectLabel: copy.appHeader.connectLabel,
        createLabel: copy.appHeader.createLabel,
        homeAriaLabel: copy.appHeader.homeAriaLabel,
        notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
        openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
        profileAriaLabel: copy.appHeader.profileAriaLabel,
        searchAriaLabel: copy.appHeader.searchAriaLabel,
        searchPlaceholder: copy.appHeader.searchPlaceholder,
      }}
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
  isRtl,
  isCommunityModerationRoute,
  knownCommunities,
  primaryItems,
  sections,
  route,
  session,
}: {
  copy: ShellMessages;
  effectiveDir: "ltr" | "rtl";
  isRtl: boolean;
  isCommunityModerationRoute: boolean;
  knownCommunities: ReturnType<typeof useKnownCommunities>;
  primaryItems: AppSidebarPrimaryItem[];
  sections: AppSidebarSection[];
  route: AppRoute;
  session: ReturnType<typeof useSession>;
}) {
  const notificationSummary = useNotificationSummary();

  return (
    <SidebarProvider
      className="flex-col"
      defaultOpen
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        "--sidebar-width": "15.5rem",
        "--sidebar-width-icon": "3.75rem",
      } as React.CSSProperties}
    >
      <>
        <AppShellHeader copy={copy} dir={effectiveDir} route={route} hasUnread={notificationSummary.has_unread} />
        <div
          className="flex min-h-0 w-full flex-1"
          dir={effectiveDir}
        >
          {isCommunityModerationRoute ? (
            <main className="flex min-h-0 w-full flex-1">
              {renderAuthenticatedRoute(route)}
            </main>
          ) : (
            <>
              <AppSidebar
                activeItemId={activeSidebarItem(route)}
                brandLabel={copy.appSidebar.brandLabel}
                homeAriaLabel={copy.appSidebar.homeAriaLabel}
                onHomeClick={() => navigate("/")}
                primaryItems={primaryItems}
                resourceItems={copy.appSidebar.resourceItems}
                resourcesLabel={copy.appSidebar.resourcesLabel}
                sections={sections}
                side={isRtl ? "right" : "left"}
              />
              <SidebarInset className="min-h-0">
                <main
                  className="flex w-full flex-1 px-3 pb-24 pt-4 md:pb-8 md:px-5 md:pt-6 lg:px-8"
                  dir={effectiveDir}
                >
                  {route.kind === "community" && !session
                    ? renderPublicRoute(route)
                    : renderAuthenticatedRoute(route)}
                </main>
                <AppShellMobileNav copy={copy} route={route} hasUnread={notificationSummary.has_unread} />
              </SidebarInset>
            </>
          )}
        </div>
        <Toaster />
      </>
    </SidebarProvider>
  );
}

function resolveSessionUiLocale(session: ReturnType<typeof useSession>): UiLocaleCode | null {
  const preferredLocale = session?.profile?.preferred_locale ?? "";
  return isUiLocaleCode(preferredLocale) ? preferredLocale : null;
}

function PirateAppShell({ initialHost, initialPath }: { initialHost?: string; initialPath?: string }) {
  const { locale, setLocale } = useUiLocale();
  const route = useRoute(initialPath, initialHost);
  const session = useSession();
  const sessionLocale = resolveSessionUiLocale(session);
  const effectiveLocale = sessionLocale ?? locale;
  const effectiveDir = resolveLocaleDirection(effectiveLocale);
  const isRtl = effectiveDir === "rtl";
  const copy = getLocaleMessages(effectiveLocale, "shell");
  const isCommunityModerationRoute = route.kind === "community-moderation";
  const isPublicProfileRoute = route.kind === "public-profile";
  const knownCommunities = useKnownCommunities();
  const primaryItems = buildPrimaryItems(copy.appSidebar);
  const sections = buildSidebarSections(copy.appSidebar, knownCommunities);

  React.useEffect(() => {
    if (sessionLocale && sessionLocale !== locale) {
      setLocale(sessionLocale);
    }
  }, [locale, sessionLocale, setLocale]);

  return (
    <ApiProvider initialHost={initialHost}>
      {isPublicProfileRoute ? (
        <>
          <main className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
              {route.kind === "public-profile" ? renderPublicRoute(route) : null}
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
              isRtl={isRtl}
              isCommunityModerationRoute={isCommunityModerationRoute}
              knownCommunities={knownCommunities}
              primaryItems={primaryItems}
              sections={sections}
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
