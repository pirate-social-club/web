import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { AltchaPowWidget } from "../altcha-pow-widget";

const readyChallenge = {
  algorithm: "SHA-256",
  challenge: "0000000000000000000000000000000000000000000000000000000000000000",
  maxnumber: 1000,
  salt: "storybook",
  signature: "storybook-signature",
};

const meta = {
  title: "Compositions/Verification/AltchaPowWidget",
  component: AltchaPowWidget,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="max-w-md bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  args: {
    action: "community:storybook",
    onPayloadChange: () => {},
    scope: "community_join",
  },
} satisfies Meta<typeof AltchaPowWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    challengeLoader: () => new Promise(() => {}),
  },
};

export const Ready: Story = {
  args: {
    challengeLoader: async () => readyChallenge,
  },
};

export const Error: Story = {
  args: {
    challengeLoader: async () => {
      throw new Error("Could not start browser anti-bot check.");
    },
  },
};
