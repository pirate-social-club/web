"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import type { FeedSort } from "@/components/compositions/feed/feed";

import { useCommunityFeedPosts } from "./community-feed-data";

export async function loadProfilesByUserId(
  api: ReturnType<typeof useApi>,
  userIds: readonly string[],
  fallbackProfilesByUserId: Record<string, ApiProfile | null | undefined> = {},
): Promise<Record<string, ApiProfile | null>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const profileEntries = await Promise.all(uniqueUserIds.map(async (userId) => {
    const fallbackProfile = fallbackProfilesByUserId[userId];
    if (fallbackProfile) {
      return [userId, fallbackProfile] as const;
    }

    try {
      const profile = await api.profiles.getByUserId(userId);
      logger.info("[author-profiles] loaded", {
        handle: profile.primary_public_handle?.label ?? profile.global_handle?.label ?? null,
        userId,
      });
      return [userId, profile] as const;
    } catch (error) {
      logger.warn("[author-profiles] lookup failed", {
        message: error instanceof Error ? error.message : String(error),
        userId,
      });
      return [userId, null] as const;
    }
  }));

  return Object.fromEntries(profileEntries);
}

export function useCommunityPageData(communityId: string, contentLocale: string, activeSort: FeedSort) {
  const api = useApi();
  const session = useSession();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [metadataLoading, setMetadataLoading] = React.useState(true);
  const [metadataError, setMetadataError] = React.useState<unknown>(null);

  React.useEffect(() => {
    setCommunity(null);
    setPreview(null);
    setEligibility(null);
    setAuthorProfiles({});
    setMetadataLoading(true);
    setMetadataError(null);
  }, [communityId, contentLocale]);

  const loadPosts = React.useCallback(async ({ communityId: nextCommunityId, locale, sort }: {
    communityId: string;
    locale: string;
    sort: FeedSort;
  }) => api.communities.listPosts(nextCommunityId, {
    limit: "100",
    locale,
    sort,
  }), [api]);

  const {
    error: postsError,
    loading: postsLoading,
    posts,
    rawPosts,
    setPosts,
  } = useCommunityFeedPosts({
    communityId,
    locale: contentLocale,
    sort: activeSort,
    loadPosts,
  });

  React.useEffect(() => {
    let cancelled = false;
    setMetadataError(null);
    setMetadataLoading(true);

    void Promise.all([
      api.communities.get(communityId, { locale: contentLocale }),
      api.communities.preview(communityId, { locale: contentLocale }),
      api.communities.getJoinEligibility(communityId),
    ])
      .then(([communityResult, previewResult, eligibilityResult]) => {
        if (cancelled) return;
        setCommunity(communityResult);
        setPreview(previewResult);
        setEligibility(eligibilityResult);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMetadataError(e);
      })
      .finally(() => {
        if (!cancelled) setMetadataLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, communityId, contentLocale]);

  React.useEffect(() => {
    let cancelled = false;
    const publicAuthorIds = Array.from(new Set(
      rawPosts
        .map((item) => item.post.identity_mode === "public" ? item.post.author_user_id : null)
        .filter((userId): userId is string => typeof userId === "string" && userId.length > 0),
    ));
    const profileFallbacks = session?.profile ? { [session.user.user_id]: session.profile } : {};

    void loadProfilesByUserId(api, publicAuthorIds, profileFallbacks)
      .then((profiles) => {
        if (cancelled) return;
        setAuthorProfiles(profiles);
      })
      .catch(() => {
        if (!cancelled) setAuthorProfiles({});
      });

    return () => { cancelled = true; };
  }, [api, rawPosts, session]);

  React.useEffect(() => {
    if (!community) return;

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  const refetchEligibility = React.useCallback(async () => {
    const e = await api.communities.getJoinEligibility(communityId);
    setEligibility(e);
    return e;
  }, [api, communityId]);

  const replaceCommunity = React.useCallback((nextCommunity: ApiCommunity) => {
    setCommunity(nextCommunity);
  }, []);

  return {
    authorProfiles,
    community,
    preview,
    eligibility,
    error: metadataError ?? postsError,
    loading: metadataLoading || postsLoading,
    posts,
    replaceCommunity,
    setPosts,
    refetchEligibility,
  };
}
