"use client";

import type {
  AssetLicenseState,
  AssetRoyaltySplitState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import type { BasePostRequestFields } from "@/app/authenticated-helpers/create-post-submit/base";
import {
  type AssetDerivativeInput,
  buildRoyaltyAllocationRequests,
  resolvedDerivativeReferences,
  validateAssetLicense,
} from "@/app/authenticated-helpers/asset-submit";

export function buildSongPostRequest(input: {
  baseRequest: BasePostRequestFields;
  bundleId: string | null;
  caption?: string;
  derivativeStep: AssetDerivativeInput | undefined;
  license: AssetLicenseState | undefined;
  paidSongPriceUsd: number | null;
  royaltySplit?: AssetRoyaltySplitState;
  charityContributionPct?: number | null;
  songMode: SongMode;
  title: string;
}) {
  const licenseError = validateAssetLicense(input.license, "song");
  if (licenseError) {
    throw new Error(licenseError);
  }

  return {
    ...input.baseRequest,
    access_mode: input.paidSongPriceUsd != null ? "locked" as const : "public" as const,
    caption: input.caption?.trim() || undefined,
    commercial_rev_share_pct: input.license?.presetId === "commercial-remix"
      ? input.license.commercialRevSharePct
      : undefined,
    license_preset: input.license?.presetId,
    post_type: "song" as const,
    rights_basis: input.songMode === "original" ? "original" as const : "derivative" as const,
    royalty_allocations: buildRoyaltyAllocationRequests(input.royaltySplit, {
      charityContributionPct: input.charityContributionPct,
      contentLabel: "song",
      license: input.license,
    }),
    song_artifact_bundle: input.bundleId,
    song_mode: input.songMode,
    title: input.title.trim(),
    upstream_asset_refs: input.songMode === "remix"
      ? resolvedDerivativeReferences(input.derivativeStep).map((reference) => reference.id)
      : undefined,
  };
}
