"use client";

import * as React from "react";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import type { FeedSort } from "@/components/compositions/posts/feed/feed";

import { sortCommunityFeedPosts } from "@/app/authenticated-helpers/feed-sorting";

type CommunityFeedLoader = (input: {
  communityId: string;
  locale: string;
  sort: FeedSort;
}) => Promise<{ items: ApiPost[] }>;

const EMPTY_POSTS: ApiPost[] = [];

function communityFeedPostsQueryKey(communityId: string, locale: string, sort: FeedSort) {
  return ["community-feed-posts", communityId, locale, sort] as const;
}

export function upsertCommunityFeedPostCache(input: {
  queryClient: QueryClient;
  communityId: string;
  locale: string;
  post: ApiPost;
}): void {
  const sorts: FeedSort[] = ["best", "new", "top"];
  for (const sort of sorts) {
    input.queryClient.setQueryData<ApiPost[]>(
      communityFeedPostsQueryKey(input.communityId, input.locale, sort),
      (current = []) => [
        input.post,
        ...current.filter((item) => item.post.id !== input.post.post.id),
      ],
    );
  }
}

export function useCommunityFeedPosts(input: {
  communityId: string;
  locale: string;
  sort: FeedSort;
  loadPosts: CommunityFeedLoader;
}) {
  const { communityId, locale, sort, loadPosts } = input;
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(
    () => communityFeedPostsQueryKey(communityId, locale, sort),
    [communityId, locale, sort],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await loadPosts({ communityId, locale, sort });
      return response.items;
    },
  });

  const rawPosts = query.data ?? EMPTY_POSTS;

  const posts = React.useMemo(() => sortCommunityFeedPosts(rawPosts, sort), [rawPosts, sort]);
  const setPosts = React.useCallback((update: React.SetStateAction<ApiPost[]>) => {
    queryClient.setQueryData<ApiPost[]>(queryKey, (current = []) => (
      typeof update === "function"
        ? (update as (value: ApiPost[]) => ApiPost[])(current)
        : update
    ));
  }, [queryClient, queryKey]);

  return {
    error: query.error,
    loading: query.isPending,
    posts,
    rawPosts,
    refetchPosts: query.refetch,
    refreshing: query.isFetching && !query.isPending,
    setPosts,
  };
}
