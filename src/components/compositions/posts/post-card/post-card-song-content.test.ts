import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { deriveSongUI, SongPostContent } from "./post-card-song-content";
import type { SongContentSpec } from "./post-card.types";

const baseSong: SongContentSpec = {
  type: "song",
  accessMode: "public",
  title: "Public track",
};

describe("deriveSongUI", () => {
  test("does not show unlocked badge for public songs", () => {
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "public",
      hasEntitlement: true,
    });

    expect(ui.showOwned).toBe(false);
    expect(ui.primaryAction).toBe("play");
  });

  test("shows unlocked badge for locked songs with entitlement", () => {
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      hasEntitlement: true,
    });

    expect(ui.showOwned).toBe(true);
    expect(ui.showUnlock).toBe(false);
  });

  test("defaults public songs to stream-only unless free download is explicit", () => {
    const publicUi = deriveSongUI(baseSong);
    const downloadableUi = deriveSongUI({
      ...baseSong,
      downloadPolicy: "free_download",
      onDownload: () => {},
    });

    expect(publicUi.effectiveDownloadPolicy).toBe("stream_only");
    expect(publicUi.showDownload).toBe(false);
    expect(downloadableUi.effectiveDownloadPolicy).toBe("free_download");
    expect(downloadableUi.showDownload).toBe(true);
    expect(downloadableUi.showOwned).toBe(false);
  });

  test("derives buy for listed locked songs and download for owned songs", () => {
    const listedUi = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: () => {},
      priceLabel: "$3.99",
    });
    const ownedUi = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      hasEntitlement: true,
      listingMode: "listed",
      listingStatus: "active",
      onDownload: () => {},
    });

    expect(listedUi.effectiveDownloadPolicy).toBe("purchased_download");
    expect(listedUi.primaryCommerceAction).toBe("buy");
    expect(ownedUi.primaryCommerceAction).toBe("download");
    expect(ownedUi.showOwned).toBe(true);
  });

  test("requires age proof until the viewer is verified allowed", () => {
    const lockedUi = deriveSongUI({
      ...baseSong,
      ageGatePolicy: "18_plus",
      ageGateViewerState: "proof_required",
      contentSafetyState: "adult",
    });

    expect(lockedUi.ageGateRequiresProof).toBe(true);
    expect(lockedUi.primaryAction).toBe("locked");
    expect(lockedUi.showAgeGatedArtwork).toBe(true);

    const verifiedUi = deriveSongUI({
      ...baseSong,
      ageGatePolicy: "18_plus",
      ageGateViewerState: "verified_allowed",
      contentSafetyState: "adult",
    });

    expect(verifiedUi.ageGateRequiresProof).toBe(false);
    expect(verifiedUi.primaryAction).toBe("play");
    expect(verifiedUi.showAgeGatedArtwork).toBe(false);
  });

  test("keeps post captions outside the song player", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          caption: "First line\n\n- one\n- two",
        },
      }),
    );

    expect(markup).not.toContain("First line");
    expect(markup).not.toContain("<li>one</li>");
  });

  test("renders the song scrubber for playable songs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          durationMs: 180000,
          progressMs: 45000,
        },
      }),
    );

    expect(markup).toContain("Track position");
    expect(markup).toContain("0:45");
    expect(markup).toContain("3:00");
    expect(markup).not.toContain("(3:00)");
  });

  test("uses preview duration for locked unowned songs", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          accessMode: "locked",
          durationMs: 227000,
          listingMode: "listed",
          listingStatus: "active",
          onBuy: () => {},
          previewDurationMs: 30000,
        },
      }),
    );

    expect(markup).toContain("0:30");
    expect(markup).not.toContain("3:47");
  });

  test("keeps Genius annotations out of the compact song player", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          annotationsUrl: "https://genius.com/34172986",
        },
      }),
    );

    expect(markup).not.toContain("View on Genius");
    expect(markup).not.toContain('href="https://genius.com/34172986"');
  });

  test("keeps download actions out of the compact song player", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          downloadPolicy: "free_download",
          onDownload: () => {},
        },
      }),
    );

    expect(markup).not.toContain("Download");
    expect(markup).not.toContain("Unlocked");
  });

  test("keeps owned download state out of the compact song player", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          accessMode: "locked",
          hasEntitlement: true,
          listingMode: "listed",
          listingStatus: "active",
          onDownload: () => {},
        },
      }),
    );

    expect(markup).not.toContain("Download");
    expect(markup).not.toContain("Unlocked");
  });

  test("does not render completed Story registration status", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          storyRegistration: {
            state: "registered",
            label: "Remix-eligible",
            description: "Story IP registration is complete.",
          },
        },
      }),
    );

    expect(markup).not.toContain("Remix-eligible");
    expect(markup).not.toContain("Story IP registration is complete.");
  });

  test("renders Story license reuse notice", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          storyLicenseNotice: {
            label: "Story license reused",
            description: "This upload reused an existing Story registration, so it keeps the original terms: Commercial remix, 10% royalty.",
          },
        },
      }),
    );

    expect(markup).toContain("Story license reused");
    expect(markup).toContain("keeps the original terms");
    expect(markup).toContain("Commercial remix, 10% royalty");
  });

  test("does not render age-gated artwork source before proof", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          ageGatePolicy: "18_plus",
          ageGateViewerState: "proof_required",
          artworkSrc: "https://example.test/adult-cover.jpg",
          contentSafetyState: "adult",
        },
      }),
    );

    expect(markup).not.toContain("https://example.test/adult-cover.jpg");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Verify Age");
  });
});
