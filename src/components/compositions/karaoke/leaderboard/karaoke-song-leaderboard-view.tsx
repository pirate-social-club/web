import * as React from "react";
import { MicrophoneStage, MusicNote } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { KaraokeRankSummary } from "./karaoke-rank-summary";
import {
  bpsToPercent,
  type KaraokeLeaderboardEntry,
  type KaraokeSongLeaderboard,
  type RankingScope,
} from "./karaoke-leaderboard.types";

export interface KaraokeSongLeaderboardViewProps {
  song: { title: string; artistName?: string | null; artworkUrl?: string | null };
  scope: RankingScope;
  onScopeChange: (scope: RankingScope) => void;
  /** Data state. `ready` requires `leaderboard`. */
  status?: "ready" | "loading" | "error";
  leaderboard?: KaraokeSongLeaderboard | null;
  /** Toggles the primary CTA between "Sing" (never sung) and "Sing again". */
  hasSung?: boolean;
  onSing: () => void;
  onRetry?: () => void;
  className?: string;
}

function displayName(entry: KaraokeLeaderboardEntry): string {
  return entry.isCurrentUser ? "You" : entry.identity.displayName;
}

function EntryRow({ entry }: { entry: KaraokeLeaderboardEntry }) {
  const showAvatar = entry.identity.visibility === "visible" && entry.identity.avatarUrl;
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
      <div className="flex min-w-0 items-center gap-2">
        {showAvatar ? (
          <img alt="" aria-hidden="true" className="size-7 shrink-0 rounded-full object-cover" src={entry.identity.avatarUrl ?? undefined} />
        ) : (
          <div aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <MicrophoneStage className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <Type as="p" className={cn("truncate", entry.isCurrentUser && "font-semibold")} variant="body">
            {displayName(entry)}
          </Type>
          {entry.identity.visibility === "visible" && entry.identity.handle ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              @{entry.identity.handle}
            </Type>
          ) : null}
        </div>
      </div>
      <Type as="span" className="tabular-nums" variant="body-strong">
        {bpsToPercent(entry.scoreBps)}
      </Type>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-48 place-items-center px-6 text-center">{children}</div>;
}

export function KaraokeSongLeaderboardView({
  className,
  hasSung = false,
  leaderboard,
  onRetry,
  onScopeChange,
  onSing,
  scope,
  song,
  status = "ready",
}: KaraokeSongLeaderboardViewProps) {
  const currentUser = leaderboard?.currentUser;
  // Show the viewer's own position as a separated row when they're ranked but
  // fall outside the visible top entries.
  const currentUserInEntries = Boolean(leaderboard?.entries.some((e) => e.isCurrentUser));
  const outsideTopRow = leaderboard
    && currentUser?.eligible
    && currentUser.rank != null
    && currentUser.bestScoreBps != null
    && !currentUserInEntries
    ? ({
      rank: currentUser.rank,
      scoreBps: currentUser.bestScoreBps,
      reachedAt: "",
      identity: { displayName: "You", handle: null, avatarUrl: null, visibility: "visible" as const },
      isCurrentUser: true,
    } satisfies KaraokeLeaderboardEntry)
    : null;

  return (
    <section
      aria-label={`Leaderboard for ${song.title}`}
      className={cn("mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 sm:px-6", className)}
    >
      {/* Song header */}
      <div className="flex items-center gap-3">
        {song.artworkUrl ? (
          <img alt="" aria-hidden="true" className="size-14 rounded-[var(--radius-lg)] object-cover" src={song.artworkUrl} />
        ) : (
          <div aria-hidden="true" className="grid size-14 place-items-center rounded-[var(--radius-lg)] bg-muted text-muted-foreground">
            <MusicNote className="size-6" />
          </div>
        )}
        <div className="min-w-0">
          <Type as="h1" className="truncate" variant="h3">
            {song.title}
          </Type>
          {song.artistName ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              {song.artistName}
            </Type>
          ) : null}
        </div>
      </div>

      {/* Scope selector */}
      <div className="inline-flex w-fit rounded-full border border-border-soft p-0.5" role="tablist" aria-label="Ranking period">
        {(["all_time", "weekly"] as const).map((value) => (
          <button
            aria-selected={scope === value}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              scope === value ? "bg-foreground text-background" : "text-muted-foreground",
            )}
            key={value}
            onClick={() => onScopeChange(value)}
            role="tab"
            type="button"
          >
            {value === "all_time" ? "All-time" : "This week"}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <Centered><Spinner className="size-8 text-muted-foreground" /></Centered>
      ) : status === "error" ? (
        <Centered>
          <div className="flex flex-col items-center gap-3">
            <Type as="p" className="text-muted-foreground" variant="body">
              Couldn’t load the leaderboard.
            </Type>
            <Button disabled={!onRetry} onClick={onRetry} size="sm" variant="secondary">
              Try again
            </Button>
          </div>
        </Centered>
      ) : leaderboard && leaderboard.totalRanked > 0 ? (
        <>
          {currentUser ? (
            <KaraokeRankSummary
              eligible={currentUser.eligible}
              percentile={currentUser.percentileBps}
              rank={currentUser.rank}
              scope={scope}
              totalRanked={leaderboard.totalRanked}
            />
          ) : null}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-soft">
            {leaderboard.entries.map((entry) => (
              <EntryRow entry={entry} key={`${entry.rank}-${entry.identity.displayName}-${entry.isCurrentUser}`} />
            ))}
            {outsideTopRow ? (
              <div className="border-t-2 border-border-soft border-dashed">
                <EntryRow entry={outsideTopRow} />
              </div>
            ) : null}
          </div>
          <Type as="p" className="px-1 text-muted-foreground" variant="caption">
            Each singer’s best eligible score.
          </Type>
        </>
      ) : (
        <Centered>
          <Type as="p" className="text-muted-foreground" variant="body">
            No ranked scores yet — be the first.
          </Type>
        </Centered>
      )}

      <Button className="w-full" leadingIcon={<MicrophoneStage className="size-5" weight="fill" />} onClick={onSing} size="lg">
        {hasSung ? "Sing again" : "Sing"}
      </Button>
    </section>
  );
}
