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

function LocalFilePlaybackStory() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = React.useRef<string | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>("Choose an audio file");
  const [playbackState, setPlaybackState] = React.useState<SongContentSpec["playbackState"]>("idle");
  const [progressMs, setProgressMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState<number | undefined>(baseSong.durationMs);

  React.useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
  }, []);

  const syncProgress = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setProgressMs(Number.isFinite(audio.currentTime) ? Math.round(audio.currentTime * 1000) : 0);
    setDurationMs(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) : undefined);
  }, []);

  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setFileUrl(nextUrl);
    setFileName(file.name);
    setPlaybackState("idle");
    setProgressMs(0);
    setDurationMs(undefined);
  }, []);

  const play = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !fileUrl) return;

    setPlaybackState("buffering");
    void audio.play().catch(() => setPlaybackState("paused"));
  }, [fileUrl]);

  const pause = React.useCallback(() => {
    audioRef.current?.pause();
    setPlaybackState("paused");
  }, []);

  const seek = React.useCallback((positionMs: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = positionMs / 1000;
    setProgressMs(Math.round(positionMs));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-foreground">
        Local audio file
        <input className="mt-2 block w-full text-sm" type="file" accept="audio/*" onChange={handleFileChange} />
      </label>
      <audio
        ref={audioRef}
        src={fileUrl ?? undefined}
        onDurationChange={syncProgress}
        onEnded={() => {
          syncProgress();
          setPlaybackState("ended");
        }}
        onLoadedMetadata={syncProgress}
        onPause={() => setPlaybackState("paused")}
        onPlay={() => setPlaybackState("playing")}
        onTimeUpdate={syncProgress}
      />
      <PostCard
        {...basePost}
        title="Local playback check"
        content={{
          ...baseSong,
          title: fileName,
          caption: "This story plays a local file through the song post controls.",
          durationLabel: undefined,
          durationMs,
          onPause: pause,
          onPlay: play,
          onSeek: seek,
          playbackState,
          progressMs,
        }}
      />
    </div>
  );
}

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

export const LocalFilePlayback: Story = {
  name: "Playback / Local file",
  render: () => <LocalFilePlaybackStory />,
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

export const LockedPreviewWithVinyl: Story = {
  name: "Access / Locked with vinyl",
  render: () => (
    <PostCard
      {...basePost}
      title="Vinyl-ready single is live"
      content={{
        ...baseSong,
        accessMode: "locked",
        playbackState: "idle",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$3.99",
        vinylRelease: {
          available: true,
          provider: "elasticstage",
        },
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

export const LockedOwnedWithVinyl: Story = {
  name: "Access / Owned with vinyl link",
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
        vinylRelease: {
          available: true,
          provider: "elasticstage",
          url: "https://elasticstage.com/kevin-tameimpala/releases/midnight-waves",
        },
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
