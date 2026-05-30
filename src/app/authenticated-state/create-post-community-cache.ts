"use client";

import type {
  CommunityPreview as ApiCommunityPreview,
  JoinEligibility as ApiJoinEligibility,
} from "@pirate/api-contracts";

type CreatePostCommunitySnapshot = {
  eligibility?: ApiJoinEligibility | null;
  preview?: ApiCommunityPreview | null;
};

const snapshotsByCommunityKey = new Map<string, CreatePostCommunitySnapshot>();
const ANONYMOUS_VIEWER_CACHE_KEY = "anonymous";

function normalizeCommunityKey(key: string | null | undefined): string | null {
  const normalized = key?.trim();
  return normalized ? normalized : null;
}

function normalizeViewerKey(viewerUserId: string | null | undefined): string {
  return viewerUserId?.trim() || ANONYMOUS_VIEWER_CACHE_KEY;
}

function buildSnapshotCacheKey(communityKey: string, viewerUserId: string | null | undefined): string {
  return `${normalizeViewerKey(viewerUserId)}:${communityKey}`;
}

export function rememberCreatePostCommunitySnapshot(
  keys: readonly (string | null | undefined)[],
  snapshot: CreatePostCommunitySnapshot,
  viewerUserId?: string | null,
) {
  const normalizedKeys = [...new Set(keys.map(normalizeCommunityKey).filter((key): key is string => Boolean(key)))];
  if (normalizedKeys.length === 0) return;

  for (const key of normalizedKeys) {
    const cacheKey = buildSnapshotCacheKey(key, viewerUserId);
    const current = snapshotsByCommunityKey.get(cacheKey) ?? {};
    snapshotsByCommunityKey.set(cacheKey, {
      eligibility: snapshot.eligibility ?? current.eligibility ?? null,
      preview: snapshot.preview ?? current.preview ?? null,
    });
  }
}

export function readCreatePostCommunitySnapshot(
  communityKey: string,
  viewerUserId?: string | null,
): CreatePostCommunitySnapshot | null {
  const normalizedKey = normalizeCommunityKey(communityKey);
  return normalizedKey ? snapshotsByCommunityKey.get(buildSnapshotCacheKey(normalizedKey, viewerUserId)) ?? null : null;
}

export function clearCreatePostCommunitySnapshotCacheForTests() {
  snapshotsByCommunityKey.clear();
}
