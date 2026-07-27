import { describe, expect, test } from "bun:test";

import type { AppRoute } from "@/app/router";
import type { ShellMessages } from "@/locales";

import {
  activeSidebarItem,
  buildMediaSpineItems,
  buildResourceItems,
  buildSidebarSections,
  buildVideoPrimaryItems,
  resolveCreatePostPath,
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

  test("shows the plain display name for unverified communities without a slug", () => {
    const sections = buildSidebarSections(
      {
        sections: [{ id: "recent", label: "Recent", items: [] }],
      } as unknown as ShellMessages["appSidebar"],
      [{
        avatarSrc: null,
        communityId: "com_cmt_be13447e169a49209b2dc207fc4574c0856e",
        displayName: "Garage Tapes",
        routeSlug: null,
        updatedAt: "2026-04-29T00:00:00.000Z",
      }],
      [],
      false,
    );

    const item = sections[0]?.items[0];
    expect(item?.label).toBe("Garage Tapes");
    expect(item?.label).not.toContain("c/");
  });

  test("falls back to the truncated community id when the display name is the id", () => {
    const communityId = "com_cmt_be13447e169a49209b2dc207fc4574c0856e";
    const sections = buildSidebarSections(
      {
        sections: [{ id: "recent", label: "Recent", items: [] }],
      } as unknown as ShellMessages["appSidebar"],
      [{
        avatarSrc: null,
        communityId,
        displayName: communityId,
        routeSlug: null,
        updatedAt: "2026-04-29T00:00:00.000Z",
      }],
      [],
      false,
    );

    expect(sections[0]?.items[0]?.label).toBe("c/com_cmt...856e");
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

describe("buildMediaSpineItems", () => {
  const account = {
    avatarFallback: "Pirate User",
    onProfileSelect: () => undefined,
    onWalletSelect: () => undefined,
    profileLabel: "Profile",
    walletLabel: "Wallet",
  };

  test("anchors Profile below Wallet and Upload at the bottom of the spine", () => {
    const items = buildMediaSpineItems({
      videoActivityLabel: "Activity",
      videoChatLabel: "Chat",
      videoExploreLabel: "Explore",
      videoForYouLabel: "For You",
      videoLiveLabel: "Live",
      videoUploadLabel: "Upload",
    } as ShellMessages["appSidebar"], account);

    expect(items.map((item) => item.id)).toEqual([
      "home",
      "community-feed",
      "live",
      "chat",
      "activity",
      "wallet",
      "upload",
      "profile",
    ]);
  });

  test("keeps the generic Profile icon until a session avatar is supplied", () => {
    const signedOut = buildMediaSpineItems({} as ShellMessages["appSidebar"], account);
    expect(signedOut.at(-1)?.avatarSrc).toBeUndefined();

    const signedIn = buildMediaSpineItems({} as ShellMessages["appSidebar"], {
      ...account,
      avatarSeed: "usr_1",
      avatarSrc: null,
    });
    expect(signedIn.at(-1)?.avatarSrc).toBeNull();
    expect(signedIn.at(-1)?.avatarFallback).toBe("Pirate User");
    expect(signedIn.at(-1)?.avatarSeed).toBe("usr_1");
  });

  test("carries unread counts onto the Chat and Activity items only", () => {
    const items = buildMediaSpineItems({} as ShellMessages["appSidebar"], {
      ...account,
      unreadActivityCount: 5,
      unreadChatCount: 2,
    });

    expect(items.find((item) => item.id === "activity")?.badgeCount).toBe(5);
    expect(items.find((item) => item.id === "chat")?.badgeCount).toBe(2);
    expect(items.find((item) => item.id === "wallet")?.badgeCount).toBeUndefined();
    expect(items.find((item) => item.id === "profile")?.badgeCount).toBeUndefined();
  });
});

describe("activeSidebarItem", () => {
  test("highlights the wallet and profile sidebar entries on their routes", () => {
    expect(activeSidebarItem({ kind: "wallet", path: "/wallet" })).toBe("wallet");
    expect(activeSidebarItem({ kind: "me", path: "/me" } as AppRoute)).toBe("profile");
  });

  test("maps the Best feed route to the visible For You spine item", () => {
    expect(activeSidebarItem({ kind: "popular", path: "/popular" })).toBe("home");
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
