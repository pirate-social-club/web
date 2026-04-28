import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActionBanner } from "./action-banner";
import { Button } from "./button";

const meta = {
  title: "Primitives/ActionBanner",
  component: ActionBanner,
} satisfies Meta<typeof ActionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ActionBanner
      title="Install Pirate"
      subtitle="Add to your home screen for the best experience."
      action={<Button size="sm">Install</Button>}
    />
  ),
};

export const WithoutAction: Story = {
  render: () => (
    <ActionBanner
      title="No royalties to claim"
      subtitle="Purchases will appear here."
    />
  ),
};

export const WithoutSubtitle: Story = {
  render: () => (
    <ActionBanner
      title="Royalties"
      action={<Button size="sm">Claim</Button>}
    />
  ),
};

export const SubtitleOnly: Story = {
  render: () => (
    <ActionBanner
      subtitle='Tap the Share button below, then scroll down and tap "Add to Home Screen".'
      action={<Button size="sm" variant="secondary">Back</Button>}
    />
  ),
};
