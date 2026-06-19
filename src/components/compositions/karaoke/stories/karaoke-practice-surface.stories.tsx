import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { badMetadataRawKaraokeLines, realSongRawKaraokeLines } from "../fixtures/real-song";
import { getLyricDurationMs } from "../karaoke-timing";
import { KaraokePracticeSurface } from "../karaoke-practice-surface";
import type { KaraokeLineRating, KaraokeStageLine } from "../karaoke-lyric-stage";
import { KaraokeScoringPanel } from "../scoring/karaoke-scoring-panel";
import type { KaraokeScoringState } from "../scoring/karaoke-scoring-controller";
import { toKaraokeStageLines } from "../lyric-transform";
import { useSyntheticKaraokeClock } from "../use-synthetic-karaoke-clock";

const artworkSrc = "https://picsum.photos/seed/pirate-karaoke/160/160";

function makeScoringState(status: KaraokeScoringState["status"]): KaraokeScoringState {
  return {
    error: null,
    latestLineId: null,
    lineScores: [],
    micError: null,
    partialTranscript: status === "active" ? "down from an old Mercedes" : "",
    phase: status === "active" ? "live" : "idle",
    status,
    summary: null,
  };
}

interface SyntheticSurfacePlayerProps {
  initialTimeMs?: number;
  isLoading?: boolean;
  lines: KaraokeStageLine[];
  rating?: KaraokeLineRating | null;
  runningScore?: number;
  combo?: number;
  scoringStatus?: KaraokeScoringState["status"];
  title?: string;
}

function SyntheticSurfacePlayer({
  initialTimeMs = 0,
  isLoading = false,
  lines,
  rating = null,
  runningScore,
  combo,
  scoringStatus,
  title = "Midnight Waves",
}: SyntheticSurfacePlayerProps) {
  const durationMs = React.useMemo(() => getLyricDurationMs(lines), [lines]);
  const clock = useSyntheticKaraokeClock({ durationMs, initialTimeMs });
  const scoringPanel = scoringStatus
    ? (
      <KaraokeScoringPanel
        canStart
        onStart={() => undefined}
        state={makeScoringState(scoringStatus)}
      />
    )
    : null;

  return (
    <KaraokePracticeSurface
      artistName="The Castaways"
      artworkSrc={artworkSrc}
      combo={combo}
      currentTimeMs={clock.currentTimeMs}
      durationMs={durationMs}
      isLoading={isLoading}
      isPlaying={clock.isPlaying}
      lines={lines}
      onExit={() => undefined}
      onPause={clock.pause}
      onPlay={clock.play}
      onReset={clock.reset}
      onSeek={clock.seek}
      rating={rating}
      runningScore={runningScore}
      scoringPanel={scoringPanel}
      title={title}
    />
  );
}

const meta = {
  title: "Compositions/Karaoke/KaraokePracticeSurface",
  component: KaraokePracticeSurface,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof KaraokePracticeSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Visual: Story = {
  render: function VisualRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return <SyntheticSurfacePlayer lines={lines} />;
  },
};

export const Loading: Story = {
  render: function LoadingRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return <SyntheticSurfacePlayer isLoading lines={lines} />;
  },
};

export const Empty: Story = {
  render: () => (
    <SyntheticSurfacePlayer
      lines={[]}
      title="No Timed Lyrics"
    />
  ),
};

export const BadMetadata: Story = {
  render: function BadMetadataRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(badMetadataRawKaraokeLines), []);

    return <SyntheticSurfacePlayer initialTimeMs={1250} lines={lines} title="Alignment Cleanup" />;
  },
};

export const LongLine: Story = {
  render: function LongLineRender() {
    const lines = React.useMemo(() => {
      const allLines = toKaraokeStageLines(realSongRawKaraokeLines);
      const longLine = allLines.find((line) => line.id === "long-two-row-line");

      return longLine ? [longLine] : allLines;
    }, []);

    return <SyntheticSurfacePlayer lines={lines} title="Final Note" />;
  },
};

export const MobileWidth: Story = {
  render: function MobileWidthRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return (
      <div className="mx-auto max-w-sm">
        <SyntheticSurfacePlayer lines={lines} />
      </div>
    );
  },
};

export const ScoringIdle: Story = {
  render: function ScoringIdleRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return <SyntheticSurfacePlayer lines={lines} scoringStatus="idle" />;
  },
};

export const ScoringListening: Story = {
  render: function ScoringListeningRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);
    const rating: KaraokeLineRating = {
      lineId: "line-1",
      key: "story-1",
      label: "Perfect",
      points: 94,
      tone: "success",
    };

    return (
      <SyntheticSurfacePlayer
        combo={3}
        initialTimeMs={9200}
        lines={lines}
        rating={rating}
        runningScore={246}
        scoringStatus="active"
      />
    );
  },
};
