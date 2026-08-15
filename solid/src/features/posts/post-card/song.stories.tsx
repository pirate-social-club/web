import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { baseSongFixture, fixtureImage, noop, songPostFixture } from "./fixtures";
import { PostCard } from "./post-card";

const meta = {
  title: "App/Posts/PostCard/Song",
  component: PostCard,
  args: { ...songPostFixture, content: baseSongFixture },
  parameters: {
    docs: {
      description: {
        component:
          "Song post cards. Every React story state is mirrored with deterministic fixtures: callbacks replace router/store wiring and artwork is an inline SVG (the React stories hotlinked picsum). The React `InlineBuy` regression story is kept even though the footer-commerce branch it guarded was dead code (song commerce renders as offer rows inside the card in both versions).",
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
  render: () => <PostCard {...songPostFixture} content={{ ...baseSongFixture, playbackState: "idle" }} />,
};

export const Playing: Story = {
  name: "Playback / Playing",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{ ...baseSongFixture, playbackState: "playing", progressMs: 65000 }}
    />
  ),
};

export const Paused: Story = {
  name: "Playback / Paused",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{ ...baseSongFixture, playbackState: "paused", progressMs: 65000 }}
    />
  ),
};

export const Buffering: Story = {
  name: "Playback / Buffering",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{ ...baseSongFixture, playbackState: "buffering", progressMs: 45000 }}
    />
  ),
};

// ============================================================================
// METADATA / STORY REGISTRATION
// ============================================================================

export const WithGeniusAnnotations: Story = {
  name: "Metadata / Genius annotations in menu",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{ ...baseSongFixture, annotationsUrl: "https://genius.com/34172986" }}
    />
  ),
};

export const StoryRegistrationPending: Story = {
  name: "Story / Registration pending",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Original awaiting Story registration"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Original with Story registration failure"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Reuploaded original"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Registered Story asset"
      content={{
        ...baseSongFixture,
        title: "Travel Guide (Tech House Remix)",
        artist: "4D Monster Lobsters",
        artworkSrc: fixtureImage("pirate-story-registered", 240, 240),
      }}
      menuItems={[
        ...(songPostFixture.menuItems ?? []),
        { key: "view-story", label: "View on Story", icon: "external", separatorBefore: true },
      ]}
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
      {...songPostFixture}
      title="Public stream, no download"
      content={{ ...baseSongFixture, accessMode: "public", downloadPolicy: "stream_only" }}
    />
  ),
};

export const PublicFreeDownload: Story = {
  name: "Access / Public free download menu",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Free download enabled"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Vinyl now available"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="My new track is live"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Purchased track with vinyl"
      content={{
        ...baseSongFixture,
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

export const LockedUnlistedUnlock: Story = {
  name: "Access / Locked unlisted Unlock",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Private unlock fallback"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Locked song keeps commerce in the footer"
      content={{
        ...baseSongFixture,
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
// DOWNLOADS / STEMS
// ============================================================================

export const FreeOriginalDownload: Story = {
  name: "Downloads / Original",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Original download"
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Original and instrumental downloads"
      content={{
        ...baseSongFixture,
        caption: "Original file and instrumental are available directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          { kind: "instrumental", durationLabel: "3:47", durationMs: 227000, accessPolicy: "free", onDownload: noop },
        ],
      }}
    />
  ),
};

export const FreeOriginalVocalsDownload: Story = {
  name: "Downloads / Original + Vocals",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Original and vocal downloads"
      content={{
        ...baseSongFixture,
        caption: "Original file and vocal stem are available directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          { kind: "vocals", label: "Vocals", durationLabel: "3:45", durationMs: 225000, accessPolicy: "free", onDownload: noop },
        ],
      }}
    />
  ),
};

export const FreeDownloadWithStems: Story = {
  name: "Downloads / Original + Instrumental + Vocals",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Free download pack"
      content={{
        ...baseSongFixture,
        caption: "Grab the original, instrumental, and vocal stem directly from the post.",
        accessMode: "public",
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          { kind: "instrumental", durationLabel: "3:47", durationMs: 227000, accessPolicy: "free", onDownload: noop },
          { kind: "vocals", label: "Vocals", durationLabel: "3:45", durationMs: 225000, accessPolicy: "free", onDownload: noop },
        ],
      }}
    />
  ),
};

