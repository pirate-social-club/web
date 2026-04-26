import * as React from "react";
import { Minus, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { triggerNavigationTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentCard } from "./comment-card";
import type { PostThreadComment } from "./post-thread.types";

const DEFAULT_MAX_COMMENT_DEPTH = 8;

function getCommentKey(comment: PostThreadComment, fallbackKey: string): string {
  return comment.commentId ?? comment.replyId ?? fallbackKey;
}

function collectCommentKeys(comments: PostThreadComment[], parentKey = "comment"): Set<string> {
  const keys = new Set<string>();

  comments.forEach((comment, index) => {
    const key = getCommentKey(comment, `${parentKey}-${index}`);
    keys.add(key);
    for (const childKey of collectCommentKeys(comment.children ?? [], key)) {
      keys.add(childKey);
    }
  });

  return keys;
}

function collectInitiallyCollapsedKeys(
  comments: PostThreadComment[],
  seenKeys: Set<string>,
  parentKey = "comment",
): string[] {
  const keys: string[] = [];

  comments.forEach((comment, index) => {
    const key = getCommentKey(comment, `${parentKey}-${index}`);
    if (comment.initiallyCollapsed && !seenKeys.has(key)) {
      keys.push(key);
    }
    keys.push(...collectInitiallyCollapsedKeys(comment.children ?? [], seenKeys, key));
  });

  return keys;
}

function collectInitialCollapsedKeySet(comments: PostThreadComment[]): Set<string> {
  return new Set(collectInitiallyCollapsedKeys(comments, new Set()));
}

function commentHasExpandableContent(comment: PostThreadComment): boolean {
  return Boolean(
    comment.body ||
    comment.originalBody ||
    comment.status ||
    comment.onReplySubmit ||
    comment.onVote,
  );
}

function formatReplyCount(count: number, copy: { replyCount: string; replyCountOne: string }): string {
  return count === 1 ? copy.replyCountOne : copy.replyCount.replace("{count}", String(count));
}

function resolveReplyCount(comment: PostThreadComment, loadedChildrenCount: number): number {
  return comment.replyCount ?? comment.loadedReplyCount ?? loadedChildrenCount;
}

interface CollapsedCommentRowProps {
  comment: PostThreadComment;
  onExpand: () => void;
  replyCount: number;
}

function CollapsedCommentRow({ comment, onExpand, replyCount }: CollapsedCommentRowProps) {
  const { locale } = useUiLocale();
  const commonCopy = getLocaleMessages(locale, "routes").common;
  const detailParts = [
    comment.scoreLabel,
    replyCount > 0 ? formatReplyCount(replyCount, commonCopy) : null,
  ].filter(Boolean);

  return (
    <button
      className="flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-lg)] px-2 py-1.5 text-start text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      onClick={onExpand}
      type="button"
      aria-label={commonCopy.expandThread}
    >
      <Plus className="size-4 shrink-0" weight="bold" />
      <div className="min-w-0 flex-1">
        <Type as="div" variant="caption" className="truncate">
          <span className="font-semibold text-foreground"><bdi>{comment.authorLabel}</bdi></span>
          <span aria-hidden="true"> · </span>
          <span>{comment.timestampLabel}</span>
          {detailParts.length > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span>{detailParts.join(" · ")}</span>
            </>
          ) : null}
        </Type>
      </div>
    </button>
  );
}

interface CommentTreeNodeProps {
  collapsedIds: Set<string>;
  comment: PostThreadComment;
  depth: number;
  maxDepth: number;
  nodeKey: string;
  onToggleCollapsed: (key: string) => void;
}

