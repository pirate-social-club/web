import {
  ArrowClockwise,
  CaretLeft,
  Crown,
  Medal,
  MicrophoneStage,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import type {
  KaraokeLeaderboardEntry,
  KaraokeSongLeaderboard,
} from "@/lib/api/client-api-types";
import { cn } from "@/lib/utils";
import { formatAvatarInitials } from "@/lib/formatting/initials";

export type KaraokeLeaderboardState =
  | { kind: "loading" }
  | { kind: "error"; message?: string }
  | { kind: "ready"; leaderboard: KaraokeSongLeaderboard };

export interface KaraokeLeaderboardProps {
  artistName?: string;
  artworkSrc?: string;
  className?: string;
  onExit?: () => void;
  onRetry?: () => void;
  onSing?: () => void;
  state: KaraokeLeaderboardState;
  title: string;
}

function formatScore(score: number): string {
  return `${Math.round(score / 100)}%`;
}

function displayName(entry: KaraokeLeaderboardEntry): string {
  if (entry.identity.visibility === "anonymized") return "Former member";
  if (entry.identity.handle) return entry.identity.handle;
  if (entry.identity.display_name) return entry.identity.display_name;
  return "Anonymous singer";
}

function initials(entry: KaraokeLeaderboardEntry): string {
  if (entry.identity.visibility === "anonymized") return "FM";
  const source = entry.identity.display_name || entry.identity.handle || "?";
  return formatAvatarInitials(source);
}

function avatarHue(entry: KaraokeLeaderboardEntry): number {
  const source = entry.identity.handle || entry.identity.display_name || String(entry.rank);
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 360;
  }
  return hash;
}

function RankMarker({ rank }: { rank: number }) {
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

function EntryRow({ entry }: { entry: KaraokeLeaderboardEntry }) {
  const hue = avatarHue(entry);
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3",
        entry.is_viewer ? "border-primary/40 bg-primary/10" : "border-border-soft bg-card",
      )}
    >
      <RankMarker rank={entry.rank} />
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full text-base font-semibold text-foreground"
        style={{ backgroundColor: `oklch(0.45 0.09 ${hue})` }}
      >
        {initials(entry)}
      </span>
      <div className="min-w-0 flex-1">
        <Type as="p" className="truncate" variant="body-strong">
          {displayName(entry)}
          {entry.is_viewer ? <span className="text-muted-foreground"> · you</span> : null}
        </Type>
        <Type as="p" className="truncate text-muted-foreground" variant="caption">
          Top {entry.top_percent}%
        </Type>
      </div>
      <span className="min-w-16 text-right text-lg font-semibold tabular-nums text-primary">
        {formatScore(entry.score)}
      </span>
    </li>
  );
}

function Header({
  artistName,
  artworkSrc,
  onExit,
  title,
}: {
  artistName?: string;
  artworkSrc?: string;
  onExit?: () => void;
  title: string;
}) {
  return (
    <header className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border-soft px-4 py-2 sm:min-h-20 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6 sm:py-3">
      <Button
        aria-label="Back to song"
        className="size-10 px-0 sm:size-11"
        leadingIcon={<CaretLeft className="size-5" weight="bold" />}
        onClick={onExit}
        size="icon"
        variant="ghost"
      />
      <div className="min-w-0">
        <Type as="h1" className="truncate" variant="h3">
          {title}
        </Type>
        <Type as="p" className="truncate text-muted-foreground" variant="caption">
          {artistName ? `${artistName} · Karaoke scores` : "Karaoke scores"}
        </Type>
      </div>
      {artworkSrc ? (
        <img
          alt=""
          aria-hidden="true"
          className="hidden size-12 rounded-[var(--radius-lg)] object-cover sm:block"
          src={artworkSrc}
        />
      ) : (
        <div aria-hidden="true" className="hidden size-12 rounded-[var(--radius-lg)] bg-muted sm:block" />
      )}
    </header>
  );
}

