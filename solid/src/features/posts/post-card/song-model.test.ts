import { describe, expect, test } from "bun:test";

import {
  clampProgressMs,
  DEFAULT_PREVIEW_DURATION_MS,
  deriveSongActions,
  deriveSongDerivativeSummary,
  deriveSongUI,
  formatDurationMs,
  resolvePlaybackDurationMs,
  songFeatureFailureCopy,
} from "./song-model";
import type { SongContentSpec } from "./types";

const noop = () => undefined;

function song(overrides: Partial<SongContentSpec> = {}): SongContentSpec {
  return {
    type: "song",
    accessMode: "public",
    title: "Track",
    ...overrides,
  };
}

describe("deriveSongUI", () => {
  test("public songs show no ownership or price chrome", () => {
    const ui = deriveSongUI(song());
    expect(ui.showOwned).toBe(false);
    expect(ui.showPrice).toBe(false);
    expect(ui.showBuy).toBe(false);
    expect(ui.showUnlock).toBe(false);
    expect(ui.primaryAction).toBe("play");
    expect(ui.effectiveDownloadPolicy).toBe("stream_only");
  });

  test("locked owned songs show owned and download", () => {
    const ui = deriveSongUI(song({
      accessMode: "locked",
      hasEntitlement: true,
      listingMode: "listed",
      listingStatus: "active",
      onDownload: noop,
    }));
    expect(ui.showOwned).toBe(true);
    expect(ui.showDownload).toBe(true);
    expect(ui.canShowPreview).toBe(false);
  });

  test("listed locked songs derive buy and preview playback", () => {
    const ui = deriveSongUI(song({
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$3.99",
      onBuy: noop,
    }));
    expect(ui.showPrice).toBe(true);
    expect(ui.showBuy).toBe(true);
    expect(ui.canShowPreview).toBe(true);
    expect(ui.primaryAction).toBe("preview");
    expect(ui.primaryCommerceAction).toBe("buy");
  });

  test("unlisted locked songs derive unlock instead of buy", () => {
    const ui = deriveSongUI(song({ accessMode: "locked", onUnlock: noop }));
    expect(ui.showUnlock).toBe(true);
    expect(ui.showBuy).toBe(false);
    expect(ui.primaryCommerceAction).toBe("unlock");
  });

  test("age-gated songs require proof and lock playback", () => {
    const ui = deriveSongUI(song({
      accessMode: "locked",
      ageGatePolicy: "18_plus",
      contentSafetyState: "adult",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: noop,
    }));
    expect(ui.isAgeGated).toBe(true);
    expect(ui.ageGateRequiresProof).toBe(true);
    expect(ui.primaryAction).toBe("locked");
    expect(ui.primaryCommerceAction).toBe("verify_age");
    // showBuy itself is age-gate blind; the offer rows hide while proof is required.

    const verified = deriveSongUI(song({
      accessMode: "locked",
      ageGatePolicy: "18_plus",
      ageGateViewerState: "verified_allowed",
      contentSafetyState: "adult",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: noop,
    }));
    expect(verified.ageGateRequiresProof).toBe(false);
    expect(verified.showBuy).toBe(true);
  });

  test("sensitive songs are explicit but not age-gated", () => {
    const ui = deriveSongUI(song({ contentSafetyState: "sensitive" }));
    expect(ui.isAgeGated).toBe(false);
    expect(ui.isPlayable).toBe(true);
  });

  test("playing and buffering map to control states", () => {
    expect(deriveSongUI(song({ playbackState: "playing" })).primaryAction).toBe("pause");
    expect(deriveSongUI(song({ playbackState: "buffering" })).primaryAction).toBe("buffering");
  });

  test("vinyl links require a URL and no age gate", () => {
    const withVinyl = song({
      vinylRelease: { available: true, provider: "elasticstage", url: "https://elasticstage.com/x" },
    });
    expect(deriveSongUI(withVinyl).showVinylLink).toBe(true);
    expect(deriveSongUI(song({
      ...withVinyl,
      ageGatePolicy: "18_plus",
      contentSafetyState: "adult",
    })).showVinylLink).toBe(false);
  });
});

describe("playback duration helpers", () => {
  test("locked unowned songs use the preview duration", () => {
    expect(resolvePlaybackDurationMs(song({
      accessMode: "locked",
      durationMs: 227000,
      previewDurationMs: 30000,
    }), true)).toBe(30000);
    expect(resolvePlaybackDurationMs(song({ accessMode: "locked", durationMs: 10000 }), true)).toBe(10000);
    expect(resolvePlaybackDurationMs(song({ accessMode: "locked" }), true)).toBe(DEFAULT_PREVIEW_DURATION_MS);
  });

  test("owned/public playback uses the full duration", () => {
    expect(resolvePlaybackDurationMs(song({ durationMs: 227000 }), false)).toBe(227000);
  });

  test("progress clamps to the duration and zero", () => {
    expect(clampProgressMs(65000, 227000)).toBe(65000);
    expect(clampProgressMs(300000, 227000)).toBe(227000);
    expect(clampProgressMs(undefined, 227000)).toBe(0);
  });

  test("formats durations with hours only when needed", () => {
    expect(formatDurationMs(65000)).toBe("1:05");
    expect(formatDurationMs(5025000)).toBe("1:23:45");
  });
});

