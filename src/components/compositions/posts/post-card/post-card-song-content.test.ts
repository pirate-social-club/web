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

  test("shows vinyl availability only before ownership", () => {
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      vinylRelease: {
        available: true,
        provider: "elasticstage",
      },
    });

    expect(ui.showVinylAvailable).toBe(true);
    expect(ui.showVinylLink).toBe(false);
  });

  test("shows vinyl link for owned songs with a release URL", () => {
    const releaseUrl = "https://elasticstage.com/kevin-tameimpala/releases/midnight-waves";
    const ui = deriveSongUI({
      ...baseSong,
      accessMode: "locked",
      hasEntitlement: true,
      vinylRelease: {
        available: true,
        provider: "elasticstage",
        url: releaseUrl,
      },
    });

    expect(ui.showOwned).toBe(true);
    expect(ui.showVinylAvailable).toBe(false);
    expect(ui.showVinylLink).toBe(true);

    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          accessMode: "locked",
          hasEntitlement: true,
          vinylRelease: {
            available: true,
            provider: "elasticstage",
            url: releaseUrl,
          },
        },
      }),
    );

    expect(markup).toContain("Buy vinyl on ElasticStage");
    expect(markup).toContain(`href="${releaseUrl}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
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

  test("renders Genius link as an external pill", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SongPostContent, {
        content: {
          ...baseSong,
          annotationsUrl: "https://genius.com/34172986",
        },
      }),
    );

    expect(markup).toContain("View on Genius");
    expect(markup).toContain("rounded-full");
    expect(markup).toContain('href="https://genius.com/34172986"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
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
            portalHref: "https://aeneid.portal.story.foundation/asset/0xbB0a33bd07e7c813963b569f1202047a92b38d48",
          },
        },
      }),
    );

    expect(markup).not.toContain("Remix-eligible");
    expect(markup).not.toContain("Story IP registration is complete.");
    expect(markup).not.toContain("View on Story");
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
