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
  /** Running score + combo, shown in the header while scoring is enabled. */
  runningScore?: number;
  combo?: number;
  /** Optional per-line rating pop rendered on the lyric stage. */
  rating?: KaraokeLineRating | null;
  /** Sole footer content for the scoring flow (Start button, status, final
   *  score). When provided, no transport controls are rendered — just this.
   *  Pass null/omit during active performance to leave the footer empty. */
  footerContent?: React.ReactNode;
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
  artistName,
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
  rating,
  footerContent,
  title,
}: KaraokePracticeSurfaceProps) {
  const clampedCurrentTimeMs = Math.max(0, Math.min(durationMs, currentTimeMs));
  const lineLabel = getCurrentLineLabel(lines, clampedCurrentTimeMs);
  const hasLines = lines.length > 0;
  const isEnded = durationMs > 0 && clampedCurrentTimeMs >= durationMs;
  const completedRef = React.useRef(false);
  const scoringEnabled = footerContent != null || runningScore != null || combo != null;
  const comboCount = Math.max(0, combo ?? 0);
  const firstLineStartMs = lines[0]?.startMs ?? Number.POSITIVE_INFINITY;
  const primed = !isPlaying && hasLines && clampedCurrentTimeMs <= firstLineStartMs;

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
          {scoringEnabled ? (
            <div className="flex flex-col items-center leading-none">
              <div className="flex items-center gap-2">
                {listening ? (
                  <span
                    aria-hidden="true"
                    className="size-2.5 animate-pulse rounded-full bg-destructive"
                  />
                ) : null}
                <Type as="span" className="tabular-nums" variant="h3">
                  {runningScore ?? 0}
                </Type>
              </div>
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
              className="size-11 rounded-[var(--radius-lg)] object-cover"
              src={artworkSrc}
            />
          ) : null}
        </div>

        {/* Balances the back button so the score sits truly centered. */}
        <div aria-hidden="true" className="size-10 shrink-0" />
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
