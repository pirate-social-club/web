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
    expect(markup).toContain("Buy $3.99");
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

  test("does not render free original downloads as offer rows (downloads live in the menu)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          downloadPolicy: "free_download",
          onDownload: () => {},
        },
      }),
    );

    // The capability is still derived, but the card surface stays clean — the
    // download is exposed through the kebab menu (deriveSongHeaderMenuActions).
    expect(deriveSongUI({ ...baseSong, downloadPolicy: "free_download", onDownload: () => {} }).showDownload).toBe(true);
    expect(markup).not.toContain("Download");
  });

  test("does not render owned original downloads as offer rows", () => {
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
  });

  test("surfaces karaoke as an offer row when ready", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: true, status: "ready" },
      onKaraoke: () => {},
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: true, status: "ready" },
          onKaraoke: () => {},
        },
      }),
    );

    expect(ui.showKaraoke).toBe(true);
    expect(markup).toContain("Karaoke");
    expect(markup).toContain("Sing");
    expect(markup).toContain("Open karaoke");
  });

  test("surfaces study as an offer row when ready and accessible", () => {
    const ui = deriveSongUI({
      ...baseSong,
      study: { status: "ready", exerciseCount: 12, sourceLanguage: "en", targetLanguage: "es" },
      onStudy: () => {},
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          study: { status: "ready", exerciseCount: 12, sourceLanguage: "en", targetLanguage: "es" },
          onStudy: () => {},
        },
      }),
    );

    expect(ui.showStudy).toBe(true);
    expect(markup).toContain("Study");
    expect(markup).toContain("Open study");
  });

  test("keeps study and karaoke visible on locked unowned songs so the routes can trigger auth", () => {
    const content: SongContentSpec = {
      ...baseSong,
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$3.99",
      study: { status: "ready" },
      karaoke: { canKaraoke: true, status: "ready" },
      onBuy: () => {},
      onStudy: () => {},
      onKaraoke: () => {},
    };
    const ui = deriveSongUI(content);
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, { content }),
    );

    expect(ui.primaryCommerceAction).toBe("buy");
    expect(ui.showStudy).toBe(true);
    expect(ui.showKaraoke).toBe(true);
    expect(markup).toContain("Buy $3.99");
    expect(markup).toContain("Open study");
    expect(markup).toContain("Open karaoke");
  });

  test("surfaces study and karaoke together once a locked song is owned", () => {
    const content: SongContentSpec = {
      ...baseSong,
      accessMode: "locked",
      hasEntitlement: true,
      study: { status: "ready" },
      karaoke: { canKaraoke: true, status: "ready" },
      onStudy: () => {},
      onKaraoke: () => {},
    };
    const ui = deriveSongUI(content);
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, { content }),
    );

    expect(ui.showStudy).toBe(true);
    expect(ui.showKaraoke).toBe(true);
    expect(markup).toContain("Open study");
    expect(markup).toContain("Open karaoke");
  });

  test("does not surface karaoke without an action callback", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: true, status: "ready" },
    });

    expect(ui.showKaraoke).toBe(false);
  });

  test("does not surface karaoke when the capability is absent", () => {
    const ui = deriveSongUI({
      ...baseSong,
      onKaraoke: () => {},
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          onKaraoke: () => {},
        },
      }),
    );

    expect(ui.showKaraoke).toBe(false);
    expect(markup).not.toContain("Open karaoke");
  });

  test("surfaces owner-visible karaoke processing status without an action", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: false, status: "processing" },
      karaokeStatusVisible: true,
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: false, status: "processing" },
          karaokeStatusVisible: true,
        },
      }),
    );

    expect(ui.showKaraoke).toBe(false);
    expect(ui.showKaraokeStatus).toBe(true);
    expect(markup).toContain("Karaoke");
    expect(markup).toContain("Processing");
    expect(markup).not.toContain("Sing");
  });

  test("uses shared activity diagnostics visibility for karaoke status rows", () => {
    const ui = deriveSongUI({
      ...baseSong,
      activityDiagnosticsVisible: true,
      karaoke: { canKaraoke: false, status: "processing" },
    });

    expect(ui.showKaraokeStatus).toBe(true);
  });

  test("hides karaoke processing status from non-owner viewers", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: false, status: "processing" },
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: false, status: "processing" },
        },
      }),
    );

    expect(ui.showKaraokeStatus).toBe(false);
    expect(markup).not.toContain("Processing");
  });

  test("surfaces owner-visible karaoke failed status", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: false, status: "failed" },
      karaokeStatusVisible: true,
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: false, status: "failed" },
          karaokeStatusVisible: true,
        },
      }),
    );

    expect(ui.showKaraokeStatus).toBe(true);
    expect(markup).toContain("Failed");
    expect(markup).not.toContain("Sing");
  });

  test("surfaces owner-visible karaoke unavailable status", () => {
    const ui = deriveSongUI({
      ...baseSong,
      karaoke: { canKaraoke: false, status: "unavailable" },
      karaokeStatusVisible: true,
    });
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: false, status: "unavailable" },
          karaokeStatusVisible: true,
        },
      }),
    );

    expect(ui.showKaraokeStatus).toBe(true);
    expect(markup).toContain("Lyrics not available");
    expect(markup).not.toContain("Sing");
  });

  test("uses custom owner-visible karaoke status copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          karaoke: { canKaraoke: false, status: "unavailable" },
          karaokeStatusLabel: "Lyrics not loadable yet",
          karaokeStatusVisible: true,
        },
      }),
    );

    expect(markup).toContain("Lyrics not loadable yet");
    expect(markup).not.toContain("Lyrics not available");
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
});
