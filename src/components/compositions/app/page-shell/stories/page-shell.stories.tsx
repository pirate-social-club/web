import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  StandardRoutePage,
  StandaloneMobilePage,
  FullBleedMobileListSection,
  PublicRoutePage,
} from "../page-shell";
import { Type } from "@/components/primitives/type";
import { Card } from "@/components/primitives/card";

const meta = {
  title: "Compositions/App/PageShell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function FakeMobileHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-40 h-16 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-full items-center px-3">
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

function FakeMobileFooter() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="flex h-full items-center justify-around px-2">
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}

function StoryContent({ bleed = false }: { bleed?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Card className="rounded-2xl border-border-soft bg-card px-5 py-5 shadow-none">
        <Type as="h2" variant="h3" className="text-xl font-semibold">
          Page block
        </Type>
        <Type as="p" variant="body" className="mt-1 text-muted-foreground">
          This block aligns to the page gutter.
        </Type>
      </Card>
      {bleed ? (
        <FullBleedMobileListSection className="border-y border-border-soft bg-card">
          <div className="px-5 py-3">
            <Type as="div" variant="label" className="text-muted-foreground">
              Full-bleed list section
            </Type>
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border-soft px-5 py-4 last:border-b-0"
            >
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </FullBleedMobileListSection>
      ) : null}
      <Card className="rounded-2xl border-border-soft bg-card px-5 py-5 shadow-none">
        <Type as="p" variant="body" className="text-muted-foreground">
          Another block aligned to the gutter.
        </Type>
      </Card>
    </div>
  );
}

export const StandardRouteDesktop: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      <StandardRoutePage size="rail">
        <StoryContent bleed />
      </StandardRoutePage>
    </div>
  ),
};

export const StandardRouteMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <FakeMobileHeader />
      <FakeMobileFooter />
      <StandardRoutePage size="rail">
        <StoryContent bleed />
      </StandardRoutePage>
    </div>
  ),
};

export const StandaloneMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StandaloneMobilePage title="Settings" onBack={() => {}}>
      <div className="flex flex-1 flex-col gap-4 px-[var(--page-gutter-x)] py-4">
        <Card className="rounded-2xl border-border-soft bg-card px-5 py-5 shadow-none">
          <Type as="p" variant="body" className="text-muted-foreground">
            Standalone mobile page content.
          </Type>
        </Card>
      </div>
    </StandaloneMobilePage>
  ),
};

export const PublicRouteDesktop: Story = {
  render: () => (
    <PublicRoutePage size="default">
      <div className="flex flex-col gap-4 py-6">
        <Card className="rounded-2xl border-border-soft bg-card px-5 py-5 shadow-none">
          <Type as="p" variant="body" className="text-muted-foreground">
            Public route content.
          </Type>
        </Card>
      </div>
    </PublicRoutePage>
  ),
};

export const PublicRouteMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <PublicRoutePage size="default">
      <div className="flex flex-col gap-4 py-6">
        <Card className="rounded-2xl border-border-soft bg-card px-5 py-5 shadow-none">
          <Type as="p" variant="body" className="text-muted-foreground">
            Public route content.
          </Type>
        </Card>
      </div>
    </PublicRoutePage>
  ),
};
