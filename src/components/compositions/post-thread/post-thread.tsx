import * as React from "react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { ResponsiveOptionSelect } from "@/components/compositions/responsive-option-select/responsive-option-select";
import { Button } from "@/components/primitives/button";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentTree } from "./comment-tree";
import type { CommentSort, PostThreadProps } from "./post-thread.types";
import { Type } from "@/components/primitives/type";

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
          <div className="flex justify-end px-4 pb-3">
            <ResponsiveOptionSelect<CommentSort>
              ariaLabel="Sort comments"
              drawerTitle={copy.common.commentsHeading}
              onValueChange={onCommentSortChange}
              options={availableCommentSorts}
              value={activeSort}
            />
          </div>
        ) : null}

        {items.length > 0 ? (
          <CommentTree className="px-4" comments={items} />
        ) : (
          <Type as="div" variant="caption" className="px-4 py-5">{resolvedEmptyCommentsLabel}</Type>
        )}
      </section>
    </div>
  );
}
