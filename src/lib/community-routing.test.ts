import { describe, expect, test } from "bun:test";

import { buildCommunityPath } from "./community-routing";

describe("buildCommunityPath", () => {
  test("prefers the route slug when available", () => {
    expect(buildCommunityPath("cmt_test", "builders")).toBe("/c/builders");
  });

  test("keeps Spaces route markers readable", () => {
    expect(buildCommunityPath("cmt_test", "@xn--t77hga")).toBe("/c/@xn--t77hga");
  });

  test("falls back to the community id when no route slug exists", () => {
    expect(buildCommunityPath("cmt_test", null)).toBe("/c/cmt_test");
  });
});
