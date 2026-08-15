"use client";

import * as React from "react";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import type { FeedSort } from "@/components/compositions/posts/feed/feed";

import { sortCommunityFeedPosts } from "@/app/authenticated-helpers/feed-sorting";
import { filterSupportedPostTypes } from "@/app/authenticated-helpers/post-type-compat";

type CommunityFeedLoader = (input: {
  communityId: string;
  cursor: string | null;
  locale: string;
  sort: FeedSort;
}) => Promise<{ items: ApiPost[]; next_cursor: string | null }>;

type CommunityFeedPage = {
  items: ApiPost[];
  next_cursor: string | null;
};

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
  if (!filterSupportedPostTypes([input.post]).length) return;
  const sorts: FeedSort[] = ["best", "new", "top"];
  for (const sort of sorts) {
    input.queryClient.setQueryData<CommunityFeedPage>(
      communityFeedPostsQueryKey(input.communityId, input.locale, sort),
      (current) => ({
        items: [
          input.post,
          ...(current?.items ?? []).filter((item) => item.post.id !== input.post.post.id),
        ],
        next_cursor: current?.next_cursor ?? null,
      }),
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
  const loadingMoreRef = React.useRef(false);
  const [loadMoreError, setLoadMoreError] = React.useState<unknown>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const queryKey = React.useMemo(
    () => communityFeedPostsQueryKey(communityId, locale, sort),
    [communityId, locale, sort],
  );
  const activeQueryKeyRef = React.useRef(queryKey);
  activeQueryKeyRef.current = queryKey;

  const query = useQuery({
    queryKey,
    queryFn: () => loadPosts({ communityId, cursor: null, locale, sort }),
  });

  React.useEffect(() => {
    loadingMoreRef.current = false;
    setLoadMoreError(null);
    setLoadingMore(false);
  }, [communityId, locale, sort]);

  const rawPosts = React.useMemo(
    () => filterSupportedPostTypes(query.data?.items ?? EMPTY_POSTS),
    [query.data?.items],
  );

  const posts = React.useMemo(() => sortCommunityFeedPosts(rawPosts, sort), [rawPosts, sort]);
  const setPosts = React.useCallback((update: React.SetStateAction<ApiPost[]>) => {
    queryClient.setQueryData<CommunityFeedPage>(queryKey, (current) => ({
      items: filterSupportedPostTypes(typeof update === "function"
        ? (update as (value: ApiPost[]) => ApiPost[])(current?.items ?? [])
        : update),
      next_cursor: current?.next_cursor ?? null,
    }));
  }, [queryClient, queryKey]);

  const loadMore = React.useCallback(async () => {
    const current = queryClient.getQueryData<CommunityFeedPage>(queryKey);
    const cursor = current?.next_cursor;
    if (!cursor || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = await loadPosts({ communityId, cursor, locale, sort });
      queryClient.setQueryData<CommunityFeedPage>(queryKey, (latest) => {
        if (!latest || latest.next_cursor !== cursor) return latest;
        const seen = new Set(latest.items.map((item) => item.post.id));
        const uniqueNextItems = filterSupportedPostTypes(next.items).filter((item) => {
          if (seen.has(item.post.id)) return false;
          seen.add(item.post.id);
          return true;
        });
        return {
          items: [...latest.items, ...uniqueNextItems],
          next_cursor: next.next_cursor,
        };
      });
    } catch (error) {
      if (activeQueryKeyRef.current === queryKey) {
        setLoadMoreError(error);
      }
    } finally {
      if (activeQueryKeyRef.current === queryKey) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [communityId, loadPosts, locale, queryClient, queryKey, sort]);

  return {
    error: query.error,
    hasMore: Boolean(query.data?.next_cursor),
    loadMore,
    loadMoreError,
    loading: query.isPending,
    loadingMore,
    posts,
    rawPosts,
    refetchPosts: query.refetch,
    refreshing: query.isFetching && !query.isPending,
    setPosts,
  };
}
