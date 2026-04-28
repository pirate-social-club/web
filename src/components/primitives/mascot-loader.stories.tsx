import type { Meta, StoryObj } from "@storybook/react";

import { MascotLoader } from "./mascot-loader";

const meta: Meta<typeof MascotLoader> = {
  component: MascotLoader,
  title: "Primitives / MascotLoader",
};

export default meta;

type Story = StoryObj<typeof MascotLoader>;

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    size: "md",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};
