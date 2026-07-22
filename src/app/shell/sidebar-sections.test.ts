import { describe, expect, test } from "bun:test";

import type { ShellMessages } from "@/locales";

import { buildPrimaryItems, buildResourceItems, buildSidebarSections, resolveCreatePostPath } from "./sidebar-sections";

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
  test("keeps one-time domain purchase out of primary navigation", () => {
    const items = buildPrimaryItems({
      agentsLabel: "Agents",
      createCommunityLabel: "Create",
      feedSortBestLabel: "Popular",
      homeLabel: "Home",
      namesLabel: "Names",
      yourCommunitiesLabel: "Your communities",
    } as ShellMessages["appSidebar"]);

    expect(items.map((item) => item.id)).not.toContain("names");
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
