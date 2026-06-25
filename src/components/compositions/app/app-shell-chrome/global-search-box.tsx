"use client";

import * as React from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import { IconButton } from "@/components/primitives/icon-button";
import type { ApiSearchResult, ApiSearchResultKind } from "@/lib/api/client-api-types";
import { useSearchAutocomplete, normalizeSearchInput } from "@/lib/api/use-search-results";
import { cn } from "@/lib/utils";
import {
  SearchAutocompletePanel,
  type SearchAutocompleteItem,
  type SearchAutocompletePanelLabels,
  type SearchAutocompletePanelState,
} from "./search-autocomplete-panel";

const RECENT_SEARCH_LIMIT = 5;
export const SEARCH_RECENTS_STORAGE_KEY = "pirate:search:recent-queries";

export type GlobalSearchBoxLabels = SearchAutocompletePanelLabels & {
  clearInput: string;
  placeholder: string;
  search: string;
};

const defaultLabels: GlobalSearchBoxLabels = {
  clearInput: "Clear search",
  clearRecents: "Clear",
  communitiesHeading: "Communities",
  error: "Search is unavailable right now.",
  loading: "Searching...",
  noMatches: (query) => `No matches for ${query}`,
  placeholder: "Find anything",
  profilesHeading: "Profiles",
  recentHeading: "Recent",
  search: "Search Pirate",
};

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readRecentSearchQueries(storageKey = SEARCH_RECENTS_STORAGE_KEY): string[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && normalizeSearchInput(item).length > 0).slice(0, RECENT_SEARCH_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function writeRecentSearchQueries(queries: string[], storageKey = SEARCH_RECENTS_STORAGE_KEY): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(queries.slice(0, RECENT_SEARCH_LIMIT)));
  } catch {
    // Ignore storage failures; search recents are optional local state.
  }
}

export function rememberRecentSearchQuery(query: string, storageKey = SEARCH_RECENTS_STORAGE_KEY): string[] {
  const normalized = normalizeSearchInput(query);
  if (!normalized) {
    return readRecentSearchQueries(storageKey);
  }
  const next = [
    normalized,
    ...readRecentSearchQueries(storageKey).filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, RECENT_SEARCH_LIMIT);
  writeRecentSearchQueries(next, storageKey);
  return next;
}

export function clearRecentSearchQueries(storageKey = SEARCH_RECENTS_STORAGE_KEY): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(storageKey);
  } catch {
    // Ignore storage failures; search recents are optional local state.
  }
}

function searchPageHref(query: string): string {
  const params = new URLSearchParams({ q: query });
  return `/search?${params.toString()}`;
}

function parseAutocompleteTarget(query: string): {
  kinds: readonly ApiSearchResultKind[];
  preferredKind: ApiSearchResultKind;
  searchQuery: string;
} {
  const normalized = normalizeSearchInput(query);
  const lower = normalized.toLowerCase();
  const profileMatch = lower.match(/^(?:\/?u\/|@)(.+)$/u);
  if (profileMatch) {
    return {
      kinds: ["profile"],
      preferredKind: "profile",
      searchQuery: normalizeSearchInput(normalized.slice(normalized.length - profileMatch[1].length)),
    };
  }

  const communityMatch = lower.match(/^\/?(?:c|r)\/(.+)$/u);
  if (communityMatch) {
    return {
      kinds: ["community"],
      preferredKind: "community",
      searchQuery: normalizeSearchInput(normalized.slice(normalized.length - communityMatch[1].length)),
    };
  }

  return {
    kinds: ["profile", "community"],
    preferredKind: "community",
    searchQuery: normalized,
  };
}

function sectionHeadingForKind(kind: ApiSearchResultKind, labels: GlobalSearchBoxLabels): string {
  return kind === "profile" ? labels.profilesHeading : labels.communitiesHeading;
}

function buildResultSections(
  results: readonly ApiSearchResult[],
  labels: GlobalSearchBoxLabels,
): Array<{ heading: string; items: ApiSearchResult[] }> {
  const sections: Array<{ heading: string; items: ApiSearchResult[] }> = [];
  for (const result of results) {
    const heading = sectionHeadingForKind(result.kind, labels);
    const existing = sections.find((section) => section.heading === heading);
    if (existing) {
      existing.items.push(result);
    } else {
      sections.push({ heading, items: [result] });
    }
  }
  return sections;
}

