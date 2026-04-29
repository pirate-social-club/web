import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityAvatar } from "./community-avatar";

const meta = {
  title: "Primitives/CommunityAvatar",
  component: CommunityAvatar,
  args: {
    communityId: "cmt_atlas",
    displayName: "Atlas Gardens",
    size: "md",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof CommunityAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <CommunityAvatar communityId="cmt_tide" displayName="Tide Room" size="xs" />
      <CommunityAvatar communityId="cmt_atlas" displayName="Atlas Gardens" size="sm" />
      <CommunityAvatar communityId="cmt_signal" displayName="Signal Room" size="md" />
      <CommunityAvatar communityId="cmt_foundry" displayName="Foundry Operators" size="lg" />
    </div>
  ),
};
