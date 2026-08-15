import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Button, IconButton, Type } from "@pirate/web-solid-ui";

import { MobileRouteShell } from "./mobile-route-shell";

const meta = {
  title: "App/Shell/MobileRouteShell",
  component: MobileRouteShell,
  parameters: {
    layout: "fullscreen",
  },
  globals: {
    viewport: { value: "mobile2", isRotated: false },
  },
} satisfies Meta<typeof MobileRouteShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Create post",
    children: (
      <div class="space-y-4">
        <Type as="h2" variant="h3">Draft details</Type>
        <Type as="p" variant="body" class="text-muted-foreground">
          Mobile route content sits below the fixed page header and fills the
          available screen height.
        </Type>
      </div>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    title: "Publish",
    trailingAction: (
      <IconButton aria-label="More options" variant="ghost">
        <svg aria-hidden="true" class="size-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </IconButton>
    ),
    children: (
      <div class="space-y-4">
        <Type as="h2" variant="h3">Review your post</Type>
        <Type as="p" variant="body" class="text-muted-foreground">
          Footer actions stay outside the scrollable route body.
        </Type>
      </div>
    ),
    footer: (
      <div class="sticky bottom-0 border-t border-border bg-background p-4">
        <Button class="w-full">Continue</Button>
      </div>
    ),
  },
};
