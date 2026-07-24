"use client";

import * as React from "react";

import { usePost } from "@/app/authenticated-state/post-state";
import { CommentTree } from "@/components/compositions/posts/post-thread/comment-tree";
import type { CommentSort } from "@/components/compositions/posts/post-thread/post-thread.types";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useSession } from "@/lib/api/session-store";

const COMMENT_SORTS: CommentSort[] = ["best", "new", "top"];

export function FeedCommentsPanel({
  composerRef,
  postId,
}: {
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
  postId: string;
}) {
  const session = useSession();
  const requestAuth = useRequestAuth();
  const contentLocale = useRouteContentLocale();
  const { copy } = useRouteMessages();
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
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
      if (result === "submitted") setBody("");
    } finally {
      setSubmitting(false);
    }
  }, [body, copy.home.videoCommentAuthRequired, createTopLevelComment, requestAuth, session?.accessToken, submitting]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {gateModal}
      <div className="flex shrink-0 items-center justify-end border-b border-border-soft px-4 py-2">
        <label className="flex items-center gap-2">
          <Type as="span" variant="caption">{copy.common.commentsHeading}</Type>
          <select
            aria-label={copy.common.commentsHeading}
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
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-4">
        {loading ? (
          <div className="grid h-full min-h-40 place-items-center">
            <Spinner className="size-6" />
          </div>
        ) : error ? (
          <Type className="px-4 py-6" variant="body">{copy.routeStatus.post.failure}</Type>
        ) : comments.length > 0 ? (
          <CommentTree
            className="px-3"
            comments={comments}
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
        className="flex shrink-0 items-end gap-2 border-t border-border-soft bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          aria-label={copy.common.replyPlaceholder}
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-border-soft bg-background px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.common.replyPlaceholder}
          ref={composerRef}
          rows={1}
          value={body}
        />
        <Button disabled={submitting || !body.trim()} type="submit">
          {copy.common.submitReply}
        </Button>
      </form>
    </div>
  );
}
