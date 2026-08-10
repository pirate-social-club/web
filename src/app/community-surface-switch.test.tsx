import { describe, expect, test } from "bun:test";

import { communitySurfaceHrefs } from "./community-surface-switch";

describe("communitySurfaceHrefs", () => {
  test("builds explicit canonical community surface paths", () => {
    expect(communitySurfaceHrefs({
      communityId: "community-id",
      routeSlug: "community-slug",
    })).toEqual({
      threads: "/c/community-slug/threads",
      videos: "/c/community-slug/videos",
    });
  });

  test("crosses origins between sovereign surfaces", () => {
    expect(communitySurfaceHrefs({
      communityId: "community-id",
      importedRootHostname: "community-root",
    })).toEqual({
      threads: "https://app.community-root/",
      videos: "https://community-root/",
    });
  });
});
