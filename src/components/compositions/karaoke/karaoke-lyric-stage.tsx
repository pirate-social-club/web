import * as React from "react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import "./karaoke-lyric-stage.styles.css";

export interface KaraokeStageToken {
  text: string;
  startMs: number;
  endMs: number;
  trailing?: string;
}

export interface KaraokeStageLine {
  id?: string;
  text: string;
  startMs: number;
  endMs: number;
  tokens?: KaraokeStageToken[];
}

type KaraokeRatingTone = "success" | "info" | "warning" | "destructive";

/**
 * Guitar-Hero-style transient rating for the most recently scored line.
 * `key` changes whenever a new rating arrives so the stage can remount the
 * pop element and replay its entrance animation.
 */
export interface KaraokeLineRating {
  lineId: string;
  key: string;
  label: string;
  points: number;
  tone: KaraokeRatingTone;
}

export interface KaraokeLyricStageProps {
  lines: KaraokeStageLine[];
  currentTimeMs: number;
  className?: string;
  lineStepPx?: number;
  /** Optional per-line rating pop rendered above the active (hit) line. */
  rating?: KaraokeLineRating | null;
  /** True before playback starts — renders the first (cue) line at full
   *  opacity so the singer sees what they're about to sing, not a dimmed cue. */
  primed?: boolean;
}

type LineMode = "active" | "cue" | "next";
type TokenState = "active" | "complete" | "upcoming";
type KaraokeStageStyle = React.CSSProperties & {
  "--karaoke-line-gap"?: string;
};

function getActiveLineIndex(lines: readonly KaraokeStageLine[], currentTimeMs: number): number {
  return lines.findIndex((line) => currentTimeMs >= line.startMs && currentTimeMs <= line.endMs);
}

function getNextLineIndex(
  lines: readonly KaraokeStageLine[],
  currentTimeMs: number,
  activeLineIndex: number,
): number {
  if (activeLineIndex >= 0) {
    const activeLine = lines[activeLineIndex];

    if (!activeLine) {
      return -1;
    }

    return lines.findIndex((line, index) => index > activeLineIndex && line.startMs > activeLine.endMs);
  }

  return lines.findIndex((line) => currentTimeMs < line.startMs);
}

export function getKaraokeDisplayState(lines: readonly KaraokeStageLine[], currentTimeMs: number) {
  const activeLineIndex = getActiveLineIndex(lines, currentTimeMs);
  const nextLineIndex = getNextLineIndex(lines, currentTimeMs, activeLineIndex);
  const lastLineIndex = lines.length - 1;
  const holdLastLineIndex =
    activeLineIndex === -1
    && nextLineIndex === -1
    && lastLineIndex >= 0
    && currentTimeMs > lines[lastLineIndex].endMs
      ? lastLineIndex
      : -1;
  const displayActiveLineIndex = activeLineIndex >= 0 ? activeLineIndex : holdLastLineIndex;

  return {
    activeLine: displayActiveLineIndex >= 0 ? lines[displayActiveLineIndex] : null,
    cueLine: displayActiveLineIndex === -1 && nextLineIndex >= 0 ? lines[nextLineIndex] : null,
    nextLine: displayActiveLineIndex >= 0 && nextLineIndex >= 0 ? lines[nextLineIndex] : null,
  };
}

function getLineTokens(line: KaraokeStageLine): KaraokeStageToken[] {
  if (line.tokens && line.tokens.length > 0) {
    return line.tokens;
  }

  return [{
    endMs: line.endMs,
    startMs: line.startMs,
    text: line.text,
  }];
}

function getTokenState(token: KaraokeStageToken, currentTimeMs: number, mode: LineMode): TokenState {
  if (mode !== "active") {
    return "upcoming";
  }

  if (currentTimeMs >= token.endMs) {
    return "complete";
  }

  if (currentTimeMs >= token.startMs && currentTimeMs < token.endMs) {
    return "active";
  }

  return "upcoming";
}

function getTokenProgress(token: KaraokeStageToken, currentTimeMs: number): number {
  const durationMs = token.endMs - token.startMs;

  if (durationMs <= 0) {
    return currentTimeMs >= token.endMs ? 1 : 0;
  }

  return Math.min(1, Math.max(0, (currentTimeMs - token.startMs) / durationMs));
}

export function getKaraokeStageLineKey(line: KaraokeStageLine): string {
  return `${line.id ?? "line"}:${line.startMs}:${line.endMs}:${line.text}`;
}

