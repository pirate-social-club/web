import { describe, expect, test } from "bun:test";

import { extractPublicProfileHost, matchRoute } from "./router";

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
  });

  test("ignores reserved or nested subdomains", () => {
    expect(extractPublicProfileHost("api.pirate")).toBe(null);
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
    expectJson(matchRoute("/c/community-123/mod/agents"), {
      kind: "community-moderation",
      path: "/c/community-123/mod/agents",
      communityId: "community-123",
      section: "agents",
    });
  });

  test("matches settings agent routes from path routes", () => {
    expectJson(matchRoute("/settings/agents"), {
      kind: "settings",
      path: "/settings/agents",
      section: "agents",
    });
  });

  test("matches post routes from path routes", () => {
    expectJson(matchRoute("/p/pst_cf89c73fe60641debd05c939252a870c"), {
      kind: "post",
      path: "/p/pst_cf89c73fe60641debd05c939252a870c",
      postId: "pst_cf89c73fe60641debd05c939252a870c",
    });
  });
});
