"use client";

import * as React from "react";
import { ArrowFatDown, ArrowFatUp, ChatCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormattedText } from "@/components/primitives/formatted-text";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { triggerCommentTapHaptic, triggerLikeToggleHaptic } from "@/lib/haptics";
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

function formatScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  if (score < 0) return score.toString();
  return score > 0 ? score.toString() : "0";
}

function commentBody(body: string | undefined, status: PostThreadCommentStatus | undefined): string {
  if (status === "deleted") return "[deleted]";
  if (status === "removed") return "Removed by moderators.";
  if (status === "hidden") return "Hidden by moderators.";
  return body ?? "";
}

function InlineVoteGroup({
  score,
  viewerVote,
  onVote,
  upvoteLabel,
  downvoteLabel,
}: {
  score: number;
  viewerVote?: "up" | "down" | null;
  onVote?: (direction: "up" | "down") => void;
  upvoteLabel?: string;
  downvoteLabel?: string;
}) {
  const canVote = Boolean(onVote);

  return (
    <div className="flex items-center gap-0.5">
      <button
        className={cn(
          "inline-flex size-7 items-center justify-center rounded transition-colors",
          canVote
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "cursor-default text-muted-foreground/40",
          viewerVote === "up" && "text-primary hover:bg-primary/10",
        )}
        disabled={!canVote}
        onClick={() => {
          if (canVote) {
            triggerLikeToggleHaptic(viewerVote !== "up");
            onVote!("up");
          }
        }}
        aria-label={upvoteLabel}
        type="button"
      >
        <ArrowFatUp
          className={cn("size-5", viewerVote === "up" && "fill-current")}
          weight={viewerVote === "up" ? "fill" : "regular"}
        />
      </button>

      <span
        className={cn(
          "min-w-[1.5rem] text-center text-sm font-semibold tabular-nums",
          viewerVote === "up" && "text-primary",
          viewerVote === "down" && "text-destructive",
          !viewerVote && "text-muted-foreground",
        )}
      >
        {formatScore(score)}
      </span>

      <button
        className={cn(
          "inline-flex size-7 items-center justify-center rounded transition-colors",
          canVote
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "cursor-default text-muted-foreground/40",
          viewerVote === "down" && "text-destructive hover:bg-destructive/10",
        )}
        disabled={!canVote}
        onClick={() => {
          if (canVote) {
            triggerLikeToggleHaptic(viewerVote !== "down");
            onVote!("down");
          }
        }}
        aria-label={downvoteLabel}
        type="button"
      >
        <ArrowFatDown
          className={cn("size-5", viewerVote === "down" && "fill-current")}
          weight={viewerVote === "down" ? "fill" : "regular"}
        />
      </button>
    </div>
  );
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
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
      </div>

      {/* Body */}
      {resolvedBody ? (
        <div className="mt-2 space-y-2">
          <FormattedText
            className={cn(
              "text-base leading-relaxed text-foreground",
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
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <InlineVoteGroup
          downvoteLabel={commonCopy.downvoteComment}
          onVote={onVote}
          score={parseScoreLabel(scoreLabel)}
          upvoteLabel={commonCopy.upvoteComment}
          viewerVote={viewerVote}
        />
        {canReply ? (
          <button
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              triggerCommentTapHaptic();
              setReplyOpen((value) => !value);
            }}
            type="button"
          >
            <ChatCircle className="size-4" />
            {replyActionLabel}
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
