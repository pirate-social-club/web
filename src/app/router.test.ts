import { describe, expect, test } from "bun:test";

import { extractPublicProfileHost, matchRoute } from "./router";

function expectJson(actual: unknown, expected: unknown): void {
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
}

describe("public profile host routing", () => {
  test("extracts pirate handle subdomains from localhost and pirate.sc hosts", () => {
    expectJson(extractPublicProfileHost("captain.localhost"), {
      handleLabel: "captain",
      hostSuffix: "localhost",
    });
    expectJson(extractPublicProfileHost("captain.pirate.sc"), {
      handleLabel: "captain",
      hostSuffix: "pirate.sc",
    });
    expectJson(extractPublicProfileHost("captain.staging.pirate.sc"), {
      handleLabel: "captain",
      hostSuffix: "staging.pirate.sc",
    });
  });

  test("ignores reserved or nested subdomains", () => {
    expect(extractPublicProfileHost("api.pirate.sc")).toBe(null);
    expect(extractPublicProfileHost("captain.dev.pirate.sc")).toBe(null);
    expect(extractPublicProfileHost("localhost")).toBe(null);
  });

  test("matches public profile routes from host before path routes", () => {
    expectJson(matchRoute("/", "captain.pirate.sc"), {
      kind: "public-profile",
      path: "/",
      handleLabel: "captain",
      hostSuffix: "pirate.sc",
    });
    expectJson(matchRoute("/settings/profile", "captain.localhost"), {
      kind: "public-profile",
      path: "/settings/profile",
      handleLabel: "captain",
      hostSuffix: "localhost",
    });
    expectJson(matchRoute("/", "captain.staging.pirate.sc"), {
      kind: "public-profile",
      path: "/",
      handleLabel: "captain",
      hostSuffix: "staging.pirate.sc",
    });
  });
});
