// Pure song-card derivation: everything the song renderer needs to decide is
// computed here so song-content.tsx stays a thin view and the policy is unit
// testable without a DOM. Ported from the React post-card-song-content.tsx
// (deriveSongUI + SongOfferRows decision logic).

import type {
  DownloadPolicy,
  SongContentSpec,
  SongFeatureCapabilityReason,
  UpstreamAttribution,
} from "./types";

export const DEFAULT_PREVIEW_DURATION_MS = 30000;

export interface SongLabels {
  buy: string;
  buyForPrice: (price: string) => string;
  buyDigitalMp3: string;
  buyDigitalMp3ForPrice: (price: string) => string;
  unlock: string;
  unlockDigitalMp3: string;
  study: string;
  studyAriaLabel: string;
  studyEarnReward: (reward: string) => string;
  studyLocked: string;
  sing: string;
  singAriaLabel: string;
  singEarnReward: (reward: string) => string;
  singSetupFailed: string;
  studySingSetupFailed: string;
  vinylLabel: string;
  providerKeyMissing: (label: string) => string;
  providerKeyInvalid: string;
  providerRateLimited: string;
  providerUnavailable: string;
  providerTimeout: string;
  providerInvalidResponse: string;
  lyricsMissing: (label: string) => string;
  lyricsTooShort: (label: string) => string;
  instrumentalMissing: string;
  timedLyricsMissing: string;
  exerciseGenerationFailed: string;
  karaokeDisabled: string;
  locked: (label: string) => string;
  remixOf: string;
  samples: string;
  references: string;
  inspiredBy: string;
  derivedFrom: string;
  titleByArtist: (title: string, artist: string) => string;
  titleRemix: (title: string) => string;
}

export const defaultSongLabels: SongLabels = {
  buy: "Buy",
  buyForPrice: (price) => `Buy · ${price}`,
  buyDigitalMp3: "Buy digital MP3",
  buyDigitalMp3ForPrice: (price) => `Buy digital MP3 for ${price}`,
  unlock: "Unlock",
  unlockDigitalMp3: "Unlock digital MP3",
  study: "Study",
  studyAriaLabel: "Study this song",
  studyEarnReward: (reward) => `Study · Earn ${reward}`,
  studyLocked: "Study is locked for this song.",
  sing: "Sing",
  singAriaLabel: "Sing this song",
  singEarnReward: (reward) => `Sing · Earn ${reward}`,
  singSetupFailed: "Sing setup failed for this song.",
  studySingSetupFailed: "Study and Sing setup failed for this song.",
  vinylLabel: "Vinyl",
  providerKeyMissing: (label) => `${label} needs an AI provider key.`,
  providerKeyInvalid: "The configured AI provider key is invalid.",
  providerRateLimited: "The AI provider is rate limited. Try again later.",
  providerUnavailable: "The AI provider is unavailable. Try again later.",
  providerTimeout: "The AI provider timed out. Try again later.",
  providerInvalidResponse: "The AI provider returned an invalid response.",
  lyricsMissing: (label) => `${label} needs lyrics first.`,
  lyricsTooShort: (label) => `${label} needs longer lyrics.`,
  instrumentalMissing: "Karaoke needs an instrumental upload.",
  timedLyricsMissing: "Timed lyrics are not available yet.",
  exerciseGenerationFailed: "Exercise generation failed.",
  karaokeDisabled: "Karaoke is disabled for this song.",
  locked: (label) => `${label} is locked.`,
  remixOf: "Remix of",
  samples: "Samples",
  references: "References",
  inspiredBy: "Inspired by",
  derivedFrom: "Derived from",
  titleByArtist: (title, artist) => `${title} by ${artist}`,
  titleRemix: (title) => `${title} (Remix)`,
};

