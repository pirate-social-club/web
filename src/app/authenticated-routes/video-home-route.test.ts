import { describe, expect, test } from "bun:test";

import { checkoutPathForFeedSlot, resolveVideoHomeSurface, VIDEO_FEED_VIEWPORT_CLASS } from "./video-home-route";

describe("VIDEO_FEED_VIEWPORT_CLASS", () => {
  test("subtracts the in-flow desktop header so the document never scrolls", () => {
    expect(VIDEO_FEED_VIEWPORT_CLASS).toContain("md:h-[calc(100dvh-var(--header-height))]");
    // A bare md:h-dvh here overflows the shell by the sticky header's height and centres every
    // slide against a viewport taller than the visible one.
    expect(VIDEO_FEED_VIEWPORT_CLASS).not.toContain("md:h-dvh");
  });

  test("gives the feed the whole viewport on mobile, where the chrome is fixed", () => {
    expect(VIDEO_FEED_VIEWPORT_CLASS.split(" ")).toContain("h-dvh");
  });
});

describe("resolveVideoHomeSurface", () => {
  test("renders the Community Feed inline when the source returns 404", () => {
    expect(resolveVideoHomeSurface({
      error: { status: 404 },
      itemCount: 0,
      loading: false,
    })).toBe("community-feed-error");
  });

  test("renders the Community Feed inline for other source failures", () => {
    expect(resolveVideoHomeSurface({
      error: new Error("network unavailable"),
      itemCount: 0,
      loading: false,
    })).toBe("community-feed-error");
  });

  test("renders the Community Feed inline for an empty first page", () => {
    expect(resolveVideoHomeSurface({
      error: null,
      itemCount: 0,
      loading: false,
    })).toBe("community-feed-empty");
  });

  test("renders videos when the first page contains playable items", () => {
    expect(resolveVideoHomeSurface({
      error: null,
      itemCount: 1,
      loading: false,
    })).toBe("video");
  });
});

describe("checkoutPathForFeedSlot", () => {
  test("addresses the host checkout with start and end only", () => {
    expect(checkoutPathForFeedSlot("usr/host", {
      available: true,
      endUtc: "2026-07-24T10:30:00.000Z",
      priceCents: 3500,
      startUtc: "2026-07-24T10:00:00.000Z",
    })).toBe(
      "/book/usr%2Fhost/checkout?end=2026-07-24T10%3A30%3A00.000Z&start=2026-07-24T10%3A00%3A00.000Z",
    );
  });
});
