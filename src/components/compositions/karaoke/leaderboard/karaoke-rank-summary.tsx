import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { KaraokeRankSummaryData } from "./karaoke-leaderboard.types";

export interface KaraokeRankSummaryProps extends KaraokeRankSummaryData {
  className?: string;
}

function scopeLabel(scope: KaraokeRankSummaryData["scope"]): string {
  return scope === "weekly" ? "this week" : "all-time";
}

/**
 * Compact rank line for the result screen — "#12 this week · Top 18%".
 * The rank and percentile are server-provided (competition rank, server-computed
 * percentile); this never calculates them. Renders a neutral note when the take
 * isn't eligible / the user isn't ranked.
 */
export function KaraokeRankSummary({ className, eligible, percentile, rank, scope }: KaraokeRankSummaryProps) {
  if (!eligible || rank == null) {
    return (
      <Type as="p" className={cn("text-muted-foreground", className)} variant="caption">
        Not ranked
      </Type>
    );
  }

  const topPercent = percentile != null ? Math.max(1, Math.round(percentile / 100)) : null;

  return (
    <Type as="p" className={cn("font-medium", className)} variant="body-strong">
      #{rank} {scopeLabel(scope)}
      {topPercent != null ? ` · Top ${topPercent}%` : ""}
    </Type>
  );
}
