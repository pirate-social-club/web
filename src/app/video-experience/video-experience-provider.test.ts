import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

import { mergeSeededVideoItems } from "./merge-seeded-video-items";

function video(id: string): VideoFeedItem {
  return {
    commentCount: 0,
    id,
    karaoke: "unavailable",
    likeCount: 0,
    media: { orientation: "portrait", src: `https://media.test/${id}.mp4` },
    publisher: { handle: "artist", kind: "profile" },
    study: "unavailable",
  };
}

describe("mergeSeededVideoItems", () => {
  test("keeps the clicked video first and removes its ranked duplicate", () => {
    expect(mergeSeededVideoItems(video("seed"), [
      video("ranked-a"),
      video("seed"),
      video("ranked-b"),
    ]).map((item) => item.id)).toEqual(["seed", "ranked-a", "ranked-b"]);
  });
});
