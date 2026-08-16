import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Card, Type } from "../../design-system";

import {
  FullBleedMobileListSection,
  PublicRoutePage,
  StandaloneMobilePage,
  StandardRoutePage,
} from "./page-shell";

const meta = {
  title: "App/Shell/PageShell",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Route page frames: StandardRoutePage (in-shell clearance for fixed chrome), StandaloneMobilePage (own MobilePageHeader), PublicRoutePage (no auth shell), and the FullBleedMobileListSection gutter escape hatch.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fullBleedStoryRows = ["top", "middle", "bottom"] as const;

function FakeMobileHeader() {
  return (
    <div class="fixed inset-x-0 top-0 z-40 h-16 border-b border-border-soft bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div class="flex h-full items-center px-3">
        <div class="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

function FakeMobileFooter() {
  return (
    <div class="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border-soft bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div class="flex h-full items-center justify-around px-2">
        <div class="h-4 w-12 rounded bg-muted" />
        <div class="h-4 w-12 rounded bg-muted" />
        <div class="h-4 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}

function StoryContent(props: { bleed?: boolean }) {
  return (
    <div class="flex flex-1 flex-col gap-4">
      <Card class="rounded-2xl border-border-soft bg-card p-5 shadow-none">
        <Type as="h2" variant="h3">
          Page block
        </Type>
        <Type as="p" variant="body" class="mt-1 text-muted-foreground">
          This block aligns to the page gutter.
        </Type>
      </Card>
      {props.bleed ? (
        <FullBleedMobileListSection class="border-y border-border-soft bg-card">
          <div class="px-5 py-3">
            <Type as="div" variant="label" class="text-muted-foreground">
              Full-bleed list section
            </Type>
          </div>
          {fullBleedStoryRows.map((row) => (
            <div class="flex items-center gap-3 border-b border-border-soft px-5 py-4 last:border-b-0">
              <div class="size-8 rounded-full bg-muted" />
              <div class="flex-1">
                <div class="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </FullBleedMobileListSection>
      ) : null}
      <Card class="rounded-2xl border-border-soft bg-card p-5 shadow-none">
        <Type as="p" variant="body" class="text-muted-foreground">
          Another block aligned to the gutter.
        </Type>
      </Card>
    </div>
  );
}

export const StandardRouteDesktop: Story = {
  name: "Route / Standard desktop",
  render: () => (
    <div class="min-h-screen bg-background">
      <StandardRoutePage size="rail">
        <StoryContent bleed />
      </StandardRoutePage>
    </div>
  ),
};

export const StandardRouteMobile: Story = {
  name: "Route / Standard mobile",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <div class="min-h-screen bg-background">
      <FakeMobileHeader />
      <FakeMobileFooter />
      <StandardRoutePage size="rail">
        <StoryContent bleed />
      </StandardRoutePage>
    </div>
  ),
};

export const StandaloneMobile: Story = {
  name: "Route / Standalone mobile",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <StandaloneMobilePage title="Settings" onBack={() => {}}>
      <div class="flex flex-1 flex-col gap-4 px-[var(--page-gutter-x)] py-4">
        <Card class="rounded-2xl border-border-soft bg-card p-5 shadow-none">
          <Type as="p" variant="body" class="text-muted-foreground">
            Standalone mobile page content.
          </Type>
        </Card>
      </div>
    </StandaloneMobilePage>
  ),
};

export const PublicRouteDesktop: Story = {
  name: "Route / Public desktop",
  render: () => (
    <PublicRoutePage size="default">
      <div class="flex flex-col gap-4 py-6">
        <Card class="rounded-2xl border-border-soft bg-card p-5 shadow-none">
          <Type as="p" variant="body" class="text-muted-foreground">
            Public route content.
          </Type>
        </Card>
      </div>
    </PublicRoutePage>
  ),
};
