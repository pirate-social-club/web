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
import { Toaster, toast } from "@/components/primitives/sonner";
import { SidebarInset, SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { ApiProvider, useSessionRevalidation } from "@/lib/api";
import { PirateAuthProvider } from "@/lib/auth/privy-provider";
import { useSession } from "@/lib/api/session-store";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages, type ShellMessages } from "@/locales";
import { cn } from "@/lib/utils";

function buildSidebarSections(messages: ShellMessages["appSidebar"]): AppSidebarSection[] {
  return [
    {
      id: "communities",
      label:
        messages.sections.find((section) => section.id === "communities")?.label
        ?? "Communities",
      defaultOpen: true,
      items: [],
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
  if (route.kind === "create-community") return "create";
  if (route.kind === "me" || route.kind === "user") return "profile";
  return "home";
}

function usesFullBleedLayout(route: AppRoute): boolean {
  return route.kind === "me" || route.kind === "user";
}

function showSearchUnavailable(message: string) {
  toast.info(message);
}

function AppShellHeader({ copy }: { copy: ShellMessages }) {
  const session = useSession();
  const displayName = session?.profile?.display_name ?? "";
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;

  return (
    <AppHeader
      avatarFallback={displayName}
      labels={{
        createLabel: copy.appHeader.createLabel,
        homeAriaLabel: copy.appHeader.homeAriaLabel,
        notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
        openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
        profileAriaLabel: copy.appHeader.profileAriaLabel,
        searchAriaLabel: copy.appHeader.searchAriaLabel,
        searchPlaceholder: copy.appHeader.searchPlaceholder,
      }}
      onCreateClick={() => navigate("/communities/new")}
      onHomeClick={() => navigate("/")}
      onNotificationsClick={() => navigate("/inbox")}
      onProfileClick={() => session ? navigate("/me") : navigate("/auth")}
      onSearchClick={() => showSearchUnavailable(copy.appHeader.searchUnavailableToast)}
      useSidebarTrigger
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
  const displayName = session?.profile?.display_name ?? "";
  const avatarSrc = session?.profile?.avatar_ref ?? undefined;

  return (
    <MobileFooterNav
      activeItem={activeMobileNav(route)}
      avatarFallback={displayName}
      labels={{
        create: copy.mobileFooter.createLabel,
        home: copy.mobileFooter.homeLabel,
        inbox: copy.mobileFooter.inboxLabel,
        inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
        primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
        profile: copy.mobileFooter.profileLabel,
        profileAriaLabel: copy.mobileFooter.profileAriaLabel,
      }}
      onCreateClick={() => navigate("/communities/new")}
      onHomeClick={() => navigate("/")}
      onInboxClick={() => navigate("/inbox")}
      onProfileClick={() => session ? navigate("/me") : navigate("/auth")}
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
  }, []);

  return <>{children}</>;
}

export function PirateApp({ initialPath }: { initialPath?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const route = useRoute(initialPath);
  const primaryItems = buildPrimaryItems(copy.appSidebar);
  const sections = buildSidebarSections(copy.appSidebar);

  return (
    <PirateAuthProvider>
      <ApiProvider>
        <SessionRevalidator>
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
              <AppShellHeader copy={copy} />
              <main
                className={cn(
                  "flex w-full flex-1 pb-24 pt-[calc(env(safe-area-inset-top)+5rem)] md:pb-8 md:pt-6",
                  usesFullBleedLayout(route)
                    ? "max-w-none"
                    : "mx-auto max-w-[96rem] px-3 md:px-5 lg:px-8",
                )}
              >
                {renderRoute(route)}
              </main>
              <AppShellMobileNav copy={copy} route={route} />
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </SessionRevalidator>
      </ApiProvider>
    </PirateAuthProvider>
  );
}
