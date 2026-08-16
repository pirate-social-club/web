import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { fixtureImage, noop, shareActionsFixture } from "./fixtures";
import { PostCard } from "./post-card";
import type { PostCardProps, VideoContentSpec } from "./types";

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: fixtureImage("avatar-community", 100, 100) },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "Live session from the studio last night",
  engagement: { score: 891, commentCount: 63 },
  shareActions: shareActionsFixture,
};

const baseVideo: VideoContentSpec = {
  type: "video",
  // No real media: the poster frame carries the story states; the src stays a
  // well-known sample URL exactly like the React stories but is only fetched
  // when a viewer presses play.
  src: "https://www.w3schools.com/html/mov_bbb.mp4",
  posterSrc: fixtureImage("pirate-video", 600, 340),
  durationLabel: "4:32",
  durationMs: 272000,
  accessMode: "public",
  playbackState: "idle",
};

const meta = {
  title: "App/Posts/PostCard/Video",
  component: PostCard,
  args: { ...basePost, content: baseVideo },
  parameters: {
    docs: {
      description: {
        component:
          "Video post cards. Mirrors every React story state; the video-experience context became the onOpenVideoViewer callback, and posters are inline SVG fixtures instead of picsum hotlinks.",
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

// ============================================================================
// PLAYBACK STATES
// ============================================================================

export const Idle: Story = {
  name: "Playback / Idle",
  render: () => <PostCard {...basePost} content={{ ...baseVideo, playbackState: "idle" }} />,
};

export const Mobile: Story = {
  ...Idle,
  name: "Mobile",
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

export const Playing: Story = {
  name: "Playback / Playing",
  render: () => (
    <PostCard
      {...basePost}
      content={{ ...baseVideo, playbackState: "playing", progressMs: 85000 }}
    />
  ),
};

export const Paused: Story = {
  name: "Playback / Paused",
  render: () => (
    <PostCard
      {...basePost}
      content={{ ...baseVideo, playbackState: "paused", progressMs: 85000 }}
    />
  ),
};

export const Buffering: Story = {
  name: "Playback / Buffering",
  render: () => (
    <PostCard
      {...basePost}
      content={{ ...baseVideo, playbackState: "buffering", progressMs: 45000 }}
    />
  ),
};

// ============================================================================
// DERIVATIVE
// ============================================================================

export const UsesSongAttribution: Story = {
  name: "Derivative / Uses Song",
  render: () => (
    <PostCard
      {...basePost}
      title="Dance cut from the floor"
      content={{
        ...baseVideo,
        rightsBasis: "derivative",
        upstreamAttributions: [{
          assetId: "asset_ast_source_song_1",
          relationshipType: "references_song",
          title: "Sunset Driver",
          artist: "lena-wave.pirate",
          artistHref: "/u/lena-wave.pirate",
          href: "#source-song",
        }],
      }}
    />
  ),
};

// ============================================================================
// ACCESS STATES
// ============================================================================

export const LockedBuy: Story = {
  name: "Access / Locked Buy",
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

export const LockedUnlock: Story = {
  name: "Access / Locked Unlock",
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
        posterSrc: fixtureImage("pirate-concert", 600, 340),
        durationLabel: "1:23:45",
        durationMs: 5025000,
      }}
    />
  ),
};
