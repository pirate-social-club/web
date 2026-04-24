"use client";

import * as React from "react";
import { ChatCircle } from "@phosphor-icons/react";

import { triggerCommentTapHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface CommentPillProps {
  count: number;
  onComment?: () => void;
  className?: string;
}

export function CommentPill({ count, onComment, className }: CommentPillProps) {
  const handleComment = React.useCallback(() => {
    if (!onComment) return;

    triggerCommentTapHaptic();
    onComment();
  }, [onComment]);

  return (
    <button
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-border-soft bg-background px-4 text-base text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground",
        className,
      )}
      onClick={handleComment}
      type="button"
      aria-label={`Comments (${count})`}
      data-post-card-interactive="true"
    >
      <ChatCircle className="size-[23px]" />
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}
