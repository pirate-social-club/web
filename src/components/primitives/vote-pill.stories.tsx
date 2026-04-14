import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { VotePill } from "./vote-pill";

const meta = {
  title: "Primitives/VotePill",
  component: VotePill,
  args: {
    score: 1240,
  },
} satisfies Meta<typeof VotePill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: (args) => {
    const [viewerVote, setViewerVote] = React.useState<"up" | "down" | null>(null);

    return (
      <VotePill
        {...args}
        onVote={setViewerVote}
        viewerVote={viewerVote}
      />
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <VotePill score={18} />
      <VotePill score={321} viewerVote="up" />
      <VotePill score={-4} viewerVote="down" />
    </div>
  ),
};
