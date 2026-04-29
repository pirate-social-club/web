import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Feed } from "../feed";
import { RecentPostRail } from "../recent-post-rail";
import {
  CommunityFlairControls,
  StoryRail,
  TopTimeRangeControl,
  communityRailItems,
  homeFeedItems,
  recentPostRailItems,
  sortOptions,
  tameImpalaCommunity,
  tameImpalaFeedItems,
  translatedMixItems,
  yourSpacesRailItems,
  yourCommunitiesFeedItems,
} from "./story-fixtures";

const meta = {
  title: "Compositions/Posts/Feed",
  component: Feed,
  args: {
    items: [],
    title: "Feed",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ padding: 16 }}>
        <div style={{ margin: "0 auto", width: "min(100%, 1200px)" }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomeMixed: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        aside={<RecentPostRail items={recentPostRailItems} title="Recent posts" />}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={homeFeedItems}
        onSortChange={setActiveSort}
      />
    );
  },
};

export const HomeRecentPostsRail: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        aside={<RecentPostRail items={recentPostRailItems} title="Recent posts" />}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={homeFeedItems}
        onSortChange={setActiveSort}
      />
    );
  },
};

export const HomeLoadingMore: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        aside={<RecentPostRail items={recentPostRailItems} title="Recent posts" />}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={homeFeedItems}
        loading
        onSortChange={setActiveSort}
      />
    );
  },
};

export const YourCommunitiesEmpty: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("new");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        emptyState={{
          title: "No posts yet.",
          body: "Join a few communities or start one to make this feed useful.",
          action: <Button variant="secondary">Create community</Button>,
        }}
        items={[]}
        onSortChange={setActiveSort}
      />
    );
  },
};

export const CommunityWithFlairFilter: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        aside={<StoryRail items={communityRailItems} title="Community" />}
        availableSorts={sortOptions}
        controls={
          <>
            {activeSort === "top" ? (
              <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
            ) : null}
            <CommunityFlairControls />
          </>
        }
        items={tameImpalaFeedItems}
        fullBleedMobile
        listClassName="border-t-0 md:rounded-none md:border-x-0 md:border-t md:bg-transparent"
        onSortChange={setActiveSort}
      />
    );
  },
};

export const MixedTranslatedAndOriginal: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={translatedMixItems}
        onSortChange={setActiveSort}
      />
    );
  },
};

export const MobileHome: Story = {
  args: {},
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={homeFeedItems}
        onSortChange={setActiveSort}
      />
    );
  },
};

export const MobileCommunity: Story = {
  args: {},
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        availableSorts={sortOptions}
        controls={
          <>
            {activeSort === "top" ? (
              <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
            ) : null}
            <CommunityFlairControls />
          </>
        }
        items={tameImpalaFeedItems}
        fullBleedMobile
        listClassName="border-t-0 md:rounded-none md:border-x-0 md:border-t md:bg-transparent"
        onSortChange={setActiveSort}
      />
    );
  },
};

export const YourCommunitiesMixed: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("new");
    const [topRange, setTopRange] = React.useState("day");

    return (
      <Feed
        activeSort={activeSort}
        aside={<StoryRail items={yourSpacesRailItems} title="Your spaces" />}
        availableSorts={sortOptions}
        controls={
          activeSort === "top" ? (
            <TopTimeRangeControl onValueChange={setTopRange} value={topRange} />
          ) : undefined
        }
        items={yourCommunitiesFeedItems}
        onSortChange={setActiveSort}
      />
    );
  },
};