function CommentTreeNode({
  collapsedIds,
  comment,
  depth,
  maxDepth,
  nodeKey,
  onToggleCollapsed,
}: CommentTreeNodeProps) {
  const { locale } = useUiLocale();
  const commonCopy = getLocaleMessages(locale, "routes").common;
  const children = comment.children ?? [];
  const loadedChildrenCount = children.length;
  const replyCount = resolveReplyCount(comment, loadedChildrenCount);
  const hasLoadedChildren = loadedChildrenCount > 0;
  const hasLoadMore = Boolean(comment.canLoadMoreReplies || comment.loadMoreRepliesLabel || comment.moreRepliesLabel);
  const loadMoreLabel = comment.loadMoreRepliesLabel ?? comment.moreRepliesLabel;
  const canCollapse = commentHasExpandableContent(comment) || hasLoadedChildren;
  const collapsed = canCollapse && collapsedIds.has(nodeKey);
  const truncateDeepNesting = depth >= maxDepth && hasLoadedChildren;

  const handleToggleCollapse = React.useCallback(() => {
    if (!canCollapse) return;
    triggerNavigationTapHaptic();
    onToggleCollapsed(nodeKey);
  }, [canCollapse, nodeKey, onToggleCollapsed]);

  if (collapsed) {
    return (
      <article className={cn("flex gap-2", depth > 0 && "pt-3")}>
        <div className="flex w-5 shrink-0 justify-center">
          <div className="size-5" />
        </div>
        <div className="min-w-0 flex-1 pb-3">
          <CollapsedCommentRow comment={comment} onExpand={handleToggleCollapse} replyCount={replyCount} />
        </div>
      </article>
    );
  }

  return (
    <article className={cn("flex gap-2", depth > 0 && "pt-3")}>
      <div className="flex w-5 flex-col items-center">
        {canCollapse ? (
          <button
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            onClick={handleToggleCollapse}
            aria-label={commonCopy.collapseThread}
            type="button"
          >
            <Minus className="size-3" weight="bold" />
          </button>
        ) : (
          <div className="size-5 shrink-0" />
        )}
        {hasLoadedChildren && !truncateDeepNesting ? (
          <div className="mt-1 w-px flex-1 bg-border" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pb-3">
        <CommentCard
          authorLabel={comment.authorLabel}
          authorHref={comment.authorHref}
          metadataLabel={comment.metadataLabel}
          scoreLabel={comment.scoreLabel}
          timestampLabel={comment.timestampLabel}
          body={comment.body}
          bodyDir={comment.bodyDir}
          bodyLang={comment.bodyLang}
          originalBody={comment.originalBody}
          status={comment.status}
          viewerVote={comment.viewerVote}
          onVote={comment.onVote}
          showOriginalLabel={comment.showOriginalLabel}
          showTranslationLabel={comment.showTranslationLabel}
          replyActionLabel={comment.replyActionLabel}
          replyPlaceholder={comment.replyPlaceholder}
          cancelReplyLabel={comment.cancelReplyLabel}
          submitReplyLabel={comment.submitReplyLabel}
          onReplySubmit={comment.onReplySubmit}
        />

        {hasLoadedChildren && !truncateDeepNesting ? (
          <div className="mt-2">
            {children.map((child, index) => {
              const childKey = getCommentKey(child, `${nodeKey}-${index}`);
              return (
                <CommentTreeNode
                  collapsedIds={collapsedIds}
                  comment={child}
                  depth={depth + 1}
                  key={childKey}
                  maxDepth={maxDepth}
                  nodeKey={childKey}
                  onToggleCollapsed={onToggleCollapsed}
                />
              );
            })}
          </div>
        ) : null}

        {truncateDeepNesting ? (
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies}>
              {commonCopy.continueThread}
            </Button>
          </div>
        ) : null}

        {hasLoadMore && loadMoreLabel ? (
          <div className="pt-2">
            <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies} disabled={comment.loadingReplies}>
              {loadMoreLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export interface CommentTreeProps {
  comments: PostThreadComment[];
  className?: string;
  maxDepth?: number;
}

export function CommentTree({
  comments,
  className,
  maxDepth = DEFAULT_MAX_COMMENT_DEPTH,
}: CommentTreeProps) {
  const initializedKeysRef = React.useRef<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(() => collectInitialCollapsedKeySet(comments));

  React.useEffect(() => {
    const knownKeys = collectCommentKeys(comments);
    const initiallyCollapsedKeys = collectInitiallyCollapsedKeys(comments, initializedKeysRef.current);

    setCollapsedIds((current) => {
      const next = new Set<string>();
      for (const key of current) {
        if (knownKeys.has(key)) {
          next.add(key);
        }
      }
      for (const key of initiallyCollapsedKeys) {
        next.add(key);
      }
      return next;
    });

    for (const key of knownKeys) {
      initializedKeysRef.current.add(key);
    }
  }, [comments]);

  const handleToggleCollapsed = React.useCallback((key: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <div className={className}>
      {comments.map((comment, index) => {
        const nodeKey = getCommentKey(comment, `comment-${index}`);
        return (
          <CommentTreeNode
            collapsedIds={collapsedIds}
            comment={comment}
            depth={0}
            key={nodeKey}
            maxDepth={maxDepth}
            nodeKey={nodeKey}
            onToggleCollapsed={handleToggleCollapsed}
          />
        );
      })}
    </div>
  );
}
