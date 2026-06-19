import * as React from "react";
import {
  ArrowCounterClockwise,
  CaretLeft,
  Pause,
  Play,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { MediaControlButton } from "@/components/primitives/media-control-button";
import { Scrubber } from "@/components/primitives/scrubber";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  KaraokeLyricStage,
  type KaraokeLineRating,
  type KaraokeStageLine,
} from "./karaoke-lyric-stage";

export interface KaraokePracticeCompleteSummary {
  durationMs: number;
  finalTimeMs: number;
  linesCompleted: number;
}

export interface KaraokePracticeSurfaceProps {
  artworkSrc?: string;
  artistName?: string;
  className?: string;
  controlsDisabled?: boolean;
  currentTimeMs: number;
  durationMs: number;
  isLoading?: boolean;
  isPlaying: boolean;
  lines: KaraokeStageLine[];
  onComplete?: (summary: KaraokePracticeCompleteSummary) => void;
  onExit?: () => void;
  onPause?: () => void;
  onPlay?: () => void;
  onReset?: () => void;
  onSeek?: (ms: number) => void;
  /** Optional scoring panel rendered in an in-flow strip below the transport. */
  scoringPanel?: React.ReactNode;
  /** Running score + combo, shown in the header while scoring is enabled. */
  runningScore?: number;
  combo?: number;
  /** Optional per-line rating pop rendered on the lyric stage. */
  rating?: KaraokeLineRating | null;
  title: string;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function countCompletedLines(lines: KaraokeStageLine[], currentTimeMs: number) {
  return lines.filter((line) => currentTimeMs >= line.endMs).length;
}

function getCurrentLineLabel(lines: KaraokeStageLine[], currentTimeMs: number): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }

  const activeIndex = lines.findIndex((line) => currentTimeMs >= line.startMs && currentTimeMs <= line.endMs);
  const nextIndex = activeIndex >= 0
    ? activeIndex
    : lines.findIndex((line) => currentTimeMs < line.startMs);
  const lineIndex = nextIndex >= 0 ? nextIndex : lines.length - 1;
  const line = lines[lineIndex];

  return `Line ${lineIndex + 1} of ${lines.length}: ${line.text}`;
}

export function shouldIgnoreKaraokeShortcutTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("button, input, textarea, select, a, [role='button'], [contenteditable='true']"));
}

