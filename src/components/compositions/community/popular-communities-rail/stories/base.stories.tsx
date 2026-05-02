import type { Meta, StoryObj } from "@storybook/react-vite";

import { PopularCommunitiesRail } from "../popular-communities-rail";

const meta = {
  title: "Compositions/Community/Popular Communities Rail",
  component: PopularCommunitiesRail,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PopularCommunitiesRail>;

export default meta;

type Story = StoryObj<typeof meta>;

const popularCommunities = [
  {
    communityId: "cmt_destiny",
    communityLabel: "c/DestinyTheGame",
    communityHref: "/c/destiny",
    avatarSrc: null,
    metricCount: 3_354_929,
    metricLabel: "views",
  },
  {
    communityId: "cmt_anime",
    communityLabel: "c/anime",
    communityHref: "/c/anime",
    avatarSrc: null,
    metricCount: 14_246_777,
    metricLabel: "views",
  },
  {
    communityId: "cmt_destiny2",
    communityLabel: "c/destiny2",
    communityHref: "/c/destiny2",
    avatarSrc: null,
    metricCount: 930_309,
    metricLabel: "views",
  },
  {
    communityId: "cmt_fortnite",
    communityLabel: "c/FortNiteBR",
    communityHref: "/c/fortnite",
    avatarSrc: null,
    metricCount: 5_653_387,
    metricLabel: "views",
  },
  {
    communityId: "cmt_dnd",
    communityLabel: "c/dndnext",
    communityHref: "/c/dndnext",
    avatarSrc: null,
    metricCount: 817_992,
    metricLabel: "views",
  },
];

export const Default: Story = {
  args: {
    items: popularCommunities,
  },
  render: (args) => (
    <div className="w-80">
      <PopularCommunitiesRail {...args} />
    </div>
  ),
};

export const WithoutFooter: Story = {
  args: {
    items: popularCommunities.slice(0, 3),
    title: "Popular Communities",
  },
  render: (args) => (
    <div className="w-80">
      <PopularCommunitiesRail {...args} />
    </div>
  ),
};

export const SingleItem: Story = {
  args: {
    items: [popularCommunities[0]],
  },
  render: (args) => (
    <div className="w-80">
      <PopularCommunitiesRail {...args} />
    </div>
  ),
};
