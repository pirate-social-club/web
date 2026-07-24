import { describe, expect, test } from "bun:test";

import type { HomeFeedItem } from "@pirate/api-contracts";

import {
  appendUniqueVideoEntries,
  checkoutPathForFeedSlot,
  nextVideoPaginationCursor,
  panelFromHistoryState,
  postIdForVideoItem,
  resolveVideoHomeSurface,
  resolveVideoPublisherRelationship,
  videoImpressionAnalyticsProperties,
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

describe("feed comments panel routing", () => {
  test("derives the post id from the feed entry instead of manufacturing it", () => {
    expect(postIdForVideoItem([feedEntry("post-1")], "post-1")).toBe("post-1");
    expect(postIdForVideoItem([feedEntry("post-1")], "missing")).toBeNull();
  });

  test("restores only valid comments-panel history state", () => {
    expect(panelFromHistoryState({
      pirateFeedComments: { itemId: "video-1", postId: "post-1" },
    })).toEqual({ itemId: "video-1", kind: "comments", postId: "post-1" });
    expect(panelFromHistoryState({ pirateFeedComments: { itemId: "video-1" } })).toEqual({ kind: "none" });
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

describe("videoImpressionAnalyticsProperties", () => {
  test("keeps ranking signals bounded and excludes media URLs", () => {
    const properties = videoImpressionAnalyticsProperties({
      id: "pst_video",
      communityId: "cmt_video",
      commentCount: 0,
      karaoke: "unavailable",
      likeCount: 0,
      media: {
        orientation: "portrait",
        posterSrc: "https://private.example/poster",
        src: "https://private.example/video",
      },
      publisher: { handle: "artist", kind: "profile" },
      study: "unavailable",
    }, {
      completionRatio: 0.876543,
      durationSeconds: 12.34567,
      dwellMs: 9_876,
      muted: false,
      playbackSeconds: 10.98765,
      position: 3,
      replayCount: 1,
      soundOnAtAnyPoint: true,
    });

    expect(properties).toEqual({
      completion_ratio: 0.8765,
      duration_seconds: 12.346,
      dwell_ms: 9_876,
      muted: false,
      orientation: "portrait",
      playback_seconds: 10.988,
      position: 3,
      publisher_kind: "profile",
      replay_count: 1,
      sound_on: true,
    });
    expect(JSON.stringify(properties)).not.toContain("private.example");
  });
});

describe("checkoutPathForFeedSlot", () => {
  const slot = {
    available: true,
    endUtc: "2026-07-24T10:30:00.000Z",
    priceCents: 3500,
    startUtc: "2026-07-24T10:00:00.000Z",
  };

  test("keeps unattributed booking entry points on the global checkout", () => {
    expect(checkoutPathForFeedSlot("usr/host", slot)).toBe(
      "/book/usr%2Fhost/checkout?end=2026-07-24T10%3A30%3A00.000Z&start=2026-07-24T10%3A00%3A00.000Z",
    );
  });

  test("carries the captured feed community through the checkout route", () => {
    expect(checkoutPathForFeedSlot("usr/host", slot, "com/feed")).toBe(
      "/c/com%2Ffeed/book/usr%2Fhost/checkout?end=2026-07-24T10%3A30%3A00.000Z&start=2026-07-24T10%3A00%3A00.000Z",
    );
  });
});
