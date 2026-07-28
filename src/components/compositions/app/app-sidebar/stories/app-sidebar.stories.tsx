import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Flag, Plus } from "@phosphor-icons/react";

import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app/app-shell-chrome/mobile-footer-nav";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { SidebarInset, SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";

import { AppSidebar } from "../app-sidebar";
import { buildVideoPrimaryItems } from "@/app/shell/sidebar-sections";

const meta = {
  title: "Compositions/App/AppSidebar",
  component: AppSidebar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ minHeight: "100vh", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

function ShellChrome({ mobile = false }: { mobile?: boolean }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const sections = copy.appSidebar.sections.map((section) => ({
    ...section,
    defaultOpen: true,
  }));
  const primaryItems = buildVideoPrimaryItems(copy.appSidebar);

  if (mobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar
          appearance="media"
          brandLabel={copy.appSidebar.brandLabel}
          homeAriaLabel={copy.appSidebar.homeAriaLabel}
          primaryItems={primaryItems}
          resourceItems={copy.appSidebar.resourceItems}
          resourcesLabel={copy.appSidebar.resourcesLabel}
          sections={sections}
        />
        <SidebarInset className="min-h-screen">
          <AppHeader
            labels={{
              createLabel: copy.appHeader.createLabel,
              homeAriaLabel: copy.appHeader.homeAriaLabel,
              notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
              openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
              profileAriaLabel: copy.appHeader.profileAriaLabel,
              searchAriaLabel: copy.appHeader.searchAriaLabel,
              searchPlaceholder: copy.appHeader.searchPlaceholder,
            }}
            useSidebarTrigger
          />
          <main className="space-y-3 px-3 pb-28 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
              <div className="space-y-3">
                <div className="h-5 w-24 rounded-full bg-muted" />
                <div className="h-32 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
              <div className="space-y-3">
                <div className="h-5 w-36 rounded-full bg-muted" />
                <div className="h-24 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              </div>
            </div>
          </main>
          <MobileFooterNav
            activeItem="home"
            labels={{
              create: copy.mobileFooter.createLabel,
              home: copy.mobileFooter.homeLabel,
              inbox: copy.mobileFooter.inboxLabel,
              primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
              profile: copy.mobileFooter.profileLabel,
            }}
          />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        appearance="media"
        brandLabel={copy.appSidebar.brandLabel}
        homeAriaLabel={copy.appSidebar.homeAriaLabel}
        primaryItems={primaryItems}
        resourceItems={copy.appSidebar.resourceItems}
        resourcesLabel={copy.appSidebar.resourcesLabel}
        sections={sections}
      />
      <SidebarInset className="min-h-screen">
        <AppHeader
          labels={{
            createLabel: copy.appHeader.createLabel,
            homeAriaLabel: copy.appHeader.homeAriaLabel,
            notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
            openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
            profileAriaLabel: copy.appHeader.profileAriaLabel,
            searchAriaLabel: copy.appHeader.searchAriaLabel,
            searchPlaceholder: copy.appHeader.searchPlaceholder,
          }}
        />
        <main className="mx-auto w-full max-w-5xl px-6 py-8">
          <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-8">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded-full bg-muted" />
              <div className="h-40 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              <div className="h-28 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MediaShellReview({
  collapsed = false,
  contentRoute = false,
  dockOpen = false,
  moderationRoute = false,
  populatedCommunities = false,
}: {
  collapsed?: boolean;
  contentRoute?: boolean;
  dockOpen?: boolean;
  moderationRoute?: boolean;
  populatedCommunities?: boolean;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const mediaSections = [{
    defaultOpen: true,
    id: "communities",
    items: [
      { id: "your-communities", icon: Flag, label: copy.appSidebar.yourCommunitiesLabel },
      ...(populatedCommunities ? [
        { id: "c/pirate-radio", label: "c/pirate-radio" },
        { id: "c/builders", label: "c/builders" },
      ] : []),
      { id: "create-community", icon: Plus, label: copy.appSidebar.createCommunityLabel },
    ],
    label: copy.appSidebar.sections.find((section) => section.id === "communities")?.label ?? "Communities",
  }];

  return (
    <SidebarProvider defaultOpen={!collapsed}>
      <AppSidebar
        activeItemId="home"
        appearance="media"
        brandLabel={copy.appSidebar.brandLabel}
        homeAriaLabel={copy.appSidebar.homeAriaLabel}
        mediaAction={<Button className="w-full">{copy.appHeader.connectLabel}</Button>}
        onHomeClick={() => undefined}
        onSearchClick={() => undefined}
        primaryItems={buildVideoPrimaryItems(copy.appSidebar)}
        searchLabel={copy.appHeader.searchPlaceholder}
        sections={mediaSections}
      />
      <SidebarInset className={contentRoute ? "h-dvh min-h-0 overflow-hidden bg-background" : "h-dvh min-h-0 overflow-hidden bg-black"}>
        {contentRoute ? (
          <AppHeader
            labels={{
              createLabel: copy.appHeader.createLabel,
              homeAriaLabel: copy.appHeader.homeAriaLabel,
              notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
              openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
              profileAriaLabel: copy.appHeader.profileAriaLabel,
              searchAriaLabel: copy.appHeader.searchAriaLabel,
              searchPlaceholder: copy.appHeader.searchPlaceholder,
            }}
          />
        ) : null}
        <main className={contentRoute ? "min-h-0 flex-1 overflow-auto p-8" : dockOpen ? "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_26rem]" : "min-h-0 flex-1"}>
          {contentRoute ? (
            <div className="mx-auto max-w-4xl space-y-5">
              <Type as="h1" variant="h2">{moderationRoute ? "Moderator tools" : "Settings"}</Type>
              <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-8">
                <div className="h-6 w-40 rounded-full bg-muted" />
                <div className={moderationRoute ? "mt-6 h-[75rem] rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" : "mt-6 h-48 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70"} />
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 place-items-center p-6">
              <div className="aspect-[9/16] h-[min(88dvh,50rem)] max-w-full rounded-[var(--radius-xl)] bg-gradient-to-b from-muted/50 to-muted" />
            </div>
          )}
          {dockOpen ? (
            <aside className="border-s border-border-soft bg-background p-6">
              <Type as="h2" variant="h3">Comments</Type>
              <div className="mt-6 space-y-4">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-20 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            </aside>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const DesktopShell: Story = {
  render: () => <ShellChrome />,
};

export const MediaShellExpanded: Story = {
  name: "Media shell / Expanded",
  render: () => <MediaShellReview />,
};

export const UnifiedContentShell: Story = {
  name: "Unified shell / Content route with header",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <MediaShellReview contentRoute populatedCommunities />,
};

export const UnifiedModerationShell: Story = {
  name: "Unified shell / Tall moderation route",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <MediaShellReview contentRoute moderationRoute populatedCommunities />,
};

export const MediaShellCollapsed: Story = {
  name: "Media shell / Collapsed icon rail",
  render: () => <MediaShellReview collapsed />,
};

export const MediaShellCommunities: Story = {
  name: "Media shell / Communities populated",
  render: () => <MediaShellReview populatedCommunities />,
};

export const MediaShellWithDock: Story = {
  name: "Media shell / Comments dock open",
  render: () => <MediaShellReview dockOpen populatedCommunities />,
};

export const DesktopShellArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  render: () => <ShellChrome />,
};

export const DesktopShellPseudo: Story = {
  globals: {
    direction: "auto",
    locale: "pseudo",
  },
  render: () => <ShellChrome />,
};

export const MobileShell: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ShellChrome mobile />,
};

export const MobileShellArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ShellChrome mobile />,
};
