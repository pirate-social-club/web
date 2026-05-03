"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { forgetKnownCommunity, getKnownCommunities, rememberKnownCommunity, useKnownCommunities } from "@/lib/known-communities-store";
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
  const slugToCanonicalId = new Map<string, string>();

  for (const community of knownCommunities) {
    merged.set(community.communityId, {
      avatarSrc: community.avatarSrc,
      communityId: community.communityId,
      displayName: community.displayName,
      routeSlug: community.routeSlug ?? null,
      updatedAt: community.updatedAt,
    });
    if (community.routeSlug) {
      slugToCanonicalId.set(community.routeSlug, community.communityId);
    }
  }

  for (const community of ownedCommunities) {
    const existing = merged.get(community.communityId);

    // If an owned community shares a routeSlug with a known community that has
    // a different ID, merge into the existing entry to avoid sidebar duplicates.
    if (
      community.routeSlug
      && slugToCanonicalId.has(community.routeSlug)
      && slugToCanonicalId.get(community.routeSlug) !== community.communityId
    ) {
      const canonicalId = slugToCanonicalId.get(community.routeSlug)!;
      const existingBySlug = merged.get(canonicalId);
      merged.set(canonicalId, {
        avatarSrc: existingBySlug?.avatarSrc ?? community.avatarSrc ?? null,
        communityId: canonicalId,
        displayName: community.displayName || existingBySlug?.displayName || canonicalId,
        routeSlug: community.routeSlug ?? existingBySlug?.routeSlug ?? null,
        updatedAt: Number(community.updatedAt) > Number(existingBySlug?.updatedAt ?? 0)
          ? community.updatedAt
          : existingBySlug?.updatedAt ?? community.updatedAt,
      });
      continue;
    }

    merged.set(community.communityId, {
      avatarSrc: existing?.avatarSrc ?? community.avatarSrc ?? null,
      communityId: community.communityId,
      displayName: community.displayName || existing?.displayName || community.communityId,
      routeSlug: community.routeSlug ?? existing?.routeSlug ?? null,
      updatedAt: Number(community.updatedAt) > Number(existing?.updatedAt ?? 0)
        ? community.updatedAt
        : existing?.updatedAt ?? community.updatedAt,
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

type KnownCommunityValidationResult =
  | {
      communityId: string;
      valid: false;
    }
  | {
      avatarSrc?: string | null;
      canonicalId?: string | null;
      communityId: string;
      displayName?: string | null;
      routeSlug?: string | null;
      valid: true;
    };

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
        const result = await api.publicCommunities.get(community.communityId);
        return {
          avatarSrc: typeof result.avatar_ref === "string" ? result.avatar_ref : null,
          canonicalId: typeof result.id === "string" ? result.id : null,
          communityId: community.communityId,
          displayName: typeof result.display_name === "string" ? result.display_name : null,
          routeSlug: typeof result.route_slug === "string" ? result.route_slug : null,
          valid: true,
        } satisfies KnownCommunityValidationResult;
      } catch (error) {
        if (isApiNotFoundError(error)) {
          return { communityId: community.communityId, valid: false } satisfies KnownCommunityValidationResult;
        }
        return { communityId: community.communityId, valid: true } satisfies KnownCommunityValidationResult;
      }
    })).then((results) => {
      if (cancelled) return;
      const currentCommunities = new Map(
        getKnownCommunities().map((community) => [community.communityId, community]),
      );
      for (const result of results) {
        if (!result.valid) continue;

        const routeSlug = result.routeSlug?.trim();
        if (!routeSlug) continue;

        const canonicalId = result.canonicalId?.trim();
        const targetId = canonicalId && canonicalId !== result.communityId
          ? canonicalId
          : result.communityId;

        // Remove stale entry if the canonical ID changed (e.g. old cmt_... -> com_cmt_...)
        if (canonicalId && canonicalId !== result.communityId) {
          forgetKnownCommunity(result.communityId);
        }

        const existing = currentCommunities.get(targetId);
        if (existing?.routeSlug?.trim() === routeSlug) continue;

        rememberKnownCommunity({
          avatarSrc: result.avatarSrc ?? existing?.avatarSrc ?? null,
          communityId: targetId,
          displayName: result.displayName?.trim() || existing?.displayName || targetId,
          routeSlug,
        });
      }

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
