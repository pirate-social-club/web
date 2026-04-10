import type { Meta, StoryObj } from "@storybook/react-vite";

import { PillButton } from "./pill-button";

const meta = {
  title: "Primitives/PillButton",
  component: PillButton,
  args: {
    children: "Best",
  },
} satisfies Meta<typeof PillButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    children: "Top",
    tone: "selected",
  },
};
