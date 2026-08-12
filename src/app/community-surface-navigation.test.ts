import { describe, expect, test } from "bun:test";

import { communitySurfaceHrefs, sovereignAppHref } from "./community-surface-navigation";

describe("community surface navigation", () => {
  test("keeps canonical threads and Watch views reciprocal", () => {
    expect(communitySurfaceHrefs({
      communityId: "com_cmt_test",
      routeSlug: "test-community",
    })).toEqual({
      threads: "/c/test-community/threads",
      videos: "/c/test-community/videos",
    });
  });

  test("opens the sovereign video application from the community root", () => {
    expect(sovereignAppHref("community-root")).toBe("https://app.community-root/");
  });

});