export function songFeatureFailureCopy(
  feature: "study" | "sing",
  reason: SongFeatureCapabilityReason | undefined,
  labels: SongLabels = defaultSongLabels,
): string | null {
  if (!reason) return null;
  const label = feature === "study" ? labels.study : labels.sing;
  switch (reason.code) {
    case "provider_key_missing":
      return labels.providerKeyMissing(label);
    case "provider_key_invalid":
      return labels.providerKeyInvalid;
    case "provider_rate_limited":
      return labels.providerRateLimited;
    case "provider_unavailable":
      return labels.providerUnavailable;
    case "provider_timeout":
      return labels.providerTimeout;
    case "provider_invalid_response":
      return labels.providerInvalidResponse;
    case "lyrics_missing":
      return labels.lyricsMissing(label);
    case "lyrics_too_short":
      return labels.lyricsTooShort(label);
    case "instrumental_missing":
      return labels.instrumentalMissing;
    case "timed_lyrics_missing":
    case "alignment_failed":
      return labels.timedLyricsMissing;
    case "exercise_generation_failed":
      return labels.exerciseGenerationFailed;
    case "karaoke_disabled":
      return labels.karaokeDisabled;
    case "locked":
      return labels.locked(label);
    default:
      return null;
  }
}

// Derived UI state from domain model — all visual state is centralized here.
export interface DerivedSongUI {
  // Core playback
  isPlayable: boolean;
  canShowPreview: boolean;
  previewMaxMs: number | undefined;

  // Viewer states that affect UI
  isAgeGated: boolean;
  ageGateRequiresProof: boolean;

  // Artwork treatment is reserved for safety gates, not commerce locks.
  showAgeGatedArtwork: boolean;

  // Commerce states
  showPrice: boolean;
  showUnlock: boolean;
  showOwned: boolean;
  showVinylLink: boolean;
  showBuy: boolean;
  showDownload: boolean;
  effectiveDownloadPolicy: DownloadPolicy;
  primaryCommerceAction: "buy" | "unlock" | "verify_age" | null;

  // Attributions
  showAttribution: boolean;

  // Primary action
  primaryAction: "play" | "pause" | "buffering" | "preview" | "locked";
}

