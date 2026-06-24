import * as React from "react";
import { ArrowsOut, Crown, MicrophoneStage, Trophy } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  bpsToPercent,
  leaderboardProfileHref,
  leaderboardSecondaryHandleLabel,
  type KaraokeLeaderboardEntry,
  type KaraokeSongLeaderboard,
  type PublicLeaderboardIdentity,
  type RankingScope,
} from "./karaoke-leaderboard.types";

export interface KaraokeSongTopSingersCardProps {
  song: { title: string; artistName?: string | null };
  /** Per-song board for the top-3 podium + the viewer's standing. Gated on the endpoint. */
  leaderboard?: KaraokeSongLeaderboard | null;
  status?: "ready" | "loading" | "error";
  /** Route to the full per-song board (/p/{postId}/karaoke/leaderboard); rendered as an anchor when provided. */
  leaderboardHref?: string | null;
  onViewRankings?: () => void;
  /** Route to start karaoke for this song; rendered as an anchor when provided (mirrors the post card). */
  karaokeHref?: string | null;
  onSing?: () => void;
  onRetry?: () => void;
  className?: string;
}

function scopeLabel(scope: RankingScope): string {
  return scope === "weekly" ? "this week" : "all-time";
}

/**
 * Per-entry "Top X%" label derived from rank vs total ranked — a server-free
 * game-y cue. The current user also has a server percentile (percentileBps);
 * per-entry entries don't, so we derive from rank ratio. Returns null past 20%.
 */
function rankTierLabel(rank: number, totalRanked: number): string | null {
  if (!totalRanked || totalRanked < 1) return null;
  const ratio = rank / totalRanked;
  if (ratio <= 0.01) return "Top 1%";
  if (ratio <= 0.05) return "Top 5%";
  if (ratio <= 0.2) return "Top 20%";
  return null;
}

/** "2h ago" / "3d ago" for recent takes; null when missing, invalid, or > 7 days old. */
function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const sec = Math.round((then - Date.now()) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const rt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(sec) < 60) return rt.format(sec, "second");
  if (Math.abs(min) < 60) return rt.format(min, "minute");
  if (Math.abs(hr) < 24) return rt.format(hr, "hour");
  if (Math.abs(day) <= 7) return rt.format(day, "day");
  return null;
}

function entryName(entry: KaraokeLeaderboardEntry): string {
  return entry.isCurrentUser ? "You" : entry.identity.displayName;
}

