import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";

import { EmptyFeedState } from "../empty-feed-state";
import { StackPageShell } from "../stack-page-shell";
import { StatusCard } from "../status-card";

const meta = {
  title: "Compositions/System/StackPageShell",
  component: StackPageShell,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    title: "Settings",
  },
} satisfies Meta<typeof StackPageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardHeader: Story = {
  render: () => (
    <StackPageShell
      title="Settings"
      description="Manage your account preferences."
      actions={<Button variant="secondary">Save</Button>}
    >
      <StatusCard
        title="Content"
        description="This is the child content inside a card-header shell."
      />
    </StackPageShell>
  ),
};

export const PlainHeader: Story = {
  render: () => (
    <StackPageShell
      title="Moderation log"
      headerVariant="plain"
      hideTitleOnMobile
      actions={<Button variant="secondary">Export</Button>}
    >
      <EmptyFeedState message="No moderation actions yet." />
    </StackPageShell>
  ),
};
