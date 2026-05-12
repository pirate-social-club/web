import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { IllustratedState } from "./illustrated-state";

const meta = {
  title: "Primitives/IllustratedState",
  component: IllustratedState,
} satisfies Meta<typeof IllustratedState>;

export default meta;

type Story = StoryObj<typeof meta>;

const errorGhost = {
  alt: "Confused pirate ghost",
  src: "/mascots/error-ghost-256.png",
  srcSet: "/mascots/error-ghost-512.webp 2x, /mascots/error-ghost-256.webp 1x",
};

export const Default: Story = {
  args: {
    description: "Something went wrong while loading this view.",
    image: errorGhost,
    title: "Could not load",
  },
};

export const WithAction: Story = {
  args: {
    action: <Button size="sm">Try again</Button>,
    description: "Refresh the request and try again.",
    image: errorGhost,
    title: "Request failed",
  },
};
