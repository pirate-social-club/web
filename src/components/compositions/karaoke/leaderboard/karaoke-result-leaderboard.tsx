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

function PreviewRow({ entry }: { entry: KaraokeLeaderboardEntry }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5",
        entry.isCurrentUser && "rounded-[var(--radius-md)] bg-muted/60",
      )}
    >
      <Type as="span" className="tabular-nums text-muted-foreground" variant="caption">
        #{entry.rank}
      </Type>
      <Type as="span" className={cn("truncate", entry.isCurrentUser && "font-semibold")} variant="body">
        {rowName(entry)}
      </Type>
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
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
      <KaraokeScoreSummary finalScore={finalScore} uncertainLineCount={uncertainLineCount} />

      <KaraokeRankSummary
        eligible={currentUser.eligible}
        percentile={currentUser.percentileBps}
        rank={currentUser.rank}
        scope={leaderboard.scope}
        totalRanked={leaderboard.totalRanked}
      />

      {top.length > 0 ? (
        <div className="w-full">
          <Type as="p" className="mb-1 inline-flex items-center gap-1 px-3 text-muted-foreground" variant="overline">
            <Trophy className="size-3.5" weight="fill" /> Top {top.length}
          </Type>
          <div className="rounded-[var(--radius-xl)] border border-border-soft p-1">
            {top.map((entry) => (
              <PreviewRow entry={entry} key={`${entry.rank}-${entry.identity.displayName}-${entry.isCurrentUser}`} />
            ))}
            {yourRow ? (
              <div className="mt-1 border-t border-dashed border-border-soft pt-1">
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
