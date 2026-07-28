import "@/test/setup-runtime";

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import {
  classifyVideoPlayRejection,
  compactCount,
  didVideoLongPressMove,
  isVideoLoopReplay,
  recordWarmedVideoSrc,
  shouldRenderVideoFeedSlide,
  VIDEO_FEED_MAX_WARMED_SRCS,
  VIDEO_FEED_PREFETCH_AHEAD_BYTES,
  videoFeedPrefetchAheadSrc,
  videoFeedPrefetchRangeHeader,
  videoImpressionEventId,
  videoProgressKeyAction,
  VideoFeed,
  type VideoFeedImpression,
  type VideoFeedPlaybackState,
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

describe("compactCount", () => {
  test("formats rail counters in the viewer's locale instead of hard-locked English", () => {
    const arabic = compactCount(51900, "ar");
    expect(arabic).toBe(
      new Intl.NumberFormat("ar", { maximumFractionDigits: 1, notation: "compact" }).format(51900),
    );
    expect(arabic).not.toBe(compactCount(51900, "en"));
    expect(compactCount(51900)).toBe(compactCount(51900, "en"));
  });
});

describe("video impression identity and playback failures", () => {
  test("builds one deterministic id from the feed, item, and committed activation sequence", () => {
    expect(videoImpressionEventId("feed_test", "post_test", 3))
      .toBe("evt_video_feed_test_post_test_3");
  });

  test("separates autoplay policy, abort, and media playback failures", () => {
    expect(classifyVideoPlayRejection(new DOMException("blocked", "NotAllowedError")))
      .toBe("autoplay_blocked");
    expect(classifyVideoPlayRejection(new DOMException("interrupted", "AbortError"))).toBeNull();
    expect(classifyVideoPlayRejection(new DOMException("decode", "NotSupportedError")))
      .toBe("playback_error");
  });
});

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

function settleFeedScroll(feed: HTMLDivElement): void {
  fireEvent.scroll(feed);
  fireEvent(feed, new window.Event("scrollend"));
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

type PrefetchCall = { priority: string | null; range: string | null; signal: AbortSignal | null; src: string };

function stubPrefetchFetch(
  respond: (src: string) => Promise<Response> = () => Promise.resolve(new Response(null, { status: 206 })),
): PrefetchCall[] {
  const calls: PrefetchCall[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      priority: (init as { priority?: string } | undefined)?.priority ?? null,
      range: new Headers(init?.headers).get("Range"),
      signal: init?.signal ?? null,
      src: String(input),
    });
    return respond(String(input));
  }) as typeof fetch;
  return calls;
}

