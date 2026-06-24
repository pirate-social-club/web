import * as React from "react";
import { ArrowsClockwise, Trophy } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { KaraokeRankSummary } from "./karaoke-rank-summary";
import { KaraokeScoreSummary } from "../scoring/karaoke-score-summary";
import {
  bpsToPercent,
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
  onSingAgain: () => void;
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
        <Type as="p" className={cn("truncate", entry.isCurrentUser && "font-semibold")} variant="body">
          {rowName(entry)}
        </Type>
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
  onSingAgain,
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

      <div className="flex w-full gap-2">
        <Button
          className="flex-1"
          leadingIcon={<ArrowsClockwise className="size-5" weight="bold" />}
          onClick={onSingAgain}
          size="lg"
        >
          Sing again
        </Button>
        <Button className="flex-1" onClick={onViewRankings} size="lg" variant="secondary">
          View rankings
        </Button>
      </div>
    </div>
  );
}