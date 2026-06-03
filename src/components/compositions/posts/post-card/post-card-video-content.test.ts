import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { deriveVideoUI, VideoPostContent } from "./post-card-video-content";
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
    expect(ui.showBuy).toBe(false);
    expect(ui.showUnlock).toBe(false);
  });

  test("derives buy and unlock states for locked videos", () => {
    const buyUi = deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: () => undefined,
      priceLabel: "$4.99",
    });
    const unlockUi = deriveVideoUI({
      ...baseVideo,
      accessMode: "locked",
      listingMode: "not_listed",
      onUnlock: () => undefined,
    });

    expect(buyUi.showBuy).toBe(true);
    expect(buyUi.showUnlock).toBe(false);
    expect(unlockUi.showBuy).toBe(false);
    expect(unlockUi.showUnlock).toBe(true);
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
    expect(ui.showAgeGatedThumbnail).toBe(false);
  });
});

describe("VideoPostContent offer rows", () => {
  test("renders a full-video buy row for listed locked videos", () => {
    const markup = renderToStaticMarkup(React.createElement(VideoPostContent, {
      content: {
        ...baseVideo,
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        onBuy: () => undefined,
        priceLabel: "$4.99",
      },
    }));

    expect(markup).toContain("Full video");
    expect(markup).toContain("$4.99");
    expect(markup).toContain(">Buy<");
  });

  test("renders a full-video unlock row for unlisted locked videos", () => {
    const markup = renderToStaticMarkup(React.createElement(VideoPostContent, {
      content: {
        ...baseVideo,
        accessMode: "locked",
        listingMode: "not_listed",
        onUnlock: () => undefined,
      },
    }));

    expect(markup).toContain("Full video");
    expect(markup).toContain(">Unlock<");
  });

  test("renders owned locked videos as unlocked in the offer row", () => {
    const markup = renderToStaticMarkup(React.createElement(VideoPostContent, {
      content: {
        ...baseVideo,
        accessMode: "locked",
        hasEntitlement: true,
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$4.99",
      },
    }));

    expect(markup).toContain("Full video");
    expect(markup).toContain("Unlocked");
  });
});
