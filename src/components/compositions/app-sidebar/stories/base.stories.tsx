import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { AppHeader } from "@/components/compositions/app-shell-chrome/app-header";
import { MobileFooterNav } from "@/components/compositions/app-shell-chrome/mobile-footer-nav";
import { SidebarInset, SidebarProvider } from "@/components/primitives/sidebar";

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

const storySections = [
  {
    id: "recent",
    label: "Recent",
    defaultOpen: true,
    items: [
      { id: "c/club1", label: "c/club1" },
      { id: "c/pirate-radio", label: "c/pirate-radio" },
    ],
  },
  {
    id: "clubs",
    label: "Clubs",
    defaultOpen: true,
    items: [
      { id: "c/builders", label: "c/builders" },
      { id: "c/mixes", label: "c/mixes" },
      { id: "c/samples", label: "c/samples" },
    ],
  },
] as const;

const resourceItems = [
  { id: "blog", label: "Blog" },
  { id: "terms-of-service", label: "Terms of Service" },
  { id: "privacy-policy", label: "Privacy Policy" },
] as const;

export const DesktopShell: Story = {
  render: () => (
    <SidebarProvider>
      <AppSidebar resourceItems={resourceItems} sections={storySections} />
      <SidebarInset className="min-h-screen">
        <AppHeader searchPlaceholder="Search Pirate" />
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
  ),
};

export const MobileShell: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar resourceItems={resourceItems} sections={storySections} />
      <SidebarInset className="min-h-screen">
        <AppHeader searchPlaceholder="Search Pirate" useSidebarTrigger />
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
        <MobileFooterNav activeItem="home" />
      </SidebarInset>
    </SidebarProvider>
  ),
};
