"use client";

import * as React from "react";
import { ArrowFatDown, ArrowFatUp } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

function formatScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  if (score < 0) return score.toString();
  return score > 0 ? score.toString() : "0";
}

export interface VotePillProps {
  score: number;
  viewerVote?: "up" | "down" | null;
  onVote?: (direction: "up" | "down" | null) => void;
  className?: string;
}

export function VotePill({ score, viewerVote, onVote, className }: VotePillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0 rounded-full border border-border/50 bg-secondary/80 px-0.5 py-0.5 transition-colors",
        viewerVote === "up" && "border-primary/20 bg-primary/5",
        viewerVote === "down" && "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <button
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full transition-colors",
          viewerVote === "up"
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground",
        )}
        onClick={() => onVote?.(viewerVote === "up" ? null : "up")}
        type="button"
        aria-label="Upvote"
      >
        <ArrowFatUp className={cn("size-[20px]", viewerVote === "up" && "fill-current")} />
      </button>

      <span
        className={cn(
          "min-w-[1.5rem] text-center text-[14px] font-semibold tabular-nums",
          viewerVote === "up" && "text-primary",
          viewerVote === "down" && "text-destructive",
          !viewerVote && "text-muted-foreground",
        )}
      >
        {formatScore(score)}
      </span>

      <button
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full transition-colors",
          viewerVote === "down"
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground",
        )}
        onClick={() => onVote?.(viewerVote === "down" ? null : "down")}
        type="button"
        aria-label="Downvote"
      >
        <ArrowFatDown className={cn("size-[20px]", viewerVote === "down" && "fill-current")} />
      </button>
    </div>
  );
}
