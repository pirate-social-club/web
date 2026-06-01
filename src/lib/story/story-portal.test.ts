import { describe, expect, test } from "bun:test";

import { buildStoryExplorerIpAssetUrl, buildStoryPortalAssetUrl } from "./story-portal";

describe("Story IP Explorer links", () => {
  test("builds network-specific IP asset URLs", () => {
    expect(buildStoryExplorerIpAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-aeneid",
    )).toBe("https://aeneid.explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
    expect(buildStoryExplorerIpAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-mainnet",
    )).toBe("https://explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("keeps the old helper name as a compatibility alias", () => {
    expect(buildStoryPortalAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-aeneid",
    )).toBe("https://aeneid.explorer.story.foundation/ipa/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("rejects missing or invalid IP ids", () => {
    expect(buildStoryExplorerIpAssetUrl(null, "story-aeneid")).toBeNull();
    expect(buildStoryExplorerIpAssetUrl("asset_ast_123", "story-aeneid")).toBeNull();
    expect(buildStoryExplorerIpAssetUrl("0x1234", "story-mainnet")).toBeNull();
  });
});
