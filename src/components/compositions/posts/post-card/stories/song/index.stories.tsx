import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowSquareOut, ArrowsClockwise, Copy, Flag, Link, ShareNetwork } from "@phosphor-icons/react";
import * as React from "react";

import { PostCard } from "../../post-card";
import type { PostCardMenuItem, PostCardProps, SongContentSpec } from "../../post-card.types";

const shareActions: NonNullable<PostCardProps["shareActions"]> = [
  { key: "crosspost", label: "Crosspost", icon: <ArrowsClockwise className="size-5" /> },
  { key: "copy-link", label: "Copy link", icon: <Copy className="size-5" /> },
  { key: "native-share", label: "Share...", icon: <ShareNetwork className="size-5" /> },
];

const basePostActions: PostCardMenuItem[] = [
  { key: "copy-link", label: "Copy link", icon: <Link className="size-4" /> },
  {
    key: "report",
    label: "Report",
    icon: <Flag className="size-4" />,
    destructive: true,
    separatorBefore: true,
  },
];

const basePost: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "Just dropped this track - let me know what you think",
  engagement: { score: 891, commentCount: 63 },
  shareActions,
  menuItems: basePostActions,
  onMenuAction: () => undefined,
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
  name: "Metadata / Genius annotations in menu",
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

export const StoryRegisteredAssetMenu: Story = {
  name: "Story / Registered asset menu",
  render: () => (
    <PostCard
      {...basePost}
      title="Registered Story asset"
      content={{
        ...baseSong,
        title: "Travel Guide (Tech House Remix)",
        artist: "4D Monster Lobsters",
        artworkSrc: "https://picsum.photos/seed/pirate-story-registered/240/240",
      }}
      menuItems={[
        ...basePostActions,
        { key: "view-story", label: "View on Story", icon: <ArrowSquareOut className="size-4" />, separatorBefore: true },
      ]}
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

export const PublicStreamOnly: Story = {
  name: "Access / Public stream-only",
  render: () => (
    <PostCard
      {...basePost}
      title="Public stream, no download"
      content={{
        ...baseSong,
        accessMode: "public",
        downloadPolicy: "stream_only",
      }}
    />
  ),
};

export const PublicFreeDownload: Story = {
  name: "Access / Public free download menu",
  render: () => (
    <PostCard
      {...basePost}
      title="Free download enabled"
      content={{
        ...baseSong,
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        storageProofs: {
          original: {
            cid: "bafyoriginalsongproof",
            gatewayUrl: "https://dweb.link/ipfs/bafyoriginalsongproof",
          },
        },
      }}
    />
  ),
};

export const LockedPreview: Story = {
  name: "Access / Locked listed Buy",
  render: () => (
    <PostCard
      {...basePost}
      title="Just dropped this track - let me know what you think"
      content={{
        ...baseSong,
        accessMode: "locked",
        previewDurationMs: 30000,
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        onBuy: noop,
        storageProofs: {
          preview: {
            cid: "bafypreviewsongproof",
            gatewayUrl: "https://dweb.link/ipfs/bafypreviewsongproof",
          },
        },
      }}
    />
  ),
};

export const LockedWithVinyl: Story = {
  name: "Access / Locked listed vinyl",
  render: () => (
    <PostCard
      {...basePost}
      title="Vinyl now available"
      content={{
        ...baseSong,
        caption: "Full track is streaming below. Vinyl is available offsite.",
        accessMode: "locked",
        previewDurationMs: 30000,
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        vinylRelease: {
          available: true,
          provider: "elasticstage",
          url: "https://elasticstage.com/kevin-tameimpala/releases/midnight-waves",
        },
        onBuy: noop,
      }}
    />
  ),
};

export const LockedOwned: Story = {
  name: "Access / Owned with download",
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
        onDownload: noop,
      }}
    />
  ),
};

export const LockedOwnedWithVinyl: Story = {
  name: "Access / Owned with vinyl",
  render: () => (
    <PostCard
      {...basePost}
      title="Purchased track with vinyl"
      content={{
        ...baseSong,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        vinylRelease: {
          available: true,
          provider: "elasticstage",
          url: "https://elasticstage.com/kevin-tameimpala/releases/midnight-waves",
        },
      }}
    />
  ),
};

export const FreeOriginalDownload: Story = {
  name: "Downloads / Original",
  render: () => (
    <PostCard
      {...basePost}
      title="Original download"
      content={{
        ...baseSong,
        caption: "Original file is available directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
      }}
    />
  ),
};

