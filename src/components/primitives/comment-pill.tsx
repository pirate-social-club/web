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
        "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/80 px-3 py-1.5 text-[15px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
      onClick={onComment}
      type="button"
      aria-label={`Comments (${count})`}
    >
      <ChatCircle className="size-[22px]" />
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}
