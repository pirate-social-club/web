import { describe, expect, test } from "bun:test";

import type { ShellMessages } from "@/locales";

import {
  buildPrimaryItems,
  buildResourceItems,
  buildSidebarSections,
  buildVideoPrimaryItems,
  resolveCreatePostPath,
  usesVideoDesktopShell,
} from "./sidebar-sections";

describe("resolveCreatePostPath", () => {
  test("canonicalizes emoji community handles for submit routes", () => {
    expect(resolveCreatePostPath({
      kind: "community",
      path: "/c/@🇵🇸",
      communityId: "@🇵🇸",
    })).toBe("/c/@xn--t77hga/submit");
  });

  test("keeps canonical Spaces route markers readable for submit routes", () => {
    expect(resolveCreatePostPath({
      kind: "community",
      path: "/c/@xn--t77hga",
      communityId: "@xn--t77hga",
    })).toBe("/c/@xn--t77hga/submit");
  });

  test("keeps the current community route segment for submit routes", () => {
    expect(resolveCreatePostPath({
      kind: "community",
      path: "/c/@xn--t77hga",
      communityId: "cmt_be13447e169a49209b2dc207fc4574c0",
    })).toBe("/c/@xn--t77hga/submit");
  });
});

describe("buildSidebarSections", () => {
  test("uses verified route slugs for sidebar moderation navigation and labels", () => {
    const sections = buildSidebarSections(
      {
        sections: [{ id: "moderation", label: "Moderation", items: [] }],
      } as unknown as ShellMessages["appSidebar"],
      [],
      [{
        avatarSrc: null,
        communityId: "cmt_be13447e169a49209b2dc207fc4574c0",
        displayName: "Palestine",
        routeSlug: "@xn--t77hga",
        updatedAt: "2026-04-29T00:00:00.000Z",
      }],
      false,
    );

    const item = sections[0]?.items[0];
    expect(item?.label).toBe("c/@🇵🇸");
  });

  test("skips malformed community summaries without crashing", () => {
    const sections = buildSidebarSections(
      {
        sections: [{ id: "recent", label: "Recent", items: [] }],
      } as unknown as ShellMessages["appSidebar"],
      [{
        avatarSrc: null,
        communityId: undefined,
        displayName: "Broken",
        routeSlug: null,
        updatedAt: "2026-04-29T00:00:00.000Z",
      } as never],
      [],
      false,
    );

    expect(sections).toEqual([]);
  });
});

describe("buildPrimaryItems", () => {
  test("uses Home and Community Feed without a duplicate Popular destination", () => {
    const items = buildPrimaryItems({
      agentsLabel: "Agents",
      communityFeedLabel: "Community Feed",
      createCommunityLabel: "Create",
      feedSortBestLabel: "Popular",
      homeLabel: "Home",
      namesLabel: "Names",
      yourCommunitiesLabel: "Your communities",
    } as ShellMessages["appSidebar"]);

    expect(items.map((item) => item.id)).not.toContain("names");
    expect(items.map((item) => item.id)).toEqual([
      "home",
      "community-feed",
      "your-communities",
      "create-community",
    ]);
  });
});

describe("buildVideoPrimaryItems", () => {
  test("builds the settled six-item desktop media spine without Agents", () => {
    const items = buildVideoPrimaryItems({
      videoActivityLabel: "Activity",
      videoChatLabel: "Chat",
      videoExploreLabel: "Explore",
      videoForYouLabel: "For You",
      videoLiveLabel: "Live",
      videoUploadLabel: "Upload",
    } as ShellMessages["appSidebar"]);

    expect(items.map((item) => item.id)).toEqual([
      "home",
      "community-feed",
      "live",
      "chat",
      "upload",
      "activity",
    ]);
    expect(items.map((item) => item.id)).not.toContain("agents");
  });
});

describe("usesVideoDesktopShell", () => {
  test("keeps home surface-scoped while preserving the media rail across its destinations", () => {
    expect(usesVideoDesktopShell({ kind: "home", path: "/" }, false)).toBe(false);
    expect(usesVideoDesktopShell({ kind: "home", path: "/" }, true)).toBe(true);
    expect(usesVideoDesktopShell({ kind: "community-feed", path: "/feed" }, false)).toBe(true);
    expect(usesVideoDesktopShell({ kind: "live", path: "/live" }, false)).toBe(true);
    expect(usesVideoDesktopShell({ kind: "inbox", path: "/inbox" }, false)).toBe(true);
  });
});

describe("buildResourceItems", () => {
  test("maps account deletion resources to an icon and route", () => {
    const [item] = buildResourceItems({
      resourceItems: [{ id: "account-deletion", label: "Delete account" }],
    } as unknown as ShellMessages["appSidebar"]);

    expect(item?.icon).toBeDefined();
    expect(typeof item?.onSelect).toBe("function");
  });
});
