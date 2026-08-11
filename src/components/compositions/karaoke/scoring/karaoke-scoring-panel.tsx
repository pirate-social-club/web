import { Microphone } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { KaraokeScoringState } from "./karaoke-scoring-controller";

export interface KaraokeScoringPanelProps {
  state: KaraokeScoringState;
  /** Begin (or retry) a scoring session — also starts playback in the surface. */
  onStart: () => void;
  /** Restart a fresh take from the beginning after a performance ends. */
  onRestart?: () => void;
  /** Open this song's karaoke score board after a performance ends. */
  onViewScores?: () => void;
  /** False while the instrumental is still loading (start is disabled). */
  canStart: boolean;
  /** Concise bounty requirements shown beside the Start action. */
  rewardGoalLabel?: string;
  className?: string;
}


function micErrorMessage(error: { code: string; message?: string }): string {
  switch (error.code) {
    case "permission_denied":
      return "Microphone access was blocked. Allow the mic and try again.";
    case "no_device":
      return "No microphone was found.";
    case "device_unavailable":
      return "The microphone became unavailable.";
    case "worklet_unavailable":
      // Not a hardware-mic problem — the audio-capture pipeline failed to initialize.
      return `Audio capture failed to start${error.message ? `: ${error.message}` : ""}.`;
    default:
      return `The microphone could not be started${error.message ? `: ${error.message}` : ""}.`;
  }
}

/**
 * Footer content for the scoring flow — pre/post-performance only:
 *  - idle / requesting-mic / connecting → the Start CTA (with an in-button
 *    spinner while the mic + socket come up, so the footer never resizes),
 *  - error → an actionable retry,
 *  - ended → the final score.
 * During active / finishing / reconnecting it renders nothing: the header score
 * and on-stage rating pops are the live feedback, and the footer stays empty
 * (no layout shift mid-performance; transient status lives in the header).
 */
export function KaraokeScoringPanel({ canStart, className, onRestart, onStart, onViewScores, rewardGoalLabel, state }: KaraokeScoringPanelProps) {
  if (state.status === "idle" || state.status === "requesting-mic" || state.status === "connecting") {
    const connecting = state.status !== "idle";
    return (
      <div className={cn("flex w-full flex-col items-center gap-4", className)}>
        {rewardGoalLabel ? (
          <Type as="p" className="text-center text-warning" variant="body-strong">
            {rewardGoalLabel}
          </Type>
        ) : null}
        <Button
          className="w-full"
          disabled={!canStart || connecting}
          leadingIcon={<Microphone className="size-5" weight="fill" />}
          loading={connecting}
          onClick={onStart}
          size="lg"
        >
          Start
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    const message = state.micError
      ? micErrorMessage(state.micError)
      : state.error?.message ?? "Scoring stopped unexpectedly.";
    return (
      <div className={cn("flex w-full flex-col items-center gap-3 text-center", className)}>
        <Type as="p" className="text-destructive" variant="caption">
          {message}
        </Type>
        <Button className="w-full" disabled={!canStart} onClick={onStart} size="lg" variant="secondary">
          Try again
        </Button>
      </div>
    );
  }

  // Footer action only — the final score itself is shown centered on the stage
  // via KaraokeScoreSummary, not here.
  if (state.status === "ended") {
    return (
      <div className={cn("grid w-full grid-cols-2 gap-3", className)}>
        <Button
          className="w-full"
          disabled={!onViewScores}
          onClick={onViewScores}
          size="lg"
          variant="secondary"
        >
          Scores
        </Button>
        <Button
          className="w-full"
          disabled={!onRestart}
          leadingIcon={<Microphone className="size-5" weight="fill" />}
          onClick={onRestart}
          size="lg"
        >
          Sing again
        </Button>
      </div>
    );
  }

  // active / finishing / reconnecting (or ended without a summary): empty footer.
  return null;
}