export function deriveSongUI(content: SongContentSpec): DerivedSongUI {
  const {
    playbackState = "idle",
    accessMode,
    contentSafetyState,
    ageGatePolicy,
    ageGateViewerState,
    listingMode,
    listingStatus,
    hasEntitlement,
    vinylRelease,
    songMode,
    upstreamAttributions,
    onBuy,
    onDownload,
    onUnlock,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";

  // Access checks
  const isLocked = accessMode === "locked";

  // Commerce checks
  const isListed = listingMode === "listed";
  const isListingActive = listingStatus === "active";
  const isListedActive = isListed && isListingActive;
  const isOwned = hasEntitlement === true;
  const effectiveDownloadPolicy = resolveEffectiveDownloadPolicy(content);
  const hasVinylReleaseUrl = Boolean(vinylRelease?.url?.trim());

  // Playback availability
  const isPlayable = !ageGateRequiresProof;
  const canShowPreview = isLocked && !isOwned && !ageGateRequiresProof;
  const previewMaxMs = resolvePlaybackDurationMs(content, canShowPreview);

  const showAgeGatedArtwork = ageGateRequiresProof;

  // Commerce UI
  const showPrice = isListed && isListingActive && !isOwned && isLocked;
  const showBuy = showPrice && Boolean(onBuy);
  const showUnlock = isLocked && !isOwned && !isListedActive && Boolean(onUnlock);
  const showOwned = isLocked && isOwned;
  const showVinylLink = hasVinylReleaseUrl && !ageGateRequiresProof;
  const showDownload = Boolean(onDownload) && (
    effectiveDownloadPolicy === "free_download"
    || (effectiveDownloadPolicy === "purchased_download" && isOwned)
  );

  // Attribution
  const showAttribution = !!(songMode === "remix" && upstreamAttributions && upstreamAttributions.length > 0);

  // Determine primary action
  let primaryAction: DerivedSongUI["primaryAction"] = "play";

  if (ageGateRequiresProof) {
    primaryAction = "locked";
  } else if (playbackState === "playing") {
    primaryAction = "pause";
  } else if (playbackState === "buffering") {
    primaryAction = "buffering";
  } else if (isOwned) {
    primaryAction = "play";
  } else if (canShowPreview) {
    primaryAction = "preview";
  } else {
    primaryAction = "play";
  }

  let primaryCommerceAction: DerivedSongUI["primaryCommerceAction"] = null;
  if (ageGateRequiresProof) {
    primaryCommerceAction = "verify_age";
  } else if (isLocked && !isOwned && isListedActive && onBuy) {
    primaryCommerceAction = "buy";
  } else if (showUnlock) {
    primaryCommerceAction = "unlock";
  }

  return {
    isPlayable,
    canShowPreview,
    previewMaxMs,
    isAgeGated,
    ageGateRequiresProof,
    showAgeGatedArtwork,
    showPrice,
    showUnlock,
    showOwned,
    showVinylLink,
    showBuy,
    showDownload,
    effectiveDownloadPolicy,
    primaryCommerceAction,
    showAttribution,
    primaryAction,
  };
}

function resolveEffectiveDownloadPolicy(content: SongContentSpec): DownloadPolicy {
  if (content.downloadPolicy) return content.downloadPolicy;

  if (content.accessMode === "public") {
    return "stream_only";
  }

  if (content.listingMode === "listed" && content.listingStatus === "active") {
    return "purchased_download";
  }

  return "stream_only";
}

export function relationshipLabel(
  source: UpstreamAttribution,
  labels: SongLabels = defaultSongLabels,
): string {
  switch (source.relationshipType) {
    case "remix_of":
      return labels.remixOf;
    case "samples":
      return labels.samples;
    case "references_video":
      return labels.references;
    case "references_song":
      return "References";
    case "inspired_by":
      return labels.inspiredBy;
    default:
      return labels.derivedFrom;
  }
}

function sourceTitle(source: UpstreamAttribution, labels: SongLabels): string {
  return source.artist ? labels.titleByArtist(source.title, source.artist) : source.title;
}

export function deriveSongDerivativeSummary(
  upstreamAttributions: UpstreamAttribution[] | undefined,
  songMode: SongContentSpec["songMode"],
  labels: SongLabels = defaultSongLabels,
): string | null {
  if (!upstreamAttributions || upstreamAttributions.length === 0) {
    return null;
  }

  if (upstreamAttributions.length === 1) {
    const source = upstreamAttributions[0]!;
    if (songMode === "remix") {
      return labels.titleRemix(source.title);
    }
    return `${relationshipLabel(source, labels)} ${sourceTitle(source, labels)}`;
  }

  if (songMode === "remix") {
    return `${labels.titleRemix(upstreamAttributions[0]!.title)} +${upstreamAttributions.length - 1}`;
  }

  return `${relationshipLabel(upstreamAttributions[0]!, labels)} ${sourceTitle(upstreamAttributions[0]!, labels)} +${upstreamAttributions.length - 1}`;
}

export function clampProgressMs(progressMs: number | undefined, durationMs: number | undefined): number {
  const progress = Number.isFinite(progressMs) ? Math.max(0, progressMs ?? 0) : 0;
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return progress;
  }
  return Math.min(progress, durationMs);
}

