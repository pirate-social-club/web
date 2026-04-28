import { describe, expect, test } from "bun:test";

import { buildDefaultProfileCoverSrc, resolveProfileCoverSrc } from "./default-profile-cover";

describe("default profile cover", () => {
  test("builds a stable data URI for the same profile seed", () => {
    const first = buildDefaultProfileCoverSrc({
      displayName: "Blackbeard",
      handle: "blackbeard.pirate",
      userId: "usr_blackbeard",
    });
    const second = buildDefaultProfileCoverSrc({
      displayName: "Blackbeard",
      handle: "blackbeard.pirate",
      userId: "usr_blackbeard",
    });

    expect(first).toBe(second);
    expect(first.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(first)).toContain("<linearGradient");
  });

  test("keeps browser-renderable cover refs instead of replacing them", () => {
    expect(resolveProfileCoverSrc({
      coverSrc: "/profile-media/cover/cover-ref.png",
      displayName: "Anne Bonny",
      handle: "anne.pirate",
      userId: "usr_anne",
    })).toBe("/profile-media/cover/cover-ref.png");
  });

  test("replaces unsupported cover refs with generated covers", () => {
    const resolved = resolveProfileCoverSrc({
      coverSrc: "ipfs://cover-ref",
      displayName: "Anne Bonny",
      handle: "anne.pirate",
      userId: "usr_anne",
    });

    expect(resolved.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  });
});
