"use client";

import * as React from "react";
import { ChatCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { Type } from "@/components/primitives/type";
import { VotePill } from "@/components/primitives/vote-pill";
import { postCardType } from "@/components/compositions/post-card/post-card.styles";
import { triggerCommentTapHaptic } from "@/lib/haptics";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type {
  PostThreadAuthorMode,
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

export interface CommentCardProps {
  authorLabel: string;
  authorHref?: string;
  metadataLabel?: string;
  scoreLabel?: string;
  timestampLabel: string;
  body?: string;
  bodyDir?: "ltr" | "rtl" | "auto";
  bodyLang?: string;
  originalBody?: string;
  status?: PostThreadCommentStatus;
  viewerVote?: "up" | "down" | null;
  onVote?: (direction: "up" | "down") => void;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  onReplySubmit?: (input: {
    body: string;
    authorMode: PostThreadAuthorMode;
  }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  className?: string;
}

export function CommentCard({
  authorLabel,
  authorHref,
  metadataLabel,
  scoreLabel,
  timestampLabel,
  body,
  bodyDir = "auto",
  bodyLang,
  originalBody,
  status,
  viewerVote,
  onVote,
  showOriginalLabel,
  showTranslationLabel,
  replyActionLabel,
  replyPlaceholder,
  cancelReplyLabel,
  submitReplyLabel,
  onReplySubmit,
  className,
}: CommentCardProps) {
  const { locale } = useUiLocale();
  const commonCopy = getLocaleMessages(locale, "routes").common;
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState("");
  const [replyBusy, setReplyBusy] = React.useState(false);

  const resolvedBody = showOriginal && originalBody ? originalBody : commentBody(body, status);
  const canToggleOriginal =
    status === "published" &&
    Boolean(originalBody) &&
    originalBody !== body &&
    Boolean(showOriginalLabel) &&
    Boolean(showTranslationLabel);
  const canReply = status === "published" && Boolean(onReplySubmit);
  const handleVote = React.useCallback((direction: "up" | "down" | null) => {
    if (direction) {
      onVote?.(direction);
    }
  }, [onVote]);

  const handleReplySubmit = React.useCallback(async () => {
    const trimmed = replyBody.trim();
    if (!trimmed || !onReplySubmit) {
      return;
    }
    try {
      setReplyBusy(true);
      const result = await onReplySubmit({ body: trimmed, authorMode: "human" });
      if (result === "blocked") {
        return;
      }
      setReplyBody("");
      setReplyOpen(false);
    } finally {
      setReplyBusy(false);
    }
  }, [onReplySubmit, replyBody]);

  return (
    <div className={cn("min-w-0 flex-1", className)}>
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

      {/* Action row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <VotePill
          downvoteLabel={commonCopy.downvoteComment}
          onVote={handleVote}
          score={parseScoreLabel(scoreLabel)}
          upvoteLabel={commonCopy.upvoteComment}
          viewerVote={viewerVote}
        />
        {canReply ? (
          <button
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              triggerCommentTapHaptic();
              setReplyOpen((value) => !value);
            }}
            type="button"
          >
            <ChatCircle className="size-4" />
            <Type as="span" variant="label">{replyActionLabel}</Type>
          </button>
        ) : null}
      </div>

      {/* Inline reply composer */}
      {replyOpen ? (
        <div className="mt-3 space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]">
          <FormattedTextarea
            className="min-h-28"
            onChange={setReplyBody}
            placeholder={replyPlaceholder}
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
              {cancelReplyLabel}
            </Button>
            <Button disabled={replyBusy || !replyBody.trim()} size="sm" onClick={() => void handleReplySubmit()}>
              {submitReplyLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
