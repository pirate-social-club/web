import { describe, expect, test } from "bun:test";

import { deriveVideoOffer, deriveVideoUI } from "./video-model";
import type { VideoContentSpec } from "./types";

const noop = () => undefined;

function video(overrides: Partial<VideoContentSpec> = {}): VideoContentSpec {
  return {
    type: "video",
    accessMode: "public",
    src: "https://cdn.example/video.mp4",
    ...overrides,
  };
}

describe("deriveVideoUI", () => {
  test("does not show unlocked badge for public videos", () => {
    const ui = deriveVideoUI(video());
    expect(ui.showOwned).toBe(false);
    expect(ui.canPlay).toBe(true);
  });

  test("does not play locked video previews without entitlement", () => {
    const ui = deriveVideoUI(video({ accessMode: "locked" }));
    expect(ui.showLockedThumbnail).toBe(true);
    expect(ui.canPlay).toBe(false);
  });

  test("derives buy and unlock states for locked videos", () => {
    const buy = deriveVideoUI(video({
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: noop,
    }));
    expect(buy.showBuy).toBe(true);
    expect(buy.showUnlock).toBe(false);

    const unlock = deriveVideoUI(video({ accessMode: "locked", onUnlock: noop }));
    expect(unlock.showUnlock).toBe(true);
    expect(unlock.showBuy).toBe(false);
  });

  test("plays locked videos only with entitlement and a playable source", () => {
    expect(deriveVideoUI(video({ accessMode: "locked", hasEntitlement: true })).canPlay).toBe(true);
    expect(deriveVideoUI(video({ accessMode: "locked", hasEntitlement: true, src: " " })).canPlay).toBe(false);
    // A callback can resolve a missing source.
    expect(deriveVideoUI(video({
      accessMode: "locked",
      hasEntitlement: true,
      src: " ",
      onPlay: noop,
    })).canPlay).toBe(true);
  });

  test("allows verified viewers through the age gate", () => {
    const gated = deriveVideoUI(video({ ageGatePolicy: "18_plus", contentSafetyState: "adult" }));
    expect(gated.ageGateRequiresProof).toBe(true);
    expect(gated.canPlay).toBe(false);

    const verified = deriveVideoUI(video({
      ageGatePolicy: "18_plus",
      ageGateViewerState: "verified_allowed",
      contentSafetyState: "adult",
    }));
    expect(verified.ageGateRequiresProof).toBe(false);
    expect(verified.canPlay).toBe(true);
  });
});

describe("deriveVideoOffer", () => {
  test("renders a full-video buy row for listed locked videos", () => {
    const content = video({
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$4.99",
      onBuy: noop,
    });
    expect(deriveVideoOffer(content, deriveVideoUI(content)))
      .toEqual({ kind: "buy", priceLabel: "$4.99" });
  });

  test("renders a full-video unlock row for unlisted locked videos", () => {
    const content = video({ accessMode: "locked", onUnlock: noop });
    expect(deriveVideoOffer(content, deriveVideoUI(content))).toEqual({ kind: "unlock" });
  });

  test("renders owned locked videos as unlocked in the offer row", () => {
    const content = video({ accessMode: "locked", hasEntitlement: true });
    expect(deriveVideoOffer(content, deriveVideoUI(content))).toEqual({ kind: "owned" });
  });

  test("public and age-gated videos render no offer row", () => {
    const publicVideo = video();
    expect(deriveVideoOffer(publicVideo, deriveVideoUI(publicVideo))).toEqual({ kind: "none" });

    const gated = video({ ageGatePolicy: "18_plus", contentSafetyState: "adult", accessMode: "locked", onUnlock: noop });
    expect(deriveVideoOffer(gated, deriveVideoUI(gated))).toEqual({ kind: "none" });
  });
});
