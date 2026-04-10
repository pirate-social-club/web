"use client";

import * as React from "react";
import { ChatCircle } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export interface CommentPillProps {
  count: number;
  onComment?: () => void;
  className?: string;
}

export function CommentPill({ count, onComment, className }: CommentPillProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-soft bg-background px-3 text-base text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground",
        className,
      )}
      onClick={onComment}
      type="button"
      aria-label={`Comments (${count})`}
      data-post-card-interactive="true"
    >
      <ChatCircle className="size-[19px]" />
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}
