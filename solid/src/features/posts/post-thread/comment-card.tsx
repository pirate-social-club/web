import { Show, createEffect, createSignal, onCleanup } from "solid-js";

import {
  Avatar,
  Button,
  FormattedText,
  FormattedTextarea,
  IconChatCircle,
  IconTrash,
  Type,
  VotePill,
  cn,
} from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import { triggerCommentTapHaptic } from "../../../lib/haptics";
import { postCardType } from "../post-card/styles";
import { CommentMediaGrid, ReplyAttachmentControl, revokeReplyAttachment } from "./comment-media";
import { postThreadCommonCopy, replyToolbarLabels } from "./copy";
import { ReplyIdentitySelect } from "./reply-identity-select";
import type {
  PostThreadAuthorMode,
  PostThreadCommentMedia,
  PostThreadCommentStatus,
  PostThreadIdentityMode,
  PostThreadReplyAttachment,
  PostThreadReplyIdentity,
  PostThreadSubmitResult,
} from "./types";

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

function CommentAuthorRole({ role }: { role?: string | null }) {
  return <Show when={role}><Type as="span" variant="caption" aria-label={role!}>{role}</Type></Show>;
}

export interface CommentCardProps {
  authorLabel: string;
  authorHref?: string;
  authorAvatarSeed?: string;
  authorAvatarSrc?: string;
  authorCommunityRole?: string | null;
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
  onVote?: (direction: "up" | "down") => Promise<void> | void;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  onReplySubmit?: (input: {
    attachment?: PostThreadReplyAttachment | null;
    anonymousScope?: PostThreadReplyIdentity["anonymousScope"];
    body: string;
    authorMode: PostThreadAuthorMode;
    identityMode?: PostThreadIdentityMode;
  }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  onReplyRequest?: () => void;
  onReplyIntent?: () => void;
  replyIdentity?: PostThreadReplyIdentity;
  avatarClass?: string;
  class?: string;
}

export function CommentCard(props: CommentCardProps) {
  const { locale } = createUiLocale();
  const commonCopy = () => postThreadCommonCopy(locale());
  const [showOriginal, setShowOriginal] = createSignal(false);
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [replyAttachment, setReplyAttachment] = createSignal<PostThreadReplyAttachment | null>(null);
  const [replyIdentityMode, setReplyIdentityMode] = createSignal<PostThreadIdentityMode>("public");
  const [replyBusy, setReplyBusy] = createSignal(false);
  let replyContainerRef: HTMLDivElement | undefined;
  const replyBusyRef = { current: false };

  createEffect(() => replyOpen(), (open) => {
    if (open) replyContainerRef?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  onCleanup(() => revokeReplyAttachment(replyAttachment()));

  const isPublished = () => !props.status || props.status === "published";
  const resolvedBody = () => showOriginal() && props.originalBody ? props.originalBody : commentBody(props.body, props.status);
  const canToggleOriginal = () => isPublished()
    && Boolean(props.originalBody)
    && props.originalBody !== props.body
    && Boolean(props.showOriginalLabel)
    && Boolean(props.showTranslationLabel);
  const canReply = () => isPublished() && Boolean(props.onReplySubmit);
  const canDelete = () => isPublished() && Boolean(props.canDelete && props.onDelete);
  const canSubmitReply = () => Boolean(replyBody().trim() || replyAttachment());

  const handleReplyAttachmentChange = (attachment: PostThreadReplyAttachment | null) => {
    revokeReplyAttachment(replyAttachment());
    setReplyAttachment(attachment);
  };

  const closeReplyComposer = () => {
    setReplyOpen(false);
    setReplyBody("");
    setReplyIdentityMode("public");
    handleReplyAttachmentChange(null);
  };

  const handleReplySubmit = async () => {
    const trimmed = replyBody().trim();
    if (!canSubmitReply() || !props.onReplySubmit || replyBusyRef.current) return;
    replyBusyRef.current = true;
    setReplyBusy(true);
    try {
      const result = await props.onReplySubmit({
        anonymousScope: replyIdentityMode() === "anonymous" ? props.replyIdentity?.anonymousScope ?? null : null,
        attachment: replyAttachment(),
        authorMode: "human",
        body: trimmed,
        identityMode: replyIdentityMode(),
      });
      if (result === "blocked") return;
      setReplyBody("");
      handleReplyAttachmentChange(null);
      setReplyIdentityMode("public");
      setReplyOpen(false);
    } finally {
      replyBusyRef.current = false;
      setReplyBusy(false);
    }
  };

  const handleVote = (direction: "up" | "down" | null) => direction ? props.onVote?.(direction) : undefined;

  return (
    <div class={cn("flex min-w-0 flex-1 items-start gap-2", props.class)}>
      {props.authorHref ? (
        <a class={cn("mt-0.5 shrink-0", props.avatarClass)} href={props.authorHref} onClick={(event) => event.stopPropagation()}>
          <Avatar fallback={props.authorLabel} fallbackSeed={props.authorAvatarSeed} size="sm" src={props.authorAvatarSrc} />
        </a>
      ) : (
        <Avatar class={cn("mt-0.5 shrink-0", props.avatarClass)} fallback={props.authorLabel} fallbackSeed={props.authorAvatarSeed} size="sm" src={props.authorAvatarSrc} />
      )}
      <div class="min-w-0 flex-1">
        <Type as="div" variant="caption" class="flex flex-wrap items-center gap-x-2 gap-y-1">
          {props.authorHref ? (
            <a class="text-foreground hover:underline" href={props.authorHref} onClick={(event) => event.stopPropagation()}>
              <bdi>{props.authorLabel}</bdi>
            </a>
          ) : <Type as="span" variant="label" class="text-foreground"><bdi>{props.authorLabel}</bdi></Type>}
          <CommentAuthorRole role={props.authorCommunityRole} />
          {props.metadataLabel ? <><span aria-hidden="true">·</span><span>{props.metadataLabel}</span></> : null}
          <span aria-hidden="true">·</span><span>{props.timestampLabel}</span>
        </Type>

        <Show when={resolvedBody()}>
          <div class="mt-2 space-y-2">
            <FormattedText
              class={cn(postCardType.body, "text-foreground", props.status && props.status !== "published" && "text-muted-foreground")}
              dir={props.bodyDir ?? "auto"}
              lang={props.bodyLang}
              value={resolvedBody()}
            />
            <Show when={canToggleOriginal()}>
              <Button size="sm" variant="ghost" onClick={() => setShowOriginal((value) => !value)}>
                {showOriginal() ? props.showTranslationLabel : props.showOriginalLabel}
              </Button>
            </Show>
          </div>
        </Show>
        <Show when={isPublished()}><CommentMediaGrid media={props.media} /></Show>

        <div class="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
          <VotePill
            downvoteLabel={commonCopy().downvoteComment}
            onVote={handleVote}
            score={parseScoreLabel(props.scoreLabel)}
            size="compact"
            upvoteLabel={commonCopy().upvoteComment}
            variant="bare"
            viewerVote={props.viewerVote}
          />
          <Show when={canReply()}>
            <button
              class="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground"
              onClick={() => {
                triggerCommentTapHaptic();
                props.onReplyIntent?.();
                if (props.onReplyRequest) props.onReplyRequest();
                else setReplyOpen((value) => !value);
              }}
              type="button"
            >
              <IconChatCircle class="size-[18px]" />
              <Type as="span" variant="label" class="text-inherit">{props.replyActionLabel ?? commonCopy().replyAction}</Type>
            </button>
          </Show>
          <Show when={canDelete()}>
            <button
              aria-label={props.deleteActionLabel ?? "Delete"}
              class="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                triggerCommentTapHaptic();
                props.onDelete?.();
              }}
              title={props.deleteActionLabel ?? "Delete"}
              type="button"
            >
              <IconTrash class="size-[18px]" />
            </button>
          </Show>
        </div>

        <Show when={replyOpen()}>
          <div class="mt-3 space-y-3 border border-border-soft bg-background/60 p-3 md:rounded-[var(--radius-lg)]" ref={(element) => { replyContainerRef = element; }}>
            <FormattedTextarea
              class="min-h-28"
              focusOnMount
              onChange={setReplyBody}
              placeholder={props.replyPlaceholder ?? commonCopy().replyPlaceholder}
              toolbarLabels={replyToolbarLabels(locale())}
              value={replyBody()}
            />
            <ReplyAttachmentControl attachment={replyAttachment()} disabled={replyBusy()} onChange={handleReplyAttachmentChange} />
            <div class="flex flex-wrap items-center justify-between gap-2">
              <ReplyIdentitySelect identity={props.replyIdentity} onChange={setReplyIdentityMode} value={replyIdentityMode()} />
              <div class="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={closeReplyComposer}>{props.cancelReplyLabel ?? commonCopy().cancelReply}</Button>
                <Button disabled={replyBusy() || !canSubmitReply()} size="sm" onClick={() => void handleReplySubmit()}>{props.submitReplyLabel ?? commonCopy().submitReply}</Button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
