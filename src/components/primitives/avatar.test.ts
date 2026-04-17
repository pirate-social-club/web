import { describe, expect, test } from "bun:test";
import { buildRetriedImageSrc, isRetryableImageSrc } from "./avatar";

describe("avatar image retry helpers", () => {
  test("marks remote and local urls as retryable but skips data uris", () => {
    expect(isRetryableImageSrc("https://pirate.test/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRetryableImageSrc("/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRetryableImageSrc("data:image/svg+xml;base64,abc")).toBe(false);
    expect(isRetryableImageSrc("")).toBe(false);
  });

  test("appends a cache-busting retry parameter", () => {
    const retried = buildRetriedImageSrc("https://pirate.test/profile-media/avatar/avatar_123.png");
    const retriedUrl = new URL(retried);

    expect(retriedUrl.pathname).toBe("/profile-media/avatar/avatar_123.png");
    expect(retriedUrl.searchParams.has("_img_retry")).toBe(true);
  });
});
