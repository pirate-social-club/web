import type { Meta, StoryObj } from "@storybook/react-vite";
import { Globe, Lock } from "@phosphor-icons/react";

import { OptionCard } from "./option-card";

const meta = {
  title: "Primitives/OptionCard",
  component: OptionCard,
  args: {
    title: "Open community",
    description: "Anyone can read and join from the feed.",
  },
} satisfies Meta<typeof OptionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-3">
      <OptionCard
        icon={<Globe className="size-5" />}
        title="Open community"
        description="Anyone can read and join from the feed."
      />
      <OptionCard
        icon={<Lock className="size-5" />}
        selected
        title="Gated community"
        description="Access stays limited until verification passes."
      />
      <OptionCard
        disabled
        title="Invite-only launch"
        description="Reserved for a later rollout."
        disabledHint="Available after initial moderation setup."
      />
    </div>
  ),
};
