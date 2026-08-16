// Pure video-card derivation, ported from the React post-card-video-content.tsx.

import type { UpstreamAttribution, VideoContentSpec } from "./types";

export interface DerivedVideoUI {
  isAgeGated: boolean;
  ageGateRequiresProof: boolean;
  showLockedThumbnail: boolean;
  showAgeGatedThumbnail: boolean;
  showOwned: boolean;
  showBuy: boolean;
  showUnlock: boolean;
  showAttribution: boolean;
  canPlay: boolean;
}

export function deriveVideoUI(content: VideoContentSpec): DerivedVideoUI {
  const {
    accessMode,
    contentSafetyState,
    ageGatePolicy,
    ageGateViewerState,
    hasEntitlement,
    listingMode,
    listingStatus,
    onBuy,
    onUnlock,
    videoMode,
    upstreamAttributions,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";
  const isLocked = accessMode === "locked";
  const isOwned = hasEntitlement === true;
  const isListedActive = listingMode === "listed" && listingStatus === "active";

  const showLockedThumbnail = isLocked && !isOwned;
  const showAgeGatedThumbnail = ageGateRequiresProof;
  const showOwned = isLocked && isOwned;
  const showBuy = isLocked && !isOwned && isListedActive && Boolean(onBuy);
  const showUnlock = isLocked && !isOwned && !isListedActive && Boolean(onUnlock);

  const showAttribution = Boolean(
    upstreamAttributions?.length
    && (videoMode !== "original" || upstreamAttributions.some((source) => source.relationshipType === "references_song")),
  );

  const hasPlayableSource = content.src.trim().length > 0;
  const hasResolvableSource = hasPlayableSource || Boolean(content.onPlay);
  const hasLockedAccess = !isLocked || isOwned;
  const canPlay = hasResolvableSource && hasLockedAccess && !ageGateRequiresProof;

  return {
    isAgeGated,
    ageGateRequiresProof,
    showLockedThumbnail,
    showAgeGatedThumbnail,
    showOwned,
    showBuy,
    showUnlock,
    showAttribution,
    canPlay,
  };
}

export type VideoOfferModel =
  | { kind: "buy"; priceLabel?: string }
  | { kind: "unlock" }
  | { kind: "owned" }
  | { kind: "none" };

/** The full-video offer row shown under the preview frame. */
export function deriveVideoOffer(content: VideoContentSpec, ui: DerivedVideoUI): VideoOfferModel {
  if (ui.ageGateRequiresProof) return { kind: "none" };

  if (ui.showBuy && content.onBuy) {
    return { kind: "buy", priceLabel: content.regionalPriceLabel ?? content.priceLabel };
  }
  if (ui.showUnlock && content.onUnlock) {
    return { kind: "unlock" };
  }
  if (ui.showOwned) {
    return { kind: "owned" };
  }
  return { kind: "none" };
}

function deriveVideoDerivativeSummary(upstreamAttributions?: UpstreamAttribution[]): string | null {
  if (!upstreamAttributions || upstreamAttributions.length === 0) {
    return null;
  }

  if (upstreamAttributions.length === 1) {
    const source = upstreamAttributions[0]!;
    return source.artist
      ? `Derived from ${source.title} by ${source.artist}`
      : `Derived from ${source.title}`;
  }

  return `Derived from ${upstreamAttributions[0]!.title} +${upstreamAttributions.length - 1}`;
}

/** The attribution row under a video: a linked song source when present,
    otherwise the compact derivative summary. */
export function deriveVideoAttribution(
  content: VideoContentSpec,
  ui: DerivedVideoUI,
): { kind: "song"; source: UpstreamAttribution } | { kind: "summary"; label: string } | null {
  if (!ui.showAttribution) return null;

  const songSource = content.upstreamAttributions?.find((source) => source.relationshipType === "references_song");
  if (songSource) return { kind: "song", source: songSource };

  const summary = deriveVideoDerivativeSummary(content.upstreamAttributions);
  return summary ? { kind: "summary", label: summary } : null;
}
