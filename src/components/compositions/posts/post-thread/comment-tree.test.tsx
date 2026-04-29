import { describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

import { UiLocaleProvider } from "@/lib/ui-locale";
import { installDomGlobals } from "@/test/setup-dom";
import { CommentTree } from "./comment-tree";

const { window } = installDomGlobals();
Object.defineProperty(window.navigator, "vibrate", { configurable: true, value: () => true });
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
  },
});

function renderTree(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  return render(
    <UiLocaleProvider dir="ltr" locale="en">
      {ui}
    </UiLocaleProvider>,
    { baseElement: container, container },
  );
}

describe("CommentTree", () => {
  test("collapses a comment into a compact row and restores it", async () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "nadia",
            body: "This body should collapse.",
            commentId: "cmt_parent",
            replyCount: 2,
            scoreLabel: "8 score",
            timestampLabel: "12m",
            children: [
              {
                authorLabel: "eli",
                body: "Nested reply",
                commentId: "cmt_child",
                timestampLabel: "8m",
              },
            ],
          },
        ]}
      />,
    );

    expect(Boolean(view.getByText("This body should collapse."))).toBe(true);
    expect(Boolean(view.getByText("Nested reply"))).toBe(true);
    expect(view.getAllByRole("button", { name: "Collapse thread" })).toHaveLength(1);

    fireEvent.click(view.getAllByRole("button", { name: "Collapse thread" })[0]);

    await waitFor(() => {
      expect(Boolean(view.queryByText("This body should collapse."))).toBe(false);
      expect(Boolean(view.queryByText("Nested reply"))).toBe(false);
    });
    expect(view.queryByText("8 score · 2 replies")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Expand thread" }));

    await waitFor(() => {
      expect(Boolean(view.getByText("This body should collapse."))).toBe(true);
      expect(Boolean(view.getByText("Nested reply"))).toBe(true);
    });

    view.unmount();
  });

  test("does not render collapse for a leaf comment", () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "eli",
            body: "Last reply in the branch",
            commentId: "cmt_leaf",
            timestampLabel: "8m",
          },
        ]}
      />,
    );

    expect(Boolean(view.getByText("Last reply in the branch"))).toBe(true);
    expect(view.queryByRole("button", { name: "Collapse thread" })).toBeNull();

    view.unmount();
  });

  test("renders reply action when status is omitted", () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "nadia",
            body: "Replyable by default",
            cancelReplyLabel: "Cancel",
            commentId: "cmt_replyable",
            onReplySubmit: () => "submitted",
            replyActionLabel: "Reply",
            replyPlaceholder: "Write a reply",
            submitReplyLabel: "Reply",
            timestampLabel: "4m",
          },
        ]}
      />,
    );

    expect(Boolean(view.getByRole("button", { name: "Reply" }))).toBe(true);

    view.unmount();
  });

  test("insets loaded replies under their parent comment", () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "nadia",
            body: "Parent comment",
            commentId: "cmt_parent",
            timestampLabel: "12m",
            children: [
              {
                authorLabel: "eli",
                body: "Reply should be inset",
                commentId: "cmt_child",
                timestampLabel: "8m",
              },
            ],
          },
        ]}
      />,
    );

    const reply = view.getByText("Reply should be inset");
    const replyGroup = reply.closest("[data-comment-tree-children]");

    expect(replyGroup?.className).toContain("ms-10");

    view.unmount();
  });

  test("uses load replies instead of collapse for unloaded branches", () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "maya",
            body: "Visible parent",
            canLoadMoreReplies: true,
            commentId: "cmt_unloaded",
            loadMoreRepliesLabel: "Load replies (3)",
            replyCount: 3,
            timestampLabel: "4m",
          },
        ]}
      />,
    );

    expect(Boolean(view.getByText("Visible parent"))).toBe(true);
    expect(view.queryByRole("button", { name: "Collapse thread" })).toBeNull();
    expect(Boolean(view.getByRole("button", { name: "Load replies (3)" }))).toBe(true);

    view.unmount();
  });

  test("does not render collapse for a pure unloaded-replies placeholder", () => {
    const view = renderTree(
      <CommentTree
        comments={[
          {
            authorLabel: "placeholder",
            canLoadMoreReplies: true,
            commentId: "cmt_placeholder",
            loadMoreRepliesLabel: "Load replies (1)",
            replyCount: 1,
            timestampLabel: "1m",
          },
        ]}
      />,
    );

    expect(view.queryByRole("button", { name: "Collapse thread" })).toBeNull();
    expect(Boolean(view.getByRole("button", { name: "Load replies (1)" }))).toBe(true);

    view.unmount();
  });
});
