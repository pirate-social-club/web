import { describe, expect, test } from "bun:test";
import type { CommentListItem } from "@pirate/api-contracts";

import {
  buildThreadCommentTreeFromItems,
  createThreadCommentNode,
  loadThreadCommentTree,
  mergeThreadCommentNodes,
  type ThreadCommentNode,
} from "@/app/authenticated-route-renderer";
import { upsertThreadCommentNodes } from "@/app/authenticated-state/thread-state";

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
    id: input.commentId,
    object: "comment_list_item",
    comment: {
      id: input.commentId,
      object: "comment",
      anonymous_label: input.anonymousLabel,
      anonymous_scope: "thread_stable",
      author_user: null,
      authorship_mode: "human_direct",
      body: input.body,
      community: "cmt_browser",
      content_hash: null,
      created: Date.parse("2026-04-18T14:05:00.000Z"),
      depth: input.depth,
      descendant_count: input.descendantCount,
      downvote_count: 0,
      direct_reply_count: input.directReplyCount,
      idempotency_key: `comment-${input.commentId}`,
      identity_mode: "anonymous",
      last_reply_at: null,
      parent_comment: input.parentCommentId ?? null,
      score: input.score,
      status: "published",
      swarm_body_ref: null,
      thread_root_post: "pst_browser",
      upvote_count: 0,
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
    expect(merged[0]?.item.comment.id).toBe("cmt_root");
    expect(merged[0]?.item.comment.score).toBe(3);
    expect(merged[0]?.item.comment.direct_reply_count).toBe(2);
    expect(merged[0]?.hasLoadedReplies).toBe(true);
    expect(merged[0]?.children.length).toBe(1);
    expect(merged[0]?.children[0]?.item.comment.body).toBe("Nested reply that was already loaded.");
    expect(merged[1]?.item.comment.id).toBe("cmt_root_2");
  });

  test("buildThreadCommentTreeFromItems nests flat replies under their parent", () => {
    const parent = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Parent comment",
      commentId: "cmt_parent",
      descendantCount: 1,
      depth: 0,
      directReplyCount: 1,
      score: 2,
    });
    const reply = createCommentListItem({
      anonymousLabel: "lookout",
      body: "Reply comment",
      commentId: "cmt_reply",
      descendantCount: 0,
      depth: 1,
      directReplyCount: 0,
      parentCommentId: "cmt_parent",
      score: 0,
    });

    const tree = buildThreadCommentTreeFromItems([parent, reply]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.item.comment.id).toBe("cmt_parent");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.item.comment.id).toBe("cmt_reply");
  });

  test("buildThreadCommentTreeFromItems links duplicate root and reply ids once", () => {
    const parent = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Parent comment",
      commentId: "cmt_parent",
      descendantCount: 1,
      depth: 0,
      directReplyCount: 1,
      score: 2,
    });
    const reply = createCommentListItem({
      anonymousLabel: "lookout",
      body: "Reply comment",
      commentId: "cmt_reply",
      descendantCount: 0,
      depth: 1,
      directReplyCount: 0,
      parentCommentId: "cmt_parent",
      score: 0,
    });

    const tree = buildThreadCommentTreeFromItems([parent, parent, reply, reply]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.item.comment.id).toBe("cmt_reply");
  });

  test("loadThreadCommentTree auto-loads first-level replies for roots", async () => {
    const parent = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Parent comment",
      commentId: "cmt_parent",
      descendantCount: 1,
      depth: 0,
      directReplyCount: 1,
      score: 2,
    });
    const reply = createCommentListItem({
      anonymousLabel: "lookout",
      body: "Reply comment",
      commentId: "cmt_reply",
      descendantCount: 0,
      depth: 1,
      directReplyCount: 0,
      parentCommentId: "cmt_parent",
      score: 0,
    });
    const replyRequests: Array<{ commentId: string; limit?: string | null }> = [];
    const api = {
      communities: {
        listComments: async () => ({
          items: [parent],
          next_cursor: null,
        }),
      },
      comments: {
        listReplies: async (commentId: string, opts?: { limit?: string | null }) => {
          replyRequests.push({ commentId, limit: opts?.limit });
          return {
            items: [reply],
            next_cursor: null,
          };
        },
      },
    } as unknown as Parameters<typeof loadThreadCommentTree>[0];

    const tree = await loadThreadCommentTree(api, "cmt_browser", "pst_browser", "en", true, "best");

    expect(replyRequests).toEqual([{ commentId: "cmt_parent", limit: "5" }]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.hasLoadedReplies).toBe(true);
    expect(tree[0]?.nextRepliesCursor).toBe(null);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.item.comment.id).toBe("cmt_reply");
  });

  test("loadThreadCommentTree deduplicates comments across pages", async () => {
    const root = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Root comment",
      commentId: "cmt_root",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 2,
    });
    const secondRoot = createCommentListItem({
      anonymousLabel: "lookout",
      body: "Second root",
      commentId: "cmt_root_2",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 1,
    });
    const api = {
      communities: {
        listComments: async (_communityId: string, _postId: string, opts?: { cursor?: string | null }) => opts?.cursor
          ? { items: [root, secondRoot], next_cursor: null }
          : { items: [root], next_cursor: "page-2" },
      },
      comments: { listReplies: async () => ({ items: [], next_cursor: null }) },
    } as unknown as Parameters<typeof loadThreadCommentTree>[0];

    const tree = await loadThreadCommentTree(api, "cmt_browser", "pst_browser", "en", true, "best");

    expect(tree.map((node) => node.item.comment.id)).toEqual(["cmt_root", "cmt_root_2"]);
  });

  test("mergeThreadCommentNodes keeps unconfirmed local echoes and still drops deleted server nodes", () => {
    const echo = {
      ...createThreadCommentNode(createCommentListItem({
        anonymousLabel: "me",
        body: "Just posted",
        commentId: "cmt_echo",
        descendantCount: 0,
        depth: 0,
        directReplyCount: 0,
        score: 0,
      })),
      isLocalEcho: true,
    };
    const staleServerRoot = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Old root",
      commentId: "cmt_root",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 2,
    });
    const deletedServerRoot = createCommentListItem({
      anonymousLabel: "lookout",
      body: "Removed elsewhere",
      commentId: "cmt_root_deleted",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 1,
    });

    // The refetch predates the echo (stale/cached page) and no longer
    // contains the root deleted elsewhere.
    const merged = mergeThreadCommentNodes(
      [echo, createThreadCommentNode(staleServerRoot), createThreadCommentNode(deletedServerRoot)],
      [createThreadCommentNode(staleServerRoot)],
    );

    expect(merged.map((node) => node.item.comment.id)).toEqual(["cmt_echo", "cmt_root"]);
    expect(merged[0]?.isLocalEcho).toBe(true);
  });

  test("mergeThreadCommentNodes clears the echo flag once the server returns the comment", () => {
    const echo = {
      ...createThreadCommentNode(createCommentListItem({
        anonymousLabel: "me",
        body: "Just posted",
        commentId: "cmt_echo",
        descendantCount: 0,
        depth: 0,
        directReplyCount: 0,
        score: 0,
      })),
      isLocalEcho: true,
    };
    const serverVersion = createThreadCommentNode(createCommentListItem({
      anonymousLabel: "me",
      body: "Just posted",
      commentId: "cmt_echo",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 1,
    }));

    const merged = mergeThreadCommentNodes([echo], [serverVersion]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.item.comment.score).toBe(1);
    expect(merged[0]?.isLocalEcho).toBeUndefined();
  });

  test("loadThreadCommentTree stops paginating when the server repeats a cursor", async () => {
    const root = createCommentListItem({
      anonymousLabel: "deckhand",
      body: "Root comment",
      commentId: "cmt_root",
      descendantCount: 0,
      depth: 0,
      directReplyCount: 0,
      score: 2,
    });
    let pages = 0;
    const api = {
      communities: {
        listComments: async () => {
          pages += 1;
          return { items: [root], next_cursor: "page-2" };
        },
      },
      comments: { listReplies: async () => ({ items: [], next_cursor: null }) },
    } as unknown as Parameters<typeof loadThreadCommentTree>[0];

    const tree = await loadThreadCommentTree(api, "cmt_browser", "pst_browser", "en", true, "best");

    expect(pages).toBe(2);
    expect(tree.map((node) => node.item.comment.id)).toEqual(["cmt_root"]);
  });

  test("upsertThreadCommentNodes clears the echo flag on server confirmation and keeps it otherwise", () => {
    const buildEcho = () => ({
      ...createThreadCommentNode(createCommentListItem({
        anonymousLabel: "me",
        body: "Just posted",
        commentId: "cmt_echo",
        descendantCount: 0,
        depth: 1,
        directReplyCount: 0,
        parentCommentId: "cmt_root",
        score: 0,
      })),
      isLocalEcho: true,
    });
    const serverVersion = createThreadCommentNode(createCommentListItem({
      anonymousLabel: "me",
      body: "Just posted",
      commentId: "cmt_echo",
      descendantCount: 0,
      depth: 1,
      directReplyCount: 0,
      parentCommentId: "cmt_root",
      score: 1,
    }));

    // Server returns the reply: the flag clears so a later absence is
    // treated as deletion again.
    const confirmed = upsertThreadCommentNodes([buildEcho()], [serverVersion]);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]?.item.comment.score).toBe(1);
    expect(confirmed[0]?.isLocalEcho).toBeUndefined();

    // Server has not returned the reply yet: the echo and its flag survive.
    const pending = upsertThreadCommentNodes([buildEcho()], []);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.isLocalEcho).toBe(true);
  });
});
import "@/test/setup-runtime";