function tokenKey(line: KaraokeStageLine, token: KaraokeStageToken, index: number): string {
  return `${getKaraokeStageLineKey(line)}:${index}:${token.startMs}:${token.endMs}:${token.text}`;
}

interface LineTokensProps {
  currentTimeMs: number;
  line: KaraokeStageLine;
  mode: LineMode;
}

function LineTokens({ currentTimeMs, line, mode }: LineTokensProps) {
  const tokens = getLineTokens(line);

  return (
    <>
      {tokens.map((token, index) => {
        const state = getTokenState(token, currentTimeMs, mode);
        const shouldFill = mode === "active" && state === "active";
        const fillStyle = shouldFill
          ? ({ "--karaoke-token-fill": `${getTokenProgress(token, currentTimeMs) * 100}%` } as React.CSSProperties)
          : undefined;
        const trailing = token.trailing ?? (index < tokens.length - 1 ? " " : "");

        return (
          <React.Fragment key={tokenKey(line, token, index)}>
            <span className="karaoke-lyric-stage__token" data-token-state={state}>
              <span className="karaoke-lyric-stage__token-base">{token.text}</span>
              {shouldFill ? (
                <span
                  aria-hidden="true"
                  className="karaoke-lyric-stage__token-fill"
                  style={fillStyle}
                >
                  {token.text}
                </span>
              ) : null}
            </span>
            {trailing ? <span aria-hidden="true">{trailing}</span> : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

interface StageLineProps {
  currentTimeMs: number;
  line: KaraokeStageLine;
  mode: LineMode;
}

function StageLine({ currentTimeMs, line, mode }: StageLineProps) {
  return (
    <Type
      aria-label={line.text}
      as="p"
      className={cn(
        "karaoke-lyric-stage__line",
        mode === "active" && "karaoke-lyric-stage__line--active",
        mode === "cue" && "karaoke-lyric-stage__line--cue",
        mode === "next" && "karaoke-lyric-stage__line--next",
      )}
      data-line-mode={mode}
      dir="auto"
      variant={mode === "next" ? "h2" : "h1"}
    >
      <LineTokens currentTimeMs={currentTimeMs} line={line} mode={mode} />
    </Type>
  );
}

export function KaraokeLyricStage({
  className,
  currentTimeMs,
  lines,
  lineStepPx,
  rating,
  primed = false,
}: KaraokeLyricStageProps) {
  const { activeLine, cueLine, nextLine } = getKaraokeDisplayState(lines, currentTimeMs);
  const style: KaraokeStageStyle = lineStepPx ? { "--karaoke-line-gap": `${lineStepPx}px` } : {};
  // Before start: the cue line is the first line, shown at full opacity
  // (mode="active" at t<startMs renders all tokens "upcoming" — no fill, full
  // foreground) so the singer sees what they're about to sing.
  const cueMode = primed && !activeLine ? "active" : "cue";

  return (
    <div
      aria-live="off"
      className={cn("karaoke-lyric-stage", className)}
      style={style}
    >
      {rating ? (
        <div
          key={rating.key}
          className="karaoke-lyric-stage__rating"
          data-rating-tone={rating.tone}
        >
          <span className="karaoke-lyric-stage__rating-label">{rating.label}</span>
          <span className="karaoke-lyric-stage__rating-points">+{rating.points}</span>
        </div>
      ) : null}

      <div className="karaoke-lyric-stage__lines">
        {activeLine ? (
          <div className="karaoke-lyric-stage__slot karaoke-lyric-stage__slot--active">
            <StageLine
              key={getKaraokeStageLineKey(activeLine)}
              currentTimeMs={currentTimeMs}
              line={activeLine}
              mode="active"
            />
          </div>
        ) : null}

        {cueLine ? (
          <div className="karaoke-lyric-stage__slot karaoke-lyric-stage__slot--cue">
            <StageLine
              key={getKaraokeStageLineKey(cueLine)}
              currentTimeMs={currentTimeMs}
              line={cueLine}
              mode={cueMode}
            />
          </div>
        ) : null}

        {nextLine ? (
          <div className="karaoke-lyric-stage__slot karaoke-lyric-stage__slot--next">
            <StageLine
              key={getKaraokeStageLineKey(nextLine)}
              currentTimeMs={currentTimeMs}
              line={nextLine}
              mode="next"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
