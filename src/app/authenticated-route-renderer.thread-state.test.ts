import { describe, expect, test } from "bun:test";
import type { CommentListItem } from "@pirate/api-contracts";

import {
  createThreadCommentNode,
  mergeThreadCommentNodes,
  type ThreadCommentNode,
} from "@/app/authenticated-route-renderer";

function createCommentListItem(input: {
  anonymousLabel: string;
  body: string;
  commentId: string;
  depth: number;
  descendantCount: number;
  directReplyCount: number;
  parentCommentId?: string | null;
  score: number;
  translatedBody?: string | null;
  translationState?: "ready" | "same_language";
}): CommentListItem {
  return {
    comment: {
      anonymous_label: input.anonymousLabel,
      anonymous_scope: "thread_stable",
      author_user_id: null,
      authorship_mode: "human_direct",
      body: input.body,
      comment_id: input.commentId,
      community_id: "cmt_browser",
      content_hash: null,
      created_at: "2026-04-18T14:05:00.000Z",
      depth: input.depth,
      descendant_count: input.descendantCount,
      downvote_count: 0,
      direct_reply_count: input.directReplyCount,
      identity_mode: "anonymous",
      last_reply_at: null,
      parent_comment_id: input.parentCommentId ?? null,
      score: input.score,
      status: "published",
      swarm_body_ref: null,
      thread_root_post_id: "pst_browser",
      upvote_count: 0,
      updated_at: "2026-04-18T14:05:00.000Z",
    },
    machine_translated: input.translationState === "ready",
    resolved_locale: "en",
    source_hash: `source-${input.commentId}`,
    translated_body: input.translatedBody ?? null,
    translation_state: input.translationState ?? "same_language",
    viewer_vote: null,
  };
}

function withLoadedReplies(
  node: ThreadCommentNode,
  children: ThreadCommentNode[],
): ThreadCommentNode {
  return {
    ...node,
    children,
    hasLoadedReplies: true,
    loadingReplies: false,
    nextRepliesCursor: null,
  };
}

describe("thread comment state helpers", () => {
  test("createThreadCommentNode initializes branch loading state", () => {
    const node = createThreadCommentNode(createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Root comment",
      commentId: "cmt_root",
      descendantCount: 1,
      depth: 0,
      directReplyCount: 1,
      score: 2,
    }));

    expect(node.children.length).toBe(0);
    expect(node.hasLoadedReplies).toBe(false);
    expect(node.loadingReplies).toBe(false);
    expect(node.nextRepliesCursor).toBe(null);
  });

  test("mergeThreadCommentNodes preserves loaded children while refreshing top-level items", () => {
    const previousRoot = withLoadedReplies(
      createThreadCommentNode(createCommentListItem({
        anonymousLabel: "deckhand",
        body: "Comentario original de la raiz.",
        commentId: "cmt_root",
        descendantCount: 1,
        depth: 0,
        directReplyCount: 1,
        score: 2,
        translatedBody: "Translated root comment.",
        translationState: "ready",
      })),
      [
        createThreadCommentNode(createCommentListItem({
          anonymousLabel: "lookout",
          body: "Nested reply that was already loaded.",
          commentId: "cmt_reply_1",
          descendantCount: 0,
          depth: 1,
          directReplyCount: 0,
          parentCommentId: "cmt_root",
          score: 1,
        })),
      ],
    );

    const refreshedRoot = createThreadCommentNode(createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Comentario original de la raiz.",
      commentId: "cmt_root",
      descendantCount: 2,
      depth: 0,
      directReplyCount: 2,
      score: 3,
      translatedBody: "Translated root comment.",
      translationState: "ready",
    }));
    const newSibling = createThreadCommentNode(createCommentListItem({
      anonymousLabel: "quartermaster",
      body: "Fresh root comment.",
      commentId: "cmt_root_2",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 0,
    }));

    const merged = mergeThreadCommentNodes([previousRoot], [refreshedRoot, newSibling]);

    expect(merged.length).toBe(2);
    expect(merged[0]?.item.comment.comment_id).toBe("cmt_root");
    expect(merged[0]?.item.comment.score).toBe(3);
    expect(merged[0]?.item.comment.direct_reply_count).toBe(2);
    expect(merged[0]?.hasLoadedReplies).toBe(true);
    expect(merged[0]?.children.length).toBe(1);
    expect(merged[0]?.children[0]?.item.comment.body).toBe("Nested reply that was already loaded.");
    expect(merged[1]?.item.comment.comment_id).toBe("cmt_root_2");
  });
});
