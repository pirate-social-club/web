import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommentPill } from "./comment-pill";

const meta = {
  title: "Primitives/CommentPill",
  component: CommentPill,
  args: {
    count: 24,
  },
} satisfies Meta<typeof CommentPill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DenseCounts: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <CommentPill count={0} />
      <CommentPill count={8} />
      <CommentPill count={124} />
    </div>
  ),
};
