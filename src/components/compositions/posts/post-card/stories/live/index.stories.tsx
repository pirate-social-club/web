import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { LiveRoomContentSpec, PostCardProps } from "../../post-card.types";

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  engagement: { score: 891, commentCount: 63 },
};

const baseLiveRoom: LiveRoomContentSpec = {
  type: "live_room",
  liveRoomId: "lr_friday_night_set",
  title: "Friday Night Studio Set",
  description: "A live run through the new material with a short Q&A after the set.",
  coverSrc: "https://picsum.photos/seed/pirate-live-room/960/600",
  roomKind: "solo",
  status: "scheduled",
  accessMode: "free",
  visibility: "public",
  accessState: "waiting",
  startsAtLabel: "Fri 8:00 PM",
  concertHref: "/p/pst_friday_night_set",
  anchorPostHref: "/p/pst_friday_night_set",
  shareUrl: "https://pirate.local/p/pst_friday_night_set",
};

const noop = () => {};

const meta = {
  title: "Compositions/Posts/PostCard/Live",
  component: PostCard,
  args: { ...basePost, content: baseLiveRoom },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ScheduledFree: Story = {
  name: "State / Scheduled free",
  render: () => <PostCard {...basePost} content={baseLiveRoom} />,
};

export const LiveNow: Story = {
  name: "State / Live now",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        status: "live",
        accessState: "allowed",
        liveSinceLabel: "12m",
        attendeeCountLabel: "1.2k watching",
        onWatch: noop,
      }}
    />
  ),
};

export const Ended: Story = {
  name: "State / Ended",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        status: "ended",
        accessState: "ended",
        endedAtLabel: "1h ago",
      }}
    />
  ),
};

export const PaidNeedsTicket: Story = {
  name: "Access / Paid needs ticket",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "purchase_required",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$12.00",
        onBuy: noop,
      }}
    />
  ),
};

export const PaidOwned: Story = {
  name: "Access / Paid owned",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "allowed",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$12.00",
      }}
    />
  ),
};

export const GatedAccess: Story = {
  name: "Access / Gated",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "gated",
        accessState: "gate_required",
        onGate: noop,
      }}
    />
  ),
};

export const PaidMissingListing: Story = {
  name: "Access / Paid missing listing",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "missing_listing",
        listingMode: "not_listed",
      }}
    />
  ),
};

export const AgeProofRequired: Story = {
  name: "Safety / 18+ proof required",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        ageGatePolicy: "18_plus",
        contentSafetyState: "adult",
        ageGateViewerState: "proof_required",
        onVerifyAge: noop,
      }}
    />
  ),
};

export const AgentAccess: Story = {
  name: "Agent / x402 checkout",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "purchase_required",
        agentPurchaseUrl: "https://pirate.local/.well-known/x402/live/lr_friday_night_set",
        agentPurchaseLabel: "x402 ticket",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$12.00",
        onBuy: noop,
      }}
    />
  ),
};

export const MobilePaid: Story = {
  name: "Mobile / Paid needs ticket",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "purchase_required",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$12.00",
        onBuy: noop,
      }}
    />
  ),
};