function EmptyState({ onSing }: { onSing?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
      <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
        <Trophy className="size-9" weight="duotone" />
      </div>
      <div>
        <Type as="h2" variant="h2">
          No scores yet
        </Type>
        <Type as="p" className="mx-auto mt-2 max-w-sm text-muted-foreground" variant="body">
          Sing this song and finish with an eligible take to claim the first score.
        </Type>
      </div>
      {onSing ? (
        <Button leadingIcon={<MicrophoneStage className="size-5" weight="fill" />} onClick={onSing} size="lg">
          Sing
        </Button>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
      <ul className="space-y-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <li
            key={row}
            className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-border-soft bg-card p-3"
          >
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
      <div className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
        <WarningCircle className="size-9" weight="duotone" />
      </div>
      <div>
        <Type as="h2" variant="h2">
          Couldn't load scores
        </Type>
        <Type as="p" className="mx-auto mt-2 max-w-sm text-muted-foreground" variant="body">
          {message ?? "Something went wrong fetching karaoke scores. Try again in a moment."}
        </Type>
      </div>
      {onRetry ? (
        <Button
          leadingIcon={<ArrowClockwise className="size-5" weight="bold" />}
          onClick={onRetry}
          size="lg"
          variant="secondary"
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function ViewerStanding({
  leaderboard,
  onSing,
}: {
  leaderboard: KaraokeSongLeaderboard;
  onSing?: () => void;
}) {
  if (leaderboard.viewer_rank == null || leaderboard.viewer_best_score == null) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-4">
        <Type as="p" variant="body-strong">
          You are not ranked yet
        </Type>
        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
          Finish an eligible karaoke take to join this board.
        </Type>
        {onSing ? (
          <Button className="mt-3 w-full" onClick={onSing} size="sm">
            Sing
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-xl)] border border-primary/40 bg-primary/10 p-4">
      <Type as="p" variant="body-strong">
        You are #{leaderboard.viewer_rank} with {formatScore(leaderboard.viewer_best_score)}
      </Type>
      <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
        {leaderboard.viewer_top_percent != null
          ? `Top ${leaderboard.viewer_top_percent}% · ${leaderboard.viewer_eligible_attempt_count} eligible ${leaderboard.viewer_eligible_attempt_count === 1 ? "take" : "takes"}`
          : `${leaderboard.viewer_eligible_attempt_count} eligible ${leaderboard.viewer_eligible_attempt_count === 1 ? "take" : "takes"}`}
      </Type>
    </div>
  );
}

function ReadyState({
  leaderboard,
  onSing,
}: {
  leaderboard: KaraokeSongLeaderboard;
  onSing?: () => void;
}) {
  const viewerRankedInEntries = leaderboard.entries.some((entry) => entry.is_viewer);

  if (leaderboard.entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <EmptyState onSing={onSing} />
        <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
          <ViewerStanding leaderboard={leaderboard} onSing={onSing} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-6 sm:px-6">
      <ul className="space-y-2">
        {leaderboard.entries.map((entry) => (
          <EntryRow entry={entry} key={`${entry.rank}:${entry.reached_at}:${entry.identity.handle ?? entry.identity.display_name ?? "anonymous"}`} />
        ))}
      </ul>
      {!viewerRankedInEntries ? <ViewerStanding leaderboard={leaderboard} onSing={onSing} /> : null}
    </div>
  );
}

export function KaraokeLeaderboard({
  artistName,
  artworkSrc,
  className,
  onExit,
  onRetry,
  onSing,
  state,
  title,
}: KaraokeLeaderboardProps) {
  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col overflow-y-auto bg-background text-foreground",
        className,
      )}
    >
      <Header artistName={artistName} artworkSrc={artworkSrc} onExit={onExit} title={title} />
      {state.kind === "loading" ? <LoadingState /> : null}
      {state.kind === "error" ? <ErrorState message={state.message} onRetry={onRetry} /> : null}
      {state.kind === "ready" ? <ReadyState leaderboard={state.leaderboard} onSing={onSing} /> : null}
    </div>
  );
}
