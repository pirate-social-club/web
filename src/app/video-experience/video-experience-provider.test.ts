import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

import {
  globalVideoCommentsHistoryState,
  globalVideoPanelFromHistoryState,
  mergeSeededVideoItems,
} from "./video-experience-provider";

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

describe("global video comments history", () => {
  test("layers comments over the video entry without losing its history state", () => {
    const state = globalVideoCommentsHistoryState(
      { pirateVideoExperience: { postId: "video-a" }, route: "community" },
      "video-a",
      "post-a",
    );

    expect(state).toEqual({
      pirateGlobalVideoComments: { itemId: "video-a", postId: "post-a" },
      pirateVideoExperience: { postId: "video-a" },
      route: "community",
    });
    expect(globalVideoPanelFromHistoryState(state)).toEqual({
      itemId: "video-a",
      kind: "comments",
      postId: "post-a",
    });
  });

  test("ignores malformed comments state", () => {
    expect(globalVideoPanelFromHistoryState({
      pirateGlobalVideoComments: { itemId: "video-a" },
    })).toEqual({ kind: "none" });
  });
});