function PodiumRow({ entry, totalRanked }: { entry: KaraokeLeaderboardEntry; totalRanked: number }) {
  const href = leaderboardProfileHref(entry.identity, entry.isCurrentUser);
  const handleLabel = entry.isCurrentUser ? null : leaderboardSecondaryHandleLabel(entry.identity);
  const tier = rankTierLabel(entry.rank, totalRanked);
  const recency = relativeTime(entry.reachedAt);
  const isGold = entry.rank === 1;
  const nameClass = cn("truncate", entry.isCurrentUser && "font-semibold");
  return (
    <div
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0",
        isGold && "bg-primary-subtle",
        entry.isCurrentUser && !isGold && "bg-muted/50",
      )}
    >
      <div className="grid place-items-center text-muted-foreground">
        {isGold ? (
          <Crown aria-hidden="true" className="size-5" weight="fill" />
        ) : (
          <Type as="span" className="tabular-nums" variant="caption">
            #{entry.rank}
          </Type>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {href ? (
            <a className={cn(nameClass, "min-w-0 truncate hover:underline")} href={href}>
              <Type as="span" variant="body-strong">{entryName(entry)}</Type>
            </a>
          ) : (
            <Type as="p" className={nameClass} variant="body-strong">
              {entryName(entry)}
            </Type>
          )}
          {tier ? (
            <Type as="span" className="shrink-0 text-muted-foreground" variant="overline">
              {tier}
            </Type>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {handleLabel ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              {handleLabel}
            </Type>
          ) : null}
          {recency ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              · {recency}
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

function YourStandingRow({ entry, previousRank, gapToNextRankBps }: {
  entry: KaraokeLeaderboardEntry;
  previousRank?: number | null;
  gapToNextRankBps?: number | null;
}) {
  const rankUp = previousRank != null && previousRank > entry.rank ? previousRank - entry.rank : null;
  const href = leaderboardProfileHref(entry.identity, entry.isCurrentUser);
  const handleLabel = entry.isCurrentUser ? null : leaderboardSecondaryHandleLabel(entry.identity);
  const nameClass = cn("truncate", entry.isCurrentUser && "font-semibold");
  const gapNudge = gapToNextRankBps != null && gapToNextRankBps > 0 && entry.rank > 1
    ? `+${bpsToPercent(gapToNextRankBps)} to overtake #${entry.rank - 1}`
    : null;
  return (
    <div className="border-t-2 border-dashed border-border-soft">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 bg-muted/40 px-4 py-3">
        <Type as="span" className="tabular-nums text-muted-foreground" variant="caption">
          #{entry.rank}
        </Type>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {href ? (
              <a className={cn(nameClass, "min-w-0 truncate hover:underline")} href={href}>
                <Type as="span" variant="body">{entryName(entry)}</Type>
              </a>
            ) : (
              <Type as="p" className={nameClass} variant="body">
                {entryName(entry)}
              </Type>
            )}
            {rankUp ? (
              <Type as="span" className="shrink-0 text-success" variant="overline">
                ↑{rankUp}
              </Type>
            ) : null}
          </div>
          {handleLabel || gapNudge ? (
            <div className="flex min-w-0 items-center gap-2">
              {handleLabel ? (
                <Type as="p" className="truncate text-muted-foreground" variant="caption">
                  {handleLabel}
                </Type>
              ) : null}
              {gapNudge ? (
                <Type as="p" className="truncate text-muted-foreground" variant="caption">
                  {handleLabel ? "· " : ""}{gapNudge}
                </Type>
              ) : null}
            </div>
          ) : null}
        </div>
        <Type as="span" className="tabular-nums" variant="body-strong">
          {bpsToPercent(entry.scoreBps)}
        </Type>
      </div>
    </div>
  );
}

/**
 * Inline "Top singers" card for the song post page — the no-sing entry point to the per-song — the no-sing entry point to
 * the per-song leaderboard (spec §10.5). A compact podium (top-3) plus the viewer's
 * own standing when ranked outside it, with a quiet "View all" affordance to the
 * full board. Names link to /u/<handle> for visible, non-self entries. Reads the
 * same per-song board data as the full KaraokeSongLeaderboardView (gated on the
 * leaderboard endpoint).
 */
export function KaraokeSongTopSingersCard({
  className,
  karaokeHref,
  leaderboard,
  leaderboardHref,
  onRetry,
  onSing,
  onViewRankings,
  song,
  status = "ready",
}: KaraokeSongTopSingersCardProps) {
  const currentUser = leaderboard?.currentUser;
  const top = leaderboard ? leaderboard.entries.slice(0, 3) : [];
  const inTop = top.some((e) => e.isCurrentUser);
  const yourRow: KaraokeLeaderboardEntry | null = leaderboard && currentUser && currentUser.eligible
      && currentUser.rank != null && currentUser.bestScoreBps != null && !inTop
    ? ({
      rank: currentUser.rank,
      scoreBps: currentUser.bestScoreBps,
      reachedAt: "",
      identity: { displayName: "You", handle: null, avatarUrl: null, visibility: "visible" as const } satisfies PublicLeaderboardIdentity,
      isCurrentUser: true,
    })
    : null;

  const headerScope = leaderboard ? scopeLabel(leaderboard.scope) : null;

  const singAction = karaokeHref ? (
    <Button asChild className="h-10 w-32 px-5" size="sm">
      <a aria-label={`Sing ${song.title} with karaoke`} href={karaokeHref}>
        <MicrophoneStage className="size-4" weight="fill" />
        <span>Sing</span>
      </a>
    </Button>
  ) : onSing ? (
    <Button className="h-10 w-32 px-5" leadingIcon={<MicrophoneStage className="size-4" weight="fill" />} onClick={onSing} size="sm">
      Sing
    </Button>
  ) : null;

  const viewAllAction = leaderboardHref ? (
    <a
      aria-label={`View full leaderboard for ${song.title}`}
      className="inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      href={leaderboardHref}
    >
      <Type as="span" variant="caption">View all</Type>
      <ArrowsOut aria-hidden="true" className="size-4" weight="bold" />
    </a>
  ) : onViewRankings ? (
    <button
      aria-label={`View full leaderboard for ${song.title}`}
      className="inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      onClick={onViewRankings}
      type="button"
    >
      <Type as="span" variant="caption">View all</Type>
      <ArrowsOut aria-hidden="true" className="size-4" weight="bold" />
    </button>
  ) : null;

  return (
    <section
      aria-label={`Top singers for ${song.title}`}
      className={cn("w-full overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-card", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy aria-hidden="true" className="size-5 text-muted-foreground" weight="fill" />
          <Type as="h2" className="truncate" variant="body-strong">
            Top singers
          </Type>
          {headerScope ? (
            <Type as="span" className="truncate text-muted-foreground" variant="caption">
              · {headerScope}
            </Type>
          ) : null}
        </div>
        {viewAllAction}
      </div>

      {status === "loading" ? (
        <div className="grid place-items-center px-4 py-10">
          <Spinner className="size-7 text-muted-foreground" />
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <Type as="p" className="text-muted-foreground" variant="body">
            Couldn’t load rankings.
          </Type>
          {onRetry ? (
            <Button disabled={!onRetry} onClick={onRetry} size="sm" variant="secondary">
              Try again
            </Button>
          ) : null}
        </div>
      ) : leaderboard && leaderboard.totalRanked > 0 && top.length > 0 ? (
        <>
          {top.map((entry) => (
            <PodiumRow entry={entry} key={`${entry.rank}-${entry.identity.displayName}-${entry.isCurrentUser}`} totalRanked={leaderboard.totalRanked} />
          ))}
          {yourRow ? (
            <YourStandingRow
              entry={yourRow}
              gapToNextRankBps={currentUser?.gapToNextRankBps}
              previousRank={currentUser?.previousRank}
            />
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <Type as="p" className="text-muted-foreground" variant="body">
            No scores yet — be the first to sing.
          </Type>
          {singAction}
        </div>
      )}
    </section>
  );
}