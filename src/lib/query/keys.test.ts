import { describe, expect, test } from "bun:test";

import { feedKeys } from "./keys";

describe("feedKeys.home", () => {
  test("isolates viewer-shaped Explore payloads across account switches", () => {
    const shared = { locale: "en", sort: "best", timeRange: null };

    expect(feedKeys.home({ ...shared, userId: "usr_a" })).not.toEqual(
      feedKeys.home({ ...shared, userId: "usr_b" }),
    );
    expect(feedKeys.home({ ...shared, userId: null })).toEqual([
      "feed",
      "home",
      null,
      "en",
      "best",
      null,
    ]);
  });
});
