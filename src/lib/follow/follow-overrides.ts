"use client";

const FOLLOW_OVERRIDE_TTL_MS = 30 * 60_000;
const FOLLOW_OVERRIDE_STORAGE_KEY = "pirate.web.follow-overrides.v1";

interface FollowOverride {
  following: boolean;
  updatedAtMs: number;
}

const viewerFollowOverrides = new Map<string, Map<string, FollowOverride>>();
let hydrated = false;

function normalizeKey(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function persistOverrides() {
  if (typeof window === "undefined") return;

  const snapshot = Object.fromEntries(
    [...viewerFollowOverrides.entries()]
      .filter(([, overrides]) => overrides.size > 0)
      .map(([viewerKey, overrides]) => [viewerKey, Object.fromEntries(overrides.entries())]),
  );

  window.localStorage.setItem(FOLLOW_OVERRIDE_STORAGE_KEY, JSON.stringify(snapshot));
}

function hydrateOverrides() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  const raw = window.localStorage.getItem(FOLLOW_OVERRIDE_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Record<string, FollowOverride>>;
    for (const [viewerKey, overrides] of Object.entries(parsed)) {
      const nextOverrides = new Map<string, FollowOverride>();
      for (const [targetKey, override] of Object.entries(overrides ?? {})) {
        if (
          !override
          || typeof override.following !== "boolean"
          || typeof override.updatedAtMs !== "number"
        ) {
          continue;
        }

        nextOverrides.set(targetKey, override);
      }

      if (nextOverrides.size > 0) {
        viewerFollowOverrides.set(viewerKey, nextOverrides);
      }
    }
  } catch {
    window.localStorage.removeItem(FOLLOW_OVERRIDE_STORAGE_KEY);
  }
}

export function readViewerFollowOverride(
  viewerAddress: string | null | undefined,
  targetAddress: string | null | undefined,
): { following: boolean; updatedAtMs: number } | null {
  hydrateOverrides();

  const viewerKey = normalizeKey(viewerAddress);
  const targetKey = normalizeKey(targetAddress);
  if (!viewerKey || !targetKey) {
    return null;
  }

  const override = viewerFollowOverrides.get(viewerKey)?.get(targetKey) ?? null;
  if (!override) {
    return null;
  }

  if (Date.now() - override.updatedAtMs <= FOLLOW_OVERRIDE_TTL_MS) {
    return override;
  }

  viewerFollowOverrides.get(viewerKey)?.delete(targetKey);
  if (viewerFollowOverrides.get(viewerKey)?.size === 0) {
    viewerFollowOverrides.delete(viewerKey);
  }
  persistOverrides();
  return null;
}

export function writeViewerFollowOverride(
  viewerAddress: string | null | undefined,
  targetAddress: string | null | undefined,
  following: boolean,
): void {
  hydrateOverrides();

  const viewerKey = normalizeKey(viewerAddress);
  const targetKey = normalizeKey(targetAddress);
  if (!viewerKey || !targetKey) {
    return;
  }

  const overrides = viewerFollowOverrides.get(viewerKey) ?? new Map<string, FollowOverride>();
  overrides.set(targetKey, { following, updatedAtMs: Date.now() });
  viewerFollowOverrides.set(viewerKey, overrides);
  persistOverrides();
}

export function clearViewerFollowOverride(
  viewerAddress: string | null | undefined,
  targetAddress: string | null | undefined,
): void {
  hydrateOverrides();

  const viewerKey = normalizeKey(viewerAddress);
  const targetKey = normalizeKey(targetAddress);
  if (!viewerKey || !targetKey) {
    return;
  }

  const overrides = viewerFollowOverrides.get(viewerKey);
  if (!overrides) {
    return;
  }

  overrides.delete(targetKey);
  if (overrides.size === 0) {
    viewerFollowOverrides.delete(viewerKey);
  }
  persistOverrides();
}
