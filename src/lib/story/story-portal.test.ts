import { describe, expect, test } from "bun:test";

import { buildStoryPortalAssetUrl } from "./story-portal";

describe("Story portal links", () => {
  test("builds Aeneid and mainnet IP asset URLs", () => {
    const ipId = "0xbB0a33bd07e7c813963b569f1202047a92b38d48";

    expect(buildStoryPortalAssetUrl(ipId, "story-aeneid"))
      .toBe("https://aeneid.portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
    expect(buildStoryPortalAssetUrl(ipId, "story-mainnet"))
      .toBe("https://portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48");
  });

  test("rejects invalid IP asset IDs", () => {
    expect(buildStoryPortalAssetUrl("asset_ast_song", "story-aeneid")).toBeNull();
    expect(buildStoryPortalAssetUrl("0x1234", "story-aeneid")).toBeNull();
    expect(buildStoryPortalAssetUrl(null, "story-aeneid")).toBeNull();
  });
});
