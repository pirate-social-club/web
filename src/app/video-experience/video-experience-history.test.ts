import { describe, expect, test } from "bun:test";

import {
  hrefWithVideo,
  hrefWithoutVideo,
  historyStateWithoutVideo,
  isVideoExperienceHistoryState,
  VIDEO_EXPERIENCE_HISTORY_KEY,
  videoIdFromLocation,
} from "./video-experience-history";

describe("video experience history", () => {
  test("adds and removes the selected video without disturbing the route", () => {
    const opened = hrefWithVideo("https://pirate.test/c/music?sort=new#latest", "pst/video");

    expect(opened).toBe("/c/music?sort=new&video=pst%2Fvideo#latest");
    expect(hrefWithoutVideo(`https://pirate.test${opened}`)).toBe("/c/music?sort=new#latest");
  });

  test("reads only a non-empty video identity", () => {
    expect(videoIdFromLocation({ href: "https://pirate.test/u/artist?video=pst_1" } as Location)).toBe("pst_1");
    expect(videoIdFromLocation({ href: "https://pirate.test/u/artist?video=" } as Location)).toBeNull();
  });

  test("distinguishes viewer-owned entries from direct deep links", () => {
    expect(isVideoExperienceHistoryState({
      [VIDEO_EXPERIENCE_HISTORY_KEY]: { postId: "pst_1" },
    })).toBe(true);
    expect(isVideoExperienceHistoryState({})).toBe(false);
    expect(isVideoExperienceHistoryState(null)).toBe(false);
  });

  test("removes only viewer-owned state before an in-app navigation", () => {
    expect(historyStateWithoutVideo({
      routePanel: { kind: "comments" },
      [VIDEO_EXPERIENCE_HISTORY_KEY]: { postId: "pst_1" },
    })).toEqual({ routePanel: { kind: "comments" } });
  });
});
