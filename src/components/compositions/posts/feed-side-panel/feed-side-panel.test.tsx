import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import {
  FEED_DOCK_QUERY,
  feedPanelBlocksPlayback,
  FeedPanelLayout,
  FeedSidePanel,
} from "./feed-side-panel";

afterEach(cleanup);

describe("FeedSidePanel", () => {
  test("does not reserve an empty dock column while the panel is closed", () => {
    const view = render(<FeedPanelLayout><article /></FeedPanelLayout>);
    expect(view.container.firstElementChild?.className).not.toContain("26rem");
  });

  test("reserves the desktop dock for widths that leave the media stage usable", () => {
    expect(FEED_DOCK_QUERY).toBe("(min-width: 1280px)");
    const view = render(<FeedPanelLayout panel={<aside />}><article /></FeedPanelLayout>);
    expect(view.container.firstElementChild?.className).toContain("xl:grid-cols-");
    expect(view.container.firstElementChild?.className).not.toContain("lg:grid-cols-");
  });

  test("keeps comments playing while booking retains its pause policy", () => {
    expect(feedPanelBlocksPlayback({ itemId: "video-1", kind: "comments", postId: "post-1" }, "video-1")).toBe(false);
    expect(feedPanelBlocksPlayback({
      startingPriceCents: 1_000,
      handle: "host",
      hostUserId: "host-1",
      itemId: "video-1",
      kind: "booking",
      playback: { muted: false, paused: false, playbackSeconds: 12 },
      sourceCommunityId: null,
    }, "video-1")).toBe(true);
  });

  test("keeps the desktop panel outside the feed stage and owns Escape", () => {
    const desktopMedia = { addEventListener() {}, matches: true, removeEventListener() {} };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => desktopMedia,
    });
    let closes = 0;
    let feedKeys = 0;
    let composerFocuses = 0;
    let feedFocuses = 0;
    const composerFocusRef = { current: { focus: () => { composerFocuses += 1; } } as HTMLElement };
    const feedFocusRef = { current: { focus: () => { feedFocuses += 1; } } as HTMLElement };
    function Fixture() {
      return (
      <FeedPanelLayout
        panel={(
          <FeedSidePanel
            closeLabel="Close"
            initialFocusRef={composerFocusRef}
            onOpenChange={(open) => { if (!open) closes += 1; }}
            open
            returnFocusRef={feedFocusRef}
            title="Comments"
          >
            <div aria-label="Write a comment" role="textbox" tabIndex={0} />
          </FeedSidePanel>
        )}
      >
        <div data-testid="feed" onKeyDown={() => { feedKeys += 1; }} tabIndex={-1}>
          <article />
          <article />
        </div>
      </FeedPanelLayout>
      );
    }
    const view = render(<Fixture />);

    expect(view.container.querySelectorAll("article")).toHaveLength(2);
    const composer = view.getByRole("textbox", { name: "Write a comment" });
    expect(composerFocuses).toBe(1);
    const press = (key: string) => {
      const event = new window.Event("keydown", { bubbles: true });
      Object.defineProperty(event, "key", { value: key });
      composer.dispatchEvent(event);
    };
    press("j");
    expect(feedKeys).toBe(0);
    press("Escape");
    expect(closes).toBe(1);
    expect(feedFocuses).toBe(1);
  });
});
