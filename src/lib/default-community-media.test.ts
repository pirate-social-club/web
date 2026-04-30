import { describe, expect, test } from "bun:test";

import { buildDefaultCommunityAvatarSrc, resolveCommunityAvatarSrc } from "./default-community-media";

describe("community media defaults", () => {
  test("builds a valid avatar data URL for emoji community names", () => {
    const src = buildDefaultCommunityAvatarSrc({
      communityId: "cmt_palestine",
      displayName: "🇵🇸",
    });

    expect(src.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(src)).toContain("🇵");
    expect(decodeURIComponent(src).includes("\uFFFD")).toBe(false);
  });

  test("preserves server-provided avatar refs", () => {
    expect(resolveCommunityAvatarSrc({
      avatarSrc: "https://media.pirate.test/avatar.png",
      communityId: "cmt_palestine",
      displayName: "@🇵🇸",
    })).toBe("https://media.pirate.test/avatar.png");
  });
});