type DisplaySections = Array<{
  heading: string;
  startIndex: number;
  items: ApiSearchResult[];
}>;

function buildDisplayItems(input: {
  canSearch: boolean;
  panelOpen: boolean;
  recents: readonly string[];
  suggestions: readonly string[];
  results: readonly ApiSearchResult[];
  labels: GlobalSearchBoxLabels;
}): { items: SearchAutocompleteItem[]; resultSections: DisplaySections } {
  if (!input.panelOpen) {
    return { items: [], resultSections: [] };
  }
  if (!input.canSearch) {
    return {
      items: input.recents.map((query) => ({ type: "recent", query })),
      resultSections: [],
    };
  }
  const suggestions: SearchAutocompleteItem[] = input.suggestions.map((query) => ({ type: "suggestion", query }));
  const sections = buildResultSections(input.results, input.labels);
  let runningIndex = suggestions.length;
  const sectionsWithIndex: DisplaySections = sections.map((section) => {
    const startIndex = runningIndex;
    runningIndex += section.items.length;
    return { ...section, startIndex };
  });
  const results: SearchAutocompleteItem[] = sectionsWithIndex.flatMap((section) =>
    section.items.map((result) => ({ type: "result" as const, result })),
  );
  return {
    items: [...suggestions, ...results],
    resultSections: sectionsWithIndex,
  };
}

