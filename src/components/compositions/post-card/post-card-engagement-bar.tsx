import * as React from "react";
import { Lock, Share } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { VotePill } from "@/components/primitives/vote-pill";
import { CommentPill } from "@/components/primitives/comment-pill";
import type { PostCardEngagement } from "./post-card.types";

export interface UnlockAction {
  label: string;
  onClick: () => void;
}

export interface PostCardEngagementBarProps {
  engagement: PostCardEngagement;
  unlock?: UnlockAction;
  onVote?: (direction: "up" | "down" | null) => void;
  onComment?: () => void;
  onShare?: () => void;
  className?: string;
}

export function PostCardEngagementBar({
  engagement,
  unlock,
  onVote,
  onComment,
  onShare,
  className,
}: PostCardEngagementBarProps) {
  const { score, viewerVote, commentCount } = engagement;

  return (
    <div className={cn("flex items-center gap-1.5 pt-0.5", className)}>
      <VotePill score={score} viewerVote={viewerVote} onVote={onVote} />
      <CommentPill count={commentCount} onComment={onComment} />
      {onShare && (
        <button
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-soft bg-background px-3 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground",
          )}
          onClick={onShare}
          type="button"
          data-post-card-interactive="true"
        >
          <Share className="size-[17px]" />
          Share
        </button>
      )}
      <div className="flex-1" />
      {unlock && (
        <button
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/8 px-3 text-base font-medium text-primary transition-colors hover:bg-primary/14",
          )}
          onClick={unlock.onClick}
          type="button"
          data-post-card-interactive="true"
        >
          <Lock className="size-[17px]" />
          {unlock.label}
        </button>
      )}
    </div>
  );
}
