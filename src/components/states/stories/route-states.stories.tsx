import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmptyFeedState } from "../empty-feed-state";
import { FullPageSpinner } from "../full-page-spinner";
import { RouteLoadFailureState, RootAppErrorState } from "../route-error-states";

const meta = {
  title: "App/Route States",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyFeed: Story = {
  render: () => <EmptyFeedState message="No posts yet. Check back later." />,
};

export const FullPageLoading: Story = {
  render: () => <FullPageSpinner />,
};

export const RouteLoadFailure: Story = {
  render: () => (
    <RouteLoadFailureState
      title="Community"
      description="We could not load this community. It may have been removed or you may be offline."
    />
  ),
};

export const RootAppError: Story = {
  render: () => (
    <RootAppErrorState
      title="Something went wrong"
      description="The app failed to initialize. Please try reloading the page."
      reloadLabel="Reload"
    />
  ),
};