const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  window.localStorage.setItem("pirate.video-feed.muted", "true");
  // Keep tests hermetic without surfacing network state mid-test: a never-settling fetch means
  // no component (follow-state hook, forward prefetch) observes a resolution or rejection here.
  globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
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

  test("cancels a video long press only after meaningful pointer movement", () => {
    expect(didVideoLongPressMove({ x: 100, y: 200 }, { x: 106, y: 208 })).toBe(false);
    expect(didVideoLongPressMove({ x: 100, y: 200 }, { x: 111, y: 200 })).toBe(true);
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

  test("links both publisher affordances without fabricating an original-sound attribution", () => {
    const view = render(<VideoFeed
      items={[{
        ...item,
        publisher: { ...item.publisher, href: "/c/songs" },
        song: undefined,
      }]}
    />);

    const publisherLinks = view.getAllByRole("link");
    expect(publisherLinks.filter((link) => link.getAttribute("href") === "/c/songs")).toHaveLength(2);
    expect(view.queryByText(/Original sound/u)).toBeNull();
    expect(view.queryByRole("button", { name: /Open .* by/u })).toBeNull();
  });

  test("presents translated caption direction and toggles back to the authored caption", () => {
    const view = render(<VideoFeed items={[{
      ...item,
      caption: "تعليق مترجم",
      captionDir: "rtl",
      captionLang: "ar",
      translation: {
        originalCaption: "Authored caption",
        originalDir: "ltr",
        originalLang: "en",
        showOriginalLabel: "Show original",
        showTranslationLabel: "Show translation",
      },
    }]} />);
    const translated = view.getByText("تعليق مترجم");

    expect(translated.getAttribute("dir")).toBe("rtl");
    expect(translated.getAttribute("lang")).toBe("ar");
    fireEvent.click(view.getByRole("button", { name: "Show original" }));

    const original = view.getByText("Authored caption");
    expect(original.getAttribute("dir")).toBe("ltr");
    expect(original.getAttribute("lang")).toBe("en");
    expect(view.getByRole("button", { name: "Show translation" }).getAttribute("aria-pressed")).toBe("true");
  });

  test("keeps mobile rail actions circle-free and gives desktop actions a visible circle", () => {
    const view = render(<VideoFeed items={[item]} onComment={() => undefined} onKaraoke={() => undefined} onShare={() => undefined} onStudy={() => undefined} />);

    for (const label of ["Like", "Comments", "Share", "Study", "Sing"]) {
      const action = view.getByRole("button", { name: label });
      // Mobile overlays the video: bare filled glyphs with a drop shadow, no filled circle.
      expect(action.className).toContain("bg-transparent");
      expect(action.className).toContain("drop-shadow-[0_1px_2px_rgb(0_0_0/0.65)]");
      expect(action.className).toContain("[&_svg]:size-7");
      // Desktop sits on the black stage outside the frame, where a dark circle is invisible.
      expect(action.className).toMatch(/md:!?bg-white\/10/);
      expect(action.className).toContain("md:drop-shadow-none");
    }
  });

  test("tightens the gap between rail icons and their counts on mobile", () => {
    const view = render(<VideoFeed items={[item]} />);
    const action = view.getByRole("button", { name: "Like" });
    const wrapper = action.parentElement!.parentElement!;

    expect(wrapper.className).toContain("gap-0.5");
    expect(wrapper.className).toContain("md:gap-1");
    expect(view.getByText("4").className).toContain("-mt-2");
    expect(view.getByText("4").className).toContain("md:mt-0");
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

  test("uses filled rail icons with a red heart when liked", () => {
    const view = render(<VideoFeed items={[{ ...item, liked: false }]} onBook={() => {}} />);
    const idleLike = view.getByRole("button", { name: "Like" });

    expect(idleLike.getAttribute("data-active")).toBeNull();
    expect(idleLike.querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("fill");
    expect(view.getByRole("button", { name: "Comments" }).querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("fill");
    expect(view.getByRole("button", { name: "Share" }).querySelector("svg")?.getAttribute("data-video-icon-weight")).toBe("fill");

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
    expect(slide.className).toContain("[--feed-browser-occlusion:max(0px,calc(100lvh-100dvh))]");
    expect(slide.className).toContain("[--feed-chrome-top:calc(env(safe-area-inset-top)+4rem)]");
    expect(slide.className).toContain("[--feed-chrome-bottom:calc(env(safe-area-inset-bottom)+var(--header-height)+var(--feed-browser-occlusion))]");
    // On md+ the chrome is in flow and already excluded from the feed box, so the insets collapse.
    expect(slide.className).toContain("md:[--feed-browser-occlusion:0px]");
    expect(slide.className).toContain("md:[--feed-chrome-top:0px]");
    expect(slide.className).toContain("md:[--feed-chrome-bottom:0px]");

    expect(view.queryByLabelText("Turn sound on")).toBeNull();
    // Overflow is inset via the rail's bottom offset on mobile now that it no longer floats over
    // the media there; the two-slot placement is covered by the rail-and-hover-corner test below.
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
    expect(video.style.transform).toBe("translateY(calc(var(--feed-browser-occlusion) / -2))");
  });

  test("sizes portrait media from its stage container instead of the viewport width", () => {
    const view = render(<VideoFeed items={[item]} />);
    const frame = view.container.querySelector<HTMLVideoElement>("video")!.parentElement!;
    const stage = frame.parentElement!;

    expect(stage.className).toContain("[container-type:inline-size]");
    expect(frame.className).toContain("177.7778cqw");
    expect(frame.className).toContain("92dvh");
    expect(frame.className).toContain("54rem");
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
    // Mobile rail slot and desktop hover-corner slot render one trigger each.
    expect(view.getAllByLabelText("More video actions")).toHaveLength(2);
  });

  test("shows non-ready learning actions without requiring a boost", () => {
    const view = render(<VideoFeed items={[{
      ...item,
      boostEligibility: "unavailable",
      karaoke: "processing",
      study: "failed",
    }]} />);

    expect(view.getByRole("button", { name: "Sing processing" }).hasAttribute("disabled")).toBe(true);
    expect(view.getByRole("button", { name: "Study unavailable" }).hasAttribute("disabled")).toBe(true);
    expect(view.queryByText("Boost this song")).toBeNull();
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
    let playCount = 0;
    const restorePlay = mockVideoPlay(() => {
      playCount += 1;
      return playCount === 1 ? Promise.reject(new Error("blocked")) : Promise.resolve();
    });
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

  test("toggles the effective media mute state when Brave drifts from React state", async () => {
    const restorePlay = mockVideoPlay(() => Promise.resolve());
    try {
      const view = render(<VideoFeed initialMuted items={[item]} />);
      const video = view.container.querySelector<HTMLVideoElement>("video")!;
      Object.defineProperty(video, "muted", { configurable: true, value: false, writable: true });

      fireEvent.click(view.getByRole("button", { name: "Sound on" }));
      expect(video.muted).toBe(true);

      fireEvent.click(view.getByRole("button", { name: "Sound on" }));
      await act(async () => { await Promise.resolve(); });

      expect(video.muted).toBe(false);
      expect(view.getByRole("button", { name: "Mute video" })).toBeTruthy();
      expect(window.localStorage.getItem("pirate.video-feed.muted")).toBe("false");
    } finally {
      restorePlay();
    }
  });

  test("shows a non-persistent play affordance when muted autoplay is blocked", async () => {
    const restorePlay = mockVideoPlay(() => Promise.reject(
      new DOMException("autoplay blocked", "NotAllowedError"),
    ));
    try {
      const calls: VideoFeedPlaybackState[] = [];
      const view = render(
        <VideoFeed
          initialMuted
          items={[item]}
          onStudy={(_item, state) => calls.push(state)}
        />,
      );

      await act(async () => { await Promise.resolve(); });

      expect(view.getByRole("button", { name: "Play video" })).toBeTruthy();
      fireEvent.click(view.getByRole("button", { name: "Study" }));
      expect(calls).toEqual([{ muted: true, paused: false, playbackSeconds: 0 }]);

      const video = view.container.querySelector<HTMLVideoElement>("video")!;
      Object.defineProperty(video, "play", { configurable: true, value: () => Promise.resolve() });
      fireEvent.click(view.getByRole("button", { name: "Play video" }));
      await act(async () => { await Promise.resolve(); });

      expect(view.getByRole("button", { name: "Pause video" })).toBeTruthy();
    } finally {
      restorePlay();
    }
  });

  test("retries a previously blocked autoplay when the slide becomes active again", async () => {
    let shouldReject = true;
    const restorePlay = mockVideoPlay(() => shouldReject
      ? Promise.reject(new DOMException("autoplay blocked", "NotAllowedError"))
      : Promise.resolve());
    try {
      const view = render(<VideoFeed initialMuted items={feedItems()} />);
      const feed = view.getByLabelText("Video feed") as HTMLDivElement;
      Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

      await act(async () => { await Promise.resolve(); });
      expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);

      shouldReject = false;
      Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
      settleFeedScroll(feed);
      Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
      settleFeedScroll(feed);
      await act(async () => { await Promise.resolve(); });

      expect(view.queryByRole("button", { name: "Play video" })).toBeNull();
    } finally {
      restorePlay();
    }
  });

  test("starts playback when playable media mounts after the initial render", async () => {
    let playCount = 0;
    const restorePlay = mockVideoPlay(() => {
      playCount += 1;
      return Promise.resolve();
    });
    try {
      const pendingItem = { ...item, media: { ...item.media, src: "" } };
      const view = render(<VideoFeed initialMuted items={[pendingItem]} />);
      expect(playCount).toBe(0);

      view.rerender(<VideoFeed initialMuted items={[item]} />);
      await act(async () => { await Promise.resolve(); });

      expect(playCount).toBeGreaterThan(0);
    } finally {
      restorePlay();
    }
  });

  test("shows the sound fallback prompt only once while scrolling the session", async () => {
    let playCount = 0;
    const restorePlay = mockVideoPlay(() => {
      playCount += 1;
      return playCount === 1 ? Promise.reject(new Error("blocked")) : Promise.resolve();
    });
    try {
      const view = render(<VideoFeed initialMuted={false} items={feedItems()} />);
      const feed = view.getByLabelText("Video feed") as HTMLDivElement;
      Object.defineProperty(feed, "clientHeight", { configurable: true, value: 700 });
      await act(async () => { await Promise.resolve(); });
      expect(view.getByRole("button", { name: "Tap for sound" })).toBeTruthy();

      feed.scrollTop = 700;
      settleFeedScroll(feed);
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

  test("restores a selected slide that arrives later without teleporting again", () => {
    const firstPage = feedItems().slice(0, 1);
    const view = render(<VideoFeed initialItemId="two" items={firstPage} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    view.rerender(<VideoFeed initialItemId="two" items={feedItems()} />);
    expect(feed.dataset.activeIndex).toBe("1");
    expect(feed.scrollTop).toBe(100);

    Object.defineProperty(feed, "scrollTop", { configurable: true, writable: true, value: 0 });
    settleFeedScroll(feed);
    view.rerender(<VideoFeed initialItemId="two" items={[...feedItems()]} />);

    expect(feed.dataset.activeIndex).toBe("0");
    expect(feed.scrollTop).toBe(0);
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

  test("exposes desktop previous and next controls with bounded navigation", () => {
    const view = render(
      <VideoFeed
        items={feedItems()}
        nextVideoLabel="Go forward"
        previousVideoLabel="Go back"
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 640 });
    const calls: ScrollToOptions[] = [];
    Object.defineProperty(feed, "scrollTo", {
      configurable: true,
      value: (options: ScrollToOptions) => calls.push(options),
    });
    const previous = view.getByRole("button", { name: "Go back" });
    const next = view.getByRole("button", { name: "Go forward" });

    expect(previous.hasAttribute("disabled")).toBe(true);
    expect(next.hasAttribute("disabled")).toBe(false);
    fireEvent.click(next);
    expect(feed.dataset.activeIndex).toBe("1");
    expect(calls).toEqual([{ behavior: "smooth", top: 640 }]);
    expect(previous.hasAttribute("disabled")).toBe(false);
  });

  test("renders a frame-bottom progress bar with an accessible scrubber", () => {
    const view = render(<VideoFeed items={[item]} videoProgressLabel="Playback position" />);
    const progress = view.container.querySelector("[data-video-progress]");
    const fill = view.container.querySelector("[data-video-progress-fill]");
    const slider = view.getByRole("slider", { name: "Playback position" });

    expect(progress?.className).toContain("bottom-[var(--feed-chrome-bottom)]");
    expect(progress?.className).toContain("md:bottom-0");
    expect(progress?.className).toContain("touch-pan-x");
    expect(fill?.className).toContain("origin-left");
    expect(slider.getAttribute("aria-valuetext")).toBe("0:00 / 0:00");
  });

  test("keeps feed navigation and playback keys owned while the scrubber is focused", () => {
    expect(videoProgressKeyAction("ArrowUp")).toBe("previous");
    expect(videoProgressKeyAction("k")).toBe("previous");
    expect(videoProgressKeyAction("ArrowDown")).toBe("next");
    expect(videoProgressKeyAction("j")).toBe("next");
    expect(videoProgressKeyAction(" ")).toBe("toggle");
    expect(videoProgressKeyAction("ArrowLeft")).toBeNull();
    expect(videoProgressKeyAction("ArrowRight")).toBeNull();
  });

  test("keeps an intentional pause when the item leaves and re-enters the active slot", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    fireEvent.click(view.getAllByRole("button", { name: "Pause video" })[0]!);
    expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
    settleFeedScroll(feed);

    expect(view.getAllByRole("button", { name: "Play video" })).toHaveLength(1);
  });

  test("reports the active slide for adjacent capability prefetch", () => {
    const calls: string[] = [];
    const view = render(
      <VideoFeed
        feedRequestId="feed_metrics"
        items={feedItems()}
        onActiveItemChange={(activeItem) => calls.push(activeItem.id)}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    expect(calls).toEqual(["one"]);
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    expect(calls).toEqual(["one", "two"]);
  });

  test("owns snap-stop on each direct scroll child", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed");
    const slideWrapper = feed.firstElementChild;
    const article = slideWrapper?.firstElementChild;

    expect(slideWrapper?.classList.contains("snap-start")).toBe(true);
    expect(slideWrapper?.classList.contains("snap-always")).toBe(true);
    expect(article?.classList.contains("snap-always")).toBe(false);
  });

  test("keeps playback on the current slide until scrolling settles", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 60 });

    fireEvent.scroll(feed);
    expect(feed.dataset.activeIndex).toBe("0");

    fireEvent(feed, new window.Event("scrollend"));
    expect(feed.dataset.activeIndex).toBe("1");
  });

  test("does not let in-flight smooth-scroll events undo the requested slide", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(feed, "scrollTo", { configurable: true, value: () => {} });

    fireEvent.click(view.getByRole("button", { name: "Next video" }));
    expect(feed.dataset.activeIndex).toBe("1");

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 20 });
    fireEvent.scroll(feed);
    expect(feed.dataset.activeIndex).toBe("1");
  });

  test("does not rerender distant slides when the settled active index changes", () => {
    const renders = new Map<string, number>();
    const onSlideRender = (itemId: string) => {
      renders.set(itemId, (renders.get(itemId) ?? 0) + 1);
    };
    const view = render(<VideoFeed items={manyFeedItems()} onSlideRender={onSlideRender} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    // Slide 2 renders inside the initial ±2 window, then drops out of it entirely.
    const distantInitialRenders = renders.get("video-2");
    expect(distantInitialRenders).toBeGreaterThan(0);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 500 });
    settleFeedScroll(feed);

    expect(feed.dataset.activeIndex).toBe("5");
    expect(renders.get("video-2")).toBe(distantInitialRenders);
  });

  test("reports bounded impression metrics when the active slide changes", () => {
    const calls: Array<{ id: string; impression: VideoFeedImpression }> = [];
    const view = render(
      <VideoFeed
        feedRequestId="feed_metrics"
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
    settleFeedScroll(feed);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe("one");
    expect(calls[0]?.impression).toMatchObject({
      completionRatio: 0.1,
      durationSeconds: 10,
      eventId: "evt_video_feed_metrics_one_1",
      exitReason: "swipe",
      feedRequestId: "feed_metrics",
      muted: true,
      playbackSeconds: 1,
      position: 0,
      replayCount: 1,
      slideEntrySequence: 1,
      soundOnAtAnyPoint: false,
    });
    expect(calls[0]?.impression.dwellMs).toBeGreaterThanOrEqual(0);
  });

  test("reuses an activation id across item-identity rerenders and increments on revisit", () => {
    const calls: VideoFeedImpression[] = [];
    const onImpression = (_activeItem: VideoFeedItem, impression: VideoFeedImpression) => {
      calls.push(impression);
    };
    const view = render(
      <VideoFeed
        feedRequestId="feed_revisit"
        items={feedItems()}
        onImpression={onImpression}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    view.rerender(
      <VideoFeed
        feedRequestId="feed_revisit"
        items={feedItems().map((feedItem) => ({ ...feedItem }))}
        onImpression={onImpression}
      />,
    );
    expect(calls).toHaveLength(0);

    Object.defineProperty(feed, "scrollTop", { configurable: true, writable: true, value: 100 });
    settleFeedScroll(feed);
    feed.scrollTop = 0;
    settleFeedScroll(feed);
    feed.scrollTop = 100;
    settleFeedScroll(feed);

    expect(calls.map((impression) => impression.eventId)).toEqual([
      "evt_video_feed_revisit_one_1",
      "evt_video_feed_revisit_two_1",
      "evt_video_feed_revisit_one_2",
    ]);
  });

  test("gives media errors precedence over swipe", () => {
    const calls: VideoFeedImpression[] = [];
    const view = render(
      <VideoFeed
        feedRequestId="feed_error"
        items={feedItems()}
        onImpression={(_activeItem, impression) => calls.push(impression)}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    // The first error triggers the no-cors retry; only the retried element's error is a failure.
    fireEvent.error(view.container.querySelector("video")!);
    fireEvent.error(view.container.querySelector("video")!);
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);

    expect(calls[0]?.exitReason).toBe("playback_error");
  });

  test("mounts media only near the active slide without removing snap shells", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;

    expect(feed.children).toHaveLength(items.length);
    // Only the ±2 slide window renders shell content; every snap spacer stays mounted.
    expect(view.container.querySelectorAll("article")).toHaveLength(3);
    expect(view.container.querySelectorAll("video")).toHaveLength(2);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("preload")))
      .toEqual(["auto", "metadata"]);
    expect(view.container.innerHTML).not.toContain("video-2.mp4");
  });

  test("uses a black placeholder instead of an empty image source when distant media has no poster", () => {
    const items = manyFeedItems().map((feedItem) => ({
      ...feedItem,
      media: { ...feedItem.media, posterSrc: "" },
    }));
    const view = render(<VideoFeed items={items} />);

    expect(view.container.querySelectorAll("article")).toHaveLength(3);
    expect(view.container.querySelectorAll("video")).toHaveLength(2);
    expect(view.container.querySelectorAll("img[src='']")).toHaveLength(0);
  });

  test("omits poster attributes and the landscape backdrop when no poster exists", () => {
    const view = render(<VideoFeed items={[{
      ...item,
      media: { ...item.media, orientation: "landscape", posterSrc: undefined },
    }]} />);

    expect(view.container.querySelector("video")?.hasAttribute("poster")).toBe(false);
    expect(view.container.querySelectorAll("article [data-video-media-image]")).toHaveLength(0);
  });

  test("moves the media window while preserving every full-height slide shell", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 300 });

    settleFeedScroll(feed);

    expect(feed.children).toHaveLength(items.length);
    // The ±2 slide window covers shells 1-5; slide 0 stays rendered through the recent union.
    expect(view.container.querySelectorAll("article")).toHaveLength(6);
    // The ±1 window covers slides 2-4; the initially viewed slide 0 stays mounted as keep-alive.
    expect(view.container.querySelectorAll("video")).toHaveLength(4);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("src")))
      .toEqual([
        "https://media.test/video-0.mp4",
        "https://media.test/video-2.mp4",
        "https://media.test/video-3.mp4",
        "https://media.test/video-4.mp4",
    ]);
    expect(Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("preload")))
      .toEqual(["none", "metadata", "auto", "metadata"]);
  });

  test("keeps recently viewed media mounted for scroll-back and evicts beyond the cap", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    const scrollTo = (index: number) => {
      Object.defineProperty(feed, "scrollTop", { configurable: true, value: index * 100 });
      settleFeedScroll(feed);
    };

    scrollTo(3);
    scrollTo(6);

    // Visited slides 0 and 3 remain mounted even though both sit outside the ±2 window of slide 6.
    const mountedSources = () => Array.from(view.container.querySelectorAll("video"), (video) => video.getAttribute("src"));
    expect(mountedSources()).toContain("https://media.test/video-0.mp4");
    expect(mountedSources()).toContain("https://media.test/video-3.mp4");

    // Visiting slides 5 and 4 pushes slide 0 past the keep-alive cap; it unmounts while slide 3,
    // still within the cap, survives.
    scrollTo(5);
    scrollTo(4);

    expect(mountedSources()).not.toContain("https://media.test/video-0.mp4");
    expect(mountedSources()).toContain("https://media.test/video-3.mp4");
  });

  test("windows slide shells around the active index, recent slides, and a pending restore", () => {
    const base = { activeIndex: 0, itemId: "video-5", recentItemIds: ["video-0"] };

    expect(shouldRenderVideoFeedSlide({ ...base, index: 2 })).toBe(true);
    expect(shouldRenderVideoFeedSlide({ ...base, index: 3 })).toBe(false);
    expect(shouldRenderVideoFeedSlide({ ...base, index: 5, recentItemIds: ["video-0", "video-5"] })).toBe(true);
    expect(shouldRenderVideoFeedSlide({ ...base, index: 5, pendingRestoreItemId: "video-5" })).toBe(true);
    expect(shouldRenderVideoFeedSlide({ ...base, index: 5, pendingRestoreItemId: "video-6" })).toBe(false);
  });

  test("renders distant slides as inert poster shells while their snap spacers persist", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed items={items} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    const spacers = Array.from(feed.children) as HTMLElement[];

    // Every item keeps its full-height snap spacer, so scroll height and snap points are intact.
    expect(spacers).toHaveLength(items.length);
    for (const spacer of spacers) {
      expect(spacer.className).toContain("h-full");
      expect(spacer.className).toContain("snap-start");
      expect(spacer.className).toContain("snap-always");
    }
    // The ±2 window covers slides 0-2; slides 3+ render the minimal poster shell instead.
    expect(spacers.slice(0, 3).every((spacer) => spacer.querySelector("article") !== null)).toBe(true);
    const shells = spacers.slice(3);
    expect(shells.every((spacer) => spacer.querySelector("article") === null)).toBe(true);
    expect(shells.every((spacer) => {
      const shell = spacer.querySelector("[data-video-slide-shell]");
      return shell !== null && shell.className.includes("bg-black");
    })).toBe(true);
    // The poster shows through fast scrolls, framed like the real slide's poster.
    const posters = shells.map((spacer) => spacer.querySelector("img[data-video-media-image]"));
    expect(posters.every((poster) => poster !== null)).toBe(true);
    for (const poster of posters) {
      expect(poster?.getAttribute("src")).toBe("https://media.test/poster.webp");
      expect(poster?.getAttribute("loading")).toBe("lazy");
      expect(poster?.className).toContain("object-cover");
    }
    // Absolutely nothing interactive or media-bearing in a shell.
    expect(feed.querySelectorAll(
      "[data-video-slide-shell] button, [data-video-slide-shell] a, [data-video-slide-shell] video, [data-video-slide-shell] [role='menu']",
    )).toHaveLength(0);
  });

  test("recenters the slide render window as the active index advances", () => {
    const renders = new Set<string>();
    const view = render(
      <VideoFeed items={manyFeedItems()} onSlideRender={(itemId) => renders.add(itemId)} />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    expect(renders.has("video-6")).toBe(false);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 600 });
    settleFeedScroll(feed);

    expect(feed.dataset.activeIndex).toBe("6");
    expect(renders.has("video-6")).toBe(true);
    // The window recentered onto slides 4-6; slide 0 stays rendered through the recent union.
    const spacers = Array.from(feed.children) as HTMLElement[];
    expect(spacers).toHaveLength(7);
    expect(spacers.map((spacer) => spacer.querySelector("article") !== null))
      .toEqual([true, false, false, false, true, true, true]);
  });

  test("renders a pending initial-item restore target far outside the slide window", () => {
    const items = manyFeedItems();
    const view = render(<VideoFeed initialItemId="video-6" items={items.slice(0, 1)} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    // Zero height defers the restore through rAF; stub it so restoration stays pending.
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 0 });
    Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: () => 1 });
    Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: () => {} });

    try {
      view.rerender(<VideoFeed initialItemId="video-6" items={items} />);

      const spacers = Array.from(feed.children) as HTMLElement[];
      expect(spacers).toHaveLength(items.length);
      expect(feed.dataset.activeIndex).toBe("0");
      // The ±2 window covers slides 0-2; the pending restore target renders on top of it.
      expect(feed.querySelectorAll("article")).toHaveLength(4);
      expect(spacers[6]?.querySelector("article")).not.toBeNull();
      view.unmount();
    } finally {
      Reflect.deleteProperty(window, "requestAnimationFrame");
      Reflect.deleteProperty(window, "cancelAnimationFrame");
    }
  });

  test("releases the pending restore slot after repeated restore misses", () => {
    const items = manyFeedItems();
    Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: () => 1 });
    Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: () => {} });
    try {
      const view = render(<VideoFeed initialItemId="video-6" items={items.slice(0, 1)} />);
      const feed = view.getByLabelText("Video feed") as HTMLDivElement;
      // Zero height defers the restore through the stubbed rAF forever: every page is a miss.
      Object.defineProperty(feed, "clientHeight", { configurable: true, value: 0 });

      view.rerender(<VideoFeed initialItemId="video-6" items={[...items]} />);
      // While restoration is pending, the far target slide stays rendered on top of the window.
      expect(feed.querySelectorAll("article")).toHaveLength(4);

      for (let page = 0; page < 12; page += 1) {
        view.rerender(<VideoFeed initialItemId="video-6" items={[...items]} />);
      }

      // The give-up released the slot: slide 6 falls back to a poster shell, window renders 0-2.
      expect(feed.dataset.activeIndex).toBe("0");
      expect(feed.querySelectorAll("article")).toHaveLength(3);
      const spacers = Array.from(feed.children) as HTMLElement[];
      expect(spacers[6]?.querySelector("[data-video-slide-shell]")).not.toBeNull();
    } finally {
      Reflect.deleteProperty(window, "requestAnimationFrame");
      Reflect.deleteProperty(window, "cancelAnimationFrame");
    }
  });

  test("builds the forward prefetch range from the byte budget", () => {
    expect(VIDEO_FEED_PREFETCH_AHEAD_BYTES).toBe(512 * 1024);
    expect(videoFeedPrefetchRangeHeader()).toBe("bytes=0-524287");
  });

  test("bounds the warmed-src set with FIFO eviction so evicted sources prefetch again", () => {
    const warmed = new Set<string>();
    for (let index = 0; index < VIDEO_FEED_MAX_WARMED_SRCS; index += 1) {
      recordWarmedVideoSrc(warmed, `https://media.test/video-${index}.mp4`);
    }
    expect(warmed.size).toBe(VIDEO_FEED_MAX_WARMED_SRCS);

    recordWarmedVideoSrc(warmed, "https://media.test/video-500.mp4");

    // The 501st source front-trims the oldest; the newest stays recorded.
    expect(warmed.size).toBe(VIDEO_FEED_MAX_WARMED_SRCS);
    expect(warmed.has("https://media.test/video-0.mp4")).toBe(false);
    expect(warmed.has("https://media.test/video-500.mp4")).toBe(true);

    // An evicted source is no longer recorded, so the prefetch guard treats it as new.
    recordWarmedVideoSrc(warmed, "https://media.test/video-0.mp4");
    expect(warmed.has("https://media.test/video-0.mp4")).toBe(true);
    expect(warmed.has("https://media.test/video-1.mp4")).toBe(false);
  });

  test("gates the forward prefetch on item eligibility and connection cost", () => {
    const next = feedItems()[1]!;
    const src = "https://media.test/two.mp4";

    expect(videoFeedPrefetchAheadSrc({ item: next })).toBe(src);
    expect(videoFeedPrefetchAheadSrc({})).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ item: { ...next, media: { ...next.media, src: undefined } } })).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ item: { ...next, viewerState: "age_proof_required" } })).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ item: next, saveData: true })).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ effectiveType: "2g", item: next })).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ effectiveType: "slow-2g", item: next })).toBeNull();
    expect(videoFeedPrefetchAheadSrc({ effectiveType: "4g", item: next })).toBe(src);
  });

  test("prefetches the first bytes of the next slide when the active index settles", async () => {
    const calls = stubPrefetchFetch();
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    await act(async () => { await Promise.resolve(); });

    expect(calls.map(({ priority, range, src }) => ({ priority, range, src }))).toEqual([
      { priority: "low", range: "bytes=0-524287", src: "https://media.test/two.mp4" },
    ]);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });

    expect(calls.map(({ priority, range, src }) => ({ priority, range, src }))).toEqual([
      { priority: "low", range: "bytes=0-524287", src: "https://media.test/two.mp4" },
      { priority: "low", range: "bytes=0-524287", src: "https://media.test/three.mp4" },
    ]);
  });

  test("never prefetches backward or refetches a source it already warmed", async () => {
    const calls = stubPrefetchFetch();
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });
    expect(calls.map((call) => call.src)).toEqual([
      "https://media.test/two.mp4",
      "https://media.test/three.mp4",
    ]);

    // Settling back on slide 0 finds its N+1 already warm; slide 0 itself never becomes a
    // prefetch candidate because the effect only looks forward.
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });
    expect(calls.map((call) => call.src)).toEqual([
      "https://media.test/two.mp4",
      "https://media.test/three.mp4",
    ]);
  });

  test("skips the forward prefetch on data-saver and 2g connections", async () => {
    const calls = stubPrefetchFetch();
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
    try {
      const view = render(<VideoFeed items={feedItems()} />);
      await act(async () => { await Promise.resolve(); });
      expect(calls).toEqual([]);
      view.unmount();
    } finally {
      Reflect.deleteProperty(navigator, "connection");
    }

    Object.defineProperty(navigator, "connection", { configurable: true, value: { effectiveType: "2g" } });
    try {
      const view = render(<VideoFeed items={feedItems()} />);
      await act(async () => { await Promise.resolve(); });
      expect(calls).toEqual([]);
      view.unmount();
    } finally {
      Reflect.deleteProperty(navigator, "connection");
    }
  });

  test("skips the forward prefetch for age-blocked or source-less next slides", async () => {
    const calls = stubPrefetchFetch();
    const [first, second] = feedItems();
    const ageBlocked = render(
      <VideoFeed items={[first!, { ...second!, viewerState: "age_proof_required" }]} />,
    );
    await act(async () => { await Promise.resolve(); });
    expect(calls).toEqual([]);
    ageBlocked.unmount();

    const sourceless = render(
      <VideoFeed items={[first!, { ...second!, media: { ...second!.media, src: undefined } }]} />,
    );
    await act(async () => { await Promise.resolve(); });
    expect(calls).toEqual([]);
    sourceless.unmount();
  });

  test("aborts an in-flight prefetch when the feed unmounts", async () => {
    const calls = stubPrefetchFetch(() => new Promise<Response>(() => {}));
    const view = render(<VideoFeed items={feedItems()} />);
    await act(async () => { await Promise.resolve(); });
    expect(calls).toHaveLength(1);

    view.unmount();

    expect(calls[0]?.signal?.aborted).toBe(true);
  });

  test("cancels the download when the server ignores the Range request", async () => {
    let cancelled = false;
    stubPrefetchFetch(() => {
      const body = new ReadableStream({
        cancel: () => { cancelled = true; },
        start: (controller) => controller.enqueue(new Uint8Array([1, 2, 3])),
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    });
    render(<VideoFeed items={feedItems()} />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(cancelled).toBe(true);
  });

  test("loads feed media with anonymous CORS so the warmed cache entry is reused", () => {
    const view = render(<VideoFeed items={[item]} />);

    expect(view.container.querySelector("video")?.getAttribute("crossorigin")).toBe("anonymous");
  });

  test("keeps an in-flight prefetch alive across a settle, aborts only past the window", async () => {
    const calls = stubPrefetchFetch(() => new Promise<Response>(() => {}));
    const view = render(<VideoFeed items={manyFeedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    await act(async () => { await Promise.resolve(); });
    expect(calls.map((call) => call.src)).toEqual(["https://media.test/video-1.mp4"]);

    // Swiping 0 → 1 must not cancel the warm-up of the video that just became active.
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });
    expect(calls[0]?.signal?.aborted).toBe(false);

    // Once slide 1 is neither the N+1 target nor inside the ±2 window, the fetch is abandoned.
    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 400 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });
    expect(calls[0]?.signal?.aborted).toBe(true);
  });

  test("retries a failed prefetch on a later settle instead of treating it as warmed", async () => {
    let failTwo = true;
    const calls = stubPrefetchFetch((src) => {
      if (failTwo && src.endsWith("two.mp4")) {
        failTwo = false;
        return Promise.reject(new Error("offline"));
      }
      return Promise.resolve(new Response(null, { status: 206 }));
    });
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });

    expect(calls.map((call) => call.src)).toEqual([
      "https://media.test/two.mp4",
      "https://media.test/three.mp4",
      "https://media.test/two.mp4",
    ]);
  });

  test("never duplicates a prefetch that is still in flight", async () => {
    const calls = stubPrefetchFetch(() => new Promise<Response>(() => {}));
    const view = render(<VideoFeed items={feedItems()} />);
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 0 });
    settleFeedScroll(feed);
    await act(async () => { await Promise.resolve(); });

    expect(calls.map((call) => call.src)).toEqual([
      "https://media.test/two.mp4",
      "https://media.test/three.mp4",
    ]);
  });

  test("remounts a failed cors video without the attribute and reports the fallback", () => {
    const calls: Array<{ itemId: string; srcHost: string | null }> = [];
    const view = render(
      <VideoFeed
        items={[item]}
        onVideoCorsFallback={(fallbackItem, context) => calls.push({ itemId: fallbackItem.id, srcHost: context.srcHost })}
      />,
    );
    const video = view.container.querySelector("video")!;
    expect(video.getAttribute("crossorigin")).toBe("anonymous");

    fireEvent.error(video);

    // A key-forced remount, not an attribute flip: the new element refetches without cors.
    const retried = view.container.querySelector("video")!;
    expect(retried).not.toBe(video);
    expect(retried.hasAttribute("crossorigin")).toBe(false);
    expect(calls).toEqual([{ itemId: "video_test", srcHost: "media.test" }]);
  });

  test("suppresses the impression playback error while the no-cors retry plays out", () => {
    const calls: VideoFeedImpression[] = [];
    const view = render(
      <VideoFeed
        feedRequestId="feed_cors_retry"
        items={feedItems()}
        onImpression={(_activeItem, impression) => calls.push(impression)}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    fireEvent.error(view.container.querySelector("video")!);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);

    expect(calls[0]?.exitReason).toBe("swipe");
  });

  test("reports the playback error once when the no-cors retry also fails", () => {
    const fallbacks: string[] = [];
    const calls: VideoFeedImpression[] = [];
    const view = render(
      <VideoFeed
        feedRequestId="feed_cors_double"
        items={feedItems()}
        onImpression={(_activeItem, impression) => calls.push(impression)}
        onVideoCorsFallback={(fallbackItem) => fallbacks.push(fallbackItem.id)}
      />,
    );
    const feed = view.getByLabelText("Video feed") as HTMLDivElement;
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });

    fireEvent.error(view.container.querySelector("video")!);
    fireEvent.error(view.container.querySelector("video")!);

    Object.defineProperty(feed, "scrollTop", { configurable: true, value: 100 });
    settleFeedScroll(feed);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.exitReason).toBe("playback_error");
    expect(fallbacks).toEqual(["one"]);
  });

  test("scopes the no-cors fallback to the failing item only", () => {
    const view = render(<VideoFeed items={feedItems()} />);
    const second = view.container.querySelectorAll("video")[1]!;
    expect(second.getAttribute("crossorigin")).toBe("anonymous");

    fireEvent.error(second);

    const videos = view.container.querySelectorAll("video");
    expect(videos[0]?.getAttribute("crossorigin")).toBe("anonymous");
    expect(videos[1]?.hasAttribute("crossorigin")).toBe(false);
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

  test("keeps only the desktop overflow dots visible", () => {
    const view = render(<VideoFeed items={[item]} />);
    const triggers = view.getAllByLabelText("More video actions");
    expect(triggers).toHaveLength(2);

    const frame = view.container.querySelector<HTMLVideoElement>("video")!.parentElement!;
    const [cornerTrigger, longPressTrigger] = triggers;

    // The corner slot lives inside the media frame and is revealed by hover/focus on md+ only.
    expect(frame.contains(cornerTrigger)).toBe(true);
    const cornerSlot = cornerTrigger.parentElement!;
    expect(cornerSlot.className).toContain("hidden");
    expect(cornerSlot.className).toContain("md:block");
    expect(cornerSlot.className).toContain("md:group-hover:opacity-100");
    expect(cornerSlot.className).toContain("md:group-focus-within:opacity-100");

    expect(longPressTrigger.className).toContain("sr-only");
    expect(view.container.querySelectorAll("[data-video-overflow-trigger]")).toHaveLength(1);
  });

  test("cancels the mobile action long press when Android claims the pointer", async () => {
    const view = render(<VideoFeed items={[item]} />);
    const playback = view.getByRole("button", { name: "Pause video" });

    fireEvent.pointerDown(playback, { clientX: 100, clientY: 200, pointerType: "touch" });
    fireEvent.pointerCancel(playback, { pointerType: "touch" });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 520)); });

    expect(view.queryByText("Video actions")).toBeNull();
  });

  test("renders overflow even when the item is not boost eligible", () => {
    const view = render(<VideoFeed items={[{ ...item, boostEligibility: "unavailable" }]} />);
    expect(view.getAllByLabelText("More video actions")).toHaveLength(2);
  });

  test("does not pause playback merely because the non-modal overflow opens", () => {
    const view = render(<VideoFeed items={[item]} />);

    fireEvent.click(view.getAllByLabelText("More video actions")[0]);

    expect(view.queryByRole("button", { name: "Play video" })).toBeNull();
  });

  test("keeps sound in the frame's top-left corner on mobile and desktop", () => {
    const view = render(<VideoFeed items={[item]} />);
    const sound = view.getByLabelText("Sound on");
    const slot = sound.parentElement!;

    expect(slot.className).toContain("block");
    expect(slot.className).toContain("opacity-100");
    expect(slot.className).toContain("md:opacity-0");
    expect(slot.className).toContain("md:group-hover:opacity-100");
    expect(slot.className).toContain("left-3");
    expect(slot.className).toContain("top-[calc(var(--feed-chrome-top)+0.75rem)]");
    expect(slot.className).toContain("md:top-3");
  });

  test("gives the publisher avatar a white rail ring", () => {
    const view = render(<VideoFeed items={[{ ...item, publisher: { handle: "songs.pirate", kind: "community" } }]} />);
    const avatar = view.container.querySelector("[data-video-publisher-avatar]")!;

    expect(avatar.className).toContain("ring-2");
    expect(avatar.className).toContain("ring-white");
    const image = avatar.querySelector("img");
    expect(image?.getAttribute("src")).toContain("data:image/svg+xml");
    expect(image?.getAttribute("alt")).toBe("songs.pirate");
  });

  test("reserves follow-badge geometry for active and inactive avatars", () => {
    const relationship = {
      kind: "follow" as const,
      ownProfile: true,
      targetUserId: "usr_publisher",
      targetWalletAddress: "0x0000000000000000000000000000000000000001",
    };
    const items = feedItems().slice(0, 2).map((feedItem) => ({
      ...feedItem,
      publisher: { ...feedItem.publisher, relationship },
    }));
    const view = render(<VideoFeed items={items} />);
    const slots = view.container.querySelectorAll("[data-video-publisher-relationship-slot]");

    expect(slots).toHaveLength(2);
    expect(slots[0]?.className).toBe(slots[1]?.className);
    expect(slots[0]?.className).toContain("size-6");
  });

  test("fills the mobile rail share slot only for a linked song with real artwork", () => {
    const linkedSong = {
      ...item,
      song: {
        artist: "Britney Spears",
        artworkSrc: "https://media.test/toxic-cover.webp",
        songHref: "/p/pst_toxic",
        title: "Toxic",
      },
    };
    const view = render(<VideoFeed items={[linkedSong]} onShare={() => undefined} />);
    const disc = view.container.querySelector("[data-video-audio-disc]");
    const share = view.getByRole("button", { name: "Share" });

    expect(disc).not.toBeNull();
    expect(disc?.querySelector("img")?.getAttribute("src")).toBe("https://media.test/toxic-cover.webp");
    expect(disc?.parentElement?.className).toContain("md:hidden");
    const desktopShareSlot = share.closest("div.hidden");
    expect(desktopShareSlot?.className).toContain("hidden");
    expect(desktopShareSlot?.className).toContain("md:block");
  });

  test("leaves the mobile rail slot empty for original audio or linked songs without artwork", () => {
    const originalAudio = render(<VideoFeed items={[item]} />);
    expect(originalAudio.container.querySelector("[data-video-audio-disc]")).toBeNull();
    originalAudio.unmount();

    const linkedWithoutArtwork = render(
      <VideoFeed
        items={[{
          ...item,
          song: { artist: "Britney Spears", songHref: "/p/pst_toxic", title: "Toxic" },
        }]}
      />,
    );
    expect(linkedWithoutArtwork.container.querySelector("[data-video-audio-disc]")).toBeNull();
  });

  test("underlines the linked song only on hover or focus", () => {
    const view = render(
      <VideoFeed
        items={[{ ...item, song: { artist: "Britney Spears", songHref: "/p/pst_toxic", title: "Toxic" } }]}
        onSong={() => undefined}
      />,
    );
    const songLink = view.getByRole("button", { name: "Open Toxic by Britney Spears" });
    const tokens = songLink.className.split(/\s+/);

    expect(tokens).not.toContain("underline");
    expect(tokens).toContain("hover:underline");
    expect(tokens).toContain("focus-visible:underline");
  });

  test("lazy-loads poster and ambient backdrop images", () => {
    const items = manyFeedItems(5);
    items[1] = { ...items[1], media: { ...items[1].media, orientation: "landscape" as const } };
    const view = render(<VideoFeed items={items} />);
    // The landscape backdrop renders for its slide; distant slides beyond the media window render
    // poster images. Neither may block the initial load.
    const images = Array.from(view.container.querySelectorAll("[data-video-media-image]"));

    expect(images.length).toBeGreaterThan(1);
    for (const image of images) {
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.getAttribute("decoding")).toBe("async");
    }
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
