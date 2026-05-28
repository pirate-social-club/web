import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { PostCardProps, SongContentSpec } from "../../post-card.types";

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "New single - check this out",
  engagement: { score: 891, commentCount: 63 },
};

const baseSong: SongContentSpec = {
  type: "song",
  title: "Midnight Waves",
  caption: "Built this around a late-night synth pass and a vocal chop from the bridge.",
  // artist omitted - same as post author (kevin.tameimpala), shown in byline
  artworkSrc: "https://picsum.photos/seed/pirate-song/240/240",
  durationLabel: "3:47",
  durationMs: 227000,
  accessMode: "public",
  playbackState: "idle",
};

const noop = () => {};

const meta = {
  title: "Compositions/Posts/PostCard/Song",
  component: PostCard,
  args: { ...basePost, content: baseSong },
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
  render: () => <PostCard {...basePost} content={{ ...baseSong, playbackState: "idle" }} />,
};

export const Playing: Story = {
  name: "Playback / Playing",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        playbackState: "playing",
        progressMs: 65000,
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
        ...baseSong,
        playbackState: "paused",
        progressMs: 65000,
      }}
    />
  ),
};

export const WithGeniusAnnotations: Story = {
  name: "Metadata / Genius annotations",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        annotationsUrl: "https://genius.com/34172986",
      }}
    />
  ),
};

export const StoryRegistrationPending: Story = {
  name: "Story / Registration pending",
  render: () => (
    <PostCard
      {...basePost}
      title="Original awaiting Story registration"
      content={{
        ...baseSong,
        storyRegistration: {
          state: "pending",
          label: "IP registration in progress",
          description: "This will appear as a remix source after Story registration completes.",
        },
      }}
    />
  ),
};

export const StoryRegistrationFailed: Story = {
  name: "Story / Registration failed",
  render: () => (
    <PostCard
      {...basePost}
      title="Original with Story registration failure"
      content={{
        ...baseSong,
        storyRegistration: {
          state: "failed",
          label: "IP registration failed",
          description: "Story royalty configuration is missing. This will not appear as a remix source until registration is retried.",
        },
      }}
    />
  ),
};

export const StoryLicenseReused: Story = {
  name: "Story / License reused after reupload",
  render: () => (
    <PostCard
      {...basePost}
      title="Reuploaded original"
      content={{
        ...baseSong,
        storyLicenseNotice: {
          label: "Story license reused",
          description: "This upload reused an existing Story registration, so it keeps the original terms: Commercial remix, 10% royalty.",
        },
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
        ...baseSong,
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
      title="Just dropped this track - let me know what you think"
      content={{
        ...baseSong,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
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
      title="My new track is live"
      content={{
        ...baseSong,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
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
      title="Explicit version - uncut"
      content={{
        ...baseSong,
        contentSafetyState: "adult",
        ageGatePolicy: "18_plus",
      }}
    />
  ),
};

// ============================================================================
// DERIVATIVE
// ============================================================================

export const RemixWithAttribution: Story = {
  name: "Derivative / Single Source",
  render: () => (
    <PostCard
      {...basePost}
      title="My derivative of a classic"
      content={{
        ...baseSong,
        title: "Midnight Waves (Club Mix)",
        artist: "kevin.tameimpala",
        artworkSrc: "https://picsum.photos/seed/pirate-remix/240/240",
        durationLabel: "4:12",
        durationMs: 252000,
        songMode: "remix",
        rightsBasis: "derivative",
        upstreamAttributions: [
          { assetId: "ast_01abc", relationshipType: "references_song", title: "Midnight Waves", artist: "The Sailors" },
        ],
      }}
    />
  ),
};

export const RemixMultipleAttributions: Story = {
  name: "Derivative / Multiple Sources",
  render: () => (
    <PostCard
      {...basePost}
      title="Derivative I made last night"
      content={{
        ...baseSong,
        title: "Midnight Ocean Mashup",
        artist: "kevin.tameimpala",
        artworkSrc: "https://picsum.photos/seed/pirate-mashup/240/240",
        songMode: "remix",
        rightsBasis: "derivative",
        upstreamAttributions: [
          { assetId: "ast_01abc", relationshipType: "references_song", title: "Midnight Waves", artist: "The Sailors" },
          { assetId: "ast_02def", relationshipType: "references_song", title: "Ocean Sounds", artist: "Nature Records" },
          { assetId: "ast_03ghi", relationshipType: "references_song", title: "Deep Blue", artist: "The Divers" },
        ],
      }}
    />
  ),
};

// Note: songMode = "original" is the default and has no distinct visual
// treatment in feed cards.
