import * as React from "react";
import { CaretRight, Trophy } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { KaraokeRankSummary } from "./karaoke-rank-summary";
import { KaraokeScoreSummary } from "../scoring/karaoke-score-summary";
import {
  bpsToPercent,
  leaderboardProfileHref,
  type KaraokeLeaderboardEntry,
  type KaraokeSongLeaderboard,
} from "./karaoke-leaderboard.types";

export interface KaraokeResultLeaderboardProps {
  /** This take's final score, 0..1 (from the live session summary). */
  finalScore: number;
  uncertainLineCount?: number;
  /** Per-song board for the top-N preview + the viewer's standing. */
  leaderboard: KaraokeSongLeaderboard;
  /** How many top rows to preview. Default 5. */
  topCount?: number;
  /** Opens the full board. Sing again is NOT here — it lives in the stage footer. */
  onViewRankings: () => void;
  className?: string;
}

function rowName(entry: KaraokeLeaderboardEntry): string {
  return entry.isCurrentUser ? "You" : entry.identity.displayName;
}

/**
 * Compact single-line preview row — rank, name (truncates), score. No avatars;
 * the completion screen stays dense. Uses the same grid track as the full board's
 * EntryRow so the preview reads as a condensed version of the real surface.
 */
function PreviewRow({ entry }: { entry: KaraokeLeaderboardEntry }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-soft px-4 py-2.5 last:border-b-0",
        entry.isCurrentUser && "bg-muted/50",
      )}
    >
      <Type as="span" className="tabular-nums text-muted-foreground" variant="caption">
        #{entry.rank}
      </Type>
      <div className="min-w-0 overflow-hidden">
        {(() => {
          const href = leaderboardProfileHref(entry.identity, entry.isCurrentUser);
          const nameClass = cn("truncate", entry.isCurrentUser && "font-semibold");
          return href ? (
            <a className={cn(nameClass, "block hover:underline")} href={href}>
              <Type as="span" variant="body">{rowName(entry)}</Type>
            </a>
          ) : (
            <Type as="p" className={nameClass} variant="body">
              {rowName(entry)}
            </Type>
          );
        })()}
      </div>
      <Type as="span" className="tabular-nums" variant="body-strong">
        {bpsToPercent(entry.scoreBps)}
      </Type>
    </div>
  );
}

/**
 * Completion-screen leaderboard preview: this take's score, a compact Top-N, and
 * the viewer's own row when they fall outside the top. A condensed companion to
 * the full KaraokeSongLeaderboardView (no scope toggle/avatars) — reads the same
 * per-song board data (gated on the leaderboard endpoint).
 */
export function KaraokeResultLeaderboard({
  className,
  finalScore,
  leaderboard,
  onViewRankings,
  topCount = 5,
  uncertainLineCount = 0,
}: KaraokeResultLeaderboardProps) {
  const top = leaderboard.entries.slice(0, topCount);
  const currentUser = leaderboard.currentUser;
  const inTop = top.some((e) => e.isCurrentUser);
  const yourRow = !inTop && currentUser.eligible && currentUser.rank != null && currentUser.bestScoreBps != null
    ? ({
      rank: currentUser.rank,
      scoreBps: currentUser.bestScoreBps,
      reachedAt: "",
      identity: { displayName: "You", handle: null, avatarUrl: null, visibility: "visible" as const },
      isCurrentUser: true,
    } satisfies KaraokeLeaderboardEntry)
    : null;

  return (
    <div className={cn("flex w-full flex-col gap-5", className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <KaraokeScoreSummary finalScore={finalScore} uncertainLineCount={uncertainLineCount} />
        <KaraokeRankSummary
          eligible={currentUser.eligible}
          percentile={currentUser.percentileBps}
          rank={currentUser.rank}
          scope={leaderboard.scope}
          totalRanked={leaderboard.totalRanked}
        />
      </div>

      {top.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Type as="p" className="inline-flex items-center gap-1.5 px-1 text-muted-foreground" variant="overline">
            <Trophy className="size-3.5" weight="fill" /> Top {top.length}
          </Type>
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-soft">
            {top.map((entry) => (
              <PreviewRow entry={entry} key={`${entry.rank}-${entry.identity.displayName}-${entry.isCurrentUser}`} />
            ))}
            {yourRow ? (
              <div className="border-t-2 border-dashed border-border-soft">
                <PreviewRow entry={yourRow} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        className="inline-flex items-center gap-1 self-center text-muted-foreground transition-colors hover:text-foreground"
        onClick={onViewRankings}
        type="button"
      >
        <Type as="span" variant="caption">See full leaderboard</Type>
        <CaretRight className="size-3.5" weight="bold" />
      </button>
    </div>
  );
}