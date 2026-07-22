import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import { toPageVideoItem, type FeedItem } from "./feed";

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
    engagement: { commentCount: 3, score: 12, viewerVote: "up" },
  },
};

describe("toPageVideoItem", () => {
  test("uses only the already-loaded card data for a playable viewer item", () => {
    expect(toPageVideoItem(videoItem)).toEqual(expect.objectContaining({
      id: "post_video",
      karaoke: "unavailable",
      liked: true,
      media: expect.objectContaining({ orientation: "portrait", src: "https://media.test/video.mp4" }),
      publisher: { handle: "scarlett", kind: "profile", avatarSrc: undefined },
      study: "unavailable",
    }));
  });

  test("does not invent viewer entries for non-video cards", () => {
    expect(toPageVideoItem({
      ...videoItem,
      post: { ...videoItem.post, content: { type: "text", body: "Not a video" } },
    })).toBeNull();
  });
});
