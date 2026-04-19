"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { FeedSort } from "@/components/compositions/feed/feed";

export async function loadProfilesByUserId(
  api: ReturnType<typeof useApi>,
  userIds: readonly string[],
  fallbackProfilesByUserId: Record<string, ApiProfile | null | undefined> = {},
): Promise<Record<string, ApiProfile | null>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const profileEntries = await Promise.all(uniqueUserIds.map(async (userId) => [
    userId,
    fallbackProfilesByUserId[userId] ?? await api.profiles.getByUserId(userId).catch(() => null),
  ] as const));

  return Object.fromEntries(profileEntries);
}

export function useCommunityPageData(communityId: string, contentLocale: string, activeSort: FeedSort) {
  const api = useApi();
  const session = useSession();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [posts, setPosts] = React.useState<ApiPost[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.communities.get(communityId),
      api.communities.preview(communityId),
      api.communities.getJoinEligibility(communityId),
      api.communities.listPosts(communityId, { locale: contentLocale, sort: activeSort }),
    ])
      .then(async ([communityResult, previewResult, eligibilityResult, postResponse]) => {
        const uniqueAuthorIds = Array.from(new Set(
          postResponse.items
            .map((item) => item.post.identity_mode === "public" ? item.post.author_user_id : null)
            .filter((userId): userId is string => typeof userId === "string" && userId.length > 0),
        ));
        const profileFallbacks = session?.profile ? { [session.user.user_id]: session.profile } : {};
        const profileEntries = await Promise.all(uniqueAuthorIds.map(async (userId) => {
          try {
            return [userId, profileFallbacks[userId] ?? await api.profiles.getByUserId(userId)] as const;
          } catch {
            return [userId, undefined] as const;
          }
        }));

        if (cancelled) return;
        setCommunity(communityResult);
        setPreview(previewResult);
        setEligibility(eligibilityResult);
        setPosts(postResponse.items);
        setAuthorProfiles(Object.fromEntries(profileEntries));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeSort, api, communityId, contentLocale, session]);

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
    error,
    loading,
    posts,
    replaceCommunity,
    setPosts,
    refetchEligibility,
  };
}
