import { describe, expect, test } from "bun:test";

import {
  canonicalizeRoutePathname,
  isNativePublicIdentityRoute,
  matchRoute,
  matchRouteWithImportedRootCommunity,
  resolveHydrationPathname,
} from "./router";
import { extractPublicProfileHost } from "@/lib/public-host";

function expectJson(actual: unknown, expected: unknown): void {
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
}

describe("public profile host routing", () => {
  test("extracts pirate handle hosts from localhost and hns domains", () => {
    expectJson(extractPublicProfileHost("captain.localhost"), {
      handleLabel: "captain",
      hostSuffix: "localhost",
    });
    expectJson(extractPublicProfileHost("captain.pirate"), {
      handleLabel: "captain",
      hostSuffix: "pirate",
    });
    expectJson(extractPublicProfileHost("captain.clawitzer"), {
      handleLabel: "captain",
      hostSuffix: "clawitzer",
    });
  });

  test("ignores reserved or nested subdomains", () => {
    expect(extractPublicProfileHost("api.pirate")).toBe(null);
    expect(extractPublicProfileHost("app.pirate")).toBe(null);
    expect(extractPublicProfileHost("captain.dev.pirate")).toBe(null);
    expect(extractPublicProfileHost("localhost")).toBe(null);
  });

  test("matches public profile routes from host and path routes", () => {
    expectJson(matchRoute("/", "captain.pirate"), {
      kind: "public-profile",
      path: "/",
      handleLabel: "captain",
      hostSuffix: "pirate",
    });
    expectJson(matchRoute("/settings/profile", "captain.localhost"), {
      kind: "public-profile",
      path: "/settings/profile",
      handleLabel: "captain",
      hostSuffix: "localhost",
    });
    expectJson(matchRoute("/u/captain.pirate", "pirate.sc"), {
      kind: "public-profile",
      path: "/u/captain.pirate",
      handleLabel: "captain.pirate",
      hostSuffix: null,
    });
  });

  test("only native public identity hosts use the standalone public shell", () => {
    expect(isNativePublicIdentityRoute(matchRoute("/", "captain.pirate"))).toBe(true);
    expect(isNativePublicIdentityRoute(matchRoute("/u/captain.pirate", "pirate.sc"))).toBe(false);
    expect(isNativePublicIdentityRoute(matchRoute("/a/night-signal.clawitzer", "pirate.sc"))).toBe(false);
  });

  test("matches public agent routes from clawitzer host routes", () => {
    expectJson(matchRoute("/", "night-signal.clawitzer"), {
      kind: "public-agent",
      path: "/",
      handleLabel: "night-signal",
      hostSuffix: "clawitzer",
    });
  });

  test("matches community moderation sections from path routes", () => {
    expectJson(matchRoute("/c/community-123/mod"), {
      kind: "community-moderation-index",
      path: "/c/community-123/mod",
      communityId: "community-123",
    });
    expectJson(matchRoute("/c/community-123/mod/links"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/links",
      communityId: "community-123",
      section: "links",
    });
    expectJson(matchRoute("/c/community-123/mod/rights"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/rights",
      communityId: "community-123",
      section: "rights",
    });
    expectJson(matchRoute("/c/community-123/mod/labels"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/labels",
      communityId: "community-123",
      section: "labels",
    });
    expectJson(matchRoute("/c/community-123/mod/donations"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/donations",
      communityId: "community-123",
      section: "donations",
    });
    expectJson(matchRoute("/c/community-123/mod/pricing"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/pricing",
      communityId: "community-123",
      section: "pricing",
    });
    expectJson(matchRoute("/c/community-123/mod/requests"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/requests",
      communityId: "community-123",
      section: "requests",
    });
    expectJson(matchRoute("/c/community-123/mod/agents"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/agents",
      communityId: "community-123",
      section: "agents",
    });
    expectJson(matchRoute("/c/community-123/mod/assistant"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/assistant",
      communityId: "community-123",
      section: "assistant",
    });
    expectJson(matchRoute("/c/community-123/mod/study"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/study",
      communityId: "community-123",
      section: "study",
    });
    expectJson(matchRoute("/c/community-123/mod/telegram"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/telegram",
      communityId: "community-123",
      section: "telegram",
    });
    expectJson(matchRoute("/c/community-123/mod/visual-policy"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/visual-policy",
      communityId: "community-123",
      section: "visual-policy",
    });
    expectJson(matchRoute("/c/community-123/mod/machine-access"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/machine-access",
      communityId: "community-123",
      section: "machine-access",
    });
  });

  test("matches dedicated live room viewer routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c/live"), {
      kind: "live-room",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c/live",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches dedicated replay draft routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c/replay"), {
      kind: "post-replay-draft",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c/replay",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches dedicated karaoke routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c/karaoke"), {
      kind: "post-karaoke",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c/karaoke",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches dedicated study routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c/study"), {
      kind: "post-study",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c/study",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches dedicated streak leaderboard routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c/streaks"), {
      kind: "post-streaks",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c/streaks",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches settings agent routes from path routes", () => {
    expectJson(matchRoute("/settings"), {
      kind: "settings-index",
      path: "/settings",
    });
    expectJson(matchRoute("/settings/agents"), {
      kind: "settings",
      path: "/settings/agents",
      section: "agents",
    });
  });

  test("matches popular as a primary feed route", () => {
    expectJson(matchRoute("/popular"), {
      kind: "popular",
      path: "/popular",
    });
  });

  test("matches advertise as an authenticated app route", () => {
    expectJson(matchRoute("/advertise"), {
      kind: "advertise",
      path: "/advertise",
    });
  });

  test("matches wallet as a primary route and keeps the old settings URL compatible", () => {
    expectJson(matchRoute("/wallet"), {
      kind: "wallet",
      path: "/wallet",
    });
    expectJson(matchRoute("/settings/wallet"), {
      kind: "wallet",
      path: "/wallet",
    });
  });

  test("matches global booking routes and keeps community discovery URLs compatible", () => {
    expectJson(matchRoute("/settings/bookings"), {
      kind: "booking-host-settings",
      path: "/settings/bookings",
    });
    expectJson(matchRoute("/bookings"), {
      kind: "booking-management",
      path: "/bookings",
      sourceCommunityId: null,
      role: "booker",
    });
    expectJson(matchRoute("/bookings/bkg_123/session"), {
      kind: "booking-session",
      path: "/bookings/bkg_123/session",
      bookingId: "bkg_123",
    });
    expectJson(matchRoute("/c/com_123/bookings"), {
      kind: "booking-management",
      path: "/c/com_123/bookings",
      sourceCommunityId: "com_123",
      role: "booker",
    });
    expectJson(matchRoute("/c/com_123/bookings/bkg_123/session"), {
      kind: "booking-session",
      path: "/c/com_123/bookings/bkg_123/session",
      bookingId: "bkg_123",
    });
    expectJson(matchRoute("/c/com_123/book/usr_456"), {
      kind: "booking-public",
      path: "/c/com_123/book/usr_456",
      communityId: "com_123",
      hostUserId: "usr_456",
    });
    expectJson(matchRoute("/c/com_123/book/usr_456/checkout"), {
      kind: "booking-checkout",
      path: "/c/com_123/book/usr_456/checkout",
      communityId: "com_123",
      hostUserId: "usr_456",
    });
    // Canonical global booking routes (no community context → communityId null).
    expectJson(matchRoute("/book/usr_456"), {
      kind: "booking-public",
      path: "/book/usr_456",
      communityId: null,
      hostUserId: "usr_456",
    });
    expectJson(matchRoute("/book/usr_456/checkout"), {
      kind: "booking-checkout",
      path: "/book/usr_456/checkout",
      communityId: null,
      hostUserId: "usr_456",
    });
  });

  test("matches post routes from path routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c"), {
      kind: "post",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });

  test("matches Telegram Mini App routes from path routes", () => {
    expectJson(matchRoute("/tg"), {
      kind: "telegram-mini-app",
      path: "/tg",
    });
    expectJson(matchRoute("/tg/exchange"), {
      kind: "telegram-exchange",
      path: "/tg/exchange",
    });
    expectJson(matchRoute("/tg/self-return"), {
      kind: "telegram-self-return",
      path: "/tg/self-return",
    });
    expectJson(matchRoute("/tg/self-return/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c"), {
      kind: "telegram-self-return",
      path: "/tg/self-return/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
      communityId: "com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
    });
    expectJson(matchRoute("/tg/join/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c"), {
      kind: "telegram-join",
      path: "/tg/join/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
      communityId: "com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
    });
    expectJson(matchRoute("/tg/verify/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c"), {
      kind: "telegram-verify",
      path: "/tg/verify/com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
      communityId: "com_cmt_58a12a18213c4bf4a1e6b9343dc3702c",
    });
    expectJson(matchRoute("/tg/c/captain-club"), {
      kind: "telegram-community",
      path: "/tg/c/captain-club",
      communityId: "captain-club",
    });
    expectJson(matchRoute("/tg/p/pst_cf89c73fe60641debd05c939252a870c"), {
      kind: "telegram-post",
      path: "/tg/p/pst_cf89c73fe60641debd05c939252a870c",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });
});

describe("canonicalizeRoutePathname", () => {
  test("normalizes percent-encoded emoji community handles to punycode", () => {
    expect(canonicalizeRoutePathname("/c/@%F0%9F%87%B5%F0%9F%87%B8")).toBe("/c/@xn--t77hga");
  });

  test("normalizes raw emoji community handles to punycode", () => {
    expect(canonicalizeRoutePathname("/c/@🇵🇸")).toBe("/c/@xn--t77hga");
  });

  test("preserves community route suffixes when normalizing", () => {
    expect(canonicalizeRoutePathname("/c/@%F0%9F%87%B5%F0%9F%87%B8/submit")).toBe("/c/@xn--t77hga/submit");
    expect(canonicalizeRoutePathname("/c/@%F0%9F%87%B5%F0%9F%87%B8/mod/links")).toBe("/c/@xn--t77hga/mod/links");
  });

  test("leaves existing canonical and non-community routes unchanged", () => {
    expect(canonicalizeRoutePathname("/c/@xn--t77hga")).toBe("/c/@xn--t77hga");
    expect(canonicalizeRoutePathname("/u/%F0%9F%87%B5%F0%9F%87%B8")).toBe("/u/%F0%9F%87%B5%F0%9F%87%B8");
  });

  test("matches device authorization route", () => {
    expectJson(matchRoute("/authorize-device"), {
      kind: "authorize-device",
      path: "/authorize-device",
    });
  });
});

describe("resolveHydrationPathname", () => {
  test("keeps imported HNS root hydration on the server-resolved community route", () => {
    expect(resolveHydrationPathname({
      initialHostname: "xn--pokmon-dva",
      initialPathname: "/c/xn--pokmon-dva",
      windowHostname: "xn--pokmon-dva",
      windowPathname: "/",
    })).toBe("/c/xn--pokmon-dva");
  });

  test("keeps explicit browser paths instead of replacing them with the initial route", () => {
    expect(resolveHydrationPathname({
      initialHostname: "xn--pokmon-dva",
      initialPathname: "/c/xn--pokmon-dva",
      windowHostname: "xn--pokmon-dva",
      windowPathname: "/p/post-1",
    })).toBe("/p/post-1");
  });
});

describe("matchRouteWithImportedRootCommunity", () => {
  test("maps imported HNS root requests to the resolved community without changing the path", () => {
    expectJson(matchRouteWithImportedRootCommunity(
      "/",
      "xn--pokmon-dva",
      "com_cmt_public_namespace_test",
    ), {
      kind: "community",
      path: "/",
      communityId: "com_cmt_public_namespace_test",
      isImportedRoot: true,
    });
  });

  test("keeps explicit paths on imported HNS roots", () => {
    expectJson(matchRouteWithImportedRootCommunity(
      "/p/post-1",
      "xn--pokmon-dva",
      "com_cmt_public_namespace_test",
    ), {
      kind: "post",
      path: "/p/post-1",
      postId: "post-1",
    });
  });
});
