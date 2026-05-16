import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { LiveRoomBanner } from "../live-room-banner";
import type { LiveRoomBannerProps } from "../live-room-banner";

const baseBanner: LiveRoomBannerProps = {
  liveRoomId: "lr_friday_night_set",
  role: "host",
  status: "scheduled",
  title: "Live room ready",
  anchorPostUrl: "https://pirate.local/p/pst_friday_night_set",
  shareUrl: "https://pirate.local/p/pst_friday_night_set",
  freedomHref: "freedom://live-room?roomId=lr_friday_night_set&communityId=cmt_tameimpala&apiBase=https%3A%2F%2Fapi.pirate.local",
};

const noop = () => {};

const meta = {
  title: "Compositions/Posts/LiveRoomBanner",
  component: LiveRoomBanner,
  args: baseBanner,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[280px] bg-background pt-8 text-foreground">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-border-soft">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LiveRoomBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HostView: Story = {
  name: "Host / Share and broadcast",
  render: () => <LiveRoomBanner {...baseBanner} />,
};

export const GuestAccepted: Story = {
  name: "Guest / Accepted performer",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      guestInviteStatus="accepted"
      role="guest"
      title="Guest performer accepted"
    />
  ),
};

export const GuestPending: Story = {
  name: "Guest / Pending invite",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      freedomHref={undefined}
      guestInviteStatus="pending"
      role="guest"
      title="Guest invite pending"
    />
  ),
};

export const ViewerWaiting: Story = {
  name: "Viewer / Waiting",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessLabel="Free room. Come back when the host goes live."
      freedomHref={undefined}
      role="viewer"
      title="Concert scheduled"
    />
  ),
};

export const ViewerLiveAllowed: Story = {
  name: "Viewer / Watch live",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessState="allowed"
      freedomHref={undefined}
      onWatch={noop}
      role="viewer"
      status="live"
      title="Concert is live"
    />
  ),
};

export const ViewerNeedsTicket: Story = {
  name: "Viewer / Needs ticket",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessState="purchase_required"
      agentPurchaseUrl="https://pirate.local/.well-known/x402/live/lr_friday_night_set"
      freedomHref={undefined}
      onBuyTicket={noop}
      priceLabel="$12.00"
      role="viewer"
      title="Ticket required"
    />
  ),
};

export const ViewerNeedsGate: Story = {
  name: "Viewer / Needs gate",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessState="gate_required"
      freedomHref={undefined}
      onGate={noop}
      role="viewer"
      title="Members-only concert"
    />
  ),
};

export const PaidMissingListing: Story = {
  name: "Setup / Paid missing listing",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessState="missing_listing"
      freedomHref={undefined}
      role="host"
      title="Ticket setup incomplete"
    />
  ),
};

export const RoomEnded: Story = {
  name: "State / Ended",
  render: () => (
    <LiveRoomBanner
      {...baseBanner}
      accessState="ended"
      freedomHref={undefined}
      role="viewer"
      status="ended"
      title="Concert ended"
    />
  ),
};

export const MobileHost: Story = {
  name: "Mobile / Host",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <LiveRoomBanner {...baseBanner} />,
};
