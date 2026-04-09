import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

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

export const DesktopHeader: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      <AppHeader searchPlaceholder="Find anything" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-8 text-base text-muted-foreground">
          Header is standalone. Compose it into the real app shell, not into onboarding cards.
        </div>
      </div>
    </div>
  ),
};

export const MobileHeader: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <AppHeader forceMobile searchPlaceholder="Search Pirate" />
      <div className="px-3 pb-24 pt-[calc(env(safe-area-inset-top)+5rem)]">
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
          Mobile header only.
        </div>
      </div>
    </div>
  ),
};

export const MobileFooter: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="min-h-screen bg-background px-3 pb-28 pt-6">
      <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
        Mobile footer only.
      </div>
      <MobileFooterNav activeItem="inbox" forceMobile />
    </div>
  ),
};

export const MobileChrome: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <AppHeader forceMobile searchPlaceholder="Search Pirate" />
      <div className="space-y-3 px-3 pb-28 pt-[calc(env(safe-area-inset-top)+5rem)]">
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
          Standalone shell chrome preview.
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5 text-base text-muted-foreground">
          Header and footer stay reusable and separate from onboarding.
        </div>
      </div>
      <MobileFooterNav activeItem="home" forceMobile />
    </div>
  ),
};
