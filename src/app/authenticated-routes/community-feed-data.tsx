"use client";

import * as React from "react";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { FeedSort } from "@/components/compositions/feed/feed";

import { sortCommunityFeedPosts } from "./feed-sorting";

type CommunityFeedLoader = (input: {
  communityId: string;
  locale: string;
  sort: FeedSort;
}) => Promise<{ items: ApiPost[] }>;

export function useCommunityFeedPosts(input: {
  communityId: string;
  locale: string;
  sort: FeedSort;
  loadPosts: CommunityFeedLoader;
}) {
  const { communityId, locale, sort, loadPosts } = input;
  const feedKey = `${communityId}:${locale}`;
  const [rawPosts, setRawPosts] = React.useState<ApiPost[]>([]);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const loadedFeedKeysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    setRawPosts([]);
    setError(null);
    setLoading(true);
    setRefreshing(false);
  }, [feedKey]);

  React.useEffect(() => {
    let cancelled = false;
    const isInitialLoad = !loadedFeedKeysRef.current.has(feedKey);
    setError(null);
    setLoading(isInitialLoad);
    setRefreshing(!isInitialLoad);

    void loadPosts({ communityId, locale, sort })
      .then((response) => {
        if (cancelled) return;
        setRawPosts(response.items);
        loadedFeedKeysRef.current.add(feedKey);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [communityId, feedKey, loadPosts, locale, sort]);

  const posts = React.useMemo(() => sortCommunityFeedPosts(rawPosts, sort), [rawPosts, sort]);

  return {
    error,
    loading,
    posts,
    rawPosts,
    refreshing,
    setPosts: setRawPosts,
  };
}
