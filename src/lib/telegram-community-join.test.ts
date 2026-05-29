import { describe, expect, test } from "bun:test";

import { buildTelegramCommunityJoinUrl } from "./telegram-community-join";

describe("buildTelegramCommunityJoinUrl", () => {
  test("builds an absolute durable Telegram join URL", () => {
    expect(buildTelegramCommunityJoinUrl({
      appOrigin: "https://pirate.sc",
      communityId: "com_cmt_test",
    })).toBe("https://pirate.sc/tg/join/com_cmt_test");
  });

  test("encodes the community path segment", () => {
    expect(buildTelegramCommunityJoinUrl({
      appOrigin: "https://staging.pirate.sc",
      communityId: "com cmt/test",
    })).toBe("https://staging.pirate.sc/tg/join/com%20cmt%2Ftest");
  });
});
