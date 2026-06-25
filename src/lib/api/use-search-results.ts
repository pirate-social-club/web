"use client";

import * as React from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import type {
  ApiSearchResult,
  ApiSearchResultKind,
  ApiSearchResultsResponse,
} from "./client-api-types";

const MIN_SEARCH_QUERY_LENGTH = 2;
const DEFAULT_AUTOCOMPLETE_LIMIT = 8;
const DEFAULT_PAGE_LIMIT = 20;
const DEFAULT_DEBOUNCE_MS = 200;

type SearchKindsInput = readonly ApiSearchResultKind[] | null | undefined;

export function normalizeSearchInput(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/gu, " ");
}

function searchKindsKey(kinds: SearchKindsInput): string {
  return kinds && kinds.length > 0 ? kinds.join(",") : "";
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

export function useSearchAutocomplete(input: {
  query: string;
  debounceMs?: number;
  enabled?: boolean;
  kinds?: SearchKindsInput;
  limit?: number;
}) {
  const api = useApi();
  const normalizedQuery = normalizeSearchInput(input.query);
  const debouncedQuery = useDebouncedValue(normalizedQuery, input.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  const kindsKey = searchKindsKey(input.kinds);
  const limit = input.limit ?? DEFAULT_AUTOCOMPLETE_LIMIT;
  const enabled = (input.enabled ?? true) && debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const query = useQuery({
    queryKey: ["search", "autocomplete", debouncedQuery, limit, kindsKey],
    enabled,
    queryFn: () => api.search.pirate({
      query: debouncedQuery,
      limit,
      kinds: input.kinds,
    }),
  });

  return {
    ...query,
    debouncedQuery,
    enabled,
    normalizedQuery,
    results: query.data?.data ?? [],
    suggestions: query.data?.suggestions ?? [],
  };
}

export function usePagedSearchResults(input: {
  query: string;
  enabled?: boolean;
  kinds?: SearchKindsInput;
  limit?: number;
}) {
  const api = useApi();
  const normalizedQuery = normalizeSearchInput(input.query);
  const kindsKey = searchKindsKey(input.kinds);
  const limit = input.limit ?? DEFAULT_PAGE_LIMIT;
  const enabled = (input.enabled ?? true) && normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const query = useInfiniteQuery({
    queryKey: ["search", "page", normalizedQuery, limit, kindsKey],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }): Promise<ApiSearchResultsResponse> => api.search.pirate({
      query: normalizedQuery,
      limit,
      cursor: typeof pageParam === "string" ? pageParam : null,
      kinds: input.kinds,
    }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor ? lastPage.next_cursor : undefined,
  });
  const results = React.useMemo<ApiSearchResult[]>(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  return {
    ...query,
    enabled,
    normalizedQuery,
    results,
  };
}
