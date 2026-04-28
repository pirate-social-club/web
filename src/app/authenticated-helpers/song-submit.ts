"use client";

import type {
  PostAudience,
  AssetLicenseState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import {
  type AssetDerivativeInput,
  validateOriginalAssetLicense,
} from "@/app/authenticated-helpers/asset-submit";

export function buildSongPostRequest(input: {
  bundleId: string | null;
  derivativeStep: AssetDerivativeInput | undefined;
  idempotencyKey: string;
  license: AssetLicenseState | undefined;
  paidSongPriceUsd: number | null;
  songMode: SongMode;
  title: string;
  visibility: PostAudience;
}) {
  const licenseError = input.songMode === "original" ? validateOriginalAssetLicense(input.license, "song") : null;
  if (licenseError) {
    throw new Error(licenseError);
  }

  return {
    access_mode: input.paidSongPriceUsd != null ? "locked" as const : "public" as const,
    commercial_rev_share_pct: input.songMode === "original" && input.license?.presetId === "commercial-remix"
      ? input.license.commercialRevSharePct
      : undefined,
    identity_mode: "public" as const,
    idempotency_key: input.idempotencyKey,
    license_preset: input.songMode === "original" ? input.license?.presetId : undefined,
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
