"use client";

import * as React from "react";
import { ArrowFatDown, ArrowFatUp } from "@phosphor-icons/react";

import { Spinner } from "@/components/primitives/spinner";
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
  onVote?: (direction: "up" | "down" | null) => Promise<void> | void;
  allowClear?: boolean;
  busy?: boolean;
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
  busy = false,
  className,
  downvoteLabel,
  size = "default",
  upvoteLabel,
  variant = "pill",
}: VotePillProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const pendingRef = React.useRef(false);
  const [pendingDirection, setPendingDirection] = React.useState<"up" | "down" | null>(null);
  const handleVote = React.useCallback(async (direction: "up" | "down") => {
    if (!onVote || busy || pendingRef.current) return;

    if (viewerVote === direction && !allowClear) return;

    const nextVote = viewerVote === direction && allowClear ? null : direction;

    triggerLikeToggleHaptic(nextVote !== null);
    pendingRef.current = true;
    setPendingDirection(direction);
    try {
      await onVote(nextVote);
    } finally {
      pendingRef.current = false;
      setPendingDirection(null);
    }
  }, [allowClear, busy, onVote, viewerVote]);
  const pending = pendingDirection != null;
  const controlsBusy = busy || pending;

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
      aria-busy={controlsBusy}
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
        aria-pressed={viewerVote === "up"}
        disabled={controlsBusy || (viewerVote === "up" && !allowClear)}
        onClick={() => void handleVote("up")}
        type="button"
        aria-label={upvoteLabel ?? copy.upvote}
      >
        {pendingDirection === "up" ? (
          <Spinner className={size === "default" ? "size-5" : "size-4"} />
        ) : (
          <ArrowFatUp
            className={cn(
              size === "default" && "size-[23px]",
              size === "compact" && "size-[20px]",
              viewerVote === "up" && "fill-current",
            )}
            weight={viewerVote === "up" ? "fill" : "regular"}
          />
        )}
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
        aria-pressed={viewerVote === "down"}
        disabled={controlsBusy || (viewerVote === "down" && !allowClear)}
        onClick={() => void handleVote("down")}
        type="button"
        aria-label={downvoteLabel ?? copy.downvote}
      >
        {pendingDirection === "down" ? (
          <Spinner className={size === "default" ? "size-5" : "size-4"} />
        ) : (
          <ArrowFatDown
            className={cn(
              size === "default" && "size-[23px]",
              size === "compact" && "size-[20px]",
              viewerVote === "down" && "fill-current",
            )}
            weight={viewerVote === "down" ? "fill" : "regular"}
          />
        )}
      </button>
    </div>
  );
}
