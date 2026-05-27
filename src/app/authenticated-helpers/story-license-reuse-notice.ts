"use client";

import type { Asset as ApiAsset } from "@pirate/api-contracts";

import type { AssetLicenseState } from "@/components/compositions/posts/post-composer/post-composer.types";
import type { SongContentSpec } from "@/components/compositions/posts/post-card/post-card.types";

export type StoryLicenseReuseNotice = NonNullable<SongContentSpec["storyLicenseNotice"]>;

const STORAGE_KEY_PREFIX = "pirate:story-license-reuse-notice:v1:";

type LicensePreset = NonNullable<ApiAsset["license_preset"]>;

const licensePresetLabels: Record<LicensePreset, string> = {
  "non-commercial": "Non-commercial",
  "commercial-use": "Commercial use",
  "commercial-remix": "Commercial remix",
};

function normalizeRevSharePct(preset: LicensePreset | null, value: number | null | undefined): number | null {
  return preset === "commercial-remix" && Number.isFinite(value) ? value ?? null : null;
}

export function formatStoryLicenseTerms(input: {
  licensePreset?: ApiAsset["license_preset"];
  commercialRevSharePct?: ApiAsset["commercial_rev_share_pct"];
}): string {
  const licensePreset = input.licensePreset ?? null;
  if (!licensePreset) return "existing Story license terms";

  const label = licensePresetLabels[licensePreset];
  const revSharePct = normalizeRevSharePct(licensePreset, input.commercialRevSharePct);
  return revSharePct == null ? label : `${label}, ${revSharePct}% royalty`;
}

export function buildStoryLicenseReuseNotice(input: {
  submittedLicense: AssetLicenseState | undefined;
  asset: ApiAsset | null | undefined;
}): StoryLicenseReuseNotice | null {
  const submittedPreset = input.submittedLicense?.presetId ?? null;
  const assetPreset = input.asset?.license_preset ?? null;
  if (!submittedPreset || !assetPreset) return null;

  const submittedRevSharePct = normalizeRevSharePct(
    submittedPreset,
    input.submittedLicense?.commercialRevSharePct,
  );
  const assetRevSharePct = normalizeRevSharePct(assetPreset, input.asset?.commercial_rev_share_pct);
  if (submittedPreset === assetPreset && submittedRevSharePct === assetRevSharePct) {
    return null;
  }

  return {
    label: "Story license reused",
    description: `This upload reused an existing Story registration, so it keeps the original terms: ${formatStoryLicenseTerms({
      licensePreset: assetPreset,
      commercialRevSharePct: assetRevSharePct,
    })}.`,
  };
}

function storageKey(postId: string): string {
  return `${STORAGE_KEY_PREFIX}${postId}`;
}

function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function isStoryLicenseReuseNotice(value: unknown): value is StoryLicenseReuseNotice {
  return Boolean(
    value
    && typeof value === "object"
    && typeof (value as StoryLicenseReuseNotice).label === "string"
    && (
      (value as StoryLicenseReuseNotice).description === undefined
      || typeof (value as StoryLicenseReuseNotice).description === "string"
    ),
  );
}

export function rememberStoryLicenseReuseNotice(postId: string | null | undefined, notice: StoryLicenseReuseNotice | null): void {
  if (!postId || !notice) return;

  try {
    getSessionStorage()?.setItem(storageKey(postId), JSON.stringify(notice));
  } catch {
    // Browsers can deny sessionStorage access; the post remains published without the transient notice.
  }
}

export function takeStoryLicenseReuseNotice(postId: string | null | undefined): StoryLicenseReuseNotice | null {
  if (!postId) return null;

  const storage = getSessionStorage();
  if (!storage) return null;

  const key = storageKey(postId);
  try {
    const raw = storage.getItem(key);
    storage.removeItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isStoryLicenseReuseNotice(parsed) ? parsed : null;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore cleanup failures.
    }
    return null;
  }
}
