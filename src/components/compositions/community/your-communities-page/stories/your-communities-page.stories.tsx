import type { Meta, StoryObj } from "@storybook/react-vite";

import { YourCommunitiesPageView } from "../your-communities-page";

const followingCommunities = [
  {
    avatarSrc: null,
    communityId: "cmt_atlas",
    displayName: "Atlas Gardens",
    routeSlug: "atlas-gardens",
    updatedAt: "2026-04-27T16:00:00.000Z",
  },
  {
    avatarSrc: null,
    communityId: "cmt_signal",
    displayName: "Signal Room",
    routeSlug: "signal-room",
    updatedAt: "2026-04-26T16:00:00.000Z",
  },
  {
    avatarSrc: null,
    communityId: "cmt_courtyard",
    displayName: "Courtyard Builders",
    routeSlug: "courtyard-builders",
    updatedAt: "2026-04-25T16:00:00.000Z",
  },
];

const joinedCommunities = [
  {
    avatarSrc: null,
    communityId: "cmt_foundry",
    displayName: "Foundry Operators",
    routeSlug: "foundry-operators",
    updatedAt: "2026-04-28T16:00:00.000Z",
  },
  {
    avatarSrc: null,
    communityId: "cmt_harbor",
    displayName: "Harbor Council",
    routeSlug: "harbor-council",
    updatedAt: "2026-04-24T16:00:00.000Z",
  },
];

const meta = {
  title: "Compositions/Community/YourCommunitiesPage",
  component: YourCommunitiesPageView,
  args: {
    createCommunityLabel: "Create Community",
    emptyFollowingLabel: "No communities yet. Communities you create or join show up here.",
    emptyJoinedLabel: "Communities you join will appear here.",
    followingCommunities,
    followingLabel: "Following",
    joinedCommunities,
    joinedLabel: "Joined",
    onCreateCommunity: () => undefined,
    onSelectCommunity: () => undefined,
    title: "Your Communities",
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof YourCommunitiesPageView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <YourCommunitiesPageView {...args} />
    </main>
  ),
};

export const Empty: Story = {
  args: {
    followingCommunities: [],
    joinedCommunities: [],
  },
  render: (args) => (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <YourCommunitiesPageView {...args} />
    </main>
  ),
};
