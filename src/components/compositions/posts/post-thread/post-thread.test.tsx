import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { POSTS_BY_ID } from "@/app/mocks";
import { UiLocaleProvider } from "@/lib/ui-locale";
import { installDomGlobals } from "@/test/setup-dom";
import { PostThread } from "./post-thread";

const { window } = installDomGlobals();
window.HTMLElement.prototype.scrollIntoView = () => undefined;
Object.defineProperty(window.HTMLElement.prototype, "attachEvent", {
  configurable: true,
  value: () => undefined,
});
Object.defineProperty(window.HTMLElement.prototype, "detachEvent", {
  configurable: true,
  value: () => undefined,
});
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});
Object.defineProperty(globalThis, "matchMedia", {
  configurable: true,
  value: window.matchMedia,
});

function renderThread(onReplyIntent: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  return render(
    <UiLocaleProvider dir="ltr" locale="en">
      <PostThread
        comments={[]}
        onReplyIntent={onReplyIntent}
        onRootReplySubmit={() => "submitted"}
        post={POSTS_BY_ID.pst_01_weekly_listening}
      />
    </UiLocaleProvider>,
    { baseElement: container, container },
  );
}

describe("PostThread reply intent", () => {
  test("preserves the click after pointer focus opens the root composer", () => {
    let replyIntents = 0;
    const view = renderThread(() => {
      replyIntents += 1;
    });
    const replyInput = view.getByRole("textbox", { name: "Reply" });

    fireEvent.pointerDown(replyInput);
    fireEvent.focus(replyInput);
    expect(replyIntents).toBe(0);
    expect(view.queryByRole("button", { name: "Bold" })).toBeNull();

    fireEvent.pointerUp(replyInput);
    fireEvent.click(replyInput);

    expect(replyIntents).toBe(1);
    expect(view.getByRole("button", { name: "Bold" })).not.toBeNull();
    view.unmount();
  });

  test("opens the composer without auth intent on keyboard focus", () => {
    let replyIntents = 0;
    const view = renderThread(() => {
      replyIntents += 1;
    });

    fireEvent.focus(view.getByRole("textbox", { name: "Reply" }));

    expect(replyIntents).toBe(0);
    expect(view.getByRole("button", { name: "Bold" })).not.toBeNull();
    view.unmount();
  });
});
