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

  test("sends sovereign community identities to the threads origin", () => {
    expect(resolveVideoPublisherHref({
      href: "/c/community",
      importedRootHostname: "community-root",
      kind: "community",
    })).toBe("https://app.community-root/");
  });
});
