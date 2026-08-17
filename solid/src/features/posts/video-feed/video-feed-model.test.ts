import { describe, expect, test } from "bun:test";

import { canPlayVideo, getMediaWindowIds, getVideoFeedActionLabel, narrowVideoFeedItems, toVerticalFeedPost } from "./video-feed-model";
import type { VideoFeedItem } from "./video-feed.types";

const item = (overrides: Partial<VideoFeedItem> = {}): VideoFeedItem => ({
  id: "video-1",
  publisher: { handle: "mara.english", kind: "profile" },
  commentCount: 4,
  interactionGate: "open",
  karaoke: "ready",
  likeCount: 10,
  media: { orientation: "portrait", src: "data:video/mp4;base64,AAAA", posterSrc: "data:image/svg+xml,offline" },
  study: "ready",
  ...overrides,
});

describe("video feed model", () => {
  test("narrowly maps playable and gated media without changing identity", () => {
    expect(canPlayVideo(item())).toBe(true);
    expect(canPlayVideo(item({ viewerState: "age_proof_required" }))).toBe(false);
    expect(toVerticalFeedPost(item()).id).toBe("video-1");
  });

  test("keeps action gates explicit and computes a bounded media window", () => {
    const gated = item({ interactionGate: "membership_required" });
    expect(getVideoFeedActionLabel(gated)).toContain("Join");
    const items = [item({ id: "a" }), item({ id: "b" }), item({ id: "c" }), item({ id: "d" })];
    expect(getMediaWindowIds(items, 2, 1)).toEqual(["b", "c", "d"]);
    expect(narrowVideoFeedItems(items)).toHaveLength(4);
  });

  test("does not invent follow state for a follow controller", () => {
    const followable = item({
      publisher: {
        handle: "mara.english",
        kind: "profile",
        relationship: {
          kind: "follow",
          ownProfile: false,
          targetUserId: "usr_mara",
          targetWalletAddress: "0x0000000000000000000000000000000000000001",
        },
      },
    });
    expect(toVerticalFeedPost(followable).isFollowing).toBeUndefined();
  });
});
