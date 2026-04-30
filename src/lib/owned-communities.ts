"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { forgetKnownCommunity, useKnownCommunities } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { getProfileHandleLabel } from "@/lib/profile-routing";

export interface SidebarCommunitySummary {
  avatarSrc?: string | null;
  communityId: string;
  displayName: string;
  routeSlug?: string | null;
  updatedAt: string | number;
}

function sortCommunities(communities: SidebarCommunitySummary[]): SidebarCommunitySummary[] {
  return [...communities].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
}

function mergeCommunities(
  knownCommunities: SidebarCommunitySummary[],
  ownedCommunities: SidebarCommunitySummary[],
): SidebarCommunitySummary[] {
  const merged = new Map<string, SidebarCommunitySummary>();

  for (const community of knownCommunities) {
    merged.set(community.communityId, {
      avatarSrc: community.avatarSrc,
      communityId: community.communityId,
      displayName: community.displayName,
      routeSlug: community.routeSlug ?? null,
      updatedAt: community.updatedAt,
    });
  }

  for (const community of ownedCommunities) {
    const existing = merged.get(community.communityId);
    merged.set(community.communityId, {
      avatarSrc: existing?.avatarSrc ?? community.avatarSrc ?? null,
      communityId: community.communityId,
      displayName: community.displayName || existing?.displayName || community.communityId,
      routeSlug: community.routeSlug ?? existing?.routeSlug ?? null,
      updatedAt: Number(community.updatedAt) > Number(existing?.updatedAt ?? 0) ? community.updatedAt : existing?.updatedAt ?? community.updatedAt,
    });
  }

  return sortCommunities([...merged.values()]);
}

type PublicProfileCommunitySummary = {
  community?: unknown;
  community_id?: unknown;
  created?: unknown;
  display_name?: unknown;
  id?: unknown;
  route_slug?: unknown;
};

function getPublicProfileCommunityId(community: PublicProfileCommunitySummary): string | null {
  const rawId = community.community ?? community.id ?? community.community_id;
  if (typeof rawId !== "string") return null;

  const communityId = rawId.trim();
  return communityId || null;
}

function publicProfileCommunityToSidebarSummary(
  community: PublicProfileCommunitySummary,
): SidebarCommunitySummary | null {
  const communityId = getPublicProfileCommunityId(community);
  if (!communityId) return null;

  const displayName = typeof community.display_name === "string" && community.display_name.trim()
    ? community.display_name
    : communityId;

  return {
    avatarSrc: null,
    communityId,
    displayName,
    routeSlug: typeof community.route_slug === "string" ? community.route_slug : null,
    updatedAt: typeof community.created === "string" ? community.created : Date.now(),
  };
}

function useValidatedKnownCommunities(ownedCommunities: SidebarCommunitySummary[]): SidebarCommunitySummary[] {
  const api = useApi();
  const knownCommunities = useKnownCommunities();
  const [invalidCommunityIds, setInvalidCommunityIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const knownCommunityIds = new Set(knownCommunities.map((community) => community.communityId));
    setInvalidCommunityIds((current) => {
      const next = new Set([...current].filter((communityId) => knownCommunityIds.has(communityId)));
      return next.size === current.size ? current : next;
    });
  }, [knownCommunities]);

  React.useEffect(() => {
    const ownedCommunityIds = new Set(ownedCommunities.map((community) => community.communityId));
    const candidates = knownCommunities.filter(
      (community) => !ownedCommunityIds.has(community.communityId) && !invalidCommunityIds.has(community.communityId),
    );
    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(candidates.map(async (community) => {
      try {
        await api.publicCommunities.get(community.communityId);
        return { communityId: community.communityId, valid: true } as const;
      } catch (error) {
        if (isApiNotFoundError(error)) {
          return { communityId: community.communityId, valid: false } as const;
        }
        return { communityId: community.communityId, valid: true } as const;
      }
    })).then((results) => {
      if (cancelled) return;
      const nextInvalidIds = results
        .filter((result) => !result.valid)
        .map((result) => result.communityId);
      if (nextInvalidIds.length === 0) return;

      setInvalidCommunityIds((current) => {
        const next = new Set(current);
        for (const communityId of nextInvalidIds) {
          next.add(communityId);
        }
        return next;
      });

      for (const communityId of nextInvalidIds) {
        forgetKnownCommunity(communityId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, invalidCommunityIds, knownCommunities, ownedCommunities]);

  return React.useMemo(
    () => knownCommunities
      .filter((community) => !invalidCommunityIds.has(community.communityId))
      .map((community) => ({
        avatarSrc: community.avatarSrc,
        communityId: community.communityId,
        displayName: community.displayName,
        routeSlug: community.routeSlug ?? null,
        updatedAt: community.updatedAt,
      })),
    [invalidCommunityIds, knownCommunities],
  );
}

export function useRecentCommunities(): SidebarCommunitySummary[] {
  return useValidatedKnownCommunities([]);
}

export function useSidebarCommunities(): {
  communities: SidebarCommunitySummary[];
  error: unknown;
  loading: boolean;
  moderatedCommunities: SidebarCommunitySummary[];
  recentCommunities: SidebarCommunitySummary[];
} {
  const api = useApi();
  const session = useSession();
  const [ownedCommunities, setOwnedCommunities] = React.useState<SidebarCommunitySummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const handleLabel = session?.profile ? getProfileHandleLabel(session.profile) : null;

  React.useEffect(() => {
    let cancelled = false;

    if (!handleLabel) {
      setOwnedCommunities([]);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    logger.debug("[your-communities] loading created communities", { handleLabel });

    void api.publicProfiles.getByHandle(handleLabel)
      .then((result) => {
        if (cancelled) return;

        const nextOwnedCommunities = sortCommunities(
          (result.created_communities as PublicProfileCommunitySummary[])
            .map(publicProfileCommunityToSidebarSummary)
            .filter((community): community is SidebarCommunitySummary => community !== null),
        );

        logger.debug("[your-communities] loaded created communities", {
          count: nextOwnedCommunities.length,
          handleLabel,
        });
        setOwnedCommunities(nextOwnedCommunities);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        logger.warn("[your-communities] failed to load created communities", {
          handleLabel,
          message: nextError instanceof Error ? nextError.message : String(nextError),
        });
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, handleLabel]);

  const knownCommunities = useValidatedKnownCommunities(ownedCommunities);

  const recentCommunities = React.useMemo(
    () => mergeCommunities(knownCommunities, ownedCommunities),
    [knownCommunities, ownedCommunities],
  );
  const moderatedCommunities = React.useMemo(
    () => sortCommunities(ownedCommunities.map((community) => {
      const knownCommunity = knownCommunities.find(
        (candidate) => candidate.communityId === community.communityId,
      );

      return {
        ...community,
        avatarSrc: knownCommunity?.avatarSrc ?? community.avatarSrc ?? null,
      };
    })),
    [knownCommunities, ownedCommunities],
  );

  return {
    communities: recentCommunities,
    error,
    loading,
    moderatedCommunities,
    recentCommunities,
  };
}
