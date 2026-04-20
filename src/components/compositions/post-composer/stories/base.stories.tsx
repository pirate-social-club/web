import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComposer } from "../post-composer";
import { baseComposer, composerDecorator } from "./story-helpers";

const meta = {
  title: "Compositions/PostComposer",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: "Overview",
  render: () => <PostComposer {...baseComposer} />,
};

export const MobileOverview: Story = {
  name: "Mobile Overview",
  parameters: {
    viewport: { defaultViewport: "mobile2" },
  },
  render: () => <PostComposer {...baseComposer} />,
};
