import { CaretRight, Fire } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { SongStreakSummary } from "./song-streak-preview";

// Feed chip: a single tappable line built from the SAME streak summary the
// post-page preview uses — the viewer's own streak when they have one, else the
// active-streak count. No row list (too heavy for a scrolling feed). Renders
// nothing when there is neither a viewer streak nor any activity.
export interface SongStreakChipProps {
  className?: string;
  onClick?: () => void;
  summary: SongStreakSummary;
}

function chipLabel(summary: SongStreakSummary): string | null {
  const { totalActiveStreaks, viewer } = summary;
  if (viewer?.alive) {
    if (viewer.qualified_today) return `${viewer.current_streak}-day streak · locked in today`;
    const remaining = Math.max(0, viewer.study_target_today - viewer.study_attempts_today);
    return `${viewer.current_streak}-day streak · Study ${remaining} more`;
  }
  if (viewer && !viewer.alive && viewer.best_streak > 0) {
    return `Streak lapsed · best ${viewer.best_streak} — restart`;
  }
  if (totalActiveStreaks > 0) {
    return `${totalActiveStreaks} active ${totalActiveStreaks === 1 ? "streak" : "streaks"}`;
  }
  return null;
}

export function SongStreakChip({ className, onClick, summary }: SongStreakChipProps) {
  const label = chipLabel(summary);
  if (!label) return null;

  const alive = Boolean(summary.viewer?.alive);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2 text-start transition-colors hover:bg-muted",
        className,
      )}
      data-post-card-interactive="true"
      onClick={onClick}
      type="button"
    >
      <Fire className={cn("size-4 shrink-0", alive ? "text-primary" : "text-muted-foreground")} weight="fill" />
      <Type as="span" className="min-w-0 flex-1 truncate" variant="label">
        {label}
      </Type>
      <CaretRight className="size-4 shrink-0 text-muted-foreground" weight="bold" />
    </button>
  );
}