export const StemsInstrumentalOnly: Story = {
  name: "Stems / Instrumental only",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Instrumental available for download"
      content={{
        ...baseSongFixture,
        downloadPolicy: "free_download",
        onDownload: noop,
        stems: [
          { kind: "instrumental", durationLabel: "3:47", durationMs: 227000, accessPolicy: "free", onDownload: noop },
        ],
      }}
    />
  ),
};

export const StemsInstrumentalAndVocals: Story = {
  name: "Stems / Instrumental + Vocals",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Purchased track with mixed stem entitlements"
      content={{
        ...baseSongFixture,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        onDownload: noop,
        entitledStems: ["vocals"],
        stems: [
          { kind: "instrumental", durationLabel: "3:47", durationMs: 227000, accessPolicy: "purchasers_only", onDownload: noop },
          { kind: "vocals", label: "Acapella", durationLabel: "3:45", durationMs: 225000, accessPolicy: "purchasers_only", onDownload: noop },
        ],
      }}
    />
  ),
};

export const CommerceHeaderMenuDownloadsStems: Story = {
  name: "Commerce / Header menu / Downloads + stems",
  render: () => (
    <PostCard
      {...songPostFixture}
      title="Owned track with downloadable versions"
      content={{
        ...baseSongFixture,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        onDownload: noop,
        entitledStems: ["instrumental", "vocals"],
        stems: [
          { kind: "instrumental", accessPolicy: "inherit", onDownload: noop },
          { kind: "vocals", accessPolicy: "inherit", onDownload: noop },
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
      {...songPostFixture}
      content={{ ...baseSongFixture, playbackState: "playing", progressMs: 62000 }}
    />
  ),
};

export const LayoutMobileFooterWrap: Story = {
  name: "Layout / Mobile footer wrap",
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
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
      {...songPostFixture}
      title="Waveform progress state"
      content={{ ...baseSongFixture, playbackState: "playing", progressMs: 91000 }}
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
      {...songPostFixture}
      title="Explicit single with cover art"
      content={{
        ...baseSongFixture,
        accessMode: "locked",
        ageGatePolicy: "18_plus",
        ageGateViewerState: "proof_required",
        artworkSrc: fixtureImage("pirate-explicit-song-cover", 240, 240),
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
      {...songPostFixture}
      title="My derivative of a classic"
      content={{
        ...baseSongFixture,
        title: "Midnight Waves (Club Mix)",
        artist: "kevin.tameimpala",
        artworkSrc: fixtureImage("pirate-remix", 240, 240),
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
      {...songPostFixture}
      title="Derivative I made last night"
      content={{
        ...baseSongFixture,
        title: "Midnight Ocean Mashup",
        artist: "kevin.tameimpala",
        artworkSrc: fixtureImage("pirate-mashup", 240, 240),
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
// treatment in feed cards (same as the React source).

// ============================================================================
// LEARNING ACTIONS — Study / Karaoke / Streaks entry points
// ============================================================================

export const LearningActionsPostPage: Story = {
  name: "Learning / Post page (Sing · Study · Streaks)",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "ready" },
        onKaraoke: noop,
        study: { status: "ready", exerciseCount: 12 },
        onStudy: noop,
        onStreaks: noop,
      }}
    />
  ),
};

export const LearningActionsFeed: Story = {
  name: "Learning / Feed (Sing · Streaks via href)",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "ready" },
        karaokeHref: "#",
        study: { status: "ready", exerciseCount: 12 },
        streaksHref: "#",
      }}
    />
  ),
};

export const LearningActionsPublishing: Story = {
  name: "Learning / Publishing (Study · Sing preparing)",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "processing" },
        study: { status: "processing" },
      }}
    />
  ),
};

export const LearningActionsStudyReadySingFailed: Story = {
  name: "Learning / Study ready · Sing failed (public)",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "failed" },
        study: { status: "ready", exerciseCount: 14 },
        onStudy: noop,
      }}
    />
  ),
};

export const LearningActionsStudyReadySingFailedManager: Story = {
  name: "Learning / Study ready · Sing failed (manager)",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "failed" },
        study: { status: "ready", exerciseCount: 14 },
        viewerCanManage: true,
        onStudy: noop,
      }}
    />
  ),
};

export const LearningActionsBothReady: Story = {
  name: "Learning / Study ready · Sing ready",
  render: () => (
    <PostCard
      {...songPostFixture}
      content={{
        ...baseSongFixture,
        karaoke: { status: "ready" },
        onKaraoke: noop,
        study: { status: "ready", exerciseCount: 14 },
        onStudy: noop,
      }}
    />
  ),
};
