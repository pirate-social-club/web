import { describe, expect, test } from "bun:test";
import type { PublicVideoFeedItem } from "./api/public-feed";
import { resolveFeedActiveId } from "./public-video-feed-session";

function items(...ids: string[]): PublicVideoFeedItem[] {
  return ids.map(id => ({ post: { post: { id } } }));
}

describe("public video feed session", () => {
  test("restores an active item that still exists", () => {
    expect(resolveFeedActiveId(items("one", "two"), "two")).toBe("two");
  });

  test("falls back when a refreshed feed no longer contains the active item", () => {
    expect(resolveFeedActiveId(items("three", "four"), "two")).toBe("three");
    expect(resolveFeedActiveId([], "two")).toBeNull();
  });
});
