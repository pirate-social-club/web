import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Type } from "../../../design-system";
import { YourCommunitiesPageView, type YourCommunitiesPageProps, type YourCommunitySummary } from "./your-communities-page";

const FOLLOWING: YourCommunitySummary[] = [
  { avatarSrc: null, communityId: "cmt_atlas", displayName: "Atlas Gardens", routeSlug: "atlas-gardens", updatedAt: "2026-04-27T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_signal", displayName: "Signal Room", routeSlug: "signal-room", updatedAt: "2026-04-26T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_courtyard", displayName: "Courtyard Builders", routeSlug: "courtyard-builders", updatedAt: "2026-04-25T16:00:00.000Z" },
];

const JOINED: YourCommunitySummary[] = [
  { avatarSrc: null, communityId: "cmt_foundry", displayName: "Foundry Operators", routeSlug: "foundry-operators", updatedAt: "2026-04-28T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_harbor", displayName: "Harbor Council", routeSlug: "harbor-council", updatedAt: "2026-04-24T16:00:00.000Z" },
];

const labels = {
  createCommunityLabel: "Create Community",
  emptyFollowingLabel: "No communities yet. Communities you create or join show up here.",
  emptyJoinedLabel: "Communities you join will appear here.",
  followingLabel: "Following",
  joinedLabel: "Joined",
  title: "Your Communities",
};

const baseArgs = {
  ...labels,
  followingCommunities: FOLLOWING,
  joinedCommunities: JOINED,
  onCreateCommunity: () => {},
  onSelectCommunity: () => {},
};

function YourCommunitiesStory(props: YourCommunitiesPageProps) {
  const [selected, setSelected] = createSignal<YourCommunitySummary | null>(null);
  const [selectedCount, setSelectedCount] = createSignal(0);
  const [created, setCreated] = createSignal(0);
  const following = () => props.followingCommunities;
  const joined = () => props.joinedCommunities;
  const selectedSummary = () => selected() ? JSON.stringify(selected()) : "None";
  return (
    <main class="min-h-screen bg-background px-6 py-8 text-foreground" dir="rtl">
      <YourCommunitiesPageView
        {...props}
        followingCommunities={following()}
        joinedCommunities={joined()}
        onCreateCommunity={() => setCreated((count) => count + 1)}
        onSelectCommunity={(community) => { setSelected(community); setSelectedCount((count) => count + 1); }}
      />
      <Type aria-live="polite" class="sr-only" data-testid="selection-report" variant="caption">Selected {selectedSummary()}; Selected {selectedCount()} times; Created {created()} times</Type>
    </main>
  );
}

const meta = {
  title: "Compositions/Community/YourCommunitiesPage",
  component: YourCommunitiesPageView,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
} satisfies Meta<typeof YourCommunitiesPageView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: baseArgs,
  globals: { direction: "rtl" },
  render: (args) => <YourCommunitiesStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /Atlas Gardens/ })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Signal Room/ })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Courtyard Builders/ })).toBeInTheDocument();
    const foundry = canvas.queryByRole("button", { name: /Foundry Operators/ });
    if (foundry) {
      await expect(foundry).toBeInTheDocument();
      await expect(canvas.getByRole("button", { name: /Harbor Council/ })).toBeInTheDocument();
    } else {
      await userEvent.click(canvas.getByRole("tab", { name: "Joined" }));
      await expect(canvas.getByRole("button", { name: /Foundry Operators/ })).toBeInTheDocument();
      await expect(canvas.getByRole("button", { name: /Harbor Council/ })).toBeInTheDocument();
      await userEvent.click(canvas.getByRole("tab", { name: "Following" }));
    }
    await userEvent.click(canvas.getByRole("button", { name: /Atlas Gardens/ }));
    await userEvent.click(canvas.getByRole("button", { name: /Atlas Gardens/ }));
    await expect(canvas.getByTestId("selection-report")).toHaveTextContent('Selected {"avatarSrc":null,"communityId":"cmt_atlas","displayName":"Atlas Gardens","routeSlug":"atlas-gardens","updatedAt":"2026-04-27T16:00:00.000Z"}; Selected 2 times; Created 0 times');
    const createButton = canvas.queryByRole("button", { name: "Create Community" });
    if (createButton) {
      await userEvent.click(createButton);
      await userEvent.click(createButton);
      await expect(canvas.getByTestId("selection-report")).toHaveTextContent('Selected {"avatarSrc":null,"communityId":"cmt_atlas","displayName":"Atlas Gardens","routeSlug":"atlas-gardens","updatedAt":"2026-04-27T16:00:00.000Z"}; Selected 2 times; Created 2 times');
    }
  },
};

export const Empty: Story = {
  args: { ...baseArgs, followingCommunities: [], joinedCommunities: [] },
  globals: { direction: "rtl" },
  render: (args) => <YourCommunitiesStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(labels.emptyFollowingLabel)).toHaveLength(2);
    await expect(canvas.getAllByText(labels.emptyJoinedLabel)).toHaveLength(1);
    const createButton = canvas.queryByRole("button", { name: "Create Community" });
    if (createButton) {
      await userEvent.click(createButton);
      await userEvent.click(createButton);
      await expect(canvas.getByTestId("selection-report")).toHaveTextContent("Selected None; Selected 0 times; Created 2 times");
    }
  },
};
