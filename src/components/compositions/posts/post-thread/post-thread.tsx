"use client";

import * as React from "react";

import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { Button } from "@/components/primitives/button";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommentTree } from "./comment-tree";
import { ReplyAttachmentControl, revokeReplyAttachment } from "./comment-media";
import { MobileReplyScreen } from "./mobile-reply-screen";
import { ReplyContextCard } from "./reply-context-card";
import type { CommentSort, PostThreadProps, PostThreadReplyAttachment, PostThreadReplyInput } from "./post-thread.types";
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
  const [rootReplyAttachment, setRootReplyAttachment] = React.useState<PostThreadReplyAttachment | null>(null);
  const [rootReplyBusy, setRootReplyBusy] = React.useState(false);
  const rootReplyContainerRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [mobileReplyTarget, setMobileReplyTarget] = React.useState<{
    kind: "root" | "comment";
    authorLabel: string;
    body: string;
    eyebrow?: string;
    metadata?: string;
    onSubmit: (input: PostThreadReplyInput) => Promise<"blocked" | "submitted" | void> | "blocked" | "submitted" | void;
  } | null>(null);
  const [mobileReplyBody, setMobileReplyBody] = React.useState("");
  const [mobileReplyAttachment, setMobileReplyAttachment] = React.useState<PostThreadReplyAttachment | null>(null);
  const [mobileReplyBusy, setMobileReplyBusy] = React.useState(false);

  React.useEffect(() => {
    if (rootReplyOpen && rootReplyContainerRef.current) {
      rootReplyContainerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [rootReplyOpen]);

  React.useEffect(() => () => revokeReplyAttachment(rootReplyAttachment), [rootReplyAttachment]);
  React.useEffect(() => () => revokeReplyAttachment(mobileReplyAttachment), [mobileReplyAttachment]);
  const activePost = showOriginalPost && postOriginal ? postOriginal : post;
  const canToggleOriginalPost = Boolean(postOriginal);
  const canReplyAtRoot = Boolean(onRootReplySubmit);
  const resolvedEmptyCommentsLabel = emptyCommentsLabel === "No comments yet." ? copy.common.noComments : emptyCommentsLabel;
  const resolvedRootReplyPlaceholder = rootReplyPlaceholder || rootReplyActionLabel || copy.common.replyAction;
  const activeSort = commentSort ?? availableCommentSorts?.[0]?.value;
  const canSubmitRootReply = Boolean(rootReplyBody.trim() || rootReplyAttachment);
  const canSubmitMobileReply = Boolean(mobileReplyBody.trim() || mobileReplyAttachment);

  React.useEffect(() => {
    setShowOriginalPost(false);
  }, [post.postHref, postOriginal?.postHref]);

  const handleRootReplySubmit = React.useCallback(async () => {
    const trimmed = rootReplyBody.trim();
    if (!canSubmitRootReply || !onRootReplySubmit) {
      return;
    }
    try {
      setRootReplyBusy(true);
      const result = await onRootReplySubmit({ attachment: rootReplyAttachment, body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setRootReplyBody("");
      setRootReplyAttachment(null);
      setRootReplyOpen(false);
    } finally {
      setRootReplyBusy(false);
    }
  }, [canSubmitRootReply, onRootReplySubmit, rootReplyAttachment, rootReplyBody]);

  const handleMobileReplySubmit = React.useCallback(async () => {
    const trimmed = mobileReplyBody.trim();
    if (!canSubmitMobileReply || !mobileReplyTarget) {
      return;
    }
    try {
      setMobileReplyBusy(true);
      const result = await mobileReplyTarget.onSubmit({ attachment: mobileReplyAttachment, body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setMobileReplyBody("");
      setMobileReplyAttachment(null);
      setMobileReplyTarget(null);
    } finally {
      setMobileReplyBusy(false);
    }
  }, [canSubmitMobileReply, mobileReplyAttachment, mobileReplyBody, mobileReplyTarget]);

  const handleMobileReplyCancel = React.useCallback(() => {
    setMobileReplyTarget(null);
    setMobileReplyBody("");
    setMobileReplyAttachment(null);
  }, []);

  const handleRootAttachmentChange = React.useCallback((attachment: PostThreadReplyAttachment | null) => {
    setRootReplyAttachment((current) => {
      revokeReplyAttachment(current);
      return attachment;
    });
  }, []);

  const handleMobileAttachmentChange = React.useCallback((attachment: PostThreadReplyAttachment | null) => {
    setMobileReplyAttachment((current) => {
      revokeReplyAttachment(current);
      return attachment;
    });
  }, []);

  const handleCommentReplyRequest = React.useCallback((comment: import("./post-thread.types").PostThreadComment) => {
    if (!comment.onReplySubmit) return;
    setMobileReplyTarget({
      kind: "comment",
      authorLabel: comment.authorLabel,
      body: comment.body ?? "",
      metadata: comment.timestampLabel,
      onSubmit: comment.onReplySubmit,
    });
    setMobileReplyBody("");
    setMobileReplyAttachment(null);
  }, []);

  const openMobileRootReply = React.useCallback(() => {
    if (!onRootReplySubmit) return;
    const body = post.content.type === "text"
      ? post.content.body
      : post.content.type === "link"
        ? (post.content.body ?? post.title ?? "")
        : post.content.type === "embed"
          ? (post.content.body ?? post.title ?? "")
          : (post.title ?? "");
    setMobileReplyTarget({
      kind: "root",
      authorLabel: post.byline.author?.label ?? post.byline.community?.label ?? "",
      body,
      eyebrow: post.byline.community?.label,
      metadata: post.byline.timestampLabel,
      onSubmit: onRootReplySubmit,
    });
    setMobileReplyBody("");
    setMobileReplyAttachment(null);
  }, [onRootReplySubmit, post]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden">
        <PostCard
          {...activePost}
          className="border-b-0"
          postHref={undefined}
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
              onClick={() => {
                if (isMobile) {
                  openMobileRootReply();
                } else {
                  setRootReplyOpen(true);
                }
              }}
              onFocus={() => {
                if (isMobile) {
                  openMobileRootReply();
                } else {
                  setRootReplyOpen(true);
                }
              }}
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
          <div ref={rootReplyContainerRef} className="mx-4 mb-5 space-y-3">
            <FormattedTextarea
              autoFocus
              className="min-h-28"
              onChange={setRootReplyBody}
              placeholder={rootReplyPlaceholder}
              value={rootReplyBody}
            />
            <ReplyAttachmentControl
              attachment={rootReplyAttachment}
              disabled={rootReplyBusy}
              onChange={handleRootAttachmentChange}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setRootReplyOpen(false);
                  setRootReplyBody("");
                  handleRootAttachmentChange(null);
                }}
              >
                {rootReplyCancelLabel}
              </Button>
              <Button
                disabled={rootReplyBusy || !canSubmitRootReply}
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
              className="hidden md:inline-flex"
              drawerTitle={copy.common.commentsHeading}
              onValueChange={onCommentSortChange}
              options={availableCommentSorts}
              value={activeSort}
            />
          </div>
        ) : null}

        {items.length > 0 ? (
          <CommentTree
            className="px-4"
            comments={items}
            onReplyRequest={isMobile ? handleCommentReplyRequest : undefined}
          />
        ) : (
          <Type as="div" variant="caption" className="px-4 py-5">{resolvedEmptyCommentsLabel}</Type>
        )}
      </section>

      {mobileReplyTarget && (
        <div className="fixed inset-0 z-50">
          <MobileReplyScreen
            body={mobileReplyBody}
            attachment={mobileReplyAttachment}
            busy={mobileReplyBusy}
            context={(
              <ReplyContextCard
                authorLabel={mobileReplyTarget.authorLabel}
                body={mobileReplyTarget.body}
                eyebrow={mobileReplyTarget.eyebrow}
                metadata={mobileReplyTarget.metadata}
              />
            )}
            onAttachmentChange={handleMobileAttachmentChange}
            onBodyChange={setMobileReplyBody}
            onCancel={handleMobileReplyCancel}
            onSubmit={handleMobileReplySubmit}
            placeholder={rootReplyPlaceholder}
            postLabel={copy.createPost.actions.post}
            title={rootReplyActionLabel ?? copy.common.replyAction}
          />
        </div>
      )}
    </div>
  );
}
