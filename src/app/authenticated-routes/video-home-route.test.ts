import { describe, expect, test } from "bun:test";

import type { HomeFeedItem } from "@pirate/api-contracts";

import {
  appendUniqueVideoEntries,
  checkoutPathForFeedSlot,
  nextVideoPaginationCursor,
  resolveVideoHomeSurface,
  resolveVideoPublisherRelationship,
  VIDEO_FEED_VIEWPORT_CLASS,
} from "./video-home-route";

function feedEntry(id: string): HomeFeedItem {
  return { post: { post: { id } } } as HomeFeedItem;
}

describe("VIDEO_FEED_VIEWPORT_CLASS", () => {
  test("owns the full desktop viewport when navigation moves into the media sidebar", () => {
    expect(VIDEO_FEED_VIEWPORT_CLASS.split(" ")).toEqual(["h-dvh"]);
    expect(VIDEO_FEED_VIEWPORT_CLASS).not.toContain("header-height");
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

describe("appendUniqueVideoEntries", () => {
  test("deduplicates overlapping cursors and duplicates inside the incoming page", () => {
    const first = feedEntry("first");
    const second = feedEntry("second");
    const third = feedEntry("third");

    expect(appendUniqueVideoEntries(
      [first, second],
      [second, third, third],
    )).toEqual([first, second, third]);
  });

  test("preserves the current array when a page contains no new posts", () => {
    const current = [feedEntry("first")];

    expect(appendUniqueVideoEntries(current, [feedEntry("first")])).toBe(current);
  });
});

describe("nextVideoPaginationCursor", () => {
  test("stops automatic pagination after three consecutive no-growth pages", () => {
    let pagination = { consecutiveNoGrowthPages: 0, nextCursor: "page-1" as string | null };

    for (const serverCursor of ["page-2", "page-3", "page-4"]) {
      pagination = nextVideoPaginationCursor({
        consecutiveNoGrowthPages: pagination.consecutiveNoGrowthPages,
        didGrow: false,
        serverCursor,
      });
    }

    expect(pagination).toEqual({ consecutiveNoGrowthPages: 3, nextCursor: null });
  });

  test("resets the no-growth budget as soon as a page contributes a post", () => {
    expect(nextVideoPaginationCursor({
      consecutiveNoGrowthPages: 2,
      didGrow: true,
      serverCursor: "page-4",
    })).toEqual({ consecutiveNoGrowthPages: 0, nextCursor: "page-4" });
  });
});

describe("resolveVideoPublisherRelationship", () => {
  test("uses the wallet-backed follow relationship for a public profile", () => {
    expect(resolveVideoPublisherRelationship({
      authorUserId: "usr_author",
      authorWalletAddress: "0x0000000000000000000000000000000000000001",
      currentUserId: "usr_viewer",
      identityMode: "public",
      joinedLabel: "Joined community",
      joinLabel: "Join community",
    })).toEqual({
      kind: "follow",
      ownProfile: false,
      targetWalletAddress: "0x0000000000000000000000000000000000000001",
    });
  });

  test("does not pretend a profile is followable before its wallet resolves", () => {
    expect(resolveVideoPublisherRelationship({
      authorUserId: "usr_author",
      identityMode: "public",
      joinedLabel: "Joined community",
      joinLabel: "Join community",
    })).toBeUndefined();
  });

  test("reflects server or optimistic community membership", () => {
    expect(resolveVideoPublisherRelationship({
      identityMode: "anonymous",
      joinedLabel: "Joined community",
      joinedLocally: true,
      joinLabel: "Join community",
      viewerMembershipStatus: "not_member",
    })).toEqual({
      active: true,
      disabled: true,
      kind: "join",
      label: "Joined community",
    });
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
