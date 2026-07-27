"use client";

import * as React from "react";
import { ArrowUp } from "@phosphor-icons/react";

import { usePost } from "@/app/authenticated-state/post-state";
import { resolveSessionAvatarFallback } from "@/app/shell/session-avatar";
import { CommentTree } from "@/components/compositions/posts/post-thread/comment-tree";
import type { CommentSort, PostThreadSubmitResult } from "@/components/compositions/posts/post-thread/post-thread.types";
import { Avatar } from "@/components/primitives/avatar";
import { IconButton } from "@/components/primitives/icon-button";
import { Skeleton } from "@/components/primitives/skeleton";
import { Type } from "@/components/primitives/type";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useSession } from "@/lib/api/session-store";

const COMMENT_SORTS: CommentSort[] = ["best", "new", "top"];
const COMMENT_SKELETON_WIDTHS = [82, 95, 68, 90, 76];

/**
 * Moves the composer from one post to the next: the outgoing post's unsent text is stashed
 * and the incoming post's stash is handed back. Returns the body the composer should show.
 */
export function swapCommentDraft(
  drafts: Map<string, string>,
  previousPostId: string,
  previousBody: string,
  nextPostId: string,
): string {
  drafts.set(previousPostId, previousBody);
  return drafts.get(nextPostId) ?? "";
}

/**
 * Applies the outcome of a composer submission. Returns whether a comment was actually
 * created — a rejected submission must keep the draft and leave the header count alone.
 */
export function commitCommentSubmission(
  drafts: Map<string, string>,
  postId: string,
  result: PostThreadSubmitResult,
): boolean {
  if (result !== "submitted") return false;
  drafts.delete(postId);
  return true;
}

export function FeedCommentsPanel({
  composerRef,
  onCommentAdded,
  postId,
}: {
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
  onCommentAdded?: (postId: string) => void;
  postId: string;
}) {
  const session = useSession();
  const requestAuth = useRequestAuth();
  const contentLocale = useRouteContentLocale();
  const { copy } = useRouteMessages();
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // Unsent composer text is kept per post, so the dock can follow feed scrolling
  // without losing a half-written comment when the viewer scrolls away and back.
  const draftsRef = React.useRef(new Map<string, string>());
  const bodyRef = React.useRef(body);
  const previousPostIdRef = React.useRef(postId);
  const listRef = React.useRef<HTMLDivElement>(null);
  const labels = React.useMemo(() => ({
    cancelReplyLabel: copy.common.cancelReply,
    loadMoreRepliesLabel: copy.common.loadMoreReplies,
    loadRepliesLabel: copy.common.loadReplies,
    loadingRepliesLabel: copy.common.loadingReplies,
    replyActionLabel: copy.common.replyAction,
    replyPlaceholder: copy.common.replyPlaceholder,
    showOriginalLabel: copy.common.showOriginal,
    showTranslationLabel: copy.common.showTranslation,
    submitReplyLabel: copy.common.submitReply,
  }), [copy.common]);
  const {
    commentSort,
    comments,
    createTopLevelComment,
    error,
    gateModal,
    loading,
    setCommentSort,
    threadPartial,
  } = usePost(postId, contentLocale, Boolean(session?.accessToken), labels);

  // Mirrors `body` for the post-swap effect below. Kept in sync at the write site rather
  // than in an effect, so the draft is already recorded by the time the post changes.
  const updateBody = React.useCallback((next: string) => {
    bodyRef.current = next;
    setBody(next);
  }, []);

  // Runs before paint so the swapped-in thread never flashes at the previous thread's
  // scroll offset, and the composer never shows the previous post's draft for a frame.
  React.useLayoutEffect(() => {
    const previousPostId = previousPostIdRef.current;
    if (previousPostId === postId) return;
    previousPostIdRef.current = postId;
    const draft = swapCommentDraft(draftsRef.current, previousPostId, bodyRef.current, postId);
    bodyRef.current = draft;
    setBody(draft);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [postId]);

  const submit = React.useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    if (!session?.accessToken) {
      requestAuth(copy.home.videoCommentAuthRequired);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTopLevelComment({
        authorMode: "human",
        body: trimmed,
        identityMode: "public",
      });
      if (commitCommentSubmission(draftsRef.current, postId, result)) {
        updateBody("");
        onCommentAdded?.(postId);
      }
    } finally {
      setSubmitting(false);
    }
  }, [body, copy.home.videoCommentAuthRequired, createTopLevelComment, onCommentAdded, postId, requestAuth, session?.accessToken, submitting]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {gateModal}
      <div className="flex shrink-0 items-center justify-end border-b border-border-soft px-4 py-2">
        <select
          aria-label={copy.common.commentSortLabel}
          className="h-9 rounded-lg border border-border-soft bg-background px-2 text-base"
          onChange={(event) => setCommentSort(event.target.value as CommentSort)}
          value={commentSort}
        >
          {COMMENT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {sort === "best" ? copy.common.bestTab : sort === "new" ? copy.common.newTab : copy.common.topTab}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-4" data-feed-comments-list ref={listRef}>
        {loading ? (
          <div
            aria-label={copy.common.loading}
            className="flex flex-col gap-6 px-4 py-2"
            role="status"
          >
            {COMMENT_SKELETON_WIDTHS.map((width, index) => (
              <div className="flex items-start gap-3" key={index}>
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Type className="px-4 py-6" variant="body">{copy.routeStatus.post.failure}</Type>
        ) : comments.length > 0 ? (
          <CommentTree
            className="px-3"
            comments={comments}
            // Remount per post: the tree holds collapse state in refs/state that must
            // not leak across posts now that the dock follows feed scrolling.
            key={postId}
            onReplyIntent={() => {
              if (!session?.accessToken) requestAuth(copy.home.videoCommentAuthRequired);
            }}
          />
        ) : (
          <Type className="px-4 py-6" variant="caption">
            {threadPartial ? copy.common.loadingReplies : copy.common.noComments}
          </Type>
        )}
      </div>
      <form
        className="flex shrink-0 items-end gap-3 border-t border-border-soft bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Avatar
          className="mb-1"
          fallback={resolveSessionAvatarFallback(session, copy.common.publicIdentityFallback)}
          fallbackSeed={session?.profile?.id ?? undefined}
          size="sm"
          src={session?.profile?.avatar_ref ?? undefined}
        />
        <textarea
          aria-label={copy.common.commentPlaceholder}
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-border-soft bg-background px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => updateBody(event.target.value)}
          placeholder={copy.common.commentPlaceholder}
          ref={composerRef}
          rows={1}
          value={body}
        />
        <IconButton
          aria-label={copy.common.submitReply}
          disabled={submitting || !body.trim()}
          loading={submitting}
          type="submit"
          variant="default"
        >
          <ArrowUp aria-hidden className="size-5" weight="bold" />
        </IconButton>
      </form>
    </div>
  );
}
