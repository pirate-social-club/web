import { describe, expect, test } from "bun:test";

import { communitySurfaceHrefs } from "./community-surface-navigation";

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

  test("connects an imported app origin back to its sovereign video root", () => {
    expect(communitySurfaceHrefs({
      communityId: "com_cmt_test",
      importedRootHostname: "test-community",
    })).toEqual({
      threads: "https://app.test-community/",
      videos: "https://test-community/",
    });
  });
});
