"use client";

import type {
  ComposerTab,
  DerivativeStepState,
  MonetizationState,
  PostAudience,
  SongMode,
} from "@/components/compositions/post-composer/post-composer.types";

type SongDerivativeReference = NonNullable<DerivativeStepState["references"]>[number];
type SongDerivativeInput = Pick<DerivativeStepState, "required"> & {
  references?: SongDerivativeReference[];
};

export function buildSongPostRequest(input: {
  bundleId: string | null;
  derivativeStep: SongDerivativeInput | undefined;
  idempotencyKey: string;
  paidSongPriceUsd: number | null;
  songMode: SongMode;
  title: string;
  visibility: PostAudience;
}) {
  return {
    access_mode: input.paidSongPriceUsd != null ? "locked" as const : "public" as const,
    identity_mode: "public" as const,
    idempotency_key: input.idempotencyKey,
    post_type: "song" as const,
    rights_basis: input.songMode === "original" ? "original" as const : "derivative" as const,
    song_artifact_bundle_id: input.bundleId,
    song_mode: input.songMode,
    title: input.title.trim(),
    translation_policy: "machine_allowed" as const,
    upstream_asset_refs: input.songMode === "remix"
      ? input.derivativeStep?.references?.map((reference) => reference.id)
      : undefined,
    visibility: input.visibility,
  };
}

export function buildSongListingRequest(input: {
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
  derivativeStep: SongDerivativeInput | undefined;
  monetizationState: Pick<MonetizationState, "rightsAttested" | "visible">;
  paidSongPriceInvalid: boolean;
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

  if (input.composerMode === "song" && input.monetizationState.visible && input.paidSongPriceInvalid) {
    return {
      disabled: true,
      submitError: "Enter a valid unlock price before publishing this song.",
    };
  }

  if (input.composerMode === "song" && input.monetizationState.visible && !input.monetizationState.rightsAttested) {
    return {
      disabled: true,
      submitError: "Confirm you have the rights to publish and monetize this track.",
    };
  }

  if (input.composerMode === "song" && input.derivativeStep?.required && !(input.derivativeStep.references?.length ?? 0)) {
    return {
      disabled: true,
      submitError: "Attach a source track before publishing this remix.",
    };
  }

  return {
    disabled: false,
    submitError: null,
  };
}
