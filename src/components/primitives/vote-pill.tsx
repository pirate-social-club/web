"use client";

import * as React from "react";
import { ArrowFatDown, ArrowFatUp } from "@phosphor-icons/react";

import { triggerLikeToggleHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

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
  allowClear?: boolean;
  className?: string;
  downvoteLabel?: string;
  size?: "default" | "compact";
  upvoteLabel?: string;
  variant?: "pill" | "bare";
}

export function VotePill({
  score,
  viewerVote,
  onVote,
  allowClear = false,
  className,
  downvoteLabel,
  size = "default",
  upvoteLabel,
  variant = "pill",
}: VotePillProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const handleVote = React.useCallback((direction: "up" | "down") => {
    if (!onVote) return;

    const nextVote = viewerVote === direction && allowClear ? null : direction;

    triggerLikeToggleHaptic(nextVote !== null);
    onVote(nextVote);
  }, [allowClear, onVote, viewerVote]);

  return (
    <div
      className={cn(
        "inline-grid items-center gap-0 transition-colors",
        size === "default" && "h-11 grid-cols-[2.5rem_2rem_2.5rem] px-1",
        size === "compact" && "h-9 grid-cols-[2rem_1.75rem_2rem] px-0.5",
        variant === "pill" && [
          "rounded-full border border-border-soft bg-background",
          viewerVote === "up" && "border-primary/18 bg-primary/6",
          viewerVote === "down" && "border-destructive/18 bg-destructive/6",
        ],
        className,
      )}
      data-post-card-interactive="true"
      dir="ltr"
    >
      <button
        className={cn(
          "inline-flex items-center justify-center justify-self-center rounded-full transition-colors",
          size === "default" && "size-10",
          size === "compact" && "size-8",
          viewerVote === "up"
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground",
        )}
        onClick={() => handleVote("up")}
        type="button"
        aria-label={upvoteLabel ?? copy.upvote}
      >
        <ArrowFatUp
          className={cn(
            size === "default" && "size-[23px]",
            size === "compact" && "size-[20px]",
            viewerVote === "up" && "fill-current",
          )}
          weight={viewerVote === "up" ? "fill" : "regular"}
        />
      </button>

      <span
        className={cn(
          "text-center text-base font-semibold tabular-nums",
          size === "default" && "w-8",
          size === "compact" && "w-7",
          viewerVote === "up" && "text-primary",
          viewerVote === "down" && "text-destructive",
          !viewerVote && "text-muted-foreground",
        )}
      >
        {formatScore(score)}
      </span>

      <button
        className={cn(
          "inline-flex items-center justify-center justify-self-center rounded-full transition-colors",
          size === "default" && "size-10",
          size === "compact" && "size-8",
          viewerVote === "down"
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground",
        )}
        onClick={() => handleVote("down")}
        type="button"
        aria-label={downvoteLabel ?? copy.downvote}
      >
        <ArrowFatDown
          className={cn(
            size === "default" && "size-[23px]",
            size === "compact" && "size-[20px]",
            viewerVote === "down" && "fill-current",
          )}
          weight={viewerVote === "down" ? "fill" : "regular"}
        />
      </button>
    </div>
  );
}
