import { describe, expect, test } from "bun:test";

import { resolveSurfaceNavigationHref } from "@/app/surface-navigation-contract";

describe("resolveSurfaceNavigationHref", () => {
  test("links the sovereign community front door and video app reciprocally", () => {
    expect(resolveSurfaceNavigationHref({
      kind: "community",
      path: "/",
      communityId: "community_test",
      importedRootHostname: "community-root",
      isImportedRoot: true,
    })).toBe("https://app.community-root/");
    expect(resolveSurfaceNavigationHref({
      kind: "community-videos",
      path: "/",
      communityId: "community_test",
      importedRootHostname: "community-root",
      isImportedRoot: true,
    })).toBe("https://community-root/");
  });

  test("links canonical community surfaces reciprocally", () => {
    expect(resolveSurfaceNavigationHref({
      kind: "community",
      path: "/c/community-route/threads",
      communityId: "community_test",
    })).toBe("/c/community-route/videos");
    expect(resolveSurfaceNavigationHref({
      kind: "community-videos",
      path: "/c/community-route/videos",
      communityId: "community_test",
    })).toBe("/c/community-route/threads");
  });

  test("does not invent navigation for unrelated or nested routes", () => {
    expect(resolveSurfaceNavigationHref({ kind: "home", path: "/" })).toBeUndefined();
    expect(resolveSurfaceNavigationHref({
      kind: "community",
      path: "/c/community-route/mod",
      communityId: "community_test",
    })).toBeUndefined();
  });
});
