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
    <div className={cn("flex items-center gap-2", className)}>
      <VotePill score={score} viewerVote={viewerVote} onVote={onVote} />
      <CommentPill count={commentCount} onComment={onComment} />
      {onShare && (
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/80 px-3 py-1.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          )}
          onClick={onShare}
          type="button"
        >
          <Share className="size-[18px]" />
          Share
        </button>
      )}
      <div className="flex-1" />
      {unlock && (
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[15px] font-medium text-primary transition-colors hover:bg-primary/20",
          )}
          onClick={unlock.onClick}
          type="button"
        >
          <Lock className="size-[18px]" />
          {unlock.label}
        </button>
      )}
    </div>
  );
}
