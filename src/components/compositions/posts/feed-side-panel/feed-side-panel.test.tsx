import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { FeedPanelLayout, FeedSidePanel } from "./feed-side-panel";

afterEach(cleanup);

describe("FeedSidePanel", () => {
  test("keeps the desktop panel outside the feed stage and owns Escape", () => {
    const desktopMedia = { addEventListener() {}, matches: true, removeEventListener() {} };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => desktopMedia,
    });
    let closes = 0;
    let feedKeys = 0;
    const view = render(
      <FeedPanelLayout
        panel={(
          <FeedSidePanel closeLabel="Close" onOpenChange={(open) => { if (!open) closes += 1; }} open title="Comments">
            <div aria-label="Write a comment" role="textbox" tabIndex={0} />
          </FeedSidePanel>
        )}
      >
        <div data-testid="feed" onKeyDown={() => { feedKeys += 1; }}>
          <article />
          <article />
        </div>
      </FeedPanelLayout>,
    );

    expect(view.container.querySelectorAll("article")).toHaveLength(2);
    const composer = view.getByRole("textbox", { name: "Write a comment" });
    const press = (key: string) => {
      const event = new window.Event("keydown", { bubbles: true });
      Object.defineProperty(event, "key", { value: key });
      composer.dispatchEvent(event);
    };
    press("j");
    expect(feedKeys).toBe(0);
    press("Escape");
    expect(closes).toBe(1);
  });
});
