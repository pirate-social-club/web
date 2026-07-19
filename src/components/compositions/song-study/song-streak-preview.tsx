import type {
  SongStreakLeaderboardEntry,
  SongStreakViewerStanding,
} from "@pirate/api-contracts";

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

// The inline streak indicator inside the song card: just the #1 holder, rendered
// with the exact same crown/avatar/fire row as the full leaderboard. Tapping it
// opens the board. No header, no viewer standing — those live on the route.
export function SongStreakPreview({ className, href, onViewLeaderboard, summary }: SongStreakPreviewProps) {
  const leader = summary.entries[0];
  if (!leader) return null;

  const list = <SongStreakEntryList entries={[leader]} />;

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
