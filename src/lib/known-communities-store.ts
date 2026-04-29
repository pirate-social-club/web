import * as React from "react";

import { logger } from "@/lib/logger";

const STORAGE_KEY = "pirate_known_communities";
const MAX_KNOWN_COMMUNITIES = 50;
const EMPTY_KNOWN_COMMUNITIES: KnownCommunity[] = [];

export interface KnownCommunity {
  avatarSrc?: string | null;
  communityId: string;
  displayName: string;
  routeSlug?: string | null;
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

function normalizeCommunities(communities: KnownCommunity[]): KnownCommunity[] {
  return sortCommunities(communities).slice(0, MAX_KNOWN_COMMUNITIES);
}

function syncFromStorage(): void {
  cachedCommunities = readFromStorage();
  hydrated = true;
  notifyAll();
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
          && (entry.routeSlug == null || typeof entry.routeSlug === "string")
          && typeof entry.updatedAt === "string",
        ),
      ),
    ).slice(0, MAX_KNOWN_COMMUNITIES);
  } catch {
    return EMPTY_KNOWN_COMMUNITIES;
  }
}

function writeToStorage(communities: KnownCommunity[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(communities));
  } catch (error) {
    logger.warn("[known-communities] failed to persist communities", error);
  }
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
  routeSlug?: string | null;
}): void {
  const displayName = input.displayName.trim();
  if (!input.communityId || !displayName) return;

  const nextCommunity: KnownCommunity = {
    avatarSrc: input.avatarSrc?.trim() || null,
    communityId: input.communityId,
    displayName,
    routeSlug: input.routeSlug?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  const existing = getKnownCommunities().filter(
    (community) => community.communityId !== input.communityId,
  );

  cachedCommunities = normalizeCommunities([nextCommunity, ...existing]);
  writeToStorage(cachedCommunities);
  notifyAll();
}

export function forgetKnownCommunity(communityId: string): void {
  const trimmedCommunityId = communityId.trim();
  if (!trimmedCommunityId) return;

  const existing = getKnownCommunities();
  const nextCommunities = existing.filter((community) => community.communityId !== trimmedCommunityId);
  if (nextCommunities.length === existing.length) return;

  cachedCommunities = nextCommunities;
  writeToStorage(cachedCommunities);
  notifyAll();
}

export function subscribeToKnownCommunities(listener: KnownCommunitiesListener): () => void {
  listeners.add(listener);
  const shouldSubscribeToStorage = listeners.size === 1 && typeof window !== "undefined";

  if (shouldSubscribeToStorage) {
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  syncFromStorage();
}

export function useKnownCommunities(): KnownCommunity[] {
  return React.useSyncExternalStore(
    subscribeToKnownCommunities,
    getKnownCommunities,
    () => EMPTY_KNOWN_COMMUNITIES,
  );
}

export function __resetKnownCommunitiesForTests(): void {
  cachedCommunities = [];
  hydrated = false;
  listeners.clear();
}
