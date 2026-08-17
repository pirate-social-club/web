import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import {
  Button,
  FormattedTextarea,
  Input,
  ResponsiveOptionSelect,
  Type,
  cn,
  createIsMobile,
} from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import { PostCard } from "../post-card/post-card";
import { CommentTree } from "./comment-tree";
import { ReplyAttachmentControl, revokeReplyAttachment } from "./comment-media";
import { MobileReplyScreen } from "./mobile-reply-screen";
import { ReplyContextCard } from "./reply-context-card";
import { ReplyIdentitySelect } from "./reply-identity-select";
import { replyToolbarLabels } from "./copy";
import { postThreadCommonCopy } from "./copy";
import type {
  CommentSort,
  PostThreadComment,
  PostThreadIdentityMode,
  PostThreadProps,
  PostThreadReplyAttachment,
  PostThreadReplyInput,
} from "./types";

interface MobileReplyTarget {
  kind: "root" | "comment";
  authorLabel: string;
  body: string;
  eyebrow?: string;
  metadata?: string;
  onSubmit: (input: PostThreadReplyInput) => Promise<"blocked" | "submitted" | void> | "blocked" | "submitted" | void;
}

export function PostThread(props: PostThreadProps) {
  const { locale } = createUiLocale();
  const copy = () => postThreadCommonCopy(locale());
  const items = () => props.comments ?? props.replies ?? [];
  const [showOriginalPost, setShowOriginalPost] = createSignal(false);
  const [rootReplyOpen, setRootReplyOpen] = createSignal(false);
  const [rootReplyBody, setRootReplyBody] = createSignal("");
  const [rootReplyAttachment, setRootReplyAttachment] = createSignal<PostThreadReplyAttachment | null>(null);
  const [rootReplyIdentityMode, setRootReplyIdentityMode] = createSignal<PostThreadIdentityMode>("public");
  const [rootReplyBusy, setRootReplyBusy] = createSignal(false);
  const rootReplyBusyRef = { current: false };
  let rootReplyContainerRef: HTMLDivElement | undefined;
  let rootReplyPointerActive = false;
  const isMobile = createIsMobile();

  const [mobileReplyTarget, setMobileReplyTarget] = createSignal<MobileReplyTarget | null>(null);
  const [mobileReplyBody, setMobileReplyBody] = createSignal("");
  const [mobileReplyAttachment, setMobileReplyAttachment] = createSignal<PostThreadReplyAttachment | null>(null);
  const [mobileReplyIdentityMode, setMobileReplyIdentityMode] = createSignal<PostThreadIdentityMode>("public");
  const [mobileReplyBusy, setMobileReplyBusy] = createSignal(false);
  const mobileReplyBusyRef = { current: false };

  createEffect(() => rootReplyOpen(), (open) => {
    if (open) rootReplyContainerRef?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  createEffect(() => props.post.postHref, () => {
    setShowOriginalPost(false);
  });
  createEffect(() => props.postOriginal?.postHref, () => {
    setShowOriginalPost(false);
  });
  onCleanup(() => {
    revokeReplyAttachment(rootReplyAttachment());
    revokeReplyAttachment(mobileReplyAttachment());
  });

  const activePost = () => showOriginalPost() && props.postOriginal ? props.postOriginal : props.post;
  const canToggleOriginalPost = () => Boolean(props.postOriginal);
  const hasRootReplyBlock = () => Boolean(props.rootReplyBlockedLabel && props.onRootReplyBlocked);
  const canReplyAtRoot = () => Boolean(props.onRootReplySubmit || hasRootReplyBlock() || props.rootReplyDisabled);
  const resolvedEmptyCommentsLabel = () => props.emptyCommentsLabel === "No comments yet." ? copy().noComments : props.emptyCommentsLabel ?? copy().noComments;
  const resolvedRootReplyPlaceholder = () => props.rootReplyPlaceholder || props.rootReplyActionLabel || copy().replyAction;
  const activeSort = () => props.commentSort ?? props.availableCommentSorts?.[0]?.value;
  const canSubmitRootReply = () => Boolean(rootReplyBody().trim() || rootReplyAttachment());
  const canSubmitMobileReply = () => Boolean(mobileReplyBody().trim() || mobileReplyAttachment());

  const handleRootAttachmentChange = (attachment: PostThreadReplyAttachment | null) => {
    revokeReplyAttachment(rootReplyAttachment());
    setRootReplyAttachment(attachment);
  };
  const handleMobileAttachmentChange = (attachment: PostThreadReplyAttachment | null) => {
    revokeReplyAttachment(mobileReplyAttachment());
    setMobileReplyAttachment(attachment);
  };

  const handleRootReplySubmit = async () => {
    const trimmed = rootReplyBody().trim();
    if (!canSubmitRootReply() || !props.onRootReplySubmit || rootReplyBusyRef.current) return;
    rootReplyBusyRef.current = true;
    setRootReplyBusy(true);
    try {
      const result = await props.onRootReplySubmit({
        anonymousScope: rootReplyIdentityMode() === "anonymous" ? props.replyIdentity?.anonymousScope ?? null : null,
        attachment: rootReplyAttachment(),
        authorMode: "human",
        body: trimmed,
        identityMode: rootReplyIdentityMode(),
      });
      if (result === "blocked") return;
      setRootReplyBody("");
      handleRootAttachmentChange(null);
      setRootReplyIdentityMode("public");
      setRootReplyOpen(false);
    } finally {
      rootReplyBusyRef.current = false;
      setRootReplyBusy(false);
    }
  };

  const handleMobileReplySubmit = async () => {
    const target = mobileReplyTarget();
    const trimmed = mobileReplyBody().trim();
    if (!canSubmitMobileReply() || !target || mobileReplyBusyRef.current) return;
    mobileReplyBusyRef.current = true;
    setMobileReplyBusy(true);
    try {
      const result = await target.onSubmit({
        anonymousScope: mobileReplyIdentityMode() === "anonymous" ? props.replyIdentity?.anonymousScope ?? null : null,
        attachment: mobileReplyAttachment(),
        authorMode: "human",
        body: trimmed,
        identityMode: mobileReplyIdentityMode(),
      });
      if (result === "blocked") return;
      setMobileReplyBody("");
      handleMobileAttachmentChange(null);
      setMobileReplyIdentityMode("public");
      setMobileReplyTarget(null);
    } finally {
      mobileReplyBusyRef.current = false;
      setMobileReplyBusy(false);
    }
  };

  const handleMobileReplyCancel = () => {
    setMobileReplyTarget(null);
    setMobileReplyBody("");
    handleMobileAttachmentChange(null);
    setMobileReplyIdentityMode("public");
  };

  const handleCommentReplyRequest = (comment: PostThreadComment) => {
    if (!comment.onReplySubmit) return;
    setMobileReplyTarget({
      kind: "comment",
      authorLabel: comment.authorLabel,
      body: comment.body ?? "",
      metadata: comment.timestampLabel,
      onSubmit: comment.onReplySubmit,
    });
    setMobileReplyBody("");
    handleMobileAttachmentChange(null);
    setMobileReplyIdentityMode("public");
  };

  const rootReplyBodyFromPost = () => {
    const content = props.post.content;
    if (content.type === "text") return content.body;
    if (content.type === "link" || content.type === "embed") return content.body ?? props.post.title ?? "";
    return props.post.title ?? "";
  };

  const openMobileRootReply = () => {
    if (!props.onRootReplySubmit) return;
    setMobileReplyTarget({
      kind: "root",
      authorLabel: props.post.byline.author?.label ?? props.post.byline.community?.label ?? "",
      body: rootReplyBodyFromPost(),
      eyebrow: props.post.byline.community?.label,
      metadata: props.post.byline.timestampLabel,
      onSubmit: props.onRootReplySubmit,
    });
    setMobileReplyBody("");
    handleMobileAttachmentChange(null);
    setMobileReplyIdentityMode("public");
  };

  return (
    <div class={cn("space-y-4", props.class)}>
      <div class="overflow-hidden">
        <PostCard
          {...activePost()}
          class="border-b-0"
          postHref={undefined}
          isViewingOriginal={showOriginalPost()}
          onToggleOriginal={canToggleOriginalPost() ? () => setShowOriginalPost((value) => !value) : activePost().onToggleOriginal}
        />
      </div>

      <section>
        <Show when={canReplyAtRoot() && !rootReplyOpen()}>
          <div class="px-4 pb-5">
            <Show
              when={hasRootReplyBlock()}
              fallback={(
                <Input
                  aria-label={props.rootReplyActionLabel ?? copy().replyAction}
                  class="h-12 w-full rounded-full px-4"
                  disabled={props.rootReplyDisabled}
                  onClick={() => {
                    rootReplyPointerActive = false;
                    props.onReplyIntent?.();
                    if (isMobile()) openMobileRootReply(); else setRootReplyOpen(true);
                  }}
                  onFocus={() => {
                    if (rootReplyPointerActive) return;
                    if (isMobile()) openMobileRootReply(); else setRootReplyOpen(true);
                  }}
                  onPointerCancel={() => { rootReplyPointerActive = false; }}
                  onPointerDown={() => { rootReplyPointerActive = true; }}
                  onPointerUp={() => { rootReplyPointerActive = false; }}
                  placeholder={resolvedRootReplyPlaceholder()}
                  readonly
                  type="text"
                />
              )}
            >
              <Button class="w-full" onClick={() => void props.onRootReplyBlocked?.()}>{props.rootReplyBlockedLabel}</Button>
            </Show>
          </div>
        </Show>
        <Show when={props.commentsBody}><Type as="p" variant="caption" class="px-4 pb-2">{props.commentsBody}</Type></Show>
        <Show when={rootReplyOpen()}>
          <div class="mx-4 mb-5 space-y-3" ref={(element) => { rootReplyContainerRef = element; }}>
            <FormattedTextarea
              class="min-h-28"
              focusOnMount
              onChange={setRootReplyBody}
              placeholder={resolvedRootReplyPlaceholder()}
              toolbarLabels={replyToolbarLabels(locale())}
              value={rootReplyBody()}
            />
            <ReplyAttachmentControl attachment={rootReplyAttachment()} disabled={rootReplyBusy()} onChange={handleRootAttachmentChange} />
            <div class="flex flex-wrap items-center justify-between gap-2">
              <ReplyIdentitySelect identity={props.replyIdentity} onChange={setRootReplyIdentityMode} value={rootReplyIdentityMode()} />
              <div class="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setRootReplyOpen(false);
                    setRootReplyBody("");
                    setRootReplyIdentityMode("public");
                    handleRootAttachmentChange(null);
                  }}
                >
              {props.rootReplyCancelLabel ?? copy().cancelReply}
                </Button>
                <Button disabled={rootReplyBusy() || !canSubmitRootReply()} size="sm" onClick={() => void handleRootReplySubmit()}>
                  {props.rootReplySubmitLabel ?? copy().submitReply}
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={(props.availableCommentSorts?.length ?? 0) > 0 && activeSort()}>
          <div class="flex justify-end px-4 pb-3">
            <ResponsiveOptionSelect
              ariaLabel={copy().commentSortLabel}
              class="hidden md:inline-flex"
              drawerTitle={copy().commentsHeading}
              onValueChange={(value) => props.onCommentSortChange?.(value as CommentSort)}
              options={props.availableCommentSorts ?? []}
              value={activeSort()}
            />
          </div>
        </Show>

        <Show
          when={items().length > 0}
          fallback={<Type as="div" variant="caption" class="px-4 py-5">{resolvedEmptyCommentsLabel()}</Type>}
        >
          <CommentTree
            class="px-4"
            comments={items()}
            onReplyIntent={props.onReplyIntent}
            onReplyRequest={isMobile() ? handleCommentReplyRequest : undefined}
            replyIdentity={props.replyIdentity}
          />
        </Show>
      </section>

      <Show when={mobileReplyTarget()}>
        {(target) => (
          <div class="fixed inset-0 z-50">
            <MobileReplyScreen
              body={mobileReplyBody()}
              attachment={mobileReplyAttachment()}
              busy={mobileReplyBusy()}
              context={(
                <ReplyContextCard
                  authorLabel={target().authorLabel}
                  body={target().body}
                  eyebrow={target().eyebrow}
                  metadata={target().metadata}
                />
              )}
              identityControl={(
                <ReplyIdentitySelect
                  identity={props.replyIdentity}
                  onChange={setMobileReplyIdentityMode}
                  value={mobileReplyIdentityMode()}
                />
              )}
              onAttachmentChange={handleMobileAttachmentChange}
              onBodyChange={setMobileReplyBody}
              onCancel={handleMobileReplyCancel}
              onSubmit={() => void handleMobileReplySubmit()}
              placeholder={props.rootReplyPlaceholder}
              postLabel={copy().submitReply}
              title={props.rootReplyActionLabel ?? copy().replyAction}
            />
          </div>
        )}
      </Show>
    </div>
  );
}
