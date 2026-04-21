import * as React from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { IconButton } from "@/components/primitives/icon-button";
import { triggerCommentTapHaptic, triggerLikeToggleHaptic, triggerNavigationTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { PostThreadComment, PostThreadProps } from "./post-thread.types";

function getCommentKey(comment: PostThreadComment, fallbackDepth: number): string {
  return comment.commentId ?? comment.replyId ?? `${comment.authorLabel}-${comment.timestampLabel}-${fallbackDepth}`;
}

function commentBody(comment: PostThreadComment): string {
  if (comment.status === "deleted") return "[deleted]";
  if (comment.status === "removed") return "Removed by moderators.";
  if (comment.status === "hidden") return "Hidden by moderators.";
  return comment.body ?? "";
}

function branchPadding(depth: number): string {
  if (depth >= 4) return "ps-3 sm:ps-4";
  if (depth >= 2) return "ps-4 sm:ps-5";
  return "ps-5 sm:ps-6";
}

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
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState("");
  const [replyBusy, setReplyBusy] = React.useState(false);
  const body = showOriginal && comment.originalBody ? comment.originalBody : commentBody(comment);
  const canToggleOriginal = comment.status === "published"
    && Boolean(comment.originalBody)
    && comment.originalBody !== comment.body
    && Boolean(comment.showOriginalLabel)
    && Boolean(comment.showTranslationLabel);
  const canReply = comment.status === "published" && Boolean(comment.onReplySubmit);

  const handleReplySubmit = React.useCallback(async () => {
    const trimmed = replyBody.trim();
    if (!trimmed || !comment.onReplySubmit) {
      return;
    }
    try {
      setReplyBusy(true);
      const result = await comment.onReplySubmit({ body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setReplyBody("");
      setReplyOpen(false);
    } finally {
      setReplyBusy(false);
    }
  }, [comment, replyBody]);

  return (
    <article className="space-y-3 px-4 py-4">
      <div
        className={cn(
          "px-0 py-0 transition-colors md:rounded-[var(--radius-lg)] md:px-4 md:py-3",
          comment.highlighted && "bg-primary/10 md:ring-1 md:ring-primary/30",
          !comment.highlighted && depth === 0 && "md:bg-muted/20",
          !comment.highlighted && depth > 0 && "bg-transparent",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-[1.25] text-muted-foreground">
              {comment.authorHref ? (
                <a className="font-semibold text-foreground hover:underline" href={comment.authorHref}>
                  <bdi>{comment.authorLabel}</bdi>
                </a>
              ) : (
                <span className="font-semibold text-foreground"><bdi>{comment.authorLabel}</bdi></span>
              )}
              {comment.metadataLabel ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{comment.metadataLabel}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{comment.timestampLabel}</span>
              {comment.scoreLabel ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{comment.scoreLabel}</span>
                </>
              ) : null}
            </div>

            {body ? (
              <div className="space-y-2">
                <FormattedText
                  className={cn(
                    "text-base leading-7 text-foreground",
                    comment.status && comment.status !== "published" && "text-muted-foreground",
                  )}
                  dir={comment.bodyDir ?? "auto"}
                  lang={comment.bodyLang}
                  value={body}
                />
                {canToggleOriginal ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowOriginal((value) => !value)}
                  >
                    {showOriginal ? comment.showTranslationLabel : comment.showOriginalLabel}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {(comment.onVote || canReply) ? (
              <div className="flex flex-wrap items-center gap-2">
                {comment.onVote ? (
                  <>
                    <IconButton
                      aria-label={commonCopy.upvoteComment}
                      size="sm"
                      variant={comment.viewerVote === "up" ? "secondary" : "ghost"}
                      onClick={() => {
                        triggerLikeToggleHaptic(comment.viewerVote !== "up");
                        comment.onVote?.("up");
                      }}
                    >
                      <CaretUp className="size-5" />
                    </IconButton>
                    <IconButton
                      aria-label={commonCopy.downvoteComment}
                      size="sm"
                      variant={comment.viewerVote === "down" ? "secondary" : "ghost"}
                      onClick={() => {
                        triggerLikeToggleHaptic(comment.viewerVote !== "down");
                        comment.onVote?.("down");
                      }}
                    >
                      <CaretDown className="size-5" />
                    </IconButton>
                  </>
                ) : null}
                {canReply ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      triggerCommentTapHaptic();
                      setReplyOpen((value) => !value);
                    }}
                  >
                    {comment.replyActionLabel}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {replyOpen ? (
              <div className="space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]">
              <FormattedTextarea
                className="min-h-28"
                onChange={setReplyBody}
                placeholder={comment.replyPlaceholder}
                value={replyBody}
              />
              <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReplyOpen(false);
                      setReplyBody("");
                    }}
                  >
                    {comment.cancelReplyLabel}
                  </Button>
                  <Button
                    disabled={replyBusy || !replyBody.trim()}
                    size="sm"
                    onClick={() => void handleReplySubmit()}
                  >
                    {comment.submitReplyLabel}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {children.length > 0 ? (
            <IconButton
              aria-label={collapsed ? commonCopy.expandReplies : commonCopy.collapseReplies}
              size="sm"
              variant="ghost"
              onClick={() => {
                triggerNavigationTapHaptic();
                setCollapsed((value) => !value);
              }}
            >
              {collapsed ? <CaretDown className="size-5" /> : <CaretUp className="size-5" />}
            </IconButton>
          ) : null}
        </div>

        {hasBranch && collapsed ? (
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                triggerNavigationTapHaptic();
                setCollapsed(false);
              }}
            >
              {comment.moreRepliesLabel ?? commonCopy.showRepliesCount.replace("{count}", String(children.length))}
            </Button>
          </div>
        ) : null}
      </div>

      {hasBranch && !collapsed ? (
        <div className={cn("space-y-0 border-s border-border-soft", branchPadding(depth))}>
          {children.map((child) => (
            <CommentNode comment={child} depth={depth + 1} key={getCommentKey(child, depth + 1)} />
          ))}

          {comment.moreRepliesLabel ? (
            <div className="px-4 pb-4 pt-1">
              <Button size="sm" variant="ghost" onClick={comment.onLoadMoreReplies}>
                {comment.moreRepliesLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
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
      <div className="overflow-hidden border-y border-border-soft md:rounded-[var(--radius-2xl)] md:border md:bg-card">
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

      <section className="overflow-hidden border-y border-border-soft md:rounded-[var(--radius-2xl)] md:border md:bg-card">
        <div className="border-b border-border-soft px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-medium text-foreground" dir={commentsHeadingDir ?? "auto"} lang={commentsHeadingLang}>
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
          {commentsBody ? (
            <p className="mt-2 text-base leading-[1.4] text-muted-foreground">{commentsBody}</p>
          ) : null}
          {rootReplyOpen ? (
            <div className="mt-3 space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]">
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
        </div>

        {items.length > 0 ? (
          <div className="divide-y divide-border-soft">
            {items.map((comment, index) => (
              <CommentNode comment={comment} depth={0} key={getCommentKey(comment, index)} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-5 text-base leading-[1.4] text-muted-foreground">{resolvedEmptyCommentsLabel}</div>
        )}
      </section>
    </div>
  );
}
