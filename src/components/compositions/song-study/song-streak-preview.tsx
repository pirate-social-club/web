import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";
import { Crown, Fire } from "@phosphor-icons/react";
import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { SongStreakEntryList } from "./song-streak-parts";

// The lightweight per-post streak data the feed/post payload would carry
// (`streak_summary`): the top entry (+ optionally more) + the viewer's standing +
// a count. The full board (route) uses the same shape.
export interface SongStreakSummary {
  entries: SongStreakLeaderboardEntry[];
  totalActiveStreaks: number;
  viewer: SongStreakViewerStanding | null;
}

export interface SongStreakPreviewProps {
  className?: string;
  href?: string;
  onViewLeaderboard?: () => void;
  summary: SongStreakSummary;
}

// Entries arrive active (the server filters), but a page can stay open across
// an expiry: drop entries whose active_until_at has passed, and re-check at the
// next expiration. This is the feed/post-card freshness contract — correct when
// fetched, self-invalidating while mounted; no refetch loop in a scrolling feed.
function useLiveEntries(summary: SongStreakSummary): SongStreakLeaderboardEntry[] {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const expiries = summary.entries
      .map((entry) => Date.parse(entry.active_until_at))
      .filter((value) => Number.isFinite(value));
    if (expiries.length === 0) return;
    const delay = Math.max(0, Math.min(...expiries) - Date.now()) + 1000;
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [summary, now]);

  return summary.entries.filter((entry) => Date.parse(entry.active_until_at) > now);
}

// The inline streak indicator inside the song card: just the #1 holder, rendered
// with the exact same crown/avatar/fire row as the full leaderboard. Tapping it
// opens the board. No header, no viewer standing — those live on the route.
export function SongStreakPreview({ className, href, onViewLeaderboard, summary }: SongStreakPreviewProps) {
  const entries = useLiveEntries(summary);
  const leader = entries[0];
  if (!leader) return null;
  const tiedLeaders = entries.filter((entry) => entry.rank === 1);
  const tiedLeaderCount = tiedLeaders.length === entries.length
    && summary.totalActiveStreaks > tiedLeaders.length
    ? `${tiedLeaders.length}+`
    : String(tiedLeaders.length);

  const list = tiedLeaders.length > 1 ? (
    <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-border-soft bg-card px-4 py-3">
      <span className="grid size-8 place-items-center text-warning">
        <Crown className="size-6" weight="fill" />
      </span>
      <div className="flex -space-x-2">
        {tiedLeaders.slice(0, 3).map((entry) => (
          <Avatar
            className="size-10 border-2 border-card"
            fallback={entry.identity.handle ?? entry.identity.display_name ?? "Anonymous learner"}
            fallbackSeed={entry.identity.user_id}
            key={entry.identity.user_id}
            size="sm"
            src={entry.identity.avatar_ref ?? undefined}
          />
        ))}
      </div>
      <Type as="p" className="min-w-0 flex-1 truncate" variant="body-strong">
        {tiedLeaderCount} people · {leader.current_streak}-day streak
      </Type>
      <Fire className="size-6 shrink-0 text-primary" weight="fill" />
    </div>
  ) : <SongStreakEntryList entries={[leader]} />;

  if (href && !onViewLeaderboard) {
    return (
      <a className={cn("block transition-opacity hover:opacity-90", className)} data-post-card-interactive="true" href={href}>
        {list}
      </a>
    );
  }

  if (!onViewLeaderboard) {
    return <div className={className}>{list}</div>;
  }

  return (
    <div
      className={cn("cursor-pointer transition-opacity hover:opacity-90", className)}
      data-post-card-interactive="true"
      onClick={onViewLeaderboard}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewLeaderboard();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {list}
    </div>
  );
}
