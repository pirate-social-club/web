import * as React from "react";
import { Crown, Fire, Medal } from "@phosphor-icons/react";
import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

// Shared visual + data language for every streak surface (full leaderboard,
// post-page preview, feed chip). One identity formatter, one rank marker, one
// fire-count metric, one viewer-status logic — so the surfaces never drift.

type LeaderboardIdentity = SongStreakLeaderboardEntry["identity"];

function streakDisplayName(identity: LeaderboardIdentity): string {
  if (identity.handle) return identity.handle;
  if (identity.display_name) return identity.display_name;
  return "Anonymous learner";
}

function initials(identity: LeaderboardIdentity): string {
  const source = identity.display_name || identity.handle || "?";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic hue from the user id so avatars are stable without a network fetch.
function avatarHue(userId: string): number {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) % 360;
  }
  return hash;
}

function StreakBadge({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-end gap-1.5 font-semibold tabular-nums text-primary",
        className,
      )}
    >
      {days}
      <Fire className="size-6" weight="fill" />
    </span>
  );
}

function StreakRankMarker({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tone = rank === 1 ? "text-warning" : rank === 2 ? "text-muted-foreground" : "text-primary";
    const Icon = rank === 1 ? Crown : Medal;
    return (
      <span className={cn("grid size-8 place-items-center", tone)}>
        <Icon className="size-6" weight="fill" />
      </span>
    );
  }
  return (
    <span className="grid size-8 place-items-center font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

function StreakAvatar({ identity }: { identity: LeaderboardIdentity }) {
  const hue = avatarHue(identity.user_id);
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full text-base font-semibold text-foreground"
      style={{ backgroundColor: `oklch(0.45 0.09 ${hue})` }}
    >
      {initials(identity)}
    </span>
  );
}

function SongStreakEntryRow({ entry }: { entry: SongStreakLeaderboardEntry }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3",
        entry.is_viewer ? "border-primary/40 bg-primary/10" : "border-border-soft bg-card",
      )}
    >
      <StreakRankMarker rank={entry.rank} />
      <StreakAvatar identity={entry.identity} />
      <div className="min-w-0 flex-1">
        <Type as="p" className="truncate" variant="body-strong">
          {streakDisplayName(entry.identity)}
          {entry.is_viewer ? <span className="text-muted-foreground"> · you</span> : null}
        </Type>
      </div>
      <StreakBadge className="text-lg" days={entry.current_streak} />
    </li>
  );
}

/** The ranked list of streak holders. `limit` truncates to the top N (preview). */
export function SongStreakEntryList({
  entries,
  limit,
  className,
}: {
  entries: SongStreakLeaderboardEntry[];
  limit?: number;
  className?: string;
}) {
  const shown = typeof limit === "number" ? entries.slice(0, limit) : entries;
  return (
    <ul className={cn("space-y-2", className)}>
      {shown.map((entry) => (
        <SongStreakEntryRow entry={entry} key={entry.identity.user_id} />
      ))}
    </ul>
  );
}

/** Copy for the viewer's own standing, shared by the full card and the compact line. */
function viewerStatusLine(viewer: SongStreakViewerStanding): string {
  if (!viewer.alive) {
    return `Best run: ${viewer.best_streak} days · study today to start a new one.`;
  }
  if (viewer.qualified_today) {
    return viewer.karaoke_passed_today
      ? "Locked in for today with a passing karaoke take."
      : "Locked in for today — nice work.";
  }
  const remaining = Math.max(0, viewer.study_target_today - viewer.study_attempts_today);
  return `${remaining} more ${remaining === 1 ? "exercise" : "exercises"} today to keep it going.`;
}

function studyRemaining(viewer: SongStreakViewerStanding): number {
  return Math.max(0, viewer.study_target_today - viewer.study_attempts_today);
}

export function SongStreakViewerStanding({
  viewer,
  ranked,
  compact = false,
  onStartStudy,
}: {
  viewer: SongStreakViewerStanding;
  ranked: boolean;
  compact?: boolean;
  onStartStudy?: () => void;
}) {
  // Compact single line for the post-page preview: "You: 14-day streak · Study 4 more".
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-muted px-4 py-2.5">
        <Type as="p" className="min-w-0 truncate" variant="label">
          <Fire
            className={cn("mr-1.5 inline size-4", viewer.alive ? "text-primary" : "text-muted-foreground")}
            weight="fill"
          />
          {viewer.alive
            ? `You: ${viewer.current_streak}-day streak`
            : `You: streak lapsed · best ${viewer.best_streak}`}
        </Type>
        {!viewer.qualified_today && onStartStudy ? (
          <Button className="shrink-0" onClick={onStartStudy} size="sm" variant="ghost">
            {viewer.alive ? `Study ${studyRemaining(viewer)} more` : "Restart"}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!viewer.alive) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Fire className="size-5" weight="regular" />
          </span>
          <div className="min-w-0 flex-1">
            <Type as="p" variant="body-strong">
              Your streak lapsed
            </Type>
            <Type as="p" className="text-muted-foreground" variant="caption">
              {viewerStatusLine(viewer)}
            </Type>
          </div>
        </div>
        {onStartStudy ? (
          <Button className="mt-3 w-full" onClick={onStartStudy} size="sm" variant="secondary">
            Start a new streak
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-xl)] border border-primary/40 bg-primary/10 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
          <Fire className="size-5" weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <Type as="p" variant="body-strong">
            You're on a {viewer.current_streak}-day streak
            {ranked ? "" : " (not yet ranked)"}
          </Type>
          <Type as="p" className="text-muted-foreground" variant="caption">
            {viewerStatusLine(viewer)}
          </Type>
        </div>
      </div>
      {!viewer.qualified_today && onStartStudy ? (
        <Button className="mt-3 w-full" onClick={onStartStudy} size="sm">
          Study {studyRemaining(viewer)} more
        </Button>
      ) : null}
    </div>
  );
}
