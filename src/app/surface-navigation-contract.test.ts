import { describe, expect, test } from "bun:test";

import { resolveSurfaceNavigationHref } from "@/app/surface-navigation-contract";

describe("resolveSurfaceNavigationHref", () => {
  test("links sovereign app video and thread routes reciprocally", () => {
    expect(resolveSurfaceNavigationHref({
      kind: "community",
      path: "/c/community-route/threads",
      communityId: "community_test",
      importedRootCommunityRoute: "community-route",
      importedRootHostname: "community-root",
      isImportedRoot: true,
    })).toBe("/");
    expect(resolveSurfaceNavigationHref({
      kind: "community-videos",
      path: "/",
      communityId: "community_test",
      importedRootCommunityRoute: "community-route",
      importedRootHostname: "community-root",
      isImportedRoot: true,
    })).toBe("/c/community-route/threads");
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
