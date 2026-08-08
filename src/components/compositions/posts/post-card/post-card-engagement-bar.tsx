import * as React from "react";
import { Lock, ShareFat } from "@phosphor-icons/react";

import { triggerNavigationTapHaptic, triggerShareSuccessHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { ActionMenu } from "@/components/primitives/action-menu";
import { VotePill } from "@/components/primitives/vote-pill";
import { CommentPill } from "@/components/primitives/comment-pill";
import type { PostCardEngagement, PostCardShareAction } from "./post-card.types";

interface UnlockAction {
  label: string;
  onClick: () => void;
}

export interface PostCardEngagementBarProps {
  engagement: PostCardEngagement;
  unlock?: UnlockAction;
  shareActions?: PostCardShareAction[];
  onVote?: (direction: "up" | "down" | null) => Promise<void> | void;
  voteAccess?: {
    label: string;
    onClick?: () => void;
  };
  onComment?: () => void;
  onShare?: () => void;
  compact?: boolean;
  className?: string;
}

function SharePillMenu({
  actions,
  onFallbackShare,
}: {
  actions: PostCardShareAction[];
  onFallbackShare?: () => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const hasMenu = actions.length > 0;
  const handleFallbackShare = React.useCallback(() => {
    if (!onFallbackShare) return;

    triggerShareSuccessHaptic();
    onFallbackShare();
  }, [onFallbackShare]);
  const handleAction = React.useCallback((key: string) => {
    const action = actions.find((item) => item.key === key);
    if (!action || action.disabled || !action.onSelect) return;

    triggerShareSuccessHaptic();
    void action.onSelect();
  }, [actions]);

  const button = (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border-soft bg-background px-4 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
      data-post-card-interactive="true"
      onClick={hasMenu ? undefined : handleFallbackShare}
      type="button"
    >
      <ShareFat className="size-[23px]" />
      {copy.post.engagement.share}
    </button>
  );

  if (!hasMenu) {
    return onFallbackShare ? button : null;
  }

  return (
    <ActionMenu
      align="start"
      contentClassName="min-w-40"
      items={actions}
      label={copy.post.engagement.share}
      onAction={handleAction}
      title={copy.post.engagement.share}
      trigger={button}
    />
  );
}

export function PostCardEngagementBar({
  engagement,
  unlock,
  shareActions = [],
  onVote,
  voteAccess,
  onComment,
  onShare,
  compact = false,
  className,
}: PostCardEngagementBarProps) {
  const { score, viewerVote, voteBusy, commentCount } = engagement;
  const handleUnlock = React.useCallback(() => {
    if (!unlock) return;

    triggerNavigationTapHaptic();
    unlock.onClick();
  }, [unlock]);
  const unlockButton = unlock ? (
    <button
      className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border-soft bg-background px-4 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
      onClick={handleUnlock}
      type="button"
      data-post-card-interactive="true"
    >
      <Lock className="size-[20px]" />
      <span className="tabular-nums">{unlock.label}</span>
    </button>
  ) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 pt-0.5",
        compact ? "flex-wrap self-start" : "w-full",
        className,
      )}
    >
      {voteAccess ? (
        <button
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border-soft bg-background px-4 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
          data-post-card-interactive="true"
          onClick={voteAccess.onClick}
          type="button"
        >
          <Lock className="size-[20px]" />
          <span>{voteAccess.label}</span>
        </button>
      ) : (
        <VotePill
          allowClear
          busy={voteBusy}
          className="shrink-0 justify-center"
          score={score}
          viewerVote={viewerVote}
          onVote={onVote}
        />
      )}
      <CommentPill
        className="shrink-0 justify-center whitespace-nowrap"
        count={commentCount}
        onComment={onComment}
      />
      {compact ? unlockButton : null}
      <SharePillMenu actions={shareActions} onFallbackShare={onShare} />
      {!compact ? <div className="flex-1" /> : null}
      {!compact ? unlockButton : null}
    </div>
  );
}
