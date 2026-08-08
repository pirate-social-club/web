"use client";

import * as React from "react";
import type { CommunityPreview, JoinEligibility } from "@pirate/api-contracts";

import type { CommunityGateData } from "@/hooks/use-community-interaction-gate.helpers";

export const COMMUNITY_GATE_CACHE_TTL_MS = 60_000;

type CommunityGateCacheEntry = {
  expiresAt: number;
  value: CommunityGateData;
};

const communityGateCache = new Map<string, CommunityGateCacheEntry>();
const communityGateRequests = new Map<string, Promise<CommunityGateData>>();

export type CommunityGateDataApi = {
  getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
  preview: (
    communityId: string,
    options: { locale: string },
  ) => Promise<CommunityPreview>;
};

export function clearCommunityGateDataCache() {
  communityGateCache.clear();
  communityGateRequests.clear();
}

function getGateCacheKey(
  sessionKey: string | null,
  communityId: string,
): string {
  return `${sessionKey ?? "anon"}:${communityId}`;
}

export function useCommunityGateData({
  communitiesApi,
  previewLocale,
  sessionKey,
}: {
  communitiesApi: CommunityGateDataApi;
  previewLocale: string;
  sessionKey: string | null;
}) {
  React.useEffect(() => {
    clearCommunityGateDataCache();
  }, [sessionKey]);

  const invalidateCommunityGate = React.useCallback((communityId: string) => {
    const cacheKey = getGateCacheKey(sessionKey, communityId);
    communityGateCache.delete(cacheKey);
    communityGateRequests.delete(cacheKey);
  }, [sessionKey]);

  const updateCachedGate = React.useCallback((communityId: string, gate: CommunityGateData) => {
    communityGateCache.set(getGateCacheKey(sessionKey, communityId), {
      expiresAt: Date.now() + COMMUNITY_GATE_CACHE_TTL_MS,
      value: gate,
    });
  }, [sessionKey]);

  const loadCommunityGate = React.useCallback(async (communityId: string): Promise<CommunityGateData> => {
    const cacheKey = getGateCacheKey(sessionKey, communityId);
    const cached = communityGateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inFlight = communityGateRequests.get(cacheKey);
    if (inFlight) {
      return await inFlight;
    }

    const request = Promise.all([
      communitiesApi.preview(communityId, { locale: previewLocale }),
      communitiesApi.getJoinEligibility(communityId),
    ]).then(([preview, eligibility]) => {
      const value: CommunityGateData = {
        eligibility,
        gateMatchMode: preview.gate_match_mode ?? null,
        preview: {
          id: preview.id,
          display_name: preview.display_name,
          membership_gate_summaries: preview.membership_gate_summaries,
          viewer_community_role: preview.viewer_community_role ?? null,
          viewer_following: preview.viewer_following ?? false,
        },
      };
      communityGateCache.set(cacheKey, {
        expiresAt: Date.now() + COMMUNITY_GATE_CACHE_TTL_MS,
        value,
      });
      return value;
    }).finally(() => {
      communityGateRequests.delete(cacheKey);
    });

    communityGateRequests.set(cacheKey, request);
    return await request;
  }, [communitiesApi, previewLocale, sessionKey]);

  return {
    invalidateCommunityGate,
    loadCommunityGate,
    updateCachedGate,
  };
}
