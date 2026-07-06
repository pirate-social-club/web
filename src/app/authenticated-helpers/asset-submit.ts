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

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function isDefaultCreatorSplit(royaltySplit: AssetRoyaltySplitState): boolean {
  if (royaltySplit.allocations.length !== 1) return false;
  const [allocation] = royaltySplit.allocations;
  return allocation.recipientKind === "creator" && allocation.sharePct === 100;
}

function isRoyaltyBearingLicense(license: AssetLicenseState | undefined): boolean {
  return license?.presetId === "commercial-use" || license?.presetId === "commercial-remix";
}

export function buildRoyaltyAllocationRequests(
  royaltySplit: AssetRoyaltySplitState | undefined,
  input: {
    contentLabel: "song" | "video";
    license: AssetLicenseState | undefined;
  },
): Array<{ recipient_kind: "creator" | "collaborator"; wallet_address: string; share_bps: number }> | undefined {
  if (!royaltySplit || isDefaultCreatorSplit(royaltySplit)) {
    return undefined;
  }
  if (!Array.isArray(royaltySplit.allocations) || royaltySplit.allocations.length === 0) {
    throw new Error("Royalty split must include at least one recipient.");
  }
  if (royaltySplit.allocations.length > 10) {
    throw new Error("Royalty split supports at most 10 recipients.");
  }

  let creatorCount = 0;
  let totalShareBps = 0;
  let hasCollaborator = false;
  const seenWallets = new Set<string>();
  const allocations = royaltySplit.allocations.map((allocation) => {
    if (allocation.recipientKind === "creator") {
      creatorCount += 1;
    } else {
      hasCollaborator = true;
    }

    const walletAddress = allocation.walletAddress?.trim() ?? "";
    if (!EVM_ADDRESS_PATTERN.test(walletAddress)) {
      throw new Error("Enter a valid wallet address for every royalty recipient.");
    }
    const normalizedWallet = walletAddress.toLowerCase();
    if (seenWallets.has(normalizedWallet)) {
      throw new Error("Each royalty recipient wallet must be unique.");
    }
    seenWallets.add(normalizedWallet);

    const shareBps = Math.round(allocation.sharePct * 100);
    if (
      !Number.isFinite(allocation.sharePct)
      || Math.abs(allocation.sharePct * 100 - shareBps) > 1e-6
      || shareBps <= 0
      || shareBps > 10000
    ) {
      throw new Error("Royalty shares must be greater than 0% and use at most two decimal places.");
    }
    totalShareBps += shareBps;

    return {
      recipient_kind: allocation.recipientKind,
      wallet_address: walletAddress,
      share_bps: shareBps,
    };
  });

  if (creatorCount !== 1) {
    throw new Error("Royalty split must include exactly one creator recipient.");
  }
  if (totalShareBps !== 10000) {
    throw new Error("Royalty shares must total 100% before publishing.");
  }
  if (hasCollaborator && !isRoyaltyBearingLicense(input.license)) {
    throw new Error(`Collaborator royalty splits require a commercial license for this ${input.contentLabel}.`);
  }

  return allocations;
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

  return {
    canContinue,
    canPost: true,
    disabled: false,
    submitError: null,
  };
}