export function formatDurationMs(ms: number | undefined): string {
  const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function resolvePlaybackDurationMs(
  content: SongContentSpec,
  canShowPreview: boolean,
): number | undefined {
  if (!canShowPreview) {
    return content.durationMs;
  }

  if (content.previewDurationMs && content.previewDurationMs > 0) {
    return content.previewDurationMs;
  }

  if (content.durationMs && content.durationMs > 0) {
    return Math.min(content.durationMs, DEFAULT_PREVIEW_DURATION_MS);
  }

  return DEFAULT_PREVIEW_DURATION_MS;
}

// ---------------------------------------------------------------------------
// Offer/action rows (extracted from the React SongOfferRows component).
// ---------------------------------------------------------------------------

export type SongCommerceRow =
  | { kind: "buy"; ariaLabel: string; label: string }
  | { kind: "unlock"; ariaLabel: string; label: string };

export type SongLearningActionModel =
  | { kind: "callback"; ariaLabel?: string; label: string }
  | { kind: "link"; ariaLabel: string; href: string; label: string }
  | { kind: "processing"; label: string; previewOnly: boolean }
  | { kind: "disabled"; label: string }
  | { kind: "hidden" };

export interface SongActionsModel {
  /** Digital good buy/unlock row, shown before learning actions. */
  commerce: SongCommerceRow | null;
  study: SongLearningActionModel;
  karaoke: SongLearningActionModel;
  /** Reserve the study slot while a partial feed payload has not delivered
      the study capability yet, so Sing does not jump width. */
  reserveStudySlot: boolean;
  /** Manager-facing failure detail, when either capability failed. */
  failureReason: string | null;
  vinylUrl: string | null;
}

export function deriveSongActions(
  content: SongContentSpec,
  ui: DerivedSongUI,
  labels: SongLabels = defaultSongLabels,
): SongActionsModel {
  const hidden: SongActionsModel = {
    commerce: null,
    study: { kind: "hidden" },
    karaoke: { kind: "hidden" },
    reserveStudySlot: false,
    failureReason: null,
    vinylUrl: null,
  };
  if (ui.ageGateRequiresProof) return hidden;

  const isOwned = content.hasEntitlement === true;
  const isLocked = content.accessMode === "locked";
  const isListedActive = content.listingMode === "listed" && content.listingStatus === "active";
  const effectivePrice = content.regionalPriceLabel ?? content.priceLabel;
  const vinylUrl = content.vinylRelease?.url?.trim() || null;

  let commerce: SongCommerceRow | null = null;
  if (isLocked && !isOwned && isListedActive && content.onBuy) {
    commerce = {
      kind: "buy",
      ariaLabel: effectivePrice ? labels.buyDigitalMp3ForPrice(effectivePrice) : labels.buyDigitalMp3,
      label: effectivePrice ? labels.buyForPrice(effectivePrice) : labels.buy,
    };
  } else if (isLocked && !isOwned && !isListedActive && content.onUnlock) {
    commerce = { kind: "unlock", ariaLabel: labels.unlockDigitalMp3, label: labels.unlock };
  }

  let study: SongLearningActionModel = { kind: "hidden" };
  let studyFailureReason: string | null = null;
  const studyActionLabel = content.study?.rewardLabel
    ? labels.studyEarnReward(content.study.rewardLabel)
    : labels.study;

  if (!isLocked || isOwned) {
    switch (content.study?.status) {
      case "ready":
        if (content.onStudy) {
          study = { kind: "callback", label: studyActionLabel };
        } else if (content.studyHref) {
          study = { kind: "link", ariaLabel: labels.studyAriaLabel, href: content.studyHref, label: studyActionLabel };
        }
        break;
      case "processing":
        study = { kind: "processing", label: labels.study, previewOnly: content.study.previewOnly === true };
        break;
      case "locked":
        study = { kind: "disabled", label: labels.study };
        if (content.viewerCanManage) {
          studyFailureReason = songFeatureFailureCopy("study", content.study.reason, labels)
            ?? labels.studyLocked;
        }
        break;
      default:
        break;
    }
  }

  let karaoke: SongLearningActionModel = { kind: "hidden" };
  let karaokeFailureReason: string | null = null;
  const karaokeActionLabel = content.karaoke?.rewardLabel
    ? labels.singEarnReward(content.karaoke.rewardLabel)
    : labels.sing;
  if (!isLocked || isOwned) {
    switch (content.karaoke?.status) {
      case "ready":
        if (content.onKaraoke) {
          karaoke = { kind: "callback", label: karaokeActionLabel };
        } else if (content.karaokeHref) {
          karaoke = { kind: "link", ariaLabel: labels.singAriaLabel, href: content.karaokeHref, label: karaokeActionLabel };
        }
        break;
      case "processing":
        karaoke = { kind: "processing", label: labels.sing, previewOnly: content.karaoke.previewOnly === true };
        break;
      case "failed":
        karaoke = { kind: "disabled", label: labels.sing };
        if (content.viewerCanManage) {
          karaokeFailureReason = songFeatureFailureCopy("sing", content.karaoke.reason, labels)
            ?? labels.singSetupFailed;
        }
        break;
      default:
        if (content.onKaraoke) {
          karaoke = { kind: "callback", label: labels.sing };
        } else if (content.karaokeHref) {
          karaoke = { kind: "link", ariaLabel: labels.singAriaLabel, href: content.karaokeHref, label: labels.sing };
        }
        break;
    }
  }

  const failureReason = studyFailureReason && karaokeFailureReason
    ? labels.studySingSetupFailed
    : studyFailureReason ?? karaokeFailureReason;

  return {
    commerce,
    study,
    karaoke,
    reserveStudySlot: karaoke.kind !== "hidden" && content.study === undefined,
    failureReason,
    vinylUrl,
  };
}
