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

  test("derives buy for listed locked songs without promoting owned downloads", () => {
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
    expect(ownedUi.primaryCommerceAction).toBeNull();
    expect(ownedUi.showDownload).toBe(true);
    expect(ownedUi.showOwned).toBe(true);
  });

  test("surfaces vinyl release as a direct offer row", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          accessMode: "locked",
          listingMode: "listed",
          listingStatus: "active",
          onBuy: () => {},
          priceLabel: "$3.99",
          vinylRelease: {
            available: true,
            provider: "elasticstage",
            url: "https://elasticstage.com/kevin-tameimpala/releases/midnight-waves"
          },
        },
      }),
    );

    expect(markup).toContain("MP3");
    expect(markup).toContain("Buy");
    expect(markup).toContain("$3.99");
    expect(markup).toContain("Vinyl");
    expect(markup).toContain("https://elasticstage.com/kevin-tameimpala/releases/midnight-waves");
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

  test("keeps cover artwork visible behind the age proof lock", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          ageGatePolicy: "18_plus",
          ageGateViewerState: "proof_required",
          artworkSrc: "https://media.test/explicit-cover.jpg",
          contentSafetyState: "adult",
        },
      }),
    );

    expect(markup).toContain('src="https://media.test/explicit-cover.jpg"');
    expect(markup).toContain("Verify Age");
    expect(markup).not.toContain('role="img" aria-label="Public track"');
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

  test("uses duration label before numeric duration metadata is available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          durationLabel: "3:47",
        },
      }),
    );

    expect(markup).toContain("0:00");
    expect(markup).toContain("3:47");
    expect(markup).not.toContain("--:--");
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

  test("keeps free original downloads out of the compact song body", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          downloadPolicy: "free_download",
          onDownload: () => {},
        },
      }),
    );

    expect(markup).not.toContain("Original");
    expect(markup).not.toContain("Free");
    expect(markup).not.toContain("Download");
  });

  test("renders karaoke as an action callback when provided", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          onKaraoke: () => {},
        },
      }),
    );

    expect(markup).toContain("Sing");
    expect(markup).not.toContain('href="/p/');
  });

  test("keeps karaoke href rendering as a fallback", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaokeHref: "/p/post_123/karaoke",
        },
      }),
    );

    expect(markup).toContain('href="/p/post_123/karaoke"');
  });

  test("keeps owned original downloads out of the compact song body", () => {
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

    expect(markup).not.toContain("Original");
    expect(markup).not.toContain("Download");
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

  test("renders age-gated artwork source before proof", () => {
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

    expect(markup).toContain("https://example.test/adult-cover.jpg");
    expect(markup).toContain("Public track");
    expect(markup).toContain("Verify Age");
  });

  test("renders the Study CTA when the server marks study ready", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          study: { status: "ready" },
          onStudy: () => {},
        },
      }),
    );

    expect(markup).toContain("Study");
  });

  test("hides the Study CTA when study is not ready", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          study: { status: "processing" },
          onStudy: () => {},
        },
      }),
    );

    expect(markup).not.toContain("Open study");
  });
});
