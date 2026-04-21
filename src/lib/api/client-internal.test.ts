import { describe, expect, test } from "bun:test";

import { buildQueryPath } from "./client-internal";

describe("buildQueryPath", () => {
  test("returns the base path when no query values are present", () => {
    expect(buildQueryPath("/feed/home", {
      cursor: null,
      limit: 0,
      locale: "",
      include_archived: false,
    })).toBe("/feed/home");
  });

  test("serializes truthy query values", () => {
    expect(buildQueryPath("/feed/home", {
      cursor: "abc",
      limit: 20,
      locale: "ar",
      include_archived: true,
    })).toBe("/feed/home?cursor=abc&limit=20&locale=ar&include_archived=true");
  });
});
