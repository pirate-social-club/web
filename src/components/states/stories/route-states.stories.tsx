import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";
import { AuthRequiredRouteState } from "../auth-required-route-state";
import { EmptyFeedState } from "../empty-feed-state";
import { EmptyInboxState } from "../empty-inbox-state";
import { ErrorState } from "../error-state";
import { FullPageSpinner } from "../full-page-spinner";
import { RouteLoadFailureState, RootAppErrorState } from "../route-error-states";
import { NotFoundRouteState } from "@/app/authenticated-helpers/route-shell";

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

export const EmptyFeedMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <EmptyFeedState message="No posts yet. Check back later." />,
};

export const AuthRequired: Story = {
  render: () => (
    <AuthRequiredRouteState
      description="Sign in to view your inbox."
      title="Inbox"
    />
  ),
};

export const AuthRequiredWithIllustration: Story = {
  render: () => (
    <AuthRequiredRouteState
      ctaLabel="Connect"
      description="Get notified when someone replies, mentions you, or sends a tip."
      headline="Your inbox is waiting"
      illustration={<EmptyInboxState className="py-0" />}
      title="Inbox"
    />
  ),
};

export const AuthRequiredMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <AuthRequiredRouteState
      ctaLabel="Connect"
      description="Get notified when someone replies, mentions you, or sends a tip."
      headline="Your inbox is waiting"
      illustration={<EmptyInboxState className="py-0" />}
      title="Inbox"
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ErrorState
      action={(
        <div className="flex w-full flex-row gap-3">
          <Button className="h-12 flex-1" size="lg">Try Again</Button>
          <Button className="h-12 flex-1" size="lg" variant="secondary">Go Home</Button>
        </div>
      )}
      description="We could not load this page. It may have been removed or you may be offline."
      title="Something went wrong?"
    />
  ),
};

export const ErrorMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <ErrorState
      action={(
        <div className="flex w-full flex-row gap-3">
          <Button className="h-12 flex-1" size="lg">Try Again</Button>
          <Button className="h-12 flex-1" size="lg" variant="secondary">Go Home</Button>
        </div>
      )}
      description="We could not load this page. It may have been removed or you may be offline."
      title="Something went wrong?"
    />
  ),
};

export const FullPageLoading: Story = {
  render: () => <FullPageSpinner />,
};

export const NotFound: Story = {
  render: () => <NotFoundRouteState path="/missing" />,
};

export const NotFoundMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <NotFoundRouteState path="/missing" />,
};

export const RouteLoadFailure: Story = {
  render: () => (
    <RouteLoadFailureState
      title="Something went wrong?"
      description="We could not load this page. It may have been removed or you may be offline."
    />
  ),
};

export const RouteLoadFailureMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <RouteLoadFailureState
      title="Something went wrong?"
      description="Failed to fetch"
    />
  ),
};

export const RootAppError: Story = {
  render: () => (
    <RootAppErrorState
      title="Something went wrong?"
      description="The app failed to initialize. Please try reloading the page."
      homeLabel="Go Home"
    />
  ),
};

export const RootAppErrorMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <RootAppErrorState
      title="Something went wrong?"
      description="The app failed to initialize. Please try reloading the page."
      homeLabel="Go Home"
    />
  ),
};
