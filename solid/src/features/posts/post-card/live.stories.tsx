import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { fixtureImage, noop, shareActionsFixture } from "./fixtures";
import { PostCard } from "./post-card";
import type { LiveRoomContentSpec, PostCardProps } from "./types";

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: fixtureImage("avatar-community", 100, 100) },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  engagement: { score: 891, commentCount: 63 },
  shareActions: shareActionsFixture,
};

const baseLiveRoom: LiveRoomContentSpec = {
  type: "live_room",
  liveRoomId: "lr_friday_night_set",
  title: "Friday Night Studio Set",
  description: "A live run through the new material with a short Q&A after the set.",
  coverSrc: fixtureImage("pirate-live-room", 960, 600),
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

const duetParticipants: LiveRoomContentSpec["participants"] = [
  { role: "host", label: "kevin.tameimpala", href: "/u/kevin.tameimpala", avatarSrc: fixtureImage("avatar-host", 100, 100) },
  { role: "guest", label: "jaywatson.pirate", href: "/u/jaywatson.pirate", avatarSrc: fixtureImage("avatar-guest-1", 100, 100) },
];

const jamParticipants: LiveRoomContentSpec["participants"] = [
  ...(duetParticipants ?? []),
  { role: "guest", label: "domSimmons.pirate", href: "/u/domSimmons.pirate", avatarSrc: fixtureImage("avatar-guest-2", 100, 100) },
  { role: "guest", label: "amhood.pirate", href: "/u/amhood.pirate" },
];

const meta = {
  title: "App/Posts/PostCard/Live",
  component: PostCard,
  args: { ...basePost, content: baseLiveRoom },
  parameters: {
    docs: {
      description: {
        component:
          "Live-room post cards. Mirrors every React story state. The inline post-page viewer surface (LiveRoomViewerSurface) belongs to the live-room-viewer lane, so the post-page surface renders the cover; covers and avatars are inline SVG fixtures instead of picsum/pravatar hotlinks.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

function SurfacePair(props: { content: LiveRoomContentSpec }) {
  return (
    <div style={{ display: "grid", gap: "32px", width: "min(100vw - 32px, 760px)" }}>
      <section>
        <h2 style={{ "font-size": "14px", "font-weight": "700", "margin-block": "0 12px" }}>Feed card</h2>
        <div style={{ width: "min(100%, 560px)" }}>
          <PostCard {...basePost} content={props.content} />
        </div>
      </section>
      <section>
        <h2 style={{ "font-size": "14px", "font-weight": "700", "margin-block": "0 12px" }}>Post page</h2>
        <PostCard {...basePost} content={props.content} viewContext="post" />
      </section>
    </div>
  );
}

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
      content={{ ...baseLiveRoom, status: "ended", accessState: "ended", endedAtLabel: "1h ago" }}
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
    <SurfacePair
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


export const DuetFeedAndPostPage: Story = {
  name: "Participants / Duet feed and post page",
  render: () => (
    <SurfacePair
      content={{
        ...baseLiveRoom,
        roomKind: "duet",
        title: "Late set with a guest",
        participants: duetParticipants,
      }}
    />
  ),
};

export const MultiPerformer: Story = {
  name: "Participants / Multi-performer",
  render: () => (
    <SurfacePair
      content={{
        ...baseLiveRoom,
        roomKind: "duet",
        title: "Sunday jam session",
        participants: jamParticipants,
      }}
    />
  ),
};
