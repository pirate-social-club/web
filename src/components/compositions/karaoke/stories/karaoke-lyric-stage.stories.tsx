import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";

import { MediaControlButton } from "@/components/primitives/media-control-button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { badMetadataRawKaraokeLines, realSongRawKaraokeLines } from "../fixtures/real-song";
import { getLyricDurationMs } from "../karaoke-timing";
import { KaraokeLyricStage, type KaraokeLineRating, type KaraokeStageLine } from "../karaoke-lyric-stage";
import { toKaraokeStageLines } from "../lyric-transform";
import { useSyntheticKaraokeClock } from "../use-synthetic-karaoke-clock";

const classicLines: KaraokeStageLine[] = [
  {
    id: "classic-1",
    text: "Step into the light",
    startMs: 900,
    endMs: 3600,
    tokens: [
      { text: "Step", startMs: 900, endMs: 1500, trailing: " " },
      { text: "into", startMs: 1500, endMs: 2200, trailing: " " },
      { text: "the", startMs: 2200, endMs: 2600, trailing: " " },
      { text: "light", startMs: 2600, endMs: 3600, trailing: "" },
    ],
  },
  {
    id: "classic-2",
    text: "Keep the chorus tight",
    startMs: 4300,
    endMs: 7600,
    tokens: [
      { text: "Keep", startMs: 4300, endMs: 5000, trailing: " " },
      { text: "the", startMs: 5000, endMs: 5500, trailing: " " },
      { text: "chorus", startMs: 5500, endMs: 6700, trailing: " " },
      { text: "tight", startMs: 6700, endMs: 7600, trailing: "" },
    ],
  },
  {
    id: "classic-3",
    text: "Then let the last word ring",
    startMs: 8700,
    endMs: 12600,
    tokens: [
      { text: "Then", startMs: 8700, endMs: 9400, trailing: " " },
      { text: "let", startMs: 9400, endMs: 9860, trailing: " " },
      { text: "the", startMs: 9860, endMs: 10240, trailing: " " },
      { text: "last", startMs: 10240, endMs: 11000, trailing: " " },
      { text: "word", startMs: 11000, endMs: 11800, trailing: " " },
      { text: "ring", startMs: 11800, endMs: 12600, trailing: "" },
    ],
  },
];

const meta = {
  title: "Compositions/Karaoke/KaraokeLyricStage",
  component: KaraokeLyricStage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof KaraokeLyricStage>;

export default meta;

type Story = StoryObj<typeof meta>;

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

interface KaraokeStoryPlayerProps {
  className?: string;
  initialTimeMs?: number;
  lines: KaraokeStageLine[];
  rating?: KaraokeLineRating | null;
}

function KaraokeStoryPlayer({ className, initialTimeMs = 0, lines, rating }: KaraokeStoryPlayerProps) {
  const durationMs = React.useMemo(() => getLyricDurationMs(lines), [lines]);
  const clock = useSyntheticKaraokeClock({ durationMs, initialTimeMs });
  const progressPct = durationMs > 0 ? Math.min(100, Math.max(0, (clock.currentTimeMs / durationMs) * 100)) : 0;

  return (
    <div className={cn("flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-8", className)}>
      <div className="flex w-full max-w-5xl flex-col gap-4">
        <div className="min-h-96 overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
          <KaraokeLyricStage currentTimeMs={clock.currentTimeMs} lines={lines} rating={rating} />
        </div>

        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-border-soft bg-card p-4 shadow-sm">
          <MediaControlButton
            aria-label={clock.isPlaying ? "Pause" : "Play"}
            onClick={clock.toggle}
            size="md"
          >
            {clock.isPlaying ? <Pause className="size-5" weight="fill" /> : <Play className="size-5" weight="fill" />}
          </MediaControlButton>

          <MediaControlButton
            aria-label="Reset"
            intent="subtle"
            onClick={clock.reset}
            size="md"
          >
            <ArrowCounterClockwise className="size-5" weight="bold" />
          </MediaControlButton>

          <div aria-hidden="true" className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <Type as="span" className="min-w-[9ch] shrink-0 whitespace-nowrap text-right" variant="caption">
            {formatTime(clock.currentTimeMs)} / {formatTime(durationMs)}
          </Type>
        </div>
      </div>
    </div>
  );
}

export const Classic: Story = {
  render: () => <KaraokeStoryPlayer lines={classicLines} />,
};

export const RealSongFixture: Story = {
  render: function RealSongFixtureRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return <KaraokeStoryPlayer lines={lines} />;
  },
};

export const BadMetadataFixture: Story = {
  render: function BadMetadataFixtureRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(badMetadataRawKaraokeLines), []);

    return <KaraokeStoryPlayer initialTimeMs={1250} lines={lines} />;
  },
};

export const MobileWidth: Story = {
  render: function MobileWidthRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return (
      <div className="mx-auto max-w-sm">
        <KaraokeStoryPlayer lines={lines} />
      </div>
    );
  },
};

export const CompactLineGap: Story = {
  args: {
    currentTimeMs: 5200,
    lineStepPx: 56,
    lines: classicLines,
  },
};

const ratingCycle: KaraokeLineRating[] = [
  { lineId: "classic-1", key: "0", label: "Perfect", points: 95, tone: "success" },
  { lineId: "classic-2", key: "1", label: "Great", points: 82, tone: "info" },
  { lineId: "classic-3", key: "2", label: "Good", points: 58, tone: "warning" },
  { lineId: "classic-4", key: "3", label: "Miss", points: 12, tone: "destructive" },
];

export const RatingPop: Story = {
  render: function RatingPopRender() {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
      const id = window.setInterval(() => {
        setIndex((current) => (current + 1) % ratingCycle.length);
      }, 2200);
      return () => window.clearInterval(id);
    }, []);

    return <KaraokeStoryPlayer initialTimeMs={2400} lines={classicLines} rating={ratingCycle[index]} />;
  },
};
