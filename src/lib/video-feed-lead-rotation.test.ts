import { beforeEach, describe, expect, test } from "bun:test";

import {
  clearSessionSeenVideoIds,
  countSeenSessionVideoIds,
  MAX_RECENT_LEAD_IDS,
  MAX_SESSION_SEEN_VIDEO_IDS,
  readSessionSeenVideoIds,
  recordSessionSeenVideoIds,
  rotateToUnseenLead,
  takeUnseenSessionVideos,
  withRecentLeadVideoId,
} from "./video-feed-lead-rotation";

const id = (value: string) => value;

describe("rotateToUnseenLead", () => {
  test("leads with the highest-ranked item that is not a recent lead", () => {
    expect(rotateToUnseenLead(["a", "b", "c", "d"], id, ["a", "b"])).toEqual([
      "c",
      "d",
      "a",
      "b",
    ]);
  });

  test("leaves the order alone when the top item is already unseen", () => {
    expect(rotateToUnseenLead(["a", "b", "c"], id, ["c"])).toEqual(["a", "b", "c"]);
  });

  test("leaves the order alone when every item is a recent lead", () => {
    // A viewer who has led on the whole corpus still gets a full feed rather
    // than an empty one — this is the property a seen-filter would break.
    expect(rotateToUnseenLead(["a", "b"], id, ["a", "b"])).toEqual(["a", "b"]);
  });

  test("is identity for empty and single-item pages", () => {
    expect(rotateToUnseenLead([], id, ["a"])).toEqual([]);
    expect(rotateToUnseenLead(["a"], id, ["a"])).toEqual(["a"]);
  });

  test("preserves page membership so pagination stays coherent", () => {
    const items = ["a", "b", "c", "d", "e"];
    const rotated = rotateToUnseenLead(items, id, ["a", "b", "c"]);
    expect([...rotated].sort()).toEqual([...items].sort());
    expect(rotated).toHaveLength(items.length);
  });

  test("moves the skipped prefix to the end in its original order", () => {
    expect(rotateToUnseenLead(["a", "b", "c", "d"], id, ["a", "b"]).slice(2)).toEqual([
      "a",
      "b",
    ]);
  });

  test("does not mutate the input", () => {
    const items = ["a", "b", "c"];
    rotateToUnseenLead(items, id, ["a"]);
    expect(items).toEqual(["a", "b", "c"]);
  });

  test("reads ids through the accessor", () => {
    const items = [{ postId: "a" }, { postId: "b" }];
    expect(rotateToUnseenLead(items, (item) => item.postId, ["a"])).toEqual([
      { postId: "b" },
      { postId: "a" },
    ]);
  });
});

describe("withRecentLeadVideoId", () => {
  test("puts the newest lead first", () => {
    expect(withRecentLeadVideoId(["a", "b"], "c")).toEqual(["c", "a", "b"]);
  });

  test("deduplicates rather than growing on a repeated lead", () => {
    expect(withRecentLeadVideoId(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  test("evicts oldest first at the cap", () => {
    const full = Array.from({ length: MAX_RECENT_LEAD_IDS }, (_, index) => `id_${index}`);
    const next = withRecentLeadVideoId(full, "fresh");
    expect(next).toHaveLength(MAX_RECENT_LEAD_IDS);
    expect(next[0]).toBe("fresh");
    expect(next).not.toContain(`id_${MAX_RECENT_LEAD_IDS - 1}`);
  });

  test("ignores an empty lead id", () => {
    expect(withRecentLeadVideoId(["a"], "")).toEqual(["a"]);
  });

  test("does not mutate the input", () => {
    const recent = ["a", "b"];
    withRecentLeadVideoId(recent, "c");
    expect(recent).toEqual(["a", "b"]);
  });
});

describe("session seen video ids", () => {
  // Module-level state: without this a leftover id from one test silently
  // changes what the next one is asserting.
  beforeEach(clearSessionSeenVideoIds);

  test("returns only videos this session has not been served", () => {
    recordSessionSeenVideoIds(["a", "b"]);
    expect(takeUnseenSessionVideos(["a", "b", "c", "d"], id)).toEqual(["c", "d"]);
  });

  test("records what it hands out, so the next page cannot repeat it", () => {
    expect(takeUnseenSessionVideos(["a", "b"], id)).toEqual(["a", "b"]);
    expect(takeUnseenSessionVideos(["b", "c"], id)).toEqual(["c"]);
  });

  test("deduplicates within a single page", () => {
    expect(takeUnseenSessionVideos(["a", "a", "b"], id)).toEqual(["a", "b"]);
  });

  test("skips items without an id", () => {
    expect(takeUnseenSessionVideos(["", "a"], id)).toEqual(["a"]);
  });

  test("counts prior sightings without recording anything", () => {
    recordSessionSeenVideoIds(["a"]);
    expect(countSeenSessionVideoIds(["a", "b"])).toBe(1);
    expect(readSessionSeenVideoIds()).toEqual(["a"]);
  });

  test("enforces the cap on ids recorded through the filter, not just the writer", () => {
    // The filter is the path every real caller takes. A cap that only the
    // explicit writer applied would never fire in production.
    const ids = Array.from({ length: MAX_SESSION_SEEN_VIDEO_IDS + 25 }, (_, index) => `v${index}`);
    takeUnseenSessionVideos(ids, id);
    expect(readSessionSeenVideoIds()).toHaveLength(MAX_SESSION_SEEN_VIDEO_IDS);
  });

  test("evicts oldest first, keeping the most recently served ids", () => {
    const ids = Array.from({ length: MAX_SESSION_SEEN_VIDEO_IDS + 2 }, (_, index) => `v${index}`);
    recordSessionSeenVideoIds(ids);
    const retained = readSessionSeenVideoIds();
    expect(retained[0]).toBe("v2");
    expect(retained.at(-1)).toBe(`v${MAX_SESSION_SEEN_VIDEO_IDS + 1}`);
  });

  test("clears back to empty", () => {
    recordSessionSeenVideoIds(["a"]);
    clearSessionSeenVideoIds();
    expect(readSessionSeenVideoIds()).toEqual([]);
    expect(takeUnseenSessionVideos(["a"], id)).toEqual(["a"]);
  });
});
