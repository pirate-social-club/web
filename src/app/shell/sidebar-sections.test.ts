import { describe, expect, test } from "bun:test";

import type { AppRoute } from "@/app/router";
import type { ShellMessages } from "@/locales";

import {
  activeSidebarItem,
  buildResourceItems,
  buildSidebarSections,
  buildVideoPrimaryItems,
  resolveCreatePostPath,
  usesHeaderlessDesktopLayout,
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

describe("buildVideoPrimaryItems", () => {
  test("builds the settled six-item desktop media spine with Upload last and without Agents", () => {
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
      "activity",
      "upload",
    ]);
    expect(items.map((item) => item.id)).not.toContain("agents");
  });
});

describe("activeSidebarItem", () => {
  test("highlights the wallet and profile sidebar entries on their routes", () => {
    expect(activeSidebarItem({ kind: "wallet", path: "/wallet" })).toBe("wallet");
    expect(activeSidebarItem({ kind: "me", path: "/me" } as AppRoute)).toBe("profile");
  });
});

describe("usesHeaderlessDesktopLayout", () => {
  test("selects headerless destinations synchronously from the route", () => {
    expect(usesHeaderlessDesktopLayout({ kind: "home", path: "/" })).toBe(true);
    expect(usesHeaderlessDesktopLayout({ kind: "community-feed", path: "/feed" })).toBe(true);
    expect(usesHeaderlessDesktopLayout({ kind: "live", path: "/live" })).toBe(true);
    expect(usesHeaderlessDesktopLayout({ kind: "inbox", path: "/inbox" })).toBe(true);
    expect(usesHeaderlessDesktopLayout({
      kind: "community-moderation",
      path: "/c/cmt_123/mod/queue",
      communityId: "cmt_123",
      section: "queue",
    } as AppRoute)).toBe(true);
    expect(usesHeaderlessDesktopLayout({
      kind: "community-moderation-index",
      path: "/c/cmt_123/mod",
      communityId: "cmt_123",
    } as AppRoute)).toBe(true);
    expect(usesHeaderlessDesktopLayout({ kind: "settings-index", path: "/settings" })).toBe(false);
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
