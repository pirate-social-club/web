"use client";

import * as React from "react";
import { ChatCircle, Trash } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { Type } from "@/components/primitives/type";
import { VotePill } from "@/components/primitives/vote-pill";
import { postCardType } from "@/components/compositions/posts/post-card/post-card.styles";
import { triggerCommentTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { CommunityAuthorRole } from "../post-card/post-card.types";
import { CommentMediaGrid, ReplyAttachmentControl, revokeReplyAttachment } from "./comment-media";
import type {
  PostThreadCommentMedia,
  PostThreadAuthorMode,
  PostThreadReplyAttachment,
  PostThreadCommentStatus,
  PostThreadSubmitResult,
} from "./post-thread.types";

function parseScoreLabel(scoreLabel: string | undefined): number {
  if (!scoreLabel) return 0;

  const numeric = Number.parseInt(scoreLabel.replace(/,/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function commentBody(body: string | undefined, status: PostThreadCommentStatus | undefined): string {
  if (status === "deleted") return "[deleted]";
  if (status === "removed") return "Removed by moderators.";
  if (status === "hidden") return "Hidden by moderators.";
  return body ?? "";
}

function CommentAuthorRoleBadge({ role }: { role?: CommunityAuthorRole | null }) {
  if (!role) return null;

  return (
    <Type as="span" variant="overline" className="inline-flex min-h-5 items-center self-center rounded-full bg-primary px-2 leading-none text-primary-foreground">
      {role === "owner" ? "Owner" : "Mod"}
    </Type>
  );
}

export interface CommentCardProps {
  authorLabel: string;
  authorHref?: string;
  authorAvatarSeed?: string;
  authorAvatarSrc?: string;
  authorCommunityRole?: CommunityAuthorRole | null;
  metadataLabel?: string;
  scoreLabel?: string;
  timestampLabel: string;
  body?: string;
  bodyDir?: "ltr" | "rtl" | "auto";
  bodyLang?: string;
  media?: PostThreadCommentMedia[];
  originalBody?: string;
  status?: PostThreadCommentStatus;
  viewerVote?: "up" | "down" | null;
  canDelete?: boolean;
  deleteActionLabel?: string;
  onDelete?: () => void;
  onVote?: (direction: "up" | "down") => void;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  onReplySubmit?: (input: {
    attachment?: PostThreadReplyAttachment | null;
    body: string;
    authorMode: PostThreadAuthorMode;
  }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  onReplyRequest?: () => void;
  avatarClassName?: string;
  className?: string;
}

export function CommentCard({
  authorLabel,
  authorHref,
  authorAvatarSeed,
  authorAvatarSrc,
  authorCommunityRole,
  metadataLabel,
  scoreLabel,
  timestampLabel,
  body,
  bodyDir = "auto",
  bodyLang,
  media,
  originalBody,
  status,
  viewerVote,
  canDelete,
  deleteActionLabel = "Delete",
  onDelete,
  onVote,
  showOriginalLabel,
  showTranslationLabel,
  replyActionLabel,
  replyPlaceholder,
  cancelReplyLabel,
  submitReplyLabel,
  onReplySubmit,
  onReplyRequest,
  avatarClassName,
  className,
}: CommentCardProps) {
  const { locale } = useUiLocale();
  const commonCopy = getLocaleMessages(locale, "routes").common;
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState("");
  const [replyAttachment, setReplyAttachment] = React.useState<PostThreadReplyAttachment | null>(null);
  const [replyBusy, setReplyBusy] = React.useState(false);
  const replyContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (replyOpen && replyContainerRef.current) {
      replyContainerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [replyOpen]);

  React.useEffect(() => () => revokeReplyAttachment(replyAttachment), [replyAttachment]);

  const isPublished = !status || status === "published";
  const resolvedBody = showOriginal && originalBody ? originalBody : commentBody(body, status);
  const canToggleOriginal =
    isPublished &&
    Boolean(originalBody) &&
    originalBody !== body &&
    Boolean(showOriginalLabel) &&
    Boolean(showTranslationLabel);
  const canReply = isPublished && Boolean(onReplySubmit);
  const canDeleteComment = isPublished && Boolean(canDelete && onDelete);
  const visibleMedia = isPublished ? media : undefined;
  const canSubmitReply = Boolean(replyBody.trim() || replyAttachment);
  const handleVote = React.useCallback((direction: "up" | "down" | null) => {
    if (direction) {
      onVote?.(direction);
    }
  }, [onVote]);

  const handleReplySubmit = React.useCallback(async () => {
    const trimmed = replyBody.trim();
    if (!canSubmitReply || !onReplySubmit) {
      return;
    }
    try {
      setReplyBusy(true);
      const result = await onReplySubmit({ attachment: replyAttachment, body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setReplyBody("");
      setReplyAttachment(null);
      setReplyOpen(false);
    } finally {
      setReplyBusy(false);
    }
  }, [canSubmitReply, onReplySubmit, replyAttachment, replyBody]);

  const handleReplyAttachmentChange = React.useCallback((attachment: PostThreadReplyAttachment | null) => {
    setReplyAttachment((current) => {
      revokeReplyAttachment(current);
      return attachment;
    });
  }, []);

  const closeReplyComposer = React.useCallback(() => {
    setReplyOpen(false);
    setReplyBody("");
    handleReplyAttachmentChange(null);
  }, [handleReplyAttachmentChange]);

  return (
    <div className={cn("flex min-w-0 flex-1 items-start gap-2", className)}>
      {authorHref ? (
        <a className={cn("mt-0.5 shrink-0", avatarClassName)} href={authorHref} onClick={(e) => e.stopPropagation()}>
          <Avatar fallback={authorLabel} fallbackSeed={authorAvatarSeed} size="sm" src={authorAvatarSrc} />
        </a>
      ) : (
        <Avatar className={cn("mt-0.5 shrink-0", avatarClassName)} fallback={authorLabel} fallbackSeed={authorAvatarSeed} size="sm" src={authorAvatarSrc} />
      )}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <Type as="div" variant="caption" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          {authorHref ? (
            <a
              className="font-semibold text-foreground hover:underline"
              href={authorHref}
              onClick={(e) => e.stopPropagation()}
            >
              <bdi>{authorLabel}</bdi>
            </a>
          ) : (
            <span className="font-semibold text-foreground">
              <bdi>{authorLabel}</bdi>
            </span>
          )}
          <CommentAuthorRoleBadge role={authorCommunityRole} />
          {metadataLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{metadataLabel}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{timestampLabel}</span>
        </Type>

        {/* Body */}
        {resolvedBody ? (
          <div className="mt-2 space-y-2">
            <FormattedText
              className={cn(
                postCardType.body,
                "text-foreground",
                status && status !== "published" && "text-muted-foreground",
              )}
              dir={bodyDir}
              lang={bodyLang}
              value={resolvedBody}
            />
            {canToggleOriginal ? (
              <Button size="sm" variant="ghost" onClick={() => setShowOriginal((value) => !value)}>
                {showOriginal ? showTranslationLabel : showOriginalLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
        <CommentMediaGrid media={visibleMedia} />

        {/* Action row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
          <VotePill
            downvoteLabel={commonCopy.downvoteComment}
            onVote={handleVote}
            score={parseScoreLabel(scoreLabel)}
            size="compact"
            upvoteLabel={commonCopy.upvoteComment}
            variant="bare"
            viewerVote={viewerVote}
          />
          {canReply ? (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground"
              onClick={() => {
                triggerCommentTapHaptic();
                if (onReplyRequest) {
                  onReplyRequest();
                } else {
                  setReplyOpen((value) => !value);
                }
              }}
              type="button"
            >
              <ChatCircle className="size-[18px]" />
              <Type as="span" variant="label" className="text-inherit">{replyActionLabel}</Type>
            </button>
          ) : null}
          {canDeleteComment ? (
            <button
              aria-label={deleteActionLabel}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                triggerCommentTapHaptic();
                onDelete?.();
              }}
              title={deleteActionLabel}
              type="button"
            >
              <Trash className="size-[18px]" />
            </button>
          ) : null}
        </div>

        {/* Inline reply composer */}
        {replyOpen ? (
          <div ref={replyContainerRef} className="mt-3 space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]">
            <FormattedTextarea
              autoFocus
              className="min-h-28"
              onChange={setReplyBody}
              placeholder={replyPlaceholder}
              value={replyBody}
            />
            <ReplyAttachmentControl
              attachment={replyAttachment}
              disabled={replyBusy}
              onChange={handleReplyAttachmentChange}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={closeReplyComposer}
              >
                {cancelReplyLabel}
              </Button>
              <Button disabled={replyBusy || !canSubmitReply} size="sm" onClick={() => void handleReplySubmit()}>
                {submitReplyLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
