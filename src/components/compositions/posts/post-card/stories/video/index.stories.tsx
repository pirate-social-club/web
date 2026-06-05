import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowsClockwise, Copy, ShareNetwork } from "@phosphor-icons/react";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { PostCardProps, VideoContentSpec } from "../../post-card.types";

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
  title: "Live session from the studio last night",
  engagement: { score: 891, commentCount: 63 },
  shareActions,
};

const baseVideo: VideoContentSpec = {
  type: "video",
  src: "https://www.w3schools.com/html/mov_bbb.mp4",
  posterSrc: "https://picsum.photos/seed/pirate-video/600/340",
  durationLabel: "4:32",
  durationMs: 272000,
  accessMode: "public",
  playbackState: "idle",
};

const portraitDerivativeVideo: VideoContentSpec = {
  ...baseVideo,
  aspectRatio: 9 / 16,
  posterSrc: "https://picsum.photos/seed/pirate-portrait-video/720/1280",
  videoMode: "remix",
  rightsBasis: "derivative",
  upstreamAttributions: [
    {
      assetId: "story:ip:0xE8b3f18fBd1cC005BA187426bc2Dd0d307640605#licenseTermsId=1894",
      relationshipType: "references_song",
      title: "Story IP 0xE8b3...0605",
      href: "#",
    },
  ],
};

const squareDerivativeVideo: VideoContentSpec = {
  ...portraitDerivativeVideo,
  aspectRatio: 1,
  posterSrc: "https://picsum.photos/seed/pirate-square-video/900/900",
};

const noop = () => {};

const meta = {
  title: "Compositions/Posts/PostCard/Video",
  component: PostCard,
  args: { ...basePost, content: baseVideo },
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

// ============================================================================
// PLAYBACK STATES
// ============================================================================

export const Idle: Story = {
  name: "Playback / Idle",
  render: () => <PostCard {...basePost} content={{ ...baseVideo, playbackState: "idle" }} />,
};

export const Playing: Story = {
  name: "Playback / Playing",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseVideo,
        playbackState: "playing",
        progressMs: 85000,
      }}
    />
  ),
};

export const Paused: Story = {
  name: "Playback / Paused",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseVideo,
        playbackState: "paused",
        progressMs: 85000,
      }}
    />
  ),
};

export const Buffering: Story = {
  name: "Playback / Buffering",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseVideo,
        playbackState: "buffering",
        progressMs: 45000,
      }}
    />
  ),
};

// ============================================================================
// ACCESS STATES
// ============================================================================

export const LockedBuy: Story = {
  name: "Access / Locked listed Buy",
  render: () => (
    <PostCard
      {...basePost}
      title="Locked derivative dance video"
      content={{
        ...portraitDerivativeVideo,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
        onBuy: noop,
      }}
    />
  ),
};

export const LockedConnectToBuy: Story = {
  name: "Access / Locked listed Connect to buy",
  render: () => (
    <PostCard
      {...basePost}
      title="Logged-out buyer sees the purchase CTA"
      content={{
        ...portraitDerivativeVideo,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
        onBuy: noop,
      }}
    />
  ),
};

export const LockedListedMissingHandler: Story = {
  name: "Regression / Locked listed missing buy handler",
  render: () => (
    <PostCard
      {...basePost}
      title="Locked listed video without a route buy handler"
      content={{
        ...portraitDerivativeVideo,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
      }}
    />
  ),
};

export const LockedUnlock: Story = {
  name: "Access / Locked unlisted Unlock",
  render: () => (
    <PostCard
      {...basePost}
      title="Private studio footage - unlock required"
      content={{
        ...baseVideo,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "not_listed",
        onUnlock: noop,
      }}
    />
  ),
};

export const LockedOwned: Story = {
  name: "Access / Owned unlocked",
  render: () => (
    <PostCard
      {...basePost}
      title="Full session unlocked"
      content={{
        ...portraitDerivativeVideo,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
      }}
    />
  ),
};

export const PortraitDerivativeBuyFooter: Story = {
  name: "Regression / Portrait derivative commerce footer",
  render: () => (
    <PostCard
      {...basePost}
      title="9:16 derivative video keeps commerce below the frame"
      content={{
        ...portraitDerivativeVideo,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
        onBuy: noop,
      }}
    />
  ),
};

export const SquareDerivativeBuyFooter: Story = {
  name: "Regression / Square derivative commerce footer",
  render: () => (
    <PostCard
      {...basePost}
      title="1:1 derivative video keeps commerce full width"
      content={{
        ...squareDerivativeVideo,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
        onBuy: noop,
      }}
    />
  ),
};

// ============================================================================
// SAFETY STATES
// ============================================================================

export const AgeProofRequired: Story = {
  name: "Safety / 18+ Proof Required",
  render: () => (
    <PostCard
      {...basePost}
      title="Explicit version - uncut studio session"
      content={{
        ...baseVideo,
        contentSafetyState: "adult",
        ageGatePolicy: "18_plus",
      }}
    />
  ),
};

// ============================================================================
// EDGE CASES
// ============================================================================

export const NoThumbnail: Story = {
  name: "Edge / No Thumbnail",
  render: () => (
    <PostCard
      {...basePost}
      title="Quick clip - no poster"
      content={{
        ...baseVideo,
        posterSrc: undefined,
        durationLabel: "0:15",
        durationMs: 15000,
      }}
    />
  ),
};

export const LongVideo: Story = {
  name: "Edge / Long Video (1h+)",
  render: () => (
    <PostCard
      {...basePost}
      title="Full concert livestream recording"
      content={{
        ...baseVideo,
        posterSrc: "https://picsum.photos/seed/pirate-concert/600/340",
        durationLabel: "1:23:45",
        durationMs: 5025000,
      }}
    />
  ),
};
