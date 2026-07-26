import { describe, expect, test } from "bun:test";

import {
  MAX_RECENT_LEAD_IDS,
  rotateToUnseenLead,
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
