import * as React from "react";

const STORAGE_KEY = "pirate_known_communities";
const EMPTY_KNOWN_COMMUNITIES: KnownCommunity[] = [];

export interface KnownCommunity {
  avatarSrc?: string | null;
  communityId: string;
  displayName: string;
  updatedAt: string;
}

type KnownCommunitiesListener = () => void;

const listeners = new Set<KnownCommunitiesListener>();
let cachedCommunities: KnownCommunity[] = [];
let hydrated = false;

function notifyAll(): void {
  for (const listener of listeners) {
    listener();
  }
}

function sortCommunities(communities: KnownCommunity[]): KnownCommunity[] {
  return [...communities].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readFromStorage(): KnownCommunity[] {
  if (typeof window === "undefined") return EMPTY_KNOWN_COMMUNITIES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_KNOWN_COMMUNITIES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_KNOWN_COMMUNITIES;

    return sortCommunities(
      parsed.filter((entry): entry is KnownCommunity =>
        Boolean(
          entry
          && typeof entry === "object"
          && (entry.avatarSrc == null || typeof entry.avatarSrc === "string")
          && typeof entry.communityId === "string"
          && typeof entry.displayName === "string"
          && typeof entry.updatedAt === "string",
        ),
      ),
    );
  } catch {
    return EMPTY_KNOWN_COMMUNITIES;
  }
}

function writeToStorage(communities: KnownCommunity[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(communities));
  } catch {}
}

export function getKnownCommunities(): KnownCommunity[] {
  if (!hydrated) {
    cachedCommunities = readFromStorage();
    hydrated = true;
  }

  return cachedCommunities;
}

export function rememberKnownCommunity(input: {
  avatarSrc?: string | null;
  communityId: string;
  displayName: string;
}): void {
  const displayName = input.displayName.trim();
  if (!input.communityId || !displayName) return;

  const nextCommunity: KnownCommunity = {
    avatarSrc: input.avatarSrc?.trim() || null,
    communityId: input.communityId,
    displayName,
    updatedAt: new Date().toISOString(),
  };
  const existing = getKnownCommunities().filter(
    (community) => community.communityId !== input.communityId,
  );

  cachedCommunities = sortCommunities([nextCommunity, ...existing]);
  writeToStorage(cachedCommunities);
  notifyAll();
}

export function subscribeToKnownCommunities(listener: KnownCommunitiesListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useKnownCommunities(): KnownCommunity[] {
  return React.useSyncExternalStore(
    subscribeToKnownCommunities,
    getKnownCommunities,
    () => EMPTY_KNOWN_COMMUNITIES,
  );
}
