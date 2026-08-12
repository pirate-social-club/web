import { describe, expect, test } from "bun:test";

import { resolveVideoPublisherHref } from "./video-publisher-href";

describe("resolveVideoPublisherHref", () => {
  test("keeps canonical feed publisher links relative", () => {
    expect(resolveVideoPublisherHref({
      href: "/u/creator.pirate",
      kind: "profile",
    })).toBe("/u/creator.pirate");
  });

  test("sends sovereign creator profiles to canonical Pirate", () => {
    expect(resolveVideoPublisherHref({
      href: "/u/creator.pirate",
      importedRootHostname: "community-root",
      kind: "profile",
    })).toBe("https://pirate.sc/u/creator.pirate");
  });

  test("keeps sovereign community identities on the app origin and selects threads", () => {
    expect(resolveVideoPublisherHref({
      href: "/c/community",
      importedRootHostname: "community-root",
      kind: "community",
    })).toBe("/c/community/threads");
  });

  test("preserves an explicit sovereign community thread route", () => {
    expect(resolveVideoPublisherHref({
      href: "/c/@xn--t77hga/threads?sort=top#new",
      importedRootHostname: "community-root",
      kind: "community",
    })).toBe("/c/@xn--t77hga/threads?sort=top#new");
  });
});
