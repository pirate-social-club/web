"use client";

import type {
  AssetLicenseState,
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";

type AssetDerivativeReference = NonNullable<DerivativeStepState["references"]>[number];
export type AssetDerivativeInput = Pick<DerivativeStepState, "required" | "sourceTermsAccepted"> & {
  references?: AssetDerivativeReference[];
};

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
    asset_id: input.assetId,
    price_usd: input.paidSongPriceUsd,
    regional_pricing_enabled: input.pricingPolicyRegionalPricingEnabled && input.regionalPricingEnabled,
    donation_partner_id: donationSharePct && input.charityPartnerId ? input.charityPartnerId : null,
    donation_share_pct: donationSharePct,
    status: "active" as const,
  };
}

export function resolveComposerSubmitState(input: {
  canSubmit: boolean;
  composerMode: ComposerTab;
  derivativeStep: AssetDerivativeInput | undefined;
  license: AssetLicenseState | undefined;
  monetizationState: Pick<MonetizationState, "rightsAttested" | "visible">;
  paidSongPriceInvalid: boolean;
  songMode?: SongMode;
  submitError: string | null;
}) {
  if (input.submitError) {
    return {
      disabled: true,
      submitError: input.submitError,
    };
  }

  if (!input.canSubmit) {
    return {
      disabled: true,
      submitError: null,
    };
  }

  if ((input.composerMode === "song" || input.composerMode === "video") && input.monetizationState.visible && input.paidSongPriceInvalid) {
    return {
      disabled: true,
      submitError: input.composerMode === "song"
        ? "Enter a valid unlock price before publishing this song."
        : "Enter a valid unlock price before publishing this video.",
    };
  }

  if ((input.composerMode === "song" || input.composerMode === "video") && input.monetizationState.visible && !input.monetizationState.rightsAttested) {
    return {
      disabled: true,
      submitError: input.composerMode === "song"
        ? "Confirm you have the rights to publish and monetize this track."
        : "Confirm you have the rights to publish and monetize this video.",
    };
  }

  if (input.composerMode === "song" && input.derivativeStep?.required && !(input.derivativeStep.references?.length ?? 0)) {
    return {
      disabled: true,
      submitError: "Attach a source track before publishing this remix.",
    };
  }

  if (input.composerMode === "song" && input.derivativeStep?.required && input.derivativeStep.sourceTermsAccepted !== true) {
    return {
      disabled: true,
      submitError: "Accept the source license terms before publishing this remix.",
    };
  }

  if (input.composerMode === "song" && (input.songMode ?? "original") === "original") {
    const licenseError = validateOriginalAssetLicense(input.license, "song");
    if (licenseError) {
      return {
        disabled: true,
        submitError: licenseError,
      };
    }
  }

  if (input.composerMode === "video" && input.monetizationState.visible) {
    const licenseError = validateOriginalAssetLicense(input.license, "video");
    if (licenseError) {
      return {
        disabled: true,
        submitError: licenseError,
      };
    }
  }

  return {
    disabled: false,
    submitError: null,
  };
}
