import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import { adjacentVideoSourcePostIds, toPageVideoItem, type FeedItem } from "./feed";

const videoItem: FeedItem = {
  id: "post_video",
  post: {
    byline: {
      author: { kind: "user", label: "scarlett" },
      timestampLabel: "now",
    },
    content: {
      type: "video",
      accessMode: "public",
      aspectRatio: 9 / 16,
      caption: "A verse rehearsal.",
      posterSrc: "https://media.test/poster.webp",
      src: "https://media.test/video.mp4",
    },
    engagement: { commentCount: 3, score: 7, upvoteCount: 12, viewerVote: "up" },
  },
};

describe("toPageVideoItem", () => {
  test("uses only the already-loaded card data for a playable viewer item", () => {
    expect(toPageVideoItem(videoItem)).toEqual(expect.objectContaining({
      id: "post_video",
      karaoke: "unavailable",
      likeCount: 12,
      liked: true,
      media: expect.objectContaining({ orientation: "portrait", src: "https://media.test/video.mp4" }),
      publisher: { handle: "scarlett", kind: "profile", avatarSrc: undefined },
      study: "unavailable",
    }));
  });

  test("carries raw booking discovery metadata into the viewer item", () => {
    expect(toPageVideoItem({
      ...videoItem,
      booking: {
        basePriceCents: 3500,
        currency: "USDC",
        hostUserId: "usr_host",
        startingPriceCents: 2500,
      },
    })?.booking).toEqual({
      basePriceCents: 3500,
      currency: "USDC",
      hostUserId: "usr_host",
      startingPriceCents: 2500,
    });
  });

  test("does not invent viewer entries for non-video cards", () => {
    expect(toPageVideoItem({
      ...videoItem,
      post: { ...videoItem.post, content: { type: "text", body: "Not a video" } },
    })).toBeNull();
  });

  test("addresses a linked song through the hydrated source post id", () => {
    const item = toPageVideoItem({
      ...videoItem,
      post: {
        ...videoItem.post,
        content: {
          ...videoItem.post.content,
          upstreamAttributions: [{
            assetId: "asset_song",
            relationshipType: "references_song",
            sourceCommunityId: "com_music",
            sourcePostId: "pst_song",
            title: "Source Song",
          }],
        },
      },
    });

    expect(item?.song).toMatchObject({ sourcePostId: "pst_song", title: "Source Song" });
  });
});

describe("adjacentVideoSourcePostIds", () => {
  test("prefetches capability metadata for only the active and adjacent slides", () => {
    const items = ["pst_one", "pst_two", "pst_three", "pst_four"].map((sourcePostId, index) => ({
      id: `video_${index}`,
      publisher: { handle: "pirate", kind: "profile" as const },
      commentCount: 0,
      karaoke: "unavailable" as const,
      likeCount: 0,
      media: { orientation: "portrait" as const, posterSrc: "poster" },
      song: { artist: "", sourcePostId, title: sourcePostId },
      study: "unavailable" as const,
    }));

    expect(adjacentVideoSourcePostIds(items, 2)).toEqual(["pst_two", "pst_three", "pst_four"]);
  });
});
