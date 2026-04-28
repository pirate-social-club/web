import { describe, expect, test } from "bun:test";

import { deriveVideoUI } from "./post-card-video-content";
import type { VideoContentSpec } from "./post-card.types";

const baseVideo: VideoContentSpec = {
  type: "video",
  src: "https://example.test/video.mp4",
  accessMode: "public",
};

describe("deriveVideoUI", () => {
  test("does not play locked video previews without entitlement", () => {
    const ui = deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      hasEntitlement: false,
      posterSrc: "https://example.test/poster.jpg",
      src: "",
    });

    expect(ui.showLockedThumbnail).toBe(true);
    expect(ui.canPlay).toBe(false);
  });

  test("plays locked videos only when entitlement and a playable source are present", () => {
    expect(deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      hasEntitlement: true,
      src: "",
    }).canPlay).toBe(false);

    expect(deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      hasEntitlement: true,
      onPlay: () => undefined,
      src: "",
    }).canPlay).toBe(true);

    expect(deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      hasEntitlement: true,
    }).canPlay).toBe(true);
  });
});