export function KaraokePracticeSurface({
  artworkSrc,
  artistName,
  className,
  controlsDisabled = false,
  currentTimeMs,
  durationMs,
  isLoading = false,
  isPlaying,
  lines,
  onComplete,
  onExit,
  onPause,
  onPlay,
  onReset,
  onSeek,
  scoringPanel,
  runningScore,
  combo,
  rating,
  title,
}: KaraokePracticeSurfaceProps) {
  const clampedCurrentTimeMs = Math.max(0, Math.min(durationMs, currentTimeMs));
  const lineLabel = getCurrentLineLabel(lines, clampedCurrentTimeMs);
  const hasLines = lines.length > 0;
  const isEnded = durationMs > 0 && clampedCurrentTimeMs >= durationMs;
  const playbackDisabled = controlsDisabled || isLoading || !hasLines;
  const completedRef = React.useRef(false);
  const scoringEnabled = scoringPanel != null;
  const comboCount = Math.max(0, combo ?? 0);

  React.useEffect(() => {
    if (!isEnded) {
      completedRef.current = false;
      return;
    }

    if (completedRef.current) {
      return;
    }

    completedRef.current = true;

    if (!onComplete) {
      return;
    }

    onComplete({
      durationMs,
      finalTimeMs: clampedCurrentTimeMs,
      linesCompleted: countCompletedLines(lines, clampedCurrentTimeMs),
    });
  }, [clampedCurrentTimeMs, durationMs, isEnded, lines, onComplete]);

  const handleTogglePlayback = () => {
    if (isPlaying) {
      onPause?.();
      return;
    }

    onPlay?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || shouldIgnoreKaraokeShortcutTarget(event.target)) {
      return;
    }

    switch (event.key) {
      case " ":
        event.preventDefault();
        handleTogglePlayback();
        break;
      case "ArrowLeft":
        event.preventDefault();
        onSeek?.(Math.max(0, clampedCurrentTimeMs - 5000));
        break;
      case "ArrowRight":
        event.preventDefault();
        onSeek?.(Math.min(durationMs, clampedCurrentTimeMs + 5000));
        break;
      case "Home":
        event.preventDefault();
        onSeek?.(0);
        break;
      case "End":
        event.preventDefault();
        onSeek?.(durationMs);
        break;
      default:
        break;
    }
  };

  return (
    <section
      aria-keyshortcuts="Space ArrowLeft ArrowRight Home End"
      aria-label={title}
      className={cn("flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {lineLabel}
      </div>
      <header className="flex items-center gap-3 border-b border-border-soft px-4 py-2.5 sm:px-6">
        <Button
          aria-label="Exit karaoke"
          className="size-10 px-0"
          leadingIcon={<CaretLeft className="size-5" weight="bold" />}
          onClick={onExit}
          size="icon"
          variant="ghost"
        />

        <div className="min-w-0 flex-1">
          <Type as="h1" className="truncate" variant="h3">
            {title}
          </Type>
          {artistName ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              {artistName}
            </Type>
          ) : null}
        </div>

        {scoringEnabled ? (
          <div className="flex shrink-0 flex-col items-end leading-none">
            <Type as="span" className="tabular-nums" variant="h3">
              {runningScore ?? 0}
            </Type>
            {comboCount >= 2 ? (
              <Type as="span" className="text-success" variant="caption">
                Combo x{comboCount}
              </Type>
            ) : null}
          </div>
        ) : artworkSrc ? (
          <img
            alt=""
            aria-hidden="true"
            className="size-11 shrink-0 rounded-[var(--radius-lg)] object-cover"
            src={artworkSrc}
          />
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {artworkSrc ? (
          <>
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-20 blur-2xl"
              src={artworkSrc}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background"
            />
          </>
        ) : null}

        <div className="relative z-10 size-full">
          {isLoading ? (
            <div className="grid size-full min-h-64 place-items-center px-4">
              <Type as="p" className="text-muted-foreground" variant="body">
                Loading karaoke
              </Type>
            </div>
          ) : hasLines ? (
            <KaraokeLyricStage
              className="h-full min-h-64"
              currentTimeMs={clampedCurrentTimeMs}
              lines={lines}
              rating={rating}
            />
          ) : (
            <div className="grid size-full min-h-64 place-items-center px-4">
              <Type as="p" className="text-muted-foreground" variant="body">
                No timed lyrics
              </Type>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-border-soft px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <MediaControlButton
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={playbackDisabled}
            onClick={handleTogglePlayback}
            size="md"
          >
            {isPlaying ? <Pause className="size-5" weight="fill" /> : <Play className="size-5" weight="fill" />}
          </MediaControlButton>

          <MediaControlButton
            aria-label="Reset"
            disabled={controlsDisabled || isLoading}
            intent="subtle"
            onClick={onReset}
            size="md"
          >
            <ArrowCounterClockwise className="size-5" weight="bold" />
          </MediaControlButton>

          <Scrubber
            ariaLabel="Karaoke playback position"
            disabled={controlsDisabled || isLoading}
            max={Math.max(1, durationMs)}
            onChange={onSeek}
            showThumb
            value={clampedCurrentTimeMs}
          />

          <Type as="span" className="min-w-[9ch] shrink-0 whitespace-nowrap text-right tabular-nums" variant="caption">
            {formatTime(clampedCurrentTimeMs)} / {formatTime(durationMs)}
          </Type>
        </div>
        {scoringPanel ? (
          <div className="mx-auto mt-3 w-full max-w-5xl border-t border-border-soft pt-3">
            {scoringPanel}
          </div>
        ) : null}
      </footer>
    </section>
  );
}
