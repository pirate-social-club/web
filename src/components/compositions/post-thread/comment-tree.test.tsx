import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { parseHTML } from "linkedom";
import * as React from "react";

import { UiLocaleProvider } from "@/lib/ui-locale";
import { CommentTree } from "./comment-tree";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { configurable: true, value: document });
Object.defineProperty(globalThis, "window", { configurable: true, value: window });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: window.navigator });
Object.defineProperty(globalThis, "Element", { configurable: true, value: window.Element });
Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: window.HTMLElement });
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
  return render(
    <UiLocaleProvider dir="ltr" locale="en">
      {ui}
    </UiLocaleProvider>,
  );
}

describe("CommentTree", () => {
  test("collapses a comment into a compact row and restores it", () => {
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

    fireEvent.click(view.getAllByRole("button", { name: "Collapse thread" })[0]);

    expect(view.queryByText("This body should collapse.")).toBeNull();
    expect(view.queryByText("Nested reply")).toBeNull();
    expect(view.getByRole("button", { name: "Expand thread" }).textContent).toContain("2 replies");

    fireEvent.click(view.getByRole("button", { name: "Expand thread" }));

    expect(Boolean(view.getByText("This body should collapse."))).toBe(true);
    expect(Boolean(view.getByText("Nested reply"))).toBe(true);

    view.unmount();
  });

  test("keeps unloaded-reply loading separate from collapse", () => {
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
    expect(Boolean(view.getByRole("button", { name: "Collapse thread" }))).toBe(true);
    expect(Boolean(view.getByRole("button", { name: "Load replies (3)" }))).toBe(true);

    fireEvent.click(view.getByRole("button", { name: "Collapse thread" }));

    expect(view.queryByText("Visible parent")).toBeNull();
    expect(view.queryByRole("button", { name: "Load replies (3)" })).toBeNull();
    expect(view.getByRole("button", { name: "Expand thread" }).textContent).toContain("3 replies");

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
