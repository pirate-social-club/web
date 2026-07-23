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

  test("renders canonical handles verbatim on an explicit dark media stage", () => {
    const view = render(<VideoFeed items={[{ ...item, publisher: { handle: "aveestel.pirate", kind: "profile" } }]} />);

    expect(view.getByText("aveestel.pirate")).toBeTruthy();
    expect(view.queryByText("@aveestel.pirate")).toBeNull();
    expect(view.container.innerHTML).toContain("bg-black");
    expect(view.container.innerHTML).not.toContain("bg-foreground");
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

    expect(view.getByLabelText("Turn sound on").className).toContain("top-[calc(var(--feed-chrome-top)+0.75rem)]");
    expect(view.getByLabelText("More video actions").parentElement!.className)
      .toContain("top-[calc(var(--feed-chrome-top)+0.75rem)]");
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
    const view = render(<VideoFeed initialMuted={false} items={[linkedItem]} onSong={(songItem, state) => calls.push({ songItem, state })} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 5 });

    fireEvent.click(view.getByRole("button", { name: "Open Toxic by Britney Spears" }));

    expect(calls).toEqual([{ songItem: linkedItem, state: { muted: false, paused: false, playbackSeconds: 5 } }]);
  });

  test("exposes booking only for a server-stated bookable publisher", () => {
    const calls: unknown[] = [];
    const view = render(
      <VideoFeed
        initialMuted={false}
        items={[{ ...item, booking: { basePriceCents: 3500, currency: "USDC", hostUserId: "usr_host" } }]}
        onBook={(bookedItem, state) => calls.push({ bookedItem, state })}
      />,
    );
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    Object.defineProperty(video, "currentTime", { configurable: true, value: 8 });

    fireEvent.click(view.getByRole("button", { name: "Book" }));

    expect(view.getByText("35.00 USDC")).toBeTruthy();
    expect(calls).toEqual([{ bookedItem: { ...item, booking: { basePriceCents: 3500, currency: "USDC", hostUserId: "usr_host" } }, state: { muted: false, paused: false, playbackSeconds: 8 } }]);
  });

  test("omits booking when the publisher is not marked bookable", () => {
    const view = render(<VideoFeed items={[item]} />);

    expect(view.queryByRole("button", { name: "Book" })).toBeNull();
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

  test("omits booking when the container supplies no booking handler", () => {
    const view = render(<VideoFeed items={[{ ...item, booking: { basePriceCents: 3500, currency: "USDC", hostUserId: "usr_host" } }]} />);

    expect(view.queryByRole("button", { name: "Book" })).toBeNull();
  });

  test("pauses the item whose booking overlay is open and resumes it on dismiss", () => {
    const bookable = { ...item, booking: { basePriceCents: 3500, currency: "USDC" as const, hostUserId: "usr_host" } };
    const view = render(<VideoFeed items={[bookable]} onBook={() => {}} />);
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    const paused: string[] = [];
    const played: string[] = [];
    Object.defineProperty(video, "pause", { configurable: true, value: () => { paused.push("pause"); } });
    Object.defineProperty(video, "play", { configurable: true, value: () => { played.push("play"); return undefined; } });

    view.rerender(<VideoFeed bookingOpenItemId={bookable.id} items={[bookable]} onBook={() => {}} />);
    expect(paused.length).toBeGreaterThan(0);

    // Dismissing returns the item to its prior (playing) state rather than leaving it stuck.
    view.rerender(<VideoFeed items={[bookable]} onBook={() => {}} />);
    expect(played.length).toBeGreaterThan(0);
  });

  test("keeps an intentional pause after the booking overlay is dismissed", () => {
    const bookable = { ...item, booking: { basePriceCents: 3500, currency: "USDC" as const, hostUserId: "usr_host" } };
    const view = render(
      <VideoFeed bookingOpenItemId={bookable.id} initialPaused initialItemId={bookable.id} items={[bookable]} onBook={() => {}} />,
    );
    const video = view.container.querySelector<HTMLVideoElement>("video")!;
    const played: string[] = [];
    Object.defineProperty(video, "play", { configurable: true, value: () => { played.push("play"); return undefined; } });

    view.rerender(
      <VideoFeed initialPaused initialItemId={bookable.id} items={[bookable]} onBook={() => {}} />,
    );

    expect(played).toEqual([]);
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
