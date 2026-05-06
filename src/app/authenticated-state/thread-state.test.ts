import { describe, expect, test } from "bun:test";
import type { CommentListItem } from "@pirate/api-contracts";

import { toThreadComment } from "./thread-state";
import type { PostThreadReplyAttachment } from "@/components/compositions/posts/post-thread/post-thread.types";

const labels = {
  cancelReplyLabel: "Cancel",
  loadMoreRepliesLabel: "Load more replies",
  loadRepliesLabel: "Load replies",
  loadingRepliesLabel: "Loading replies",
  replyActionLabel: "Reply",
  replyPlaceholder: "Write a reply",
  showOriginalLabel: "Show original",
  showTranslationLabel: "Show translation",
  submitReplyLabel: "Post reply",
};

function createCommentItem(overrides: Partial<CommentListItem["comment"]> = {}): CommentListItem {
  return {
    comment: {
      id: "cmt_test",
      parent_comment: null,
      identity_mode: "anonymous",
      anonymous_label: "anon",
      author_user: null,
      status: "published",
      body: "Comment body",
      score: 0,
      direct_reply_count: 0,
      descendant_count: 0,
      created: Date.parse("2026-05-06T00:00:00.000Z"),
      media_refs: [],
      ...overrides,
    },
    resolved_locale: "en",
    translation_state: "same_language",
    translated_body: null,
    viewer_vote: null,
    viewer_can_delete: false,
  } as unknown as CommentListItem;
}

describe("thread-state comment mapping", () => {
  test("maps API comment media refs into post thread media", () => {
    const comment = toThreadComment(
      createCommentItem({
        media_refs: [{
          storage_ref: "https://media.test/comment.gif",
          mime_type: "image/gif",
          size_bytes: 1200,
        }],
      }),
      {},
      labels,
    );

    expect(comment.media).toEqual([{
      storageRef: "https://media.test/comment.gif",
      mimeType: "image/gif",
    }]);
  });

  test("preserves reply attachments when mapping submit handlers", async () => {
    const attachment: PostThreadReplyAttachment = {
      label: "comment.png",
      mimeType: "image/png",
      previewUrl: "blob:comment",
      sizeBytes: 1200,
    };
    const seen: unknown[] = [];
    const comment = toThreadComment(
      createCommentItem(),
      {},
      labels,
      {
        onReplySubmit: (input) => {
          seen.push(input);
          return "submitted";
        },
      },
    );

    await comment.onReplySubmit?.({ attachment, authorMode: "human", body: "" });

    expect(seen).toEqual([{ attachment, authorMode: "human", body: "" }]);
  });

  test("maps comment delete permission into post thread actions", () => {
    const deleted: string[] = [];
    const comment = toThreadComment(
      {
        ...createCommentItem(),
        viewer_can_delete: true,
      },
      {},
      labels,
      {
        onDelete: () => {
          deleted.push("cmt_test");
        },
      },
    );

    expect(comment.canDelete).toBe(true);
    expect(comment.deleteActionLabel).toBe("Delete");
    comment.onDelete?.();
    expect(deleted).toEqual(["cmt_test"]);
  });
});
