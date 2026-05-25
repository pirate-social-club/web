"use client";

import type {
  PostAudience,
  AssetLicenseState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import {
  type AssetDerivativeInput,
  resolvedDerivativeReferences,
  validateAssetLicense,
} from "@/app/authenticated-helpers/asset-submit";

export function buildSongPostRequest(input: {
  bundleId: string | null;
  caption?: string;
  derivativeStep: AssetDerivativeInput | undefined;
  idempotencyKey: string;
  license: AssetLicenseState | undefined;
  paidSongPriceUsd: number | null;
  songMode: SongMode;
  title: string;
  visibility: PostAudience;
}) {
  const licenseError = validateAssetLicense(input.license, "song");
  if (licenseError) {
    throw new Error(licenseError);
  }

  return {
    access_mode: input.paidSongPriceUsd != null ? "locked" as const : "public" as const,
    caption: input.caption?.trim() || undefined,
    commercial_rev_share_pct: input.license?.presetId === "commercial-remix"
      ? input.license.commercialRevSharePct
      : undefined,
    identity_mode: "public" as const,
    idempotency_key: input.idempotencyKey,
    license_preset: input.license?.presetId,
    post_type: "song" as const,
    rights_basis: input.songMode === "original" ? "original" as const : "derivative" as const,
    song_artifact_bundle: input.bundleId,
    song_mode: input.songMode,
    title: input.title.trim(),
    translation_policy: "machine_allowed" as const,
    upstream_asset_refs: input.songMode === "remix"
      ? resolvedDerivativeReferences(input.derivativeStep).map((reference) => reference.id)
      : undefined,
    visibility: input.visibility,
  };
}
