import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotsThree } from "@phosphor-icons/react";

import { MobileRouteShell } from "../mobile-route-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";

const meta = {
  title: "Compositions/App/MobileRouteShell",
  component: MobileRouteShell,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile2" },
  },
} satisfies Meta<typeof MobileRouteShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Create post",
    children: (
      <div className="space-y-4">
        <Type as="h2" variant="h3">Draft details</Type>
        <Type as="p" variant="body" className="text-muted-foreground">
          Mobile route content sits below the fixed page header and fills the available screen height.
        </Type>
      </div>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    title: "Publish",
    trailingAction: (
      <Button aria-label="More options" size="icon" variant="ghost">
        <DotsThree className="size-5" />
      </Button>
    ),
    children: (
      <div className="space-y-4">
        <Type as="h2" variant="h3">Review your post</Type>
        <Type as="p" variant="body" className="text-muted-foreground">
          Footer actions stay outside the scrollable route body.
        </Type>
      </div>
    ),
    footer: (
      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <Button className="w-full">Continue</Button>
      </div>
    ),
  },
};
