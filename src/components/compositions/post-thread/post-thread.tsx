import * as React from "react";
import { Minus, Plus } from "@phosphor-icons/react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { ResponsiveOptionSelect } from "@/components/compositions/responsive-option-select/responsive-option-select";
import { SortControlRow } from "@/components/compositions/sort-control-row/sort-control-row";
import { Button } from "@/components/primitives/button";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { triggerNavigationTapHaptic } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentCard } from "./comment-card";
import type { CommentSort, PostThreadComment, PostThreadProps } from "./post-thread.types";
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

type FlatCommentItem = {
  comment: PostThreadComment;
  depth: number;
};

function flattenComments(comments: PostThreadComment[]): FlatCommentItem[] {
  const result: FlatCommentItem[] = [];

  function walk(items: PostThreadComment[], depth: number) {
    for (const item of items) {
      result.push({ comment: item, depth });
      if (item.children && item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    }
  }

  walk(comments, 0);
  return result;
}

function flatCommentPadding(depth: number): string {
  if (depth >= 4) return "ps-3";
  if (depth >= 2) return "ps-4";
  if (depth >= 1) return "ps-5";
  return "";
}

function FlatCommentRow({ item }: { item: FlatCommentItem }) {
  const { comment, depth } = item;

  return (
    <article
      className={cn(
        "pb-3",
        depth > 0 && "border-l border-border-soft pt-3",
        depth === 0 && "border-b border-border-soft",
        flatCommentPadding(depth),
      )}
    >
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

      {comment.moreRepliesLabel ? (
        <div className="pt-2">
          <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies}>
            {comment.moreRepliesLabel}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function PostThread({
  post,
  postOriginal,
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
  const isMobile = useIsMobile();
  const [showOriginalPost, setShowOriginalPost] = React.useState(false);
  const [rootReplyOpen, setRootReplyOpen] = React.useState(false);
  const [rootReplyBody, setRootReplyBody] = React.useState("");
  const [rootReplyBusy, setRootReplyBusy] = React.useState(false);
  const activePost = showOriginalPost && postOriginal ? postOriginal : post;
  const canToggleOriginalPost = Boolean(postOriginal);
  const canReplyAtRoot = Boolean(onRootReplySubmit);
  const resolvedEmptyCommentsLabel = emptyCommentsLabel === "No comments yet." ? copy.common.noComments : emptyCommentsLabel;
  const resolvedRootReplyPlaceholder = rootReplyPlaceholder || rootReplyActionLabel || copy.common.replyAction;
  const activeSort = commentSort ?? availableCommentSorts?.[0]?.value;

  const flatItems = React.useMemo(() => flattenComments(items), [items]);

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
      <div className="overflow-hidden">
        <PostCard
          {...activePost}
          className="border-b-0"
          isViewingOriginal={showOriginalPost}
          onToggleOriginal={canToggleOriginalPost ? () => setShowOriginalPost((value) => !value) : activePost.onToggleOriginal}
        />
      </div>

      <section>
        {canReplyAtRoot && !rootReplyOpen ? (
          <div className="px-4 pb-5">
            <input
              aria-label={rootReplyActionLabel ?? copy.common.replyAction}
              className="h-12 w-full rounded-full border border-border-soft bg-background px-4 text-base text-foreground shadow-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft"
              onClick={() => setRootReplyOpen(true)}
              onFocus={() => setRootReplyOpen(true)}
              placeholder={resolvedRootReplyPlaceholder}
              readOnly
              type="text"
            />
          </div>
        ) : null}
        {commentsBody ? (
          <Type as="p" variant="caption" className="px-4 pb-2">{commentsBody}</Type>
        ) : null}
        {rootReplyOpen ? (
          <div className="mx-4 mb-5 space-y-3">
            <FormattedTextarea
              className="min-h-28"
              onChange={setRootReplyBody}
              placeholder={rootReplyPlaceholder}
              value={rootReplyBody}
            />
            <div className="flex items-center justify-end gap-2">
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
        {availableCommentSorts && availableCommentSorts.length > 0 && activeSort ? (
          <SortControlRow className="px-4 py-3">
            <ResponsiveOptionSelect<CommentSort>
              ariaLabel="Sort comments"
              drawerTitle={copy.common.commentsHeading}
              onValueChange={onCommentSortChange}
              options={availableCommentSorts}
              value={activeSort}
            />
          </SortControlRow>
        ) : null}

        {items.length > 0 ? (
          <div className="px-4">
            {isMobile
              ? items.map((comment, index) => (
                  <CommentNode comment={comment} depth={0} key={getCommentKey(comment, index)} />
                ))
              : flatItems.map((item, index) => (
                  <FlatCommentRow item={item} key={getCommentKey(item.comment, index)} />
                ))}
          </div>
        ) : (
          <Type as="div" variant="caption" className="px-4 py-5">{resolvedEmptyCommentsLabel}</Type>
        )}
      </section>
    </div>
  );
}
