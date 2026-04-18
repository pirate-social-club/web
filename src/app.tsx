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
import { useUiLocale } from "@/lib/ui-locale";
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
  route,
}: {
  copy: ShellMessages;
  route: AppRoute;
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
      showCreateAction={clientReady}
      showNotificationsAction={clientReady && !!session}
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
}: {
  copy: ShellMessages;
  route: AppRoute;
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

export function PirateApp({ initialHost, initialPath }: { initialHost?: string; initialPath?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const route = useRoute(initialPath, initialHost);
  const session = useSession();
  const isCommunityModerationRoute = route.kind === "community-moderation";
  const isPublicProfileRoute = route.kind === "public-profile";
  const knownCommunities = useKnownCommunities();
  const primaryItems = buildPrimaryItems(copy.appSidebar);
  const sections = buildSidebarSections(copy.appSidebar, knownCommunities);

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
            <SidebarProvider className="flex-col" defaultOpen>
              <>
                <AppShellHeader copy={copy} route={route} />
                <div className="flex min-h-0 w-full flex-1">
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
                      />
                      <SidebarInset className="min-h-0">
                        <main className="flex w-full flex-1 px-3 pb-24 pt-4 md:pb-8 md:px-5 md:pt-6 lg:px-8">
                          {route.kind === "community" && !session
                            ? renderPublicRoute(route)
                            : renderAuthenticatedRoute(route)}
                        </main>
                        <AppShellMobileNav copy={copy} route={route} />
                      </SidebarInset>
                    </>
                  )}
                </div>
                <Toaster />
              </>
            </SidebarProvider>
          </SessionRevalidator>
        </PirateAuthProvider>
      )}
    </ApiProvider>
  );
}
