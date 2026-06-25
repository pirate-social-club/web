import { describe, expect, test } from "bun:test";

import { buildStoryExplorerIpAssetUrl, buildStoryPortalAssetUrl } from "./story-portal";

describe("Story portal links", () => {
  test("builds network-specific IP asset URLs via portal", () => {
    expect(buildStoryPortalAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-aeneid",
    )).toBe("https://aeneid.portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
    expect(buildStoryPortalAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-mainnet",
    )).toBe("https://portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("keeps the old explorer helper name as a compatibility alias", () => {
    expect(buildStoryExplorerIpAssetUrl(
      "0xbB0a33bd07e7c813963b569f1202047a92b38d48",
      "story-mainnet",
    )).toBe("https://portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("rejects missing or invalid IP ids", () => {
    expect(buildStoryPortalAssetUrl(null, "story-aeneid")).toBeNull();
    expect(buildStoryPortalAssetUrl("asset_ast_123", "story-aeneid")).toBeNull();
    expect(buildStoryPortalAssetUrl("0x1234", "story-mainnet")).toBeNull();
  });
});
