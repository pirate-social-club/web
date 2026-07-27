import * as React from "react";
import { CaretLeft } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  KaraokeLyricStage,
  type KaraokeLineRating,
  type KaraokeStageLine,
} from "./karaoke-lyric-stage";
import type { KaraokeScoringStatus } from "./scoring/karaoke-scoring-controller";
import { Spinner } from "@/components/primitives/spinner";

export interface KaraokePracticeCompleteSummary {
  durationMs: number;
  finalTimeMs: number;
  linesCompleted: number;
}

export interface KaraokePracticeSurfaceProps {
  artworkSrc?: string;
  artistName?: string;
  className?: string;
  currentTimeMs: number;
  durationMs: number;
  isLoading?: boolean;
  isPlaying: boolean;
  lines: KaraokeStageLine[];
  /** True while the mic is live and scoring is actively listening. */
  listening?: boolean;
  onComplete?: (summary: KaraokePracticeCompleteSummary) => void;
  onExit?: () => void;
  /** Running score + combo, shown centered in the header while performing. */
  runningScore?: number;
  combo?: number;
  /** Scoring status — drives the top-right loading/connecting indicator. */
  scoringStatus?: KaraokeScoringStatus | null;
  /** Optional per-line rating pop rendered on the lyric stage. */
  rating?: KaraokeLineRating | null;
  /** Optional campaign offer shown above the lyric stage. */
  rewardSlot?: React.ReactNode;
  /** Footer content for the pre-performance scoring flow (Start button, connect
   *  status). The end-of-take RESULT does not go here — see `centerContent`. Pass
   *  null/omit during active performance to leave the footer empty. */
  footerContent?: React.ReactNode;
  /** Rendered centered in the main stage area, replacing the lyric stage — used
   *  for the end-of-take result (final score + Sing again), which belongs on the
   *  stage, not in the footer control bar. */
  centerContent?: React.ReactNode;
  title: string;
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
  className,
  currentTimeMs,
  durationMs,
  isLoading = false,
  isPlaying,
  lines,
  listening = false,
  onComplete,
  onExit,
  runningScore,
  combo,
  scoringStatus,
  rating,
  rewardSlot,
  footerContent,
  centerContent,
  title,
}: KaraokePracticeSurfaceProps) {
  const clampedCurrentTimeMs = Math.max(0, Math.min(durationMs, currentTimeMs));
  const lineLabel = getCurrentLineLabel(lines, clampedCurrentTimeMs);
  const hasLines = lines.length > 0;
  const isEnded = durationMs > 0 && clampedCurrentTimeMs >= durationMs;
  const completedRef = React.useRef(false);
  const scoringEnabled = footerContent != null || centerContent != null || runningScore != null || combo != null;
  const comboCount = Math.max(0, combo ?? 0);
  const firstLineStartMs = lines[0]?.startMs ?? Number.POSITIVE_INFINITY;
  const primed = !isPlaying && hasLines && clampedCurrentTimeMs <= firstLineStartMs;
  // Live score sits centered in the header only while a performance is underway.
  // On "ended" the final result takes over the stage (centerContent), so the
  // header score clears to avoid showing two scores.
  const performing = scoringStatus === "active" || scoringStatus === "finishing"
    || scoringStatus === "reconnecting";
  const showScore = scoringEnabled && performing;
  const connecting = scoringStatus === "requesting-mic" || scoringStatus === "connecting";
  const reconnecting = scoringStatus === "reconnecting";

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

  return (
    <section
      aria-label={title}
      className={cn("flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground", className)}
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

        <div className="flex flex-1 items-center justify-center">
          {showScore ? (
            <div className="flex flex-col items-center leading-none">
              <Type as="span" className="tabular-nums" variant="h3">
                {runningScore ?? 0}
              </Type>
              <Type as="span" className="text-muted-foreground" variant="caption">
                Provisional
              </Type>
              {comboCount >= 2 ? (
                <Type as="span" className="text-success" variant="caption">
                  Combo x{comboCount}
                </Type>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Top-right: transient connect/reconnect status only — never the score.
            min-w-10 balances the back button so the centered score stays centered. */}
        <div className="flex h-10 min-w-10 shrink-0 items-center justify-end gap-1.5">
          {connecting || reconnecting ? (
            <>
              <Spinner className="size-4" />
              <Type as="span" className="hidden text-muted-foreground sm:inline" variant="caption">
                {reconnecting ? "Reconnecting…" : "Connecting…"}
              </Type>
            </>
          ) : listening ? (
            <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-destructive" />
          ) : null}
        </div>
      </header>

      {rewardSlot ? (
        <div className="border-b border-border-soft px-4 py-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {rewardSlot}
          </div>
        </div>
      ) : null}

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
          {centerContent ? (
            <div className="grid size-full min-h-64 place-items-center px-4">
              <div className="flex w-full flex-col items-center sm:max-w-sm">
                {centerContent}
              </div>
            </div>
          ) : isLoading ? (
            <div className="grid size-full min-h-64 place-items-center px-4">
              <Spinner className="size-8 text-muted-foreground" />
            </div>
          ) : hasLines ? (
            <KaraokeLyricStage
              className="h-full min-h-64"
              currentTimeMs={clampedCurrentTimeMs}
              lines={lines}
              primed={primed}
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

      {footerContent ? (
        <footer className="border-t border-border-soft px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 sm:px-6">
          <div className="mx-auto flex w-full flex-col items-center sm:max-w-sm">
            {footerContent}
          </div>
        </footer>
      ) : null}
    </section>
  );
}
