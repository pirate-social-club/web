import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import { VideoFeed } from "./video-feed";
import type { VideoFeedItem } from "./video-feed.types";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ addEventListener() {}, matches: false, removeEventListener() {} }),
  });
}

const item: VideoFeedItem = {
  id: "video_test",
  publisher: { handle: "songs.pirate", kind: "community" },
  commentCount: 2,
  karaoke: "ready",
  likeCount: 4,
  media: {
    orientation: "portrait",
    posterSrc: "https://media.test/poster.webp",
    src: "https://media.test/private.mp4",
  },
  study: "ready",
  viewerState: "allowed",
};

function feedItems(): VideoFeedItem[] {
  return [
    { ...item, id: "one", media: { ...item.media, src: "https://media.test/one.mp4" } },
    { ...item, id: "two", media: { ...item.media, src: "https://media.test/two.mp4" } },
    { ...item, id: "three", media: { ...item.media, src: "https://media.test/three.mp4" } },
  ];
}

afterEach(() => {
  cleanup();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

describe("VideoFeed", () => {
  test("redacts the video source from age-blocked markup", () => {
    const view = render(<VideoFeed items={[{ ...item, viewerState: "age_proof_required" }]} />);
    expect(view.container.innerHTML).not.toContain("private.mp4");
    expect(view.getByText("Age verification required")).toBeTruthy();
  });

  test("omits learning actions for an unlinked video", () => {
    const view = render(<VideoFeed items={[{ ...item, karaoke: "unavailable", study: "unavailable" }]} />);
    expect(view.queryByRole("button", { name: "Study" })).toBeNull();
    expect(view.queryByRole("button", { name: "Sing" })).toBeNull();
  });

  test("annotates existing learning actions and exposes boost only from server-stated eligibility", () => {
    const rewarded = {
      ...item,
      boostEligibility: "eligible" as const,
      rewards: { karaoke: { amountLabel: "$2" }, study: { amountLabel: "$1" } },
    };
    const view = render(<VideoFeed items={[rewarded]} />);

    expect(view.getByLabelText("Earn $1")).toBeTruthy();
    expect(view.getByLabelText("Earn $2")).toBeTruthy();
    expect(view.getByLabelText("More video actions")).toBeTruthy();
  });

  test("reports playback state when a learning action launches", () => {
    const calls: unknown[] = [];
    const view = render(<VideoFeed initialMuted={false} items={[item]} onStudy={(_item, state) => calls.push(state)} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 12.5 });

    fireEvent.click(view.getByRole("button", { name: "Study" }));

    expect(calls).toEqual([{ muted: false, paused: false, playbackSeconds: 12.5 }]);
  });

  test("restores the selected slide and intentional pause", () => {
    const view = render(<VideoFeed initialItemId="two" initialPaused items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;

    expect(feed.dataset.activeIndex).toBe("1");
    expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);
  });

  test("keeps keyboard navigation scoped to the focused feed", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed");
    const calls: ScrollToOptions[] = [];
    Object.defineProperty(feed, "scrollTo", {
      configurable: true,
      value: (options: ScrollToOptions) => calls.push(options),
    });
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 640 });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(calls).toHaveLength(0);

    feed.focus();
    const keyEvent = document.createEvent("Event");
    keyEvent.initEvent("keydown", true, true);
    Object.defineProperty(keyEvent, "key", { value: "ArrowDown" });
    act(() => feed.dispatchEvent(keyEvent));
    expect(feed.dataset.activeIndex).toBe("1");
    expect(calls).toEqual([{ behavior: "smooth", top: 640 }]);
  });

  test("keeps an intentional pause when the item leaves and re-enters the active slot", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    fireEvent.click(view.getAllByRole("button", { name: "Pause video" })[0]!);
    expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    fireEvent.scroll(feed);
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
    fireEvent.scroll(feed);

    expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);
  });

  test("reports the active slide for adjacent capability prefetch", () => {
    const calls: string[] = [];
    const view = render(
      <VideoFeed
        items={feedItems()}
        onActiveItemChange={(activeItem) => calls.push(activeItem.id)}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    expect(calls).toEqual(["one"]);
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    fireEvent.scroll(feed);
    expect(calls).toEqual(["one", "two"]);
  });

  test("preloads only the active and adjacent playable items", () => {
    const blocked = { ...item, id: "blocked", viewerState: "age_proof_required" as const };
    const view = render(<VideoFeed items={[feedItems()[0]!, blocked, feedItems()[2]!]} />);
    const videos = view.container.querySelectorAll("video");

    expect(videos).toHaveLength(2);
    expect(videos[0]?.getAttribute("preload")).toBe("auto");
    expect(videos[1]?.getAttribute("preload")).toBe("metadata");
    expect(view.container.innerHTML).not.toContain("private.mp4");
  });

  test("pauses active playback while the document is hidden", () => {
    const calls: HTMLVideoElement[] = [];
    const view = render(<VideoFeed items={feedItems()} />);
    const activeVideo = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(activeVideo, "pause", {
      configurable: true,
      value: () => { calls.push(activeVideo); },
    });

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const event = document.createEvent("Event");
    event.initEvent("visibilitychange", false, false);
    act(() => document.dispatchEvent(event));

    expect(calls.length).toBeGreaterThan(0);
  });
});
