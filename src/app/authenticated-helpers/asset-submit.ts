"use client";

import type {
  AssetLicenseState,
  AssetRoyaltySplitState,
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { usdToCents } from "@/lib/formatting/currency";

const ROYALTY_BEARING_PRESETS = new Set(["commercial-use", "commercial-remix"]);
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export type RoyaltyAllocationRequest = {
  recipient_kind: "creator" | "collaborator";
  wallet_address: string;
  share_bps: number;
};

// A "real" split has at least one collaborator. A creator-only split is
// equivalent to the default single-owner asset and is not sent to the API.
function hasCollaboratorAllocation(split: AssetRoyaltySplitState | undefined): boolean {
  return !!split && split.allocations.some((allocation) => allocation.recipientKind === "collaborator");
}

// 2-decimal percent -> integer basis points (0.01% granularity). Only safe to
// call after validateRoyaltySplit confirms each percent is bps-aligned.
function sharePctToBps(pct: number): number {
  return Math.round(pct * 100);
}

// True when pct lands on a whole basis point (0.01%) within fp tolerance.
function isBpsAligned(pct: number): boolean {
  return Math.abs(pct * 100 - Math.round(pct * 100)) < 1e-6;
}

/**
 * Validates the royalty split. `undefined` means the feature is untouched
 * (single-owner; no request sent) and passes. ANY supplied allocation state is
 * validated fully so malformed creator-only states cannot slip through; the
 * commercial-license requirement only applies once a collaborator is present
 * (a creator-only split is omitted from the request).
 */
export function validateRoyaltySplit(input: {
  split: AssetRoyaltySplitState | undefined;
  license: AssetLicenseState | undefined;
  contentLabel: "song" | "video";
}): string | null {
  const split = input.split;
  if (!split) {
    return null;
  }
  const allocations = split.allocations;
  if (allocations.length === 0) {
    return "Add your wallet to the royalty split.";
  }
  if (hasCollaboratorAllocation(split)
    && (!input.license || !ROYALTY_BEARING_PRESETS.has(input.license.presetId ?? ""))) {
    return `Royalty splits require a commercial license for this ${input.contentLabel}.`;
  }
  if (allocations.length > 10) {
    return "A royalty split can have at most 10 recipients.";
  }
  if (allocations.filter((allocation) => allocation.recipientKind === "creator").length !== 1) {
    return "A royalty split must have exactly one creator allocation.";
  }
  const seen = new Set<string>();
  let totalBps = 0;
  for (const allocation of allocations) {
    if (!isBpsAligned(allocation.sharePct)) {
      return "Royalty shares can be specified to 0.01% at most.";
    }
    const bps = sharePctToBps(allocation.sharePct);
    if (bps <= 0 || bps > 10000) {
      return "Each royalty share must be greater than 0%.";
    }
    totalBps += bps;
    const wallet = (allocation.walletAddress ?? "").trim();
    if (!EVM_ADDRESS_PATTERN.test(wallet)) {
      return allocation.recipientKind === "creator"
        ? "Your wallet is required for the royalty split."
        : "Each collaborator needs a valid wallet address.";
    }
    const normalized = wallet.toLowerCase();
    if (seen.has(normalized)) {
      return "Royalty split wallets must be unique.";
    }
    seen.add(normalized);
  }
  if (totalBps !== 10000) {
    return "Royalty shares must total 100%.";
  }
  return null;
}

export function buildRoyaltyAllocationsRequest(
  split: AssetRoyaltySplitState | undefined,
): RoyaltyAllocationRequest[] | undefined {
  // Only a real split (with a collaborator) is sent; creator-only / untouched
  // stays single-owner. Assumes validateRoyaltySplit already passed.
  if (!hasCollaboratorAllocation(split)) {
    return undefined;
  }
  return split!.allocations.map((allocation) => ({
    recipient_kind: allocation.recipientKind,
    wallet_address: (allocation.walletAddress ?? "").trim(),
    share_bps: sharePctToBps(allocation.sharePct),
  }));
}

type AssetDerivativeReference = NonNullable<DerivativeStepState["references"]>[number];
export type AssetDerivativeInput = Pick<DerivativeStepState, "required" | "sourceTermsAccepted"> & Partial<Pick<DerivativeStepState, "trigger" | "visible">> & {
  references?: AssetDerivativeReference[];
};

function isResolvedDerivativeReference(reference: AssetDerivativeReference): boolean {
  return !reference.id.startsWith("acr:custom-file:") && !reference.id.startsWith("acr:unresolved-bundle:");
}

export function resolvedDerivativeReferences(input: AssetDerivativeInput | undefined): AssetDerivativeReference[] {
  return input?.references?.filter(isResolvedDerivativeReference) ?? [];
}

function isVideoDerivativeSongMode(input: AssetDerivativeInput | undefined): boolean {
  return input?.visible === true && input.trigger === "uses_song";
}

export function validateAssetLicense(license: AssetLicenseState | undefined, contentLabel: "song" | "video"): string | null {
  if (!license) {
    return `Choose license terms before publishing this ${contentLabel}.`;
  }

  if (
    license.presetId !== "non-commercial"
    && license.presetId !== "commercial-use"
    && license.presetId !== "commercial-remix"
  ) {
    return `Choose valid license terms before publishing this ${contentLabel}.`;
  }

  if (license.presetId === "commercial-remix") {
    const commercialRevSharePct = license.commercialRevSharePct;
    if (
      commercialRevSharePct == null
      || !Number.isInteger(commercialRevSharePct)
      || commercialRevSharePct < 0
      || commercialRevSharePct > 100
    ) {
      return `Choose a valid remix revenue share before publishing this ${contentLabel}.`;
    }
    return null;
  }

  if (license.commercialRevSharePct != null) {
    return "Revenue share is only available for commercial remix licenses.";
  }

  return null;
}

export function buildAssetListingRequest(input: {
  assetId: string;
  paidSongPriceUsd: number | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  regionalPricingEnabled: boolean;
  charityContributionPct?: number | null;
  charityPartnerId?: string | null;
  vinylReleaseUrl?: string | null;
}) {
  if (input.paidSongPriceUsd == null) {
    return null;
  }

  const donationSharePct = Number.isInteger(input.charityContributionPct)
    && (input.charityContributionPct ?? 0) > 0
    && (input.charityContributionPct ?? 0) <= 100
    ? input.charityContributionPct ?? null
    : null;

  const vinylReleaseUrl = input.vinylReleaseUrl?.trim() || null;

  return {
    asset: input.assetId,
    price_cents: usdToCents(input.paidSongPriceUsd) ?? 0,
    regional_pricing_enabled: input.pricingPolicyRegionalPricingEnabled && input.regionalPricingEnabled,
    donation_partner: donationSharePct && input.charityPartnerId ? input.charityPartnerId : null,
    donation_share_bps: donationSharePct == null ? null : donationSharePct * 100,
    ...(vinylReleaseUrl
      ? {
          vinyl_release_provider: "elasticstage" as const,
          vinyl_release_url: vinylReleaseUrl,
        }
      : {}),
    status: "active" as const,
  };
}

export function buildLiveRoomListingRequest(input: {
  liveRoomId?: string | null;
  paidLiveRoomPriceUsd: number | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  regionalPricingEnabled: boolean;
}) {
  if (input.paidLiveRoomPriceUsd == null) {
    return null;
  }

  return {
    live_room: input.liveRoomId ?? null,
    price_cents: usdToCents(input.paidLiveRoomPriceUsd) ?? 0,
    regional_pricing_enabled: input.pricingPolicyRegionalPricingEnabled && input.regionalPricingEnabled,
    status: "active" as const,
  };
}

export function resolveComposerSubmitState(input: {
  canSubmit: boolean;
  composerMode: ComposerTab;
  derivativeStep: AssetDerivativeInput | undefined;
  license: AssetLicenseState | undefined;
  monetizationState: Pick<MonetizationState, "visible">;
  paidSongPriceInvalid: boolean;
  royaltySplit?: AssetRoyaltySplitState;
  songMode?: SongMode;
  submitError: string | null;
}) {
  const contentError = (() => {
    if (!input.canSubmit) return null;
    const selectedSourceCount = resolvedDerivativeReferences(input.derivativeStep).length;

    if (input.composerMode === "song" && input.derivativeStep?.required && selectedSourceCount === 0) {
      return "Attach a source track before publishing this remix.";
    }

    if (input.composerMode === "song" && input.derivativeStep?.required && input.derivativeStep.sourceTermsAccepted !== true) {
      return "Accept the source license terms before publishing this remix.";
    }

    const videoRequiresSource = input.derivativeStep?.required || isVideoDerivativeSongMode(input.derivativeStep);

    if (input.composerMode === "video" && videoRequiresSource && selectedSourceCount === 0) {
      return "Attach a source song before publishing this video.";
    }

    if (
      input.composerMode === "video"
      && selectedSourceCount > 0
      && input.derivativeStep?.sourceTermsAccepted !== true
    ) {
      return "Accept the source song terms before publishing this video.";
    }

    return null;
  })();
  const canContinue = input.canSubmit && !contentError;

  if (input.submitError) {
    return {
      canContinue,
      canPost: false,
      disabled: true,
      submitError: input.submitError,
    };
  }

  if (!input.canSubmit) {
    return {
      canContinue: false,
      canPost: false,
      disabled: true,
      submitError: null,
    };
  }

  if (contentError) {
    return {
      canContinue: false,
      canPost: false,
      disabled: true,
      submitError: contentError,
    };
  }

  const paidAssetNeedsPrice = (
    (input.composerMode === "song" || input.composerMode === "video")
      && input.monetizationState.visible
  ) || input.composerMode === "live";

  if (paidAssetNeedsPrice && input.paidSongPriceInvalid) {
    return {
      canContinue,
      canPost: false,
      disabled: true,
      submitError: input.composerMode === "song"
        ? "Enter a valid unlock price before publishing this song."
        : input.composerMode === "video"
          ? "Enter a valid unlock price before publishing this video."
          : "Enter a valid ticket price before publishing this live room.",
    };
  }

  if (input.composerMode === "song") {
    const licenseError = validateAssetLicense(input.license, "song");
    if (licenseError) {
      return {
        canContinue,
        canPost: false,
        disabled: true,
        submitError: licenseError,
      };
    }
  }

  if (input.composerMode === "video" && input.monetizationState.visible) {
    const licenseError = validateAssetLicense(input.license, "video");
    if (licenseError) {
      return {
        canContinue,
        canPost: false,
        disabled: true,
        submitError: licenseError,
      };
    }
  }

  if (input.composerMode === "song" || (input.composerMode === "video" && input.monetizationState.visible)) {
    const splitError = validateRoyaltySplit({
      split: input.royaltySplit,
      license: input.license,
      contentLabel: input.composerMode === "song" ? "song" : "video",
    });
    if (splitError) {
      return {
        canContinue,
        canPost: false,
        disabled: true,
        submitError: splitError,
      };
    }
  }

  return {
    canContinue,
    canPost: true,
    disabled: false,
    submitError: null,
  };
}
