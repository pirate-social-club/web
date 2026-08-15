import { Show } from "solid-js";

import {
  ActionMenu,
  CommentPill,
  IconLock,
  IconShareFat,
  VotePill,
} from "../../../design-system";
import { cn } from "../../../lib/cn";
import { triggerNavigationTapHaptic, triggerShareSuccessHaptic } from "../../../lib/haptics";
import { resolveMenuItemsWithIcons } from "./action-menu";
import type { PostCardEngagement, PostCardShareAction } from "./types";

interface UnlockAction {
  label: string;
  onClick: () => void;
}

export interface PostCardEngagementBarLabels {
  share?: string;
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
  labels?: PostCardEngagementBarLabels;
  class?: string;
}

const pillClassName =
  "inline-flex h-11 items-center gap-2 rounded-full border border-border-soft bg-background px-4 text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground";

function SharePillMenu(props: {
  actions: PostCardShareAction[];
  onFallbackShare?: () => void;
  shareLabel: string;
}) {
  const hasMenu = () => props.actions.length > 0;
  const handleFallbackShare = () => {
    if (!props.onFallbackShare) return;
    triggerShareSuccessHaptic();
    props.onFallbackShare();
  };
  const handleAction = (key: string) => {
    const action = props.actions.find((item) => item.key === key);
    if (!action || action.disabled || !action.onSelect) return;
    triggerShareSuccessHaptic();
    void action.onSelect();
  };

  const triggerContent = (
    <>
      <IconShareFat class="size-[23px]" />
      {props.shareLabel}
    </>
  );

  return (
    <Show
      when={hasMenu()}
      fallback={props.onFallbackShare ? (
        <button
          class={pillClassName}
          data-post-card-interactive="true"
          onClick={handleFallbackShare}
          type="button"
        >
          {triggerContent}
        </button>
      ) : null}
    >
      <ActionMenu
        contentClass="min-w-40"
        items={resolveMenuItemsWithIcons(props.actions)}
        label={props.shareLabel}
        onAction={handleAction}
        placement="bottom-start"
        triggerClass={pillClassName}
        triggerContent={triggerContent}
      />
    </Show>
  );
}

export function PostCardEngagementBar(props: PostCardEngagementBarProps) {
  const handleUnlock = () => {
    if (!props.unlock) return;
    triggerNavigationTapHaptic();
    props.unlock.onClick();
  };

  const unlockButton = (
    <Show when={props.unlock}>
      {(unlock) => (
        <button
          class={cn(pillClassName, "whitespace-nowrap")}
          onClick={handleUnlock}
          type="button"
          data-post-card-interactive="true"
        >
          <IconLock class="size-[20px]" />
          <span class="tabular-nums">{unlock().label}</span>
        </button>
      )}
    </Show>
  );

  return (
    <div
      class={cn(
        "flex items-center gap-1.5 pt-0.5",
        props.compact ? "flex-wrap self-start" : "w-full",
        props.class,
      )}
    >
      <Show
        when={props.voteAccess}
        fallback={(
          <VotePill
            allowClear
            busy={props.engagement.voteBusy}
            class="shrink-0 justify-center"
            score={props.engagement.score}
            viewerVote={props.engagement.viewerVote}
            onVote={props.onVote}
          />
        )}
      >
        {(voteAccess) => (
          <button
            class={cn(pillClassName, "shrink-0")}
            data-post-card-interactive="true"
            onClick={voteAccess().onClick}
            type="button"
          >
            <IconLock class="size-[20px]" />
            <span>{voteAccess().label}</span>
          </button>
        )}
      </Show>
      <CommentPill
        class="shrink-0 justify-center whitespace-nowrap"
        count={props.engagement.commentCount}
        onComment={props.onComment}
      />
      {props.compact ? unlockButton : null}
      <SharePillMenu
        actions={props.shareActions ?? []}
        onFallbackShare={props.onShare}
        shareLabel={props.labels?.share ?? "Share"}
      />
      {!props.compact ? <div class="flex-1" /> : null}
      {!props.compact ? unlockButton : null}
    </div>
  );
}