export function GlobalSearchBox({
  className,
  debounceMs,
  defaultValue = "",
  labels: labelOverrides,
  limit = 8,
  onNavigate = navigate,
  onSubmit,
  onValueChange,
  storageKey = SEARCH_RECENTS_STORAGE_KEY,
  value,
}: {
  className?: string;
  debounceMs?: number;
  defaultValue?: string;
  labels?: Partial<GlobalSearchBoxLabels>;
  limit?: number;
  onNavigate?: (href: string) => void;
  onSubmit?: (query: string) => void;
  onValueChange?: (value: string) => void;
  storageKey?: string;
  value?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listboxId = React.useId();
  const itemIdPrefix = React.useId();
  const labels = React.useMemo<GlobalSearchBoxLabels>(() => ({
    ...defaultLabels,
    ...labelOverrides,
  }), [labelOverrides]);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const updateValue = React.useCallback((next: string) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  }, [isControlled, onValueChange]);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [recents, setRecents] = React.useState<string[]>(() => readRecentSearchQueries(storageKey));
  const normalizedQuery = normalizeSearchInput(currentValue);
  const canSearch = normalizedQuery.length >= 2;
  const autocompleteTarget = React.useMemo(() => parseAutocompleteTarget(normalizedQuery), [normalizedQuery]);
  const autocompleteSearchQuery = autocompleteTarget.searchQuery;
  const resultHeading = sectionHeadingForKind(autocompleteTarget.preferredKind, labels);
  const search = useSearchAutocomplete({
    debounceMs,
    enabled: panelOpen && canSearch && autocompleteSearchQuery.length >= 2,
    kinds: autocompleteTarget.kinds,
    limit,
    query: autocompleteSearchQuery,
  });

  const { items, resultSections } = React.useMemo(
    () => buildDisplayItems({
      canSearch,
      labels,
      panelOpen,
      recents,
      results: search.results,
      suggestions: search.suggestions,
    }),
    [canSearch, labels, panelOpen, recents, search.results, search.suggestions],
  );
  const panelState = React.useMemo<SearchAutocompletePanelState | null>(() => {
    if (!panelOpen) {
      return null;
    }
    if (!canSearch) {
      return recents.length > 0 ? "recent" : null;
    }
    if (search.isError) {
      return "error";
    }
    if (autocompleteSearchQuery.length < 2) {
      return null;
    }
    if (search.isPending || (search.isFetching && search.results.length === 0)) {
      return "loading";
    }
    if (search.suggestions.length === 0 && search.results.length === 0) {
      return "empty";
    }
    return "results";
  }, [
    autocompleteSearchQuery.length,
    canSearch,
    panelOpen,
    recents.length,
    search.isError,
    search.isFetching,
    search.isPending,
    search.results.length,
    search.suggestions.length,
  ]);
  const activeDescendant = panelOpen && activeIndex >= 0 ? `${itemIdPrefix}-${activeIndex}` : undefined;

  React.useEffect(() => {
    if (!panelOpen || items.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) => current >= 0 && current < items.length ? current : 0);
  }, [items.length, panelOpen]);

  React.useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      setPanelOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [panelOpen]);

  const remember = React.useCallback((query: string) => {
    const nextRecents = rememberRecentSearchQuery(query, storageKey);
    setRecents(nextRecents);
  }, [storageKey]);

  const closePanel = React.useCallback(() => {
    setPanelOpen(false);
    setActiveIndex(-1);
  }, []);

  const navigateToSearch = React.useCallback((query: string) => {
    const normalized = normalizeSearchInput(query);
    if (normalized.length < 2) {
      return;
    }
    remember(normalized);
    closePanel();
    if (onSubmit) {
      onSubmit(normalized);
      return;
    }
    onNavigate(searchPageHref(normalized));
  }, [closePanel, onNavigate, onSubmit, remember]);

  const selectItem = React.useCallback((item: SearchAutocompleteItem) => {
    if (item.type === "recent" || item.type === "suggestion") {
      navigateToSearch(item.query);
      return;
    }
    remember(normalizedQuery || item.result.title);
    closePanel();
    onNavigate(item.result.href);
  }, [closePanel, navigateToSearch, normalizedQuery, onNavigate, remember]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && panelOpen) {
      event.preventDefault();
      closePanel();
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && panelOpen && items.length > 0) {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const safeCurrent = current < 0 ? 0 : current;
        return (safeCurrent + direction + items.length) % items.length;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
      if (activeItem) {
        selectItem(activeItem);
        return;
      }
      navigateToSearch(normalizedQuery);
    }
  }, [activeIndex, closePanel, items, navigateToSearch, normalizedQuery, panelOpen, selectItem]);

  const clearInput = React.useCallback(() => {
    updateValue("");
    setPanelOpen(true);
    inputRef.current?.focus();
  }, [updateValue]);

  const clearRecents = React.useCallback(() => {
    clearRecentSearchQueries(storageKey);
    setRecents([]);
    closePanel();
    inputRef.current?.focus();
  }, [closePanel, storageKey]);

  return (
    <div className={cn("relative w-full", className)} ref={rootRef}>
      <div className="flex h-12 items-center gap-2 rounded-full border border-border-soft bg-card px-4 text-foreground shadow-sm transition-[color,box-shadow,border-color] focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft">
        <MagnifyingGlass className="size-5 shrink-0 text-muted-foreground" weight="regular" />
        <input
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={panelState ? listboxId : undefined}
          aria-expanded={Boolean(panelState)}
          aria-label={labels.search}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            updateValue(event.currentTarget.value);
            setPanelOpen(true);
          }}
          onFocus={() => {
            setRecents(readRecentSearchQueries(storageKey));
            setPanelOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={labels.placeholder}
          ref={inputRef}
          role="combobox"
          type="search"
          value={currentValue}
        />
        {currentValue ? (
          <IconButton
            aria-label={labels.clearInput}
            className="-me-2 size-8 text-muted-foreground hover:text-foreground"
            onClick={clearInput}
            size="sm"
            variant="ghost"
          >
            <X className="size-4" weight="bold" />
          </IconButton>
        ) : null}
      </div>
      {panelState ? (
        <SearchAutocompletePanel
          activeIndex={activeIndex}
          getItemId={(index) => `${itemIdPrefix}-${index}`}
          id={listboxId}
          items={items}
          labels={labels}
          onClearRecents={clearRecents}
          onHoverItem={setActiveIndex}
          onSelectItem={selectItem}
          query={search.debouncedQuery || normalizedQuery}
          resultHeading={resultHeading}
          resultSections={resultSections}
          state={panelState}
        />
      ) : null}
    </div>
  );
}