export const FreeOriginalInstrumentalDownload: Story = {
  name: "Downloads / Original + Instrumental",
  render: () => (
    <PostCard
      {...basePost}
      title="Original and instrumental downloads"
      content={{
        ...baseSong,
        caption: "Original file and instrumental are available directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          {
            kind: "instrumental",
            durationLabel: "3:47",
            durationMs: 227000,
            accessPolicy: "free",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

export const FreeOriginalVocalsDownload: Story = {
  name: "Downloads / Original + Vocals",
  render: () => (
    <PostCard
      {...basePost}
      title="Original and vocal downloads"
      content={{
        ...baseSong,
        caption: "Original file and vocal stem are available directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          {
            kind: "vocals",
            label: "Vocals",
            durationLabel: "3:45",
            durationMs: 225000,
            accessPolicy: "free",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

export const FreeDownloadWithStems: Story = {
  name: "Downloads / Original + Instrumental + Vocals",
  render: () => (
    <PostCard
      {...basePost}
      title="Free download pack"
      content={{
        ...baseSong,
        caption: "Grab the original, instrumental, and vocal stem directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          {
            kind: "instrumental",
            durationLabel: "3:47",
            durationMs: 227000,
            accessPolicy: "free",
            onDownload: noop,
          },
          {
            kind: "vocals",
            label: "Vocals",
            durationLabel: "3:45",
            durationMs: 225000,
            accessPolicy: "free",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

export const LockedUnlistedUnlock: Story = {
  name: "Access / Locked unlisted Unlock",
  render: () => (
    <PostCard
      {...basePost}
      title="Private unlock fallback"
      content={{
        ...baseSong,
        accessMode: "locked",
        listingMode: "not_listed",
        onUnlock: noop,
      }}
    />
  ),
};

export const InlineBuy: Story = {
  name: "Regression / Song commerce footer",
  render: () => (
    <PostCard
      {...basePost}
      title="Locked song keeps commerce in the footer"
      content={{
        ...baseSong,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        onBuy: noop,
      }}
    />
  ),
};

// ============================================================================
// STEMS
// ============================================================================

export const StemsInstrumentalOnly: Story = {
  name: "Stems / Instrumental only",
  render: () => (
    <PostCard
      {...basePost}
      title="Instrumental available for download"
      content={{
        ...baseSong,
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          {
            kind: "instrumental",
            durationLabel: "3:47",
            durationMs: 227000,
            accessPolicy: "free",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

export const StemsInstrumentalAndVocals: Story = {
  name: "Stems / Instrumental + Vocals",
  render: () => (
    <PostCard
      {...basePost}
      title="Purchased track with mixed stem entitlements"
      content={{
        ...baseSong,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        onDownload: noop,
        entitledStems: ["vocals"],
        stems: [
          {
            kind: "instrumental",
            durationLabel: "3:47",
            durationMs: 227000,
            accessPolicy: "purchasers_only",
            onDownload: noop,
          },
          {
            kind: "vocals",
            label: "Acapella",
            durationLabel: "3:45",
            durationMs: 225000,
            accessPolicy: "purchasers_only",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

export const CommerceHeaderMenuDownloadsStems: Story = {
  name: "Commerce / Header menu / Downloads + stems",
  render: () => (
    <PostCard
      {...basePost}
      title="Owned track with downloadable versions"
      content={{
        ...baseSong,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        onDownload: noop,
        entitledStems: ["instrumental", "vocals"],
        stems: [
          {
            kind: "instrumental",
            accessPolicy: "inherit",
            onDownload: noop,
          },
          {
            kind: "vocals",
            accessPolicy: "inherit",
            onDownload: noop,
          },
        ],
      }}
    />
  ),
};

// ============================================================================
// LAYOUT
// ============================================================================

export const LayoutCardBaseline: Story = {
  name: "Layout / Card baseline",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        playbackState: "playing",
        progressMs: 62000,
      }}
    />
  ),
};

export const LayoutMobileFooterWrap: Story = {
  name: "Layout / Mobile footer wrap",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <PostCard
      {...basePost}
      content={{
        ...baseSong,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        onBuy: noop,
      }}
    />
  ),
};

export const WaveformSeededVisual: Story = {
  name: "Waveform / Seeded visual",
  render: () => (
    <PostCard
      {...basePost}
      title="Waveform progress state"
      content={{
        ...baseSong,
        playbackState: "playing",
        progressMs: 91000,
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
      title="Explicit single with cover art"
      content={{
        ...baseSong,
        accessMode: "locked",
        ageGatePolicy: "18_plus",
        ageGateViewerState: "proof_required",
        artworkSrc: "https://picsum.photos/seed/pirate-explicit-song-cover/240/240",
        contentSafetyState: "adult",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        title: "Midnight Waves (Explicit)",
        onBuy: noop,
        onVerifyAge: noop,
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