describe("deriveSongDerivativeSummary", () => {
  test("single remix source uses remix presentation", () => {
    expect(deriveSongDerivativeSummary([
      { assetId: "a1", relationshipType: "references_song", title: "Midnight Waves", artist: "The Sailors" },
    ], "remix")).toBe("Midnight Waves (Remix)");
  });

  test("multiple sources append a count", () => {
    expect(deriveSongDerivativeSummary([
      { assetId: "a1", relationshipType: "references_song", title: "Midnight Waves" },
      { assetId: "a2", relationshipType: "samples", title: "Ocean" },
    ], "remix")).toBe("Midnight Waves (Remix) +1");
  });

  test("non-remix derivatives use relationship copy", () => {
    expect(deriveSongDerivativeSummary([
      { assetId: "a1", relationshipType: "samples", title: "Ocean", artist: "Nature" },
    ], "original")).toBe("Samples Ocean by Nature");
  });
});

describe("deriveSongActions", () => {
  test("buy row comes before learning actions for locked unowned songs", () => {
    const content = song({
      accessMode: "locked",
      listingMode: "listed",
      listingStatus: "active",
      priceLabel: "$3.99",
      onBuy: noop,
      karaoke: { status: "ready" },
      onKaraoke: noop,
    });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.commerce).toEqual({
      kind: "buy",
      ariaLabel: "Buy digital MP3 for $3.99",
      label: "Buy · $3.99",
    });
    // Learning actions stay hidden while the song is locked and unowned.
    expect(actions.karaoke.kind).toBe("hidden");
  });

  test("unlock row covers unlisted locked songs", () => {
    const content = song({ accessMode: "locked", onUnlock: noop });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.commerce?.kind).toBe("unlock");
  });

  test("karaoke renders as callback, then href fallback", () => {
    const withCallback = song({ karaoke: { status: "ready" }, onKaraoke: noop });
    expect(deriveSongActions(withCallback, deriveSongUI(withCallback)).karaoke)
      .toEqual({ kind: "callback", label: "Sing" });

    const withHref = song({ karaoke: { status: "ready" }, karaokeHref: "/sing/1" });
    expect(deriveSongActions(withHref, deriveSongUI(withHref)).karaoke)
      .toEqual({ kind: "link", ariaLabel: "Sing this song", href: "/sing/1", label: "Sing" });
  });

  test("reserves the study slot while study is unknown but sing is present", () => {
    const content = song({ karaoke: { status: "ready" }, onKaraoke: noop });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.reserveStudySlot).toBe(true);
    expect(actions.study.kind).toBe("hidden");
  });

  test("known-unavailable study lets sing take full width", () => {
    const content = song({ karaoke: { status: "ready" }, onKaraoke: noop, study: { status: "unavailable" } });
    expect(deriveSongActions(content, deriveSongUI(content)).reserveStudySlot).toBe(false);
  });

  test("failed karaoke hides failure detail from the public", () => {
    const content = song({ karaoke: { status: "failed" }, study: { status: "ready", onStudy: undefined }, onStudy: noop });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.karaoke).toEqual({ kind: "disabled", label: "Sing" });
    expect(actions.failureReason).toBeNull();
  });

  test("failed karaoke shows detail to managers", () => {
    const content = song({
      karaoke: { status: "failed", reason: { code: "karaoke_disabled", kind: "config", ownerAction: "enable_karaoke" } },
      viewerCanManage: true,
    });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.failureReason).toBe("Karaoke is disabled for this song.");
  });

  test("combined study+sing failures use the combined copy", () => {
    const content = song({
      karaoke: { status: "failed" },
      study: { status: "locked" },
      viewerCanManage: true,
    });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.failureReason).toBe("Study and Sing setup failed for this song.");
  });

  test("reward labels replace the default CTA copy", () => {
    const content = song({
      karaoke: { status: "ready", rewardLabel: "5 CRED" },
      onKaraoke: noop,
      study: { status: "ready", rewardLabel: "3 CRED" },
      onStudy: noop,
    });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.karaoke.kind === "callback" && actions.karaoke.label).toBe("Sing · Earn 5 CRED");
    expect(actions.study.kind === "callback" && actions.study.label).toBe("Study · Earn 3 CRED");
  });

  test("processing capabilities render as preparing", () => {
    const content = song({ karaoke: { status: "processing" }, study: { status: "processing" } });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.karaoke).toEqual({ kind: "processing", label: "Sing", previewOnly: false });
    expect(actions.study).toEqual({ kind: "processing", label: "Study", previewOnly: false });
  });

  test("vinyl rows surface the release URL", () => {
    const content = song({
      vinylRelease: { available: true, provider: "elasticstage", url: "https://elasticstage.com/x" },
    });
    expect(deriveSongActions(content, deriveSongUI(content)).vinylUrl).toBe("https://elasticstage.com/x");
  });

  test("age-gated songs hide all actions until proof", () => {
    const content = song({
      accessMode: "locked",
      ageGatePolicy: "18_plus",
      contentSafetyState: "adult",
      listingMode: "listed",
      listingStatus: "active",
      onBuy: noop,
    });
    const actions = deriveSongActions(content, deriveSongUI(content));
    expect(actions.commerce).toBeNull();
    expect(actions.vinylUrl).toBeNull();
  });
});

describe("songFeatureFailureCopy", () => {
  test("interpolates the feature label for content gaps", () => {
    expect(songFeatureFailureCopy("study", { code: "lyrics_missing", kind: "content", ownerAction: "edit_song" }))
      .toBe("Study needs lyrics first.");
    expect(songFeatureFailureCopy("sing", { code: "instrumental_missing", kind: "content", ownerAction: "upload_instrumental" }))
      .toBe("Karaoke needs an instrumental upload.");
  });

  test("unknown reasons return null", () => {
    expect(songFeatureFailureCopy("study", undefined)).toBeNull();
  });
});

