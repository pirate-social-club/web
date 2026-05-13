import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { ActionCalloutPanel } from "../action-callout-panel";
import { Type } from "@/components/primitives/type";

const meta = {
  title: "Compositions/Community/ActionCalloutPanel",
  component: ActionCalloutPanel,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="w-[min(100vw-2rem,840px)] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionCalloutPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPrimaryAction: Story = {
  args: {
    title: "Verify your identity to join",
    description: "Complete the ID check, then return to join.",
    action: (
      <Button className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44" size="lg">
        Verify to Join
      </Button>
    ),
  },
};

export const WithHelperLinks: Story = {
  args: {
    title: "Scan your palm to join",
    action: (
      <Button className="h-14 w-full shrink-0 px-9 text-lg shadow-sm md:w-auto md:min-w-44" size="lg">
        Verify to Join
      </Button>
    ),
    children: (
      <Type as="div" variant="caption" className="flex flex-wrap items-center gap-x-3 gap-y-1 ">
        <span>Download VeryAI app:</span>
        <a className="font-medium text-foreground underline-offset-4 hover:underline" href="https://apps.apple.com/us/app/veryai-proof-of-reality/id6746761869">
          iOS App Store
        </a>
        <a className="font-medium text-foreground underline-offset-4 hover:underline" href="https://play.google.com/store/apps/details?id=xyz.veros.app&pli=1">
          Google Play
        </a>
      </Type>
    ),
  },
};

export const Mobile: Story = {
  args: WithPrimaryAction.args,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
