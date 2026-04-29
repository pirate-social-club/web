import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmptyInboxState } from "@/components/states/empty-inbox-state";

const meta = {
  title: "App/Route States/Empty Inbox",
  component: EmptyInboxState,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof EmptyInboxState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    description: "No notifications yet",
  },
};

export const WithTitle: Story = {
  args: {
    title: "All caught up!",
    description: "You have no new notifications right now.",
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  args: {
    description: "No notifications yet",
  },
};
