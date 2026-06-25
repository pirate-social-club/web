"use client";

import * as React from "react";

import { NAVIGATION_EVENT, navigate } from "@/app/router";
import { GlobalSearchBox } from "@/components/compositions/app/app-shell-chrome/global-search-box";
import { SearchResultRow } from "@/components/compositions/app/app-shell-chrome/search-result-row";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { usePagedSearchResults, normalizeSearchInput } from "@/lib/api/use-search-results";

function readQueryFromLocation(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function searchHref(query: string): string {
  return `/search?${new URLSearchParams({ q: query }).toString()}`;
}

function useSearchQueryParam(): string {
  const [query, setQuery] = React.useState(readQueryFromLocation);

  React.useEffect(() => {
    const handleLocationChange = () => setQuery(readQueryFromLocation());
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener(NAVIGATION_EVENT, handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener(NAVIGATION_EVENT, handleLocationChange);
    };
  }, []);

  return query;
}

export function SearchPage() {
  const routeQuery = useSearchQueryParam();
  const normalizedRouteQuery = normalizeSearchInput(routeQuery);
  const [draft, setDraft] = React.useState(normalizedRouteQuery);
  const search = usePagedSearchResults({ query: normalizedRouteQuery });

  React.useEffect(() => {
    setDraft(normalizedRouteQuery);
  }, [normalizedRouteQuery]);

  const submitSearch = React.useCallback((query: string) => {
    const normalized = normalizeSearchInput(query);
    if (normalized.length < 2) {
      return;
    }
    if (normalized === normalizedRouteQuery) {
      return;
    }
    navigate(searchHref(normalized));
  }, [normalizedRouteQuery]);

  const showLoading = search.enabled && search.isPending;
  const showError = search.enabled && search.isError;
  const showEmpty = search.enabled && search.isSuccess && search.results.length === 0;
  const showResults = search.results.length > 0;

  return (
    <PageContainer className="w-full max-w-3xl">
      <div className="space-y-6">
        <div className="space-y-3">
          <Type as="h1" variant="h2">Search</Type>
          <GlobalSearchBox
            onSubmit={submitSearch}
            onValueChange={setDraft}
            value={draft}
          />
        </div>

        {showLoading ? (
          <div
            aria-live="polite"
            className="flex items-center gap-3 py-10 text-muted-foreground"
            role="status"
          >
            <Spinner className="size-4" />
            <Type as="span" variant="body">Searching...</Type>
          </div>
        ) : showError ? (
          <div aria-live="polite" className="py-10" role="status">
            <Type as="p" className="text-muted-foreground" variant="body">
              Search is unavailable right now.
            </Type>
          </div>
        ) : showEmpty ? (
          <div aria-live="polite" className="py-10" role="status">
            <Type as="p" className="text-muted-foreground" variant="body">
              No matches for {normalizedRouteQuery}
            </Type>
          </div>
        ) : null}

        {showResults ? (
          <div className="space-y-2">
            {search.results.map((result) => (
              <SearchResultRow
                className="rounded-[var(--radius-lg)] border border-border-soft bg-card"
                key={result.id}
                onSelect={(item) => navigate(item.href)}
                result={result}
              />
            ))}
            {search.hasNextPage ? (
              <div className="pt-3">
                <Button
                  className="w-full"
                  loading={search.isFetchingNextPage}
                  onClick={() => void search.fetchNextPage()}
                  variant="secondary"
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
