import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import { AppHeader } from "../app-header";
import { MobileFooterNav } from "../mobile-footer-nav";

const meta = {
  title: "Compositions/AppShellChrome",
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
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function HeaderOnlyStory({
  forceMobile = false,
  isAuthenticated = true,
}: {
  forceMobile?: boolean;
  isAuthenticated?: boolean;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const bodyCopy = copy.storybook;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        forceMobile={forceMobile}
        isAuthenticated={isAuthenticated}
        labels={{
          connectLabel: copy.appHeader.connectLabel,
          createLabel: copy.appHeader.createLabel,
          homeAriaLabel: copy.appHeader.homeAriaLabel,
          notificationsAriaLabel: copy.appHeader.notificationsAriaLabel,
          openNavigationAriaLabel: copy.appHeader.openNavigationAriaLabel,
          profileAriaLabel: copy.appHeader.profileAriaLabel,
          searchAriaLabel: copy.appHeader.searchAriaLabel,
          searchPlaceholder: forceMobile
            ? copy.appHeader.searchPlaceholder
            : copy.storybook.standaloneDesktopSearchPlaceholder,
          verifyLabel: copy.appHeader.verifyLabel,
        }}
        onConnectClick={() => {}}
        onVerifyClick={() => {}}
      />
      <div className={forceMobile ? "px-3 pb-24 pt-[calc(env(safe-area-inset-top)+5rem)]" : "mx-auto max-w-5xl px-6 py-10"}>
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground md:p-8">
          {forceMobile ? bodyCopy.mobileHeaderBody : bodyCopy.desktopHeaderBody}
        </div>
      </div>
    </div>
  );
}

function FooterOnlyStory({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const bodyCopy = copy.storybook;

  return (
    <div className="min-h-screen bg-background px-3 pb-28 pt-6">
      <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
        {bodyCopy.mobileFooterBody}
      </div>
      <MobileFooterNav
        activeItem="inbox"
        forceMobile
        isAuthenticated={isAuthenticated}
        hasBrowserAuth={isAuthenticated}
        labels={{
          create: copy.mobileFooter.createLabel,
          home: copy.mobileFooter.homeLabel,
          inbox: copy.mobileFooter.inboxLabel,
          inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
          primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
          profile: copy.mobileFooter.profileLabel,
          profileAriaLabel: copy.mobileFooter.profileAriaLabel,
        }}
      />
    </div>
  );
}

function MobileChromeStory() {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell");
  const bodyCopy = copy.storybook;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        forceMobile
        isAuthenticated
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
        onVerifyClick={() => {}}
      />
      <div className="space-y-3 px-3 pb-28 pt-[calc(env(safe-area-inset-top)+5rem)]">
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
          {bodyCopy.mobileChromeLead}
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
          {bodyCopy.mobileChromeFollow}
        </div>
      </div>
      <MobileFooterNav
        activeItem="home"
        forceMobile
        isAuthenticated
        hasBrowserAuth
        labels={{
          create: copy.mobileFooter.createLabel,
          home: copy.mobileFooter.homeLabel,
          inbox: copy.mobileFooter.inboxLabel,
          inboxAriaLabel: copy.mobileFooter.inboxAriaLabel,
          primaryNavAriaLabel: copy.mobileFooter.primaryNavAriaLabel,
          profile: copy.mobileFooter.profileLabel,
          profileAriaLabel: copy.mobileFooter.profileAriaLabel,
        }}
      />
    </div>
  );
}

export const DesktopHeader: Story = {
  render: () => <HeaderOnlyStory />,
};

export const DesktopHeaderSignedOut: Story = {
  render: () => <HeaderOnlyStory isAuthenticated={false} />,
};

export const DesktopHeaderArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  render: () => <HeaderOnlyStory />,
};

export const DesktopHeaderPseudo: Story = {
  globals: {
    direction: "auto",
    locale: "pseudo",
  },
  render: () => <HeaderOnlyStory />,
};

export const MobileHeader: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <HeaderOnlyStory forceMobile />,
};

export const MobileHeaderArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <HeaderOnlyStory forceMobile />,
};

export const MobileFooter: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <FooterOnlyStory />,
};

export const MobileFooterSignedOut: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <FooterOnlyStory isAuthenticated={false} />,
};

export const MobileFooterArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <FooterOnlyStory />,
};

export const MobileChrome: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <MobileChromeStory />,
};

export const MobileChromeArabic: Story = {
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <MobileChromeStory />,
};
