import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowsClockwise, Copy, ShareNetwork } from "@phosphor-icons/react";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { LiveRoomContentSpec, PostCardProps } from "../../post-card.types";

const shareActions: NonNullable<PostCardProps["shareActions"]> = [
  { key: "crosspost", label: "Crosspost", icon: <ArrowsClockwise className="size-5" /> },
  { key: "copy-link", label: "Copy link", icon: <Copy className="size-5" /> },
  { key: "native-share", label: "Share...", icon: <ShareNetwork className="size-5" /> },
];

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  engagement: { score: 891, commentCount: 63 },
  shareActions,
};

const baseLiveRoom: LiveRoomContentSpec = {
  type: "live_room",
  liveRoomId: "lr_friday_night_set",
  title: "Friday Night Studio Set",
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
        endedAtLabel: "1h",
      }}
    />
  ),
};

export const EndedReplayPublishedFree: Story = {
  name: "Replay / Published free",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "free",
        accessState: "ended",
        endedAtLabel: "1h",
        hasEntitlement: true,
        onWatch: noop,
        replayDurationLabel: "48 min",
        replayStatus: "published",
        status: "ended",
      }}
    />
  ),
};

export const EndedReplayPublishedPaidNeedsTicket: Story = {
  name: "Replay / Published paid locked",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "paid",
        accessState: "ended",
        endedAtLabel: "1h",
        hasEntitlement: false,
        listingMode: "listed",
        listingStatus: "active",
        onBuy: noop,
        priceLabel: "$12.00",
        replayDurationLabel: "48 min",
        replayStatus: "published",
        status: "ended",
      }}
    />
  ),
};

export const EndedReplayProcessing: Story = {
  name: "Replay / Processing",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessState: "ended",
        endedAtLabel: "1h",
        replayDurationLabel: "48 min",
        replayStatus: "processing",
        status: "ended",
      }}
      viewContext="post"
    />
  ),
};

export const EndedReplayUnderReview: Story = {
  name: "Replay / Under review",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessState: "ended",
        endedAtLabel: "1h",
        replayDurationLabel: "48 min",
        replayStatus: "review_pending",
        status: "ended",
      }}
      viewContext="post"
    />
  ),
};

export const EndedReplayFailed: Story = {
  name: "Replay / Failed",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessState: "ended",
        endedAtLabel: "1h",
        replayDurationLabel: "48 min",
        replayStatus: "failed",
        status: "ended",
      }}
      viewContext="post"
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

export const FeedAndPostPageSurfaces: Story = {
  name: "Surface / Feed and post page",
  render: () => (
    <div style={{ display: "grid", gap: 32, width: "min(100vw - 32px, 760px)" }}>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Feed card: 16:9 cover</h2>
        <div style={{ width: "min(100%, 560px)" }}>
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
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Post page: 16:9 cover</h2>
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
          viewContext="post"
        />
      </section>
    </div>
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

export const GatedNeedsAccess: Story = {
  name: "Access / Gated needs access",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseLiveRoom,
        accessMode: "gated",
        accessState: "gate_required",
        status: "live",
        liveSinceLabel: "8m",
        onWatch: noop,
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

export const DuetFeedAndPostPage: Story = {
  name: "Participants / Duet feed and post page",
  render: () => (
    <div style={{ display: "grid", gap: 32, width: "min(100vw - 32px, 760px)" }}>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Feed card: duet with guest</h2>
        <div style={{ width: "min(100%, 560px)" }}>
          <PostCard
            {...basePost}
            content={{
              ...baseLiveRoom,
              roomKind: "duet",
              title: "Late set with a guest",
              participants: [
                { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
                { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
              ],
            }}
          />
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Post page: duet with guest</h2>
        <PostCard
          {...basePost}
          content={{
            ...baseLiveRoom,
            roomKind: "duet",
            title: "Late set with a guest",
            participants: [
              { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
              { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
            ],
          }}
          viewContext="post"
        />
      </section>
    </div>
  ),
};

export const MultiPerformer: Story = {
  name: "Participants / Multi-performer",
  render: () => (
    <div style={{ display: "grid", gap: 32, width: "min(100vw - 32px, 760px)" }}>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Feed card: 3 guests</h2>
        <div style={{ width: "min(100%, 560px)" }}>
          <PostCard
            {...basePost}
            content={{
              ...baseLiveRoom,
              roomKind: "duet",
              title: "Sunday jam session",
              participants: [
                { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
                { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
                { role: "guest", label: "domSimmons.pirate", href: "/u/domSimmons.pirate", avatarSrc: "https://i.pravatar.cc/100?img=13" },
                { role: "guest", label: "amhood.pirate", href: "/u/amhood.pirate" },
              ],
            }}
          />
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBlock: "0 12px" }}>Post page: 3 guests</h2>
        <PostCard
          {...basePost}
          content={{
            ...baseLiveRoom,
            roomKind: "duet",
            title: "Sunday jam session",
            participants: [
              { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: "https://i.pravatar.cc/100?img=11" },
              { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: "https://i.pravatar.cc/100?img=12" },
              { role: "guest", label: "domSimmons.pirate", href: "/u/domSimmons.pirate", avatarSrc: "https://i.pravatar.cc/100?img=13" },
              { role: "guest", label: "amhood.pirate", href: "/u/amhood.pirate" },
            ],
          }}
          viewContext="post"
        />
      </section>
    </div>
  ),
};
