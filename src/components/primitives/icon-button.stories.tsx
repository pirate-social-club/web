import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowsClockwise, Bell, Heart } from "@phosphor-icons/react";

import { IconButton } from "./icon-button";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton aria-label="Refresh" variant="secondary">
        <ArrowsClockwise className="size-5" />
      </IconButton>
      <IconButton aria-label="Notifications" variant="ghost">
        <Bell className="size-5" />
      </IconButton>
      <IconButton aria-label="Favorite" variant="outline">
        <Heart className="size-5" />
      </IconButton>
      <IconButton aria-label="Saving" loading />
    </div>
  ),
};

export const ActiveState: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton active aria-label="Active secondary" variant="secondary">
        <Bell className="size-5" />
      </IconButton>
      <IconButton active aria-label="Active ghost" variant="ghost">
        <Heart className="size-5" />
      </IconButton>
    </div>
  ),
};
