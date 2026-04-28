import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";

import { StatusCard } from "../status-card";

const meta = {
  title: "Compositions/System/StatusCard",
  component: StatusCard,
  parameters: {
    layout: "centered",
  },
  args: {
    title: "Welcome aboard",
    description: "This is a default status card with no special tone.",
  },
} satisfies Meta<typeof StatusCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = {
  args: {
    title: "All set",
    description: "Your community has been created successfully.",
    tone: "success",
  },
};

export const Warning: Story = {
  args: {
    title: "Heads up",
    description: "You need to verify your identity before posting.",
    tone: "warning",
    actions: <Button size="sm">Verify</Button>,
  },
};

export const FlatOnMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  args: {
    title: "Mobile flat variant",
    description: "This card loses its rounded border and background on small viewports.",
    flatOnMobile: true,
    tone: "warning",
  },
};
