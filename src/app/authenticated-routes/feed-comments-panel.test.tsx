import "@/test/setup-runtime";

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import * as React from "react";

let fakeSession: unknown = { accessToken: "tok", profile: { id: "usr_1" } };
let threadLoading = false;
let commentTreeMountCount = 0;
const createTopLevelComment = mock(async (_input: unknown) => "submitted" as string);

// The dock keeps one mounted panel across many posts, so the thread body is stubbed out:
// what these tests exercise is the panel's own per-post bookkeeping.
mock.module("@/components/compositions/posts/post-thread/comment-tree", () => ({
  CommentTree: () => {
    React.useEffect(() => {
      commentTreeMountCount += 1;
    }, []);
    return <div data-testid="comment-tree" />;
  },
}));
mock.module("@/lib/api/session-store", () => ({ useSession: () => fakeSession }));
mock.module("@/hooks/use-request-auth", () => ({ useRequestAuth: () => () => {} }));
mock.module("@/hooks/use-route-content-locale", () => ({ useRouteContentLocale: () => "en" }));
mock.module("@/app/authenticated-state/post-state", () => ({
  usePost: (postId: string) => ({
    commentSort: "best",
    comments: threadLoading ? [] : [{ id: `${postId}-c1` }],
    createTopLevelComment,
    error: null,
    gateModal: null,
    loading: threadLoading,
    setCommentSort: () => {},
    threadPartial: false,
  }),
}));

const {
  commitCommentSubmission,
  FeedCommentsPanel,
  swapCommentDraft,
} = await import("./feed-comments-panel");

function listOf(container: HTMLElement): HTMLElement {
  const list = container.querySelector("[data-feed-comments-list]");
  if (!list) throw new Error("comment list not rendered");
  return list as HTMLElement;
}

beforeEach(() => {
  fakeSession = { accessToken: "tok", profile: { id: "usr_1" } };
  threadLoading = false;
  commentTreeMountCount = 0;
  createTopLevelComment.mockClear();
});

afterEach(() => {
  cleanup();
});

// The composer itself is driven through these helpers rather than through typing: React
// change events do not fire under this repo's linkedom test DOM, so a fireEvent-based
// version of these assertions would pass no matter what the panel did.
describe("swapCommentDraft", () => {
  test("hands a half-written comment back when the dock returns to that post", () => {
    const drafts = new Map<string, string>();
    expect(swapCommentDraft(drafts, "post_a", "half a thought", "post_b")).toBe("");
    expect(swapCommentDraft(drafts, "post_b", "b draft", "post_a")).toBe("half a thought");
    expect(swapCommentDraft(drafts, "post_a", "half a thought", "post_b")).toBe("b draft");
  });

  test("opens a clean composer on a post the viewer has not written on", () => {
    expect(swapCommentDraft(new Map(), "post_a", "", "post_new")).toBe("");
  });
});

describe("commitCommentSubmission", () => {
  test("clears the draft and reports the new comment once it is created", () => {
    const drafts = new Map([["post_a", "nice"]]);
    expect(commitCommentSubmission(drafts, "post_a", "submitted")).toBe(true);
    expect(drafts.has("post_a")).toBe(false);
  });

  // A gate-blocked comment was never created: keeping the text is the whole point, and
  // crediting the header count would show a comment that does not exist.
  test("keeps the draft and reports nothing when the submission was blocked", () => {
    const drafts = new Map([["post_a", "nice"]]);
    expect(commitCommentSubmission(drafts, "post_a", "blocked")).toBe(false);
    expect(drafts.get("post_a")).toBe("nice");
  });
});

describe("FeedCommentsPanel", () => {
  // Without this the viewer lands mid-thread in a thread they have never seen, at whatever
  // offset the previous post's comments happened to be scrolled to.
  test("returns the thread to the top when the dock switches post", () => {
    const view = render(<FeedCommentsPanel postId="post_a" />);
    const list = listOf(view.container);
    list.scrollTop = 480;
    expect(list.scrollTop).toBe(480);

    view.rerender(<FeedCommentsPanel postId="post_b" />);
    expect(listOf(view.container).scrollTop).toBe(0);
  });

  test("does not reset the thread on unrelated re-renders", () => {
    const view = render(<FeedCommentsPanel postId="post_a" />);
    listOf(view.container).scrollTop = 480;

    view.rerender(<FeedCommentsPanel postId="post_a" />);
    expect(listOf(view.container).scrollTop).toBe(480);
  });

  test("labels the sort control as sorting rather than as the panel heading", () => {
    const view = render(<FeedCommentsPanel postId="post_a" />);
    expect(view.container.querySelector("select")?.getAttribute("aria-label")).toBe("Sort comments");
  });

  // CommentTree keeps collapse bookkeeping in refs/state, so the dock must remount it per
  // post; otherwise one post's collapse map leaks into the next as the dock follows scrolling.
  test("remounts the thread when the dock switches post, and only then", () => {
    const view = render(<FeedCommentsPanel postId="post_a" />);
    expect(commentTreeMountCount).toBe(1);

    view.rerender(<FeedCommentsPanel postId="post_b" />);
    expect(commentTreeMountCount).toBe(2);

    view.rerender(<FeedCommentsPanel postId="post_b" />);
    expect(commentTreeMountCount).toBe(2);
  });

  test("shows comment-shaped skeletons rather than a bare spinner while loading", () => {
    threadLoading = true;
    const view = render(<FeedCommentsPanel postId="post_a" />);
    const status = view.container.querySelector("[role='status']");
    expect(status).not.toBeNull();
    expect(status?.children.length).toBeGreaterThan(1);
  });
});
