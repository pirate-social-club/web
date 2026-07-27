import { describe, expect, test } from "bun:test";

import type { AppRoute } from "@/app/router";
import type { ShellMessages } from "@/locales";

import {
  activeSidebarItem,
  buildMediaSections,
  buildMediaSpineItems,
  buildResourceItems,
  buildSidebarSections,
  buildVideoPrimaryItems,
  resolveCreatePostPath,
  usesStandaloneRouteShell,
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

  test("skips a display name that would impersonate a community route", () => {
    const sections = buildSidebarSections(
      {
        sections: [{ id: "recent", label: "Recent", items: [] }],
      } as unknown as ShellMessages["appSidebar"],
      [{
        avatarSrc: null,
        communityId: "com_cmt_be13447e169a49209b2dc207fc4574c0856e",
        displayName: "c/garage",
        routeSlug: null,
        updatedAt: "2026-04-29T00:00:00.000Z",
      }],
      [],
      false,
    );

    // No slug means /c/garage does not resolve; fall back to the truncated ID
    // rather than rendering a label that reads as a working route.
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

describe("buildMediaSections", () => {
  const messages = {
    communitiesEmptyLabel: "No communities yet",
    createCommunityLabel: "Create community",
    sections: [{ id: "communities", label: "Communities", items: [] }],
  } as unknown as ShellMessages["appSidebar"];

  const recentSection = {
    id: "recent",
    items: [{ id: "c/com_cmt_1", label: "Garage Tapes" }],
    label: "Recent",
  };

  test("promotes recent communities into the Communities section", () => {
    const [communities] = buildMediaSections(messages, [recentSection]);

    expect(communities?.id).toBe("communities");
    expect(communities?.label).toBe("Communities");
    expect(communities?.items.map((item) => item.id)).toEqual(["c/com_cmt_1"]);
  });

  // The Communities header already reads "Communities"; a nested "Your Communities"
  // row under it rendered as a bare, avatar-less line that looked like a subheading.
  test("does not add a Your Communities row", () => {
    const [communities] = buildMediaSections(messages, [recentSection]);

    expect(communities?.items.some((item) => item.id === "your-communities")).toBe(false);
  });

  test("keeps the create action and an empty label when there are no communities", () => {
    const [communities] = buildMediaSections(messages, []);

    expect(communities?.items).toEqual([]);
    expect(communities?.emptyLabel).toBe("No communities yet");
    // The section cannot be hidden when empty: this action is the only
    // create-community entry point in the media spine.
    expect(communities?.action?.ariaLabel).toBe("Create community");
  });

  test("passes non-recent sections through untouched", () => {
    const moderation = { id: "moderation", items: [], label: "Moderation" };
    const sections = buildMediaSections(messages, [recentSection, moderation]);

    expect(sections.map((section) => section.id)).toEqual(["communities", "moderation"]);
    expect(sections[1]).toBe(moderation);
  });
});


describe("usesStandaloneRouteShell", () => {
  // Regression: community moderation renders its own sidebar, so the app
  // sidebar must not render alongside it on any viewport.
  test("community moderation routes are standalone on desktop and mobile", () => {
    const sectionRoute: AppRoute = {
      kind: "community-moderation",
      path: "/c/@xn--tl8h/mod/queue",
      communityId: "@xn--tl8h",
      section: "queue",
    };
    const indexRoute: AppRoute = {
      kind: "community-moderation-index",
      path: "/c/@xn--tl8h/mod",
      communityId: "@xn--tl8h",
    };

    expect(usesStandaloneRouteShell(sectionRoute, false)).toBe(true);
    expect(usesStandaloneRouteShell(sectionRoute, true)).toBe(true);
    expect(usesStandaloneRouteShell(indexRoute, false)).toBe(true);
    expect(usesStandaloneRouteShell(indexRoute, true)).toBe(true);
  });

  test("regular routes stay inside the unified shell on desktop", () => {
    expect(usesStandaloneRouteShell({ kind: "home", path: "/" }, false)).toBe(false);
  });

  test("mobile standalone routes only apply to the mobile layout", () => {
    const postRoute: AppRoute = { kind: "post", path: "/p/post_1", postId: "post_1" };

    expect(usesStandaloneRouteShell(postRoute, true)).toBe(true);
    expect(usesStandaloneRouteShell(postRoute, false)).toBe(false);
  });

  test("viewer routes are standalone on every viewport", () => {
    const liveRoute: AppRoute = { kind: "live-room", path: "/live/post_1", postId: "post_1" };

    expect(usesStandaloneRouteShell(liveRoute, false)).toBe(true);
    expect(usesStandaloneRouteShell(liveRoute, true)).toBe(true);
  });
});
