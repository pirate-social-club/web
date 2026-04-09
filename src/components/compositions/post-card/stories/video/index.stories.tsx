import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { PostCardProps, VideoContentSpec } from "../../post-card.types";

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "Live session from the studio last night",
  engagement: { score: 891, commentCount: 63 },
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

const noop = () => {};

const meta = {
  title: "Compositions/PostCard/Video",
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

export const LockedPreview: Story = {
  name: "Access / Locked (30s Preview)",
  render: () => (
    <PostCard
      {...basePost}
      title="Behind-the-scenes studio footage - pay to unlock"
      content={{
        ...baseVideo,
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

export const LockedOwned: Story = {
  name: "Access / Owned",
  render: () => (
    <PostCard
      {...basePost}
      title="Full session unlocked"
      content={{
        ...baseVideo,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
      }}
    />
  ),
};

// ============================================================================
// COMMERCE STATES
// ============================================================================

export const RegionalPricing: Story = {
  name: "Commerce / Regional Pricing",
  render: () => (
    <PostCard
      {...basePost}
      title="Exclusive tutorial - regional pricing available"
      content={{
        ...baseVideo,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
        regionalPriceLabel: "$2.49",
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
        ageGateViewerState: "proof_required",
        onVerifyAge: noop,
      }}
    />
  ),
};

// ============================================================================
// DERIVATIVE
// ============================================================================

export const ReactionVideo: Story = {
  name: "Derivative / Reaction Video",
  render: () => (
    <PostCard
      {...basePost}
      title="My reaction to the new album"
      content={{
        ...baseVideo,
        posterSrc: "https://picsum.photos/seed/pirate-reaction/600/340",
        durationLabel: "12:05",
        durationMs: 725000,
        videoMode: "reaction",
        rightsBasis: "attribution_only",
        upstreamAttributions: [
          {
            assetId: "ast_01abc",
            relationshipType: "references_song",
            title: "Midnight Waves",
            artist: "The Sailors",
          },
        ],
      }}
    />
  ),
};

export const RemixVideo: Story = {
  name: "Derivative / Video Remix",
  render: () => (
    <PostCard
      {...basePost}
      title="Remixed the visuals for this track"
      content={{
        ...baseVideo,
        posterSrc: "https://picsum.photos/seed/pirate-vremix/600/340",
        durationLabel: "3:47",
        durationMs: 227000,
        videoMode: "remix",
        rightsBasis: "derivative",
        upstreamAttributions: [
          { assetId: "ast_01abc", relationshipType: "references_video", title: "Original Music Video" },
          { assetId: "ast_02def", relationshipType: "references_song", title: "Midnight Waves", artist: "The Sailors" },
        ],
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
        videoMode: "clip",
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
