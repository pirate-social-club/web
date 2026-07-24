import "@/test/setup-runtime";

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import {
  isVideoLoopReplay,
  VideoFeed,
  type VideoFeedImpression,
  watchedPlaybackDelta,
} from "./video-feed";
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

function manyFeedItems(count = 7): VideoFeedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    ...item,
    id: `video-${index}`,
    media: { ...item.media, src: `https://media.test/video-${index}.mp4` },
  }));
}

function mockVideoPlay(play: () => Promise<void>): () => void {
  const prototype = Object.getPrototypeOf(document.createElement("video")) as object;
  const previous = Object.getOwnPropertyDescriptor(prototype, "play");
  Object.defineProperty(prototype, "play", { configurable: true, value: play });
  return () => {
    if (previous) Object.defineProperty(prototype, "play", previous);
    else Reflect.deleteProperty(prototype, "play");
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

beforeEach(() => {
  window.localStorage.setItem("pirate.video-feed.muted", "true");
});

describe("VideoFeed", () => {
  test("counts only an end-to-start wrap as a replay", () => {
    expect(isVideoLoopReplay({ currentTime: 0.2, duration: 10, previousTime: 9.4 })).toBe(true);
    expect(isVideoLoopReplay({ currentTime: 2, duration: 10, previousTime: 6 })).toBe(false);
    expect(isVideoLoopReplay({ currentTime: 0.2, duration: Number.NaN, previousTime: 9.4 })).toBe(false);
    expect(isVideoLoopReplay({ currentTime: 0.2, duration: 10, previousTime: 4 })).toBe(false);
  });

  test("counts watched time without crediting seeks or restored positions", () => {
    expect(watchedPlaybackDelta(0.5, 0)).toBe(0.5);
    expect(watchedPlaybackDelta(1.1, 0.5)).toBeCloseTo(0.6);
    expect(watchedPlaybackDelta(9, 1.1)).toBe(0);
    expect(watchedPlaybackDelta(2, 9)).toBe(0);
  });

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

  test("renders canonical handles verbatim on an explicit dark media stage", () => {
    const view = render(<VideoFeed items={[{ ...item, publisher: { handle: "aveestel.pirate", kind: "profile" } }]} />);

    expect(view.getByText("aveestel.pirate")).toBeTruthy();
    expect(view.queryByText("@aveestel.pirate")).toBeNull();
    expect(view.container.innerHTML).toContain("bg-black");
    expect(view.container.innerHTML).not.toContain("bg-foreground");
  });

  test("places the publisher avatar at the top of the action rail", () => {
    const view = render(<VideoFeed items={[item]} />);
    const publisherAvatar = view.getByRole("img", { name: "Publisher songs.pirate" });
    const likeAction = view.getByRole("button", { name: "Like" });
    const rail = publisherAvatar.parentElement!;

    expect(publisherAvatar.hasAttribute("data-video-publisher-avatar")).toBe(true);
    expect(rail.children[0]).toBe(publisherAvatar);
    expect(rail.children[1]?.contains(likeAction)).toBe(true);
    expect(view.getByText("songs.pirate").parentElement?.querySelector("[data-video-publisher-avatar]")).toBeNull();
  });

  test("separates lightweight social actions from capability actions", () => {
    const view = render(<VideoFeed items={[item]} onComment={() => undefined} onKaraoke={() => undefined} onShare={() => undefined} onStudy={() => undefined} />);

    for (const label of ["Like", "Comments", "Share"]) {
      const action = view.getByRole("button", { name: label });
      expect(action.closest("[data-video-action-tone]")?.getAttribute("data-video-action-tone")).toBe("social");
      expect(action.className).toContain("bg-transparent");
    }

    for (const label of ["Study", "Sing"]) {
      const action = view.getByRole("button", { name: label });
      expect(action.closest("[data-video-action-tone]")?.getAttribute("data-video-action-tone")).toBe("action");
      expect(action.className).toContain("bg-card/85");
    }
  });

  test("opens public comments without routing through the membership gate", () => {
    let comments = 0;
    let gates = 0;
    const view = render(
      <VideoFeed
        items={[{ ...item, interactionGate: "membership_required" }]}
        onComment={() => { comments += 1; }}
        onGateRequired={() => { gates += 1; }}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Comments" }));

    expect(comments).toBe(1);
    expect(gates).toBe(0);
  });

  test("uses outline rail icons by default and a red filled heart when liked", () => {
    const view = render(<VideoFeed items={[{ ...item, liked: false }]} onBook={() => {}} />);
    const idleLike = view.getByRole("button", { name: "Like" });

    expect(idleLike.getAttribute("data-active")).toBeNull();
    expect(idleLike.querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("regular");
    expect(view.getByRole("button", { name: "Comments" }).querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("regular");
    expect(view.getByRole("button", { name: "Share" }).querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("regular");

    view.rerender(<VideoFeed items={[{ ...item, liked: true }]} />);
    const liked = view.getByRole("button", { name: "Like" });

    expect(liked.getAttribute("data-active")).toBe("true");
    expect(liked.className).toContain("data-[active=true]:text-destructive");
    expect(liked.querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("fill");
  });

  test("insets overlaid controls clear of the fixed mobile chrome", () => {
    const view = render(<VideoFeed items={[{ ...item, boostEligibility: "eligible" }]} />);
    const slide = view.container.querySelector("article")!;

    // The mobile header is h-16, not var(--header-height); the footer nav is var(--header-height).
    expect(slide.className).toContain("[--feed-chrome-top:calc(env(safe-area-inset-top)+4rem)]");
    expect(slide.className).toContain("[--feed-chrome-bottom:calc(env(safe-area-inset-bottom)+var(--header-height))]");
    // On md+ the chrome is in flow and already excluded from the feed box, so the insets collapse.
    expect(slide.className).toContain("md:[--feed-chrome-top:0px]");
    expect(slide.className).toContain("md:[--feed-chrome-bottom:0px]");

    expect(view.queryByLabelText("Turn sound on")).toBeNull();
    // Overflow is inset via the rail's bottom offset now that it no longer floats over the media;
    // its placement is covered by "keeps overflow in the rail on every slide".
    expect(view.getByRole("button", { name: "Like" }).closest("div.absolute")!.className)
      .toContain("bottom-[calc(var(--feed-chrome-bottom)+1.25rem)]");
  });

  test("keeps the media frame full-bleed rather than letterboxing it away from the chrome", () => {
    const view = render(<VideoFeed items={[item]} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    const frame = video.parentElement!;

    expect(video.className).toContain("size-full");
    expect(frame.className).toContain("h-full");
    expect(frame.className).toContain("w-full");
    // Insetting the frame itself reproduces the letterboxed layout under a different name.
    expect(frame.className).not.toContain("--feed-chrome");
    expect(video.className).not.toContain("--feed-chrome");
  });

  test("sizes portrait media from its stage container instead of the viewport width", () => {
    const view = render(<VideoFeed items={[item]} />);
    const frame = view.container.querySelector<HTMLVideoElement>("video")!.parentElement!;
    const stage = frame.parentElement!;

    expect(stage.className).toContain("[container-type:inline-size]");
    expect(frame.className).toContain("177.7778cqw");
    expect(frame.className).toContain("md:aspect-[9/16]");
    expect(frame.className).not.toContain("md:w-[min(49.5dvh");
  });

  test("sizes landscape media from its stage container instead of the viewport width", () => {
    const landscapeItem = { ...item, media: { ...item.media, orientation: "landscape" as const } };
    const view = render(<VideoFeed items={[landscapeItem]} />);
    const frame = view.container.querySelector<HTMLVideoElement>("video")!.parentElement!;

    expect(frame.className).toContain("40.5cqw");
    expect(frame.className).toContain("md:aspect-video");
    expect(frame.className).not.toContain("72vw");
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

  test("opens a linked song and preserves playback state", () => {
    const calls: unknown[] = [];
    const linkedItem = { ...item, song: { artist: "Britney Spears", songHref: "/p/pst_toxic", title: "Toxic" } };
    const view = render(<VideoFeed initialMuted items={[linkedItem]} onSong={(songItem, state) => calls.push({ songItem, state })} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 5 });

    fireEvent.click(view.getByRole("button", { name: "Open Toxic by Britney Spears" }));

    expect(calls).toEqual([{ songItem: linkedItem, state: { muted: true, paused: false, playbackSeconds: 5 } }]);
  });

  test("exposes booking only for a server-stated bookable publisher", () => {
    const calls: unknown[] = [];
    const view = render(
      <VideoFeed
        initialMuted
        items={[{
          ...item,
          booking: {
            basePriceCents: 5000,
            currency: "USDC",
            hasAvailableSlot: true,
            hostUserId: "usr_host",
            startingPriceCents: 3500,
          },
        }]}
        onBook={(bookedItem, state) => calls.push({ bookedItem, state })}
      />,
    );
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 8 });

    fireEvent.click(view.getByRole("button", { name: "Book" }));

    expect(view.getByRole("button", { name: "Book" })).toBeTruthy();
    expect(view.getByText("$35+")).toBeTruthy();
    expect(view.queryByText(/USDC/u)).toBeNull();
    expect(calls).toEqual([{
      bookedItem: {
        ...item,
        booking: {
          basePriceCents: 5000,
          currency: "USDC",
          hasAvailableSlot: true,
          hostUserId: "usr_host",
          startingPriceCents: 3500,
        },
      },
      state: { muted: true, paused: false, playbackSeconds: 8 },
    }]);
  });

  test("omits booking when the publisher is not marked bookable", () => {
    const view = render(<VideoFeed items={[item]} />);

    expect(view.queryByRole("button", { name: "Book" })).toBeNull();
  });

  test("omits booking when the canonical discovery window has no available slot", () => {
    const view = render(
      <VideoFeed
        items={[{
          ...item,
          booking: {
            basePriceCents: 5000,
            currency: "USDC",
            hasAvailableSlot: false,
            hostUserId: "usr_host",
            startingPriceCents: null,
          },
        }]}
        onBook={() => {}}
      />,
    );

    expect(view.queryByRole("button", { name: "Book" })).toBeNull();
    expect(view.queryByText("$50+")).toBeNull();
  });

  test("reports playback state when a learning action launches", () => {
    const calls: unknown[] = [];
    const view = render(<VideoFeed initialMuted items={[item]} onStudy={(_item, state) => calls.push(state)} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 12.5 });

    fireEvent.click(view.getByRole("button", { name: "Study" }));

    expect(calls).toEqual([{ muted: true, paused: false, playbackSeconds: 12.5 }]);
  });

  test("only clears effective mute after unmuted playback resolves", async () => {
    const restorePlay = mockVideoPlay(() => Promise.reject(new Error("blocked")));
    try {
      const view = render(<VideoFeed initialMuted={false} items={[item]} />);
      const video = view.container.querySelector<HTMLVideoElement>("video")!;
      await act(async () => { await Promise.resolve(); });
      Object.defineProperty(video, "play", { configurable: true, value: () => Promise.resolve() });

      fireEvent.click(view.getByRole("button", { name: "Tap for sound" }));
      await act(async () => { await Promise.resolve(); });

      expect(video.muted).toBe(false);
      expect(window.localStorage.getItem("pirate.video-feed.muted")).toBe("false");
    } finally {
      restorePlay();
    }
  });

  test("restores a sound-on preference by attempting unmuted playback on activation", async () => {
    const restorePlay = mockVideoPlay(() => Promise.resolve());
    try {
      const view = render(<VideoFeed initialMuted={false} items={[item]} />);
      const video = view.container.querySelector<HTMLVideoElement>("video")!;

      await act(async () => { await Promise.resolve(); });

      expect(video.muted).toBe(false);
      expect(window.localStorage.getItem("pirate.video-feed.muted")).toBe("false");
    } finally {
      restorePlay();
    }
  });

  test("stays effectively muted when unmuted playback is rejected", async () => {
    const restorePlay = mockVideoPlay(() => Promise.reject(new Error("blocked")));
    try {
      const view = render(<VideoFeed initialMuted={false} items={[item]} />);
      const video = view.container.querySelector<HTMLVideoElement>("video")!;

      await act(async () => { await Promise.resolve(); });

      expect(video.muted).toBe(true);
      expect(window.localStorage.getItem("pirate.video-feed.muted")).toBe("true");
    } finally {
      restorePlay();
    }
  });

  test("shows the sound fallback prompt only once while scrolling the session", async () => {
    const restorePlay = mockVideoPlay(() => Promise.reject(new Error("blocked")));
    try {
      const view = render(<VideoFeed initialMuted={false} items={feedItems()} />);
      const feed = view.getByLabelText("Video feed") as HTMLDivElement;
      Object.defineProperty(feed, "clientHeight", { configurable: true, value: 700 });
      await act(async () => { await Promise.resolve(); });
      expect(view.getByRole("button", { name: "Tap for sound" })).toBeTruthy();

      feed.scrollTop = 700;
      fireEvent.scroll(feed);
      await act(async () => { await Promise.resolve(); });

      expect(view.queryByRole("button", { name: "Tap for sound" })).toBeNull();
    } finally {
      restorePlay();
    }
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

  test("reports bounded impression metrics when the active slide changes", () => {
    const calls: Array<{ id: string; impression: VideoFeedImpression }> = [];
    const view = render(
      <VideoFeed
        items={feedItems()}
        onImpression={(activeItem, impression) => calls.push({ id: activeItem.id, impression })}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    const activeVideo = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(activeVideo, "duration", { configurable: true, value: 10 });
    Object.defineProperty(activeVideo, "currentTime", { configurable: true, writable: true, value: 0.5 });
    fireEvent.timeUpdate(activeVideo);
    activeVideo.currentTime = 1;
    fireEvent.timeUpdate(activeVideo);
    activeVideo.currentTime = 9;
    fireEvent.timeUpdate(activeVideo);
    activeVideo.currentTime = 1;
    fireEvent.timeUpdate(activeVideo);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    fireEvent.scroll(feed);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe("one");
    expect(calls[0]?.impression).toMatchObject({
      completionRatio: 0.1,
      durationSeconds: 10,
      muted: true,
      playbackSeconds: 1,
      position: 0,
      replayCount: 1,
      soundOnAtAnyPoint: false,
    });
    expect(calls[0]?.impression.dwellMs).toBeGreaterThanOrEqual(0);
  });

  test("mounts media only near the active slide without removing snap shells", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);

    expect(view.container.querySelectorAll("article")).toHaveLength(items.length);
    expect(view.container.querySelectorAll("video")).toHaveLength(3);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("preload")))
      .toEqual(["auto", "auto", "metadata"]);
    expect(view.container.innerHTML).not.toContain("video-3.mp4");
  });

  test("uses a black placeholder instead of an empty image source when distant media has no poster", () => {
    const items = manyFeedItems().map((feedItem) => ({
      ...feedItem,
      media: { ...feedItem.media, posterSrc: "" },
    }));
    const view = render(<VideoFeed items={items} />);

    expect(view.container.querySelectorAll("article")).toHaveLength(items.length);
    expect(view.container.querySelectorAll("video")).toHaveLength(3);
    expect(view.container.querySelectorAll("img[src='']")).toHaveLength(0);
  });

  test("moves the media window while preserving every full-height slide shell", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 300 });

    fireEvent.scroll(feed);

    expect(view.container.querySelectorAll("article")).toHaveLength(items.length);
    expect(view.container.querySelectorAll("video")).toHaveLength(5);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("src")))
      .toEqual([
        "https://media.test/video-1.mp4",
        "https://media.test/video-2.mp4",
        "https://media.test/video-3.mp4",
        "https://media.test/video-4.mp4",
        "https://media.test/video-5.mp4",
    ]);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("preload")))
      .toEqual(["metadata", "auto", "auto", "auto", "metadata"]);
  });

  test("omits booking when the container supplies no booking handler", () => {
    const view = render(<VideoFeed items={[{
      ...item,
      booking: {
        basePriceCents: 3500,
        currency: "USDC",
        hasAvailableSlot: true,
        hostUserId: "usr_host",
        startingPriceCents: 2500,
      },
    }]} />);

    expect(view.queryByRole("button", { name: "Book" })).toBeNull();
  });

  test("pauses the item whose booking overlay is open and resumes it on dismiss", () => {
    const bookable = {
      ...item,
      booking: {
        basePriceCents: 3500,
        currency: "USDC" as const,
        hasAvailableSlot: true,
        hostUserId: "usr_host",
        startingPriceCents: 2500,
      },
    };
    const view = render(<VideoFeed items={[bookable]} onBook={() => {}} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    const paused: string[] = [];
    const played: string[] = [];
    Object.defineProperty(video, "pause", { configurable: true, value: () => { paused.push("pause"); } });
    Object.defineProperty(video, "play", { configurable: true, value: () => { played.push("play"); return undefined; } });

    view.rerender(<VideoFeed externallyPausedItemId={bookable.id} items={[bookable]} onBook={() => {}} />);
    expect(paused.length).toBeGreaterThan(0);

    // Dismissing returns the item to its prior (playing) state rather than leaving it stuck.
    view.rerender(<VideoFeed items={[bookable]} onBook={() => {}} />);
    expect(played.length).toBeGreaterThan(0);
  });

  test("keeps an intentional pause after the booking overlay is dismissed", () => {
    const bookable = {
      ...item,
      booking: {
        basePriceCents: 3500,
        currency: "USDC" as const,
        hasAvailableSlot: true,
        hostUserId: "usr_host",
        startingPriceCents: 2500,
      },
    };
    const view = render(
      <VideoFeed externallyPausedItemId={bookable.id} initialPaused initialItemId={bookable.id} items={[bookable]} onBook={() => {}} />,
    );
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    const played: string[] = [];
    Object.defineProperty(video, "play", { configurable: true, value: () => { played.push("play"); return undefined; } });

    view.rerender(
      <VideoFeed initialPaused initialItemId={bookable.id} items={[bookable]} onBook={() => {}} />,
    );

    expect(played).toEqual([]);
  });

  test("keeps overflow in the rail on every slide, not floating over the media", () => {
    const view = render(<VideoFeed items={[item]} />);
    const trigger = view.getByLabelText("More video actions");
    const rail = view.getByRole("button", { name: "Like" }).closest("div.absolute");

    // Consistent placement is what keeps the rail the same height between videos.
    expect(trigger.closest("div.absolute")).toBe(rail);
    // The old treatment pinned it to the media's top-right, under the app chrome.
    expect(trigger.closest("div")?.className ?? "").not.toContain("--feed-chrome-top");
  });

  test("renders overflow even when the item is not boost eligible", () => {
    const view = render(<VideoFeed items={[{ ...item, boostEligibility: "unavailable" }]} />);
    expect(view.getByLabelText("More video actions")).toBeTruthy();
  });

  test("does not pause playback merely because the non-modal overflow opens", () => {
    const view = render(<VideoFeed items={[item]} />);

    fireEvent.click(view.getByLabelText("More video actions"));

    expect(view.queryByRole("button", { name: "Play video" })).toBeNull();
  });

  test("rings the publisher avatar and uses a neutral fallback over media", () => {
    const view = render(<VideoFeed items={[{ ...item, publisher: { handle: "songs.pirate", kind: "community" } }]} />);
    const avatar = view.container.querySelector("[data-video-publisher-avatar]")!;

    expect(avatar.className).toContain("ring-2");
    // The generated identicon is a data: URI; the neutral fallback must replace it on this surface.
    expect(avatar.innerHTML).not.toContain("data:image/svg+xml");
    expect(avatar.querySelector("svg")).toBeTruthy();
  });

  test("renders an actionable join badge on the publisher avatar", () => {
    let selected: VideoFeedItem | null = null;
    const joinItem: VideoFeedItem = {
      ...item,
      publisher: {
        handle: "songs.pirate",
        kind: "community",
        relationship: {
          active: false,
          kind: "join",
          label: "Join community",
        },
      },
    };
    const view = render(
      <VideoFeed
        items={[joinItem]}
        onPublisherRelationship={(nextItem) => { selected = nextItem; }}
      />,
    );

    const join = view.getByRole("button", { name: "Join community" });
    expect(join.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(join);
    expect(selected).toBe(joinItem);
  });

  test("shows joined publisher state without allowing a duplicate join", () => {
    const view = render(<VideoFeed items={[{
      ...item,
      publisher: {
        handle: "songs.pirate",
        kind: "community",
        relationship: {
          active: true,
          disabled: true,
          kind: "join",
          label: "Joined community",
        },
      },
    }]} />);

    const joined = view.getByRole("button", { name: "Joined community" });
    expect(joined.getAttribute("aria-pressed")).toBe("true");
    expect((joined as HTMLButtonElement).disabled).toBe(true);
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
