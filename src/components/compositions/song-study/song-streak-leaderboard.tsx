import * as React from "react";
import {
  ArrowClockwise,
  CaretLeft,
  GraduationCap,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  SongStreakEntryList,
  SongStreakViewerStanding as ViewerStanding,
} from "./song-streak-parts";

export type SongStreakLeaderboardState =
  | { kind: "loading" }
  | { kind: "error"; message?: string }
  | {
    kind: "ready";
    date: string;
    entries: SongStreakLeaderboardEntry[];
    totalActiveStreaks: number;
    viewer: SongStreakViewerStanding | null;
  };

export interface SongStreakLeaderboardProps {
  artistName?: string;
  artworkSrc?: string;
  className?: string;
  onExit?: () => void;
  onRetry?: () => void;
  onStartStudy?: () => void;
  state: SongStreakLeaderboardState;
  title: string;
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
          {artistName ? `${artistName} · Study streaks` : "Study streaks"}
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

function EmptyState({ onStartStudy }: { onStartStudy?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
      <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
        <Trophy className="size-9" weight="duotone" />
      </div>
      <div>
        <Type as="h2" variant="h2">
          No streaks yet
        </Type>
        <Type as="p" className="mx-auto mt-2 max-w-sm text-muted-foreground" variant="body">
          Study this song — or sing it — on back-to-back days to start the first streak on the board.
        </Type>
      </div>
      {onStartStudy ? (
        <Button leadingIcon={<GraduationCap className="size-5" weight="fill" />} onClick={onStartStudy} size="lg">
          Start studying
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
            <div className="h-6 w-10 animate-pulse rounded-full bg-muted" />
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
          Couldn't load the leaderboard
        </Type>
        <Type as="p" className="mx-auto mt-2 max-w-sm text-muted-foreground" variant="body">
          {message ?? "Something went wrong fetching streaks. Try again in a moment."}
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

function ReadyState({
  state,
  onStartStudy,
}: {
  state: Extract<SongStreakLeaderboardState, { kind: "ready" }>;
  onStartStudy?: () => void;
}) {
  const { entries, viewer } = state;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <EmptyState onStartStudy={onStartStudy} />
        {viewer ? (
          <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
            <ViewerStanding onStartStudy={onStartStudy} ranked={false} viewer={viewer} />
          </div>
        ) : null}
      </div>
    );
  }

  const viewerRanked = entries.some((entry) => entry.is_viewer);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-6 sm:px-6">
      <SongStreakEntryList entries={entries} />

      {viewer && !viewerRanked ? (
        <ViewerStanding onStartStudy={onStartStudy} ranked={false} viewer={viewer} />
      ) : null}
      {viewer && viewerRanked && !viewer.qualified_today ? (
        <ViewerStanding onStartStudy={onStartStudy} ranked viewer={viewer} />
      ) : null}
    </div>
  );
}

export function SongStreakLeaderboard({
  artistName,
  artworkSrc,
  className,
  onExit,
  onRetry,
  onStartStudy,
  state,
  title,
}: SongStreakLeaderboardProps) {
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
      {state.kind === "ready" ? <ReadyState onStartStudy={onStartStudy} state={state} /> : null}
    </div>
  );
}
