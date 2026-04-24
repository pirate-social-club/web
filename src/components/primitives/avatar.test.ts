import { describe, expect, test } from "bun:test";
import { buildRetriedImageSrc, isRenderableImageSrc, isRetryableImageSrc } from "./avatar";

describe("avatar image retry helpers", () => {
  test("marks browser-renderable image urls", () => {
    expect(isRenderableImageSrc("https://pirate.test/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRenderableImageSrc("/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRenderableImageSrc("data:image/svg+xml;base64,abc")).toBe(true);
    expect(isRenderableImageSrc("blob:http://localhost/avatar")).toBe(true);
    expect(isRenderableImageSrc("avatar.png")).toBe(true);
    expect(isRenderableImageSrc("ipfs://seed-dev-avatar-maya")).toBe(false);
    expect(isRenderableImageSrc("mailto:avatar@example.test")).toBe(false);
    expect(isRenderableImageSrc("")).toBe(false);
  });

  test("marks remote and local urls as retryable but skips data uris and unsupported schemes", () => {
    expect(isRetryableImageSrc("https://pirate.test/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRetryableImageSrc("/profile-media/avatar/avatar_123.png")).toBe(true);
    expect(isRetryableImageSrc("data:image/svg+xml;base64,abc")).toBe(false);
    expect(isRetryableImageSrc("ipfs://seed-dev-avatar-maya")).toBe(false);
    expect(isRetryableImageSrc("")).toBe(false);
  });

  test("appends a cache-busting retry parameter", () => {
    const retried = buildRetriedImageSrc("https://pirate.test/profile-media/avatar/avatar_123.png");
    const retriedUrl = new URL(retried);

    expect(retriedUrl.pathname).toBe("/profile-media/avatar/avatar_123.png");
    expect(retriedUrl.searchParams.has("_img_retry")).toBe(true);
  });
});
