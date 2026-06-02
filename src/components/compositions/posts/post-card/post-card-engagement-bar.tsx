import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Lock, ShareFat } from "@phosphor-icons/react";

import { triggerNavigationTapHaptic, triggerShareSuccessHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { VotePill } from "@/components/primitives/vote-pill";
import { CommentPill } from "@/components/primitives/comment-pill";
import type { PostCardEngagement, PostCardShareAction } from "./post-card.types";

export interface UnlockAction {
  label: string;
  onClick: () => void;
}

export interface PostCardEngagementBarProps {
  engagement: PostCardEngagement;
  unlock?: UnlockAction;
  shareActions?: PostCardShareAction[];
  onVote?: (direction: "up" | "down" | null) => void;
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
  const hasMenu = actions.length > 0;
  const handleFallbackShare = React.useCallback(() => {
    if (!onFallbackShare) return;

    triggerShareSuccessHaptic();
    onFallbackShare();
  }, [onFallbackShare]);

  const button = (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border-soft bg-background px-4 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
      data-post-card-interactive="true"
      onClick={hasMenu ? undefined : handleFallbackShare}
      type="button"
    >
      <ShareFat className="size-[23px]" />
      Share
    </button>
  );

  if (!hasMenu) {
    return onFallbackShare ? button : null;
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {button}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "relative z-50 min-w-40 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          )}
        >
          {actions.map((item, index) => (
            <React.Fragment key={item.key}>
              {item.separatorBefore && index > 0 ? (
                <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
              ) : null}
              <DropdownMenuPrimitive.Item
                className={cn(
                  "relative w-full cursor-pointer select-none rounded-none py-2.5 pe-3 ps-3 text-start text-base text-popover-foreground outline-none transition-colors hover:text-foreground focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  item.icon ? "grid grid-cols-[1.25rem_1fr] items-center gap-2" : "block",
                  item.destructive && "text-destructive focus:text-destructive",
                )}
                disabled={item.disabled}
                onClick={() => {
                  triggerShareSuccessHaptic();
                  void item.onSelect?.();
                }}
              >
                {item.icon ? (
                  <span className="inline-flex size-5 items-center justify-center">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </DropdownMenuPrimitive.Item>
            </React.Fragment>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export function PostCardEngagementBar({
  engagement,
  unlock,
  shareActions = [],
  onVote,
  onComment,
  onShare,
  compact = false,
  className,
}: PostCardEngagementBarProps) {
  const { score, viewerVote, commentCount } = engagement;
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
      <VotePill
        className="shrink-0 justify-center"
        score={score}
        viewerVote={viewerVote}
        onVote={onVote}
      />
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
