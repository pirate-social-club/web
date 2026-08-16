import { describe, expect, test } from "bun:test";
import type { InfiniteData } from "@tanstack/query-core";
import { flattenPublicVideoFeedPages } from "../components/public-video-feed-data";
import type { PublicVideoFeedPage } from "./api/public-feed";

function page(ids: string[], next_cursor: string | null): PublicVideoFeedPage {
  return {
    items: ids.map(id => ({ post: { post: { id } } })),
    next_cursor,
  };
}

describe("public video feed data", () => {
  test("flattens infinite-query pages without mirroring them into signals", () => {
    const data: InfiniteData<PublicVideoFeedPage, string | null> = {
      pages: [page(["one", "two"], "cursor-1"), page(["two", "three"], null)],
      pageParams: [null, "cursor-1"],
    };

    expect(flattenPublicVideoFeedPages(data).map(item => item.post.post.id)).toEqual(["one", "two", "three"]);
  });
});
