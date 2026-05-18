"use client";

import type {
  AssetLicenseState,
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { usdToCents } from "@/lib/formatting/currency";

type AssetDerivativeReference = NonNullable<DerivativeStepState["references"]>[number];
export type AssetDerivativeInput = Pick<DerivativeStepState, "required" | "sourceTermsAccepted"> & {
  references?: AssetDerivativeReference[];
};

export function isResolvedDerivativeReference(reference: AssetDerivativeReference): boolean {
  return !reference.id.startsWith("acr:custom-file:") && !reference.id.startsWith("acr:unresolved-bundle:");
}

export function resolvedDerivativeReferences(input: AssetDerivativeInput | undefined): AssetDerivativeReference[] {
  return input?.references?.filter(isResolvedDerivativeReference) ?? [];
}

export function validateOriginalAssetLicense(license: AssetLicenseState | undefined, contentLabel: "song" | "video"): string | null {
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
}) {
  if (input.paidSongPriceUsd == null) {
    return null;
  }

  const donationSharePct = Number.isInteger(input.charityContributionPct)
    && (input.charityContributionPct ?? 0) > 0
    && (input.charityContributionPct ?? 0) <= 100
    ? input.charityContributionPct ?? null
    : null;

  return {
    asset: input.assetId,
    price_cents: usdToCents(input.paidSongPriceUsd) ?? 0,
    regional_pricing_enabled: input.pricingPolicyRegionalPricingEnabled && input.regionalPricingEnabled,
    donation_partner: donationSharePct && input.charityPartnerId ? input.charityPartnerId : null,
    donation_share_bps: donationSharePct == null ? null : donationSharePct * 100,
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

    if (input.composerMode === "song" && input.derivativeStep?.required && resolvedDerivativeReferences(input.derivativeStep).length === 0) {
      return "Attach a source track before publishing this remix.";
    }

    if (input.composerMode === "song" && input.derivativeStep?.required && input.derivativeStep.sourceTermsAccepted !== true) {
      return "Accept the source license terms before publishing this remix.";
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

  if (input.composerMode === "song" && (input.songMode ?? "original") === "original") {
    const licenseError = validateOriginalAssetLicense(input.license, "song");
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
    const licenseError = validateOriginalAssetLicense(input.license, "video");
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
