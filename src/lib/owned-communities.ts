"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { useKnownCommunities } from "@/lib/known-communities-store";
import { getProfileHandleLabel } from "@/lib/profile-routing";

export interface SidebarCommunitySummary {
  avatarSrc?: string | null;
  communityId: string;
  displayName: string;
  routeSlug?: string | null;
  updatedAt: string;
}

function sortCommunities(communities: SidebarCommunitySummary[]): SidebarCommunitySummary[] {
  return [...communities].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mergeCommunities(
  knownCommunities: ReturnType<typeof useKnownCommunities>,
  ownedCommunities: SidebarCommunitySummary[],
): SidebarCommunitySummary[] {
  const merged = new Map<string, SidebarCommunitySummary>();

  for (const community of knownCommunities) {
    merged.set(community.communityId, {
      avatarSrc: community.avatarSrc,
      communityId: community.communityId,
      displayName: community.displayName,
      routeSlug: null,
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
      updatedAt: community.updatedAt > (existing?.updatedAt ?? "") ? community.updatedAt : existing?.updatedAt ?? community.updatedAt,
    });
  }

  return sortCommunities([...merged.values()]);
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
  const knownCommunities = useKnownCommunities();
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
    console.info("[your-communities] loading created communities", { handleLabel });

    void api.publicProfiles.getByHandle(handleLabel)
      .then((result) => {
        if (cancelled) return;

        const nextOwnedCommunities = sortCommunities(result.created_communities.map((community) => ({
          avatarSrc: null,
          communityId: community.community_id,
          displayName: community.display_name,
          routeSlug: community.route_slug,
          updatedAt: community.created_at,
        })));

        console.info("[your-communities] loaded created communities", {
          count: nextOwnedCommunities.length,
          handleLabel,
        });
        setOwnedCommunities(nextOwnedCommunities);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        console.warn("[your-communities] failed to load created communities", {
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
