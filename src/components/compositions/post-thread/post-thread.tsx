import * as React from "react";
import { Minus, Plus } from "@phosphor-icons/react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { Button } from "@/components/primitives/button";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { PillButton } from "@/components/primitives/pill-button";
import { triggerNavigationTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentCard } from "./comment-card";
import type { PostThreadComment, PostThreadProps } from "./post-thread.types";
import { Type } from "@/components/primitives/type";

function getCommentKey(comment: PostThreadComment, fallbackDepth: number): string {
  return comment.commentId ?? comment.replyId ?? `${comment.authorLabel}-${comment.timestampLabel}-${fallbackDepth}`;
}

const MAX_COMMENT_DEPTH = 8;

function CommentNode({
  comment,
  depth,
}: {
  comment: PostThreadComment;
  depth: number;
}) {
  const { locale } = useUiLocale();
  const commonCopy = getLocaleMessages(locale, "routes").common;
  const children = comment.children ?? [];
  const hasBranch = children.length > 0 || Boolean(comment.moreRepliesLabel);
  const [collapsed, setCollapsed] = React.useState(Boolean(comment.initiallyCollapsed));
  const truncateDeepNesting = depth >= MAX_COMMENT_DEPTH && hasBranch;

  const handleToggleCollapse = React.useCallback(() => {
    if (!hasBranch) return;
    triggerNavigationTapHaptic();
    setCollapsed((value) => !value);
  }, [hasBranch]);

  return (
    <article className={cn("flex gap-2", depth > 0 && "pt-3")}>
      {/* Left thread/collapse column */}
      <div className="flex w-5 flex-col items-center">
        {hasBranch ? (
          <button
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              collapsed
                ? "border-border bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground"
                : "border-border bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
            onClick={handleToggleCollapse}
            aria-label={collapsed ? commonCopy.expandReplies : commonCopy.collapseReplies}
            type="button"
          >
            {collapsed ? (
              <Plus className="size-3" weight="bold" />
            ) : (
              <Minus className="size-3" weight="bold" />
            )}
          </button>
        ) : (
          <div className="size-5 shrink-0" />
        )}

        {/* Vertical thread line extending down to children */}
        {hasBranch && !collapsed ? (
          <div className="mt-1 w-px flex-1 bg-border" />
        ) : null}
      </div>

      {/* Right content */}
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

        {/* Collapsed summary */}
        {hasBranch && collapsed ? (
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleCollapse}
            >
              {comment.moreRepliesLabel ?? commonCopy.showRepliesCount.replace("{count}", String(children.length))}
            </Button>
          </div>
        ) : null}

        {/* Children branch */}
        {hasBranch && !collapsed && !truncateDeepNesting ? (
          <div className="mt-2">
            {children.map((child) => (
              <CommentNode comment={child} depth={depth + 1} key={getCommentKey(child, depth + 1)} />
            ))}

            {comment.moreRepliesLabel ? (
              <div className="pt-2">
                <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies}>
                  {comment.moreRepliesLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Deep nesting truncation */}
        {truncateDeepNesting ? (
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies}>
              Continue this thread →
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PostThread({
  post,
  postOriginal,
  postShowOriginalLabel,
  postShowTranslationLabel,
  commentsHeading = "Comments",
  commentsHeadingDir,
  commentsHeadingLang,
  commentsBody,
  comments,
  replies,
  emptyCommentsLabel = "No comments yet.",
  rootReplyActionLabel,
  rootReplyPlaceholder,
  rootReplyCancelLabel,
  rootReplySubmitLabel,
  onRootReplySubmit,
  commentSort,
  availableCommentSorts,
  onCommentSortChange,
  className,
}: PostThreadProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const items = comments ?? replies ?? [];
  const [showOriginalPost, setShowOriginalPost] = React.useState(false);
  const [rootReplyOpen, setRootReplyOpen] = React.useState(false);
  const [rootReplyBody, setRootReplyBody] = React.useState("");
  const [rootReplyBusy, setRootReplyBusy] = React.useState(false);
  const activePost = showOriginalPost && postOriginal ? postOriginal : post;
  const canToggleOriginalPost = Boolean(postOriginal && postShowOriginalLabel && postShowTranslationLabel);
  const canReplyAtRoot = Boolean(onRootReplySubmit);
  const resolvedCommentsHeading = commentsHeading === "Comments" ? copy.common.commentsHeading : commentsHeading;
  const resolvedEmptyCommentsLabel = emptyCommentsLabel === "No comments yet." ? copy.common.noComments : emptyCommentsLabel;

  React.useEffect(() => {
    setShowOriginalPost(false);
  }, [post.postHref, postOriginal?.postHref]);

  const handleRootReplySubmit = React.useCallback(async () => {
    const trimmed = rootReplyBody.trim();
    if (!trimmed || !onRootReplySubmit) {
      return;
    }
    try {
      setRootReplyBusy(true);
      const result = await onRootReplySubmit({ body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setRootReplyBody("");
      setRootReplyOpen(false);
    } finally {
      setRootReplyBusy(false);
    }
  }, [onRootReplySubmit, rootReplyBody]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden border-b border-border-soft">
        <PostCard {...activePost} className="border-b-0" />
        {canToggleOriginalPost ? (
          <div className="border-t border-border-soft px-4 py-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowOriginalPost((value) => !value)}
            >
              {showOriginalPost ? postShowTranslationLabel : postShowOriginalLabel}
            </Button>
          </div>
        ) : null}
      </div>

      <section>
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="text-sm font-medium text-foreground" dir={commentsHeadingDir ?? "auto"} lang={commentsHeadingLang}>
            {resolvedCommentsHeading}
          </div>
          {canReplyAtRoot ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRootReplyOpen((value) => !value)}
            >
              {rootReplyActionLabel}
            </Button>
          ) : null}
        </div>
        {availableCommentSorts && availableCommentSorts.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {availableCommentSorts.map((sort) => (
              <PillButton
                key={sort.value}
                onClick={() => onCommentSortChange?.(sort.value)}
                tone={sort.value === commentSort ? "selected" : "default"}
              >
                {sort.label}
              </PillButton>
            ))}
          </div>
        ) : null}
        {commentsBody ? (
          <Type as="p" variant="caption" className="px-4 pb-2">{commentsBody}</Type>
        ) : null}
        {rootReplyOpen ? (
          <div className="mx-4 mb-3 space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]">
            <FormattedTextarea
              className="min-h-28"
              onChange={setRootReplyBody}
              placeholder={rootReplyPlaceholder}
              value={rootReplyBody}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setRootReplyOpen(false);
                  setRootReplyBody("");
                }}
              >
                {rootReplyCancelLabel}
              </Button>
              <Button
                disabled={rootReplyBusy || !rootReplyBody.trim()}
                size="sm"
                onClick={() => void handleRootReplySubmit()}
              >
                {rootReplySubmitLabel}
              </Button>
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="px-4">
            {items.map((comment, index) => (
              <CommentNode comment={comment} depth={0} key={getCommentKey(comment, index)} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 text-sm text-muted-foreground">{resolvedEmptyCommentsLabel}</div>
        )}
      </section>
    </div>
  );
}
