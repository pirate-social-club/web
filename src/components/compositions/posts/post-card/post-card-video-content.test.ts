import { describe, expect, test } from "bun:test";

import { deriveVideoUI } from "./post-card-video-content";
import type { VideoContentSpec } from "./post-card.types";

const baseVideo: VideoContentSpec = {
  type: "video",
  src: "https://example.test/video.mp4",
  accessMode: "public",
};

describe("deriveVideoUI", () => {
  test("does not show unlocked badge for public videos", () => {
    const ui = deriveVideoUI({
      ...baseVideo,
      accessMode: "public",
      hasEntitlement: true,
    });

    expect(ui.showOwned).toBe(false);
    expect(ui.canPlay).toBe(true);
  });

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
      onPlay: () => undefined,
      src: "",
    }).showOwned).toBe(true);

    expect(deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      hasEntitlement: true,
    }).canPlay).toBe(true);
  });

  test("allows verified viewers through the age gate", () => {
    const ui = deriveVideoUI({
      ...baseVideo,
      ageGatePolicy: "18_plus",
      ageGateViewerState: "verified_allowed",
      contentSafetyState: "adult",
    });

    expect(ui.ageGateRequiresProof).toBe(false);
    expect(ui.canPlay).toBe(true);
  });
});
