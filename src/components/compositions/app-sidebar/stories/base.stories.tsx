import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { SidebarInset, SidebarProvider } from "@/components/compositions/sidebar/sidebar";

import { AppSidebar } from "../app-sidebar";

const meta = {
  title: "Compositions/AppSidebar",
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
  const primaryItems = [
    { id: "home", icon: House, label: copy.appSidebar.homeLabel },
    {
      id: "your-communities",
      icon: Flag,
      label: copy.appSidebar.yourCommunitiesLabel,
    },
    {
      id: "create-community",
      icon: Plus,
      label: copy.appSidebar.createCommunityLabel,
    },
  ] as const;

  if (mobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar
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

export const DesktopShell: Story = {
  render: () => <ShellChrome />,
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
