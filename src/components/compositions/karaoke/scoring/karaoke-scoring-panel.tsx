import * as React from "react";
import { Microphone, Waveform } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { KaraokeScoringState } from "./karaoke-scoring-controller";

export interface KaraokeScoringPanelProps {
  state: KaraokeScoringState;
  /** Begin (or retry) a scoring session — also starts playback in the surface. */
  onStart: () => void;
  /** False while the instrumental is still loading (start is disabled). */
  canStart: boolean;
  className?: string;
}

function scorePercent(score: number): string {
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}`;
}

function micErrorMessage(code: string): string {
  switch (code) {
    case "permission_denied":
      return "Microphone access was blocked. Allow the mic and try again.";
    case "no_device":
      return "No microphone was found.";
    case "device_unavailable":
      return "The microphone became unavailable.";
    default:
      return "The microphone could not be started.";
  }
}

export function KaraokeScoringPanel({ canStart, className, onStart, state }: KaraokeScoringPanelProps) {
  const latest = state.lineScores.find((line) => line.lineId === state.latestLineId) ?? null;

  if (state.status === "idle") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Button
          disabled={!canStart}
          leadingIcon={<Microphone className="size-5" weight="fill" />}
          onClick={onStart}
          size="lg"
        >
          Score my singing
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    const message = state.micError
      ? micErrorMessage(state.micError.code)
      : state.error?.message ?? "Scoring stopped unexpectedly.";
    return (
      <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
        <Type as="p" className="text-muted-foreground" variant="caption">
          {message}
        </Type>
        <Button disabled={!canStart} onClick={onStart} size="sm" variant="secondary">
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "requesting-mic" || state.status === "connecting" || state.status === "reconnecting") {
    const label = state.status === "requesting-mic"
      ? "Requesting microphone…"
      : state.status === "reconnecting"
        ? "Reconnecting…"
        : "Connecting…";
    return (
      <div className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}>
        <Microphone className="size-5 animate-pulse" weight="fill" />
        <Type as="p" variant="caption">
          {label}
        </Type>
      </div>
    );
  }

  if ((state.status === "ended" || state.status === "finishing") && state.summary) {
    return (
      <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
        <Type as="p" className="text-muted-foreground" variant="caption">
          Final score
        </Type>
        <Type as="p" variant="h1">
          {scorePercent(state.summary.finalScore)}
        </Type>
        <Type as="p" className="text-muted-foreground" variant="caption">
          {state.summary.scoredLineCount} of {state.summary.lineCount} lines scored
        </Type>
      </div>
    );
  }

  // active / finishing (awaiting summary)
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)} aria-live="polite">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Waveform className="size-5" weight="fill" />
        <Type as="span" variant="caption">
          {state.status === "finishing" ? "Scoring…" : "Listening…"}
        </Type>
      </div>
      {latest ? (
        <Type as="p" variant="body-strong">
          Last line: {scorePercent(latest.score)}
        </Type>
      ) : null}
      {state.partialTranscript ? (
        <Type as="p" className="max-w-md truncate text-muted-foreground" dir="auto" variant="caption">
          {state.partialTranscript}
        </Type>
      ) : null}
    </div>
  );
}
