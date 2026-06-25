"use client";

import * as React from "react";
import {
  ClockCounterClockwise,
  MagnifyingGlass,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import type { ApiSearchResult } from "@/lib/api/client-api-types";
import { cn } from "@/lib/utils";
import { SearchResultRow } from "./search-result-row";

export type SearchAutocompleteItem =
  | { type: "recent"; query: string }
  | { type: "suggestion"; query: string }
  | { type: "result"; result: ApiSearchResult };

export type SearchAutocompletePanelState = "recent" | "loading" | "results" | "empty" | "error";

export type SearchAutocompletePanelLabels = {
  clearRecents: string;
  communitiesHeading: string;
  error: string;
  loading: string;
  noMatches: (query: string) => string;
  profilesHeading: string;
  recentHeading: string;
};

export type SearchAutocompleteResultSection = {
  heading: string;
  startIndex: number;
  items: ApiSearchResult[];
};

function SearchPanelStatusRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 text-muted-foreground"
      role="status"
    >
      {children}
    </div>
  );
}

export function SearchAutocompletePanel({
  activeIndex,
  className,
  getItemId,
  id,
  items,
  labels,
  onClearRecents,
  onHoverItem,
  onSelectItem,
  query,
  resultHeading,
  resultSections,
  state,
}: {
  activeIndex: number;
  className?: string;
  getItemId: (index: number) => string;
  id: string;
  items: SearchAutocompleteItem[];
  labels: SearchAutocompletePanelLabels;
  onClearRecents: () => void;
  onHoverItem: (index: number) => void;
  onSelectItem: (item: SearchAutocompleteItem) => void;
  query: string;
  resultHeading: string;
  resultSections?: SearchAutocompleteResultSection[];
  state: SearchAutocompletePanelState;
}) {
  const renderRecentItem = (item: Extract<SearchAutocompleteItem, { type: "recent" }>, index: number) => (
    <button
      aria-selected={index === activeIndex}
      className={cn(
        "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-md px-3 py-2.5 text-start outline-none transition-colors",
        index === activeIndex ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
      )}
      id={getItemId(index)}
      key={item.query}
      onClick={() => onSelectItem(item)}
      onMouseEnter={() => onHoverItem(index)}
      role="option"
      type="button"
    >
      <span className="grid size-9 place-items-center rounded-full border border-border-soft bg-card text-muted-foreground">
        <ClockCounterClockwise className="size-5" weight="regular" />
      </span>
      <span className="min-w-0">
        <Type as="span" className="block truncate" variant="body">
          {item.query}
        </Type>
      </span>
    </button>
  );

  const renderSuggestionItem = (item: Extract<SearchAutocompleteItem, { type: "suggestion" }>, index: number) => (
    <button
      aria-selected={index === activeIndex}
      className={cn(
        "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-md px-3 py-2.5 text-start outline-none transition-colors",
        index === activeIndex ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
      )}
      id={getItemId(index)}
      key={item.query}
      onClick={() => onSelectItem(item)}
      onMouseEnter={() => onHoverItem(index)}
      role="option"
      type="button"
    >
      <span className="grid size-9 place-items-center rounded-full border border-border-soft bg-card text-muted-foreground">
        <MagnifyingGlass className="size-5" weight="regular" />
      </span>
      <span className="min-w-0">
        <Type as="span" className="block truncate" variant="body">
          {item.query}
        </Type>
      </span>
    </button>
  );

  const renderResultItem = (item: Extract<SearchAutocompleteItem, { type: "result" }>, index: number) => (
    <SearchResultRow
      active={index === activeIndex}
      id={getItemId(index)}
      key={item.result.id}
      onMouseEnter={() => onHoverItem(index)}
      onSelect={() => onSelectItem(item)}
      result={item.result}
      role="option"
    />
  );

  const showFallbackHeading = state === "loading" || state === "error" || state === "empty";
  const renderResultAtIndex = (item: Extract<SearchAutocompleteItem, { type: "result" }>, index: number) => {
    const section = resultSections?.find((candidate) => candidate.startIndex === index);
    return (
      <React.Fragment key={item.result.id}>
        {section ? (
          <div
            className={cn("px-3 pb-1", section.startIndex === 0 ? "pt-1" : "pt-3")}
            role="presentation"
          >
            <Type aria-hidden="true" as="div" className="text-muted-foreground" variant="caption">
              {section.heading}
            </Type>
          </div>
        ) : null}
        {renderResultItem(item, index)}
      </React.Fragment>
    );
  };

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-2xl",
        className,
      )}
    >
      {state === "recent" ? (
        <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
          <Type as="div" className="text-muted-foreground" variant="caption">
            {labels.recentHeading}
          </Type>
          <Button className="h-8 px-3" onClick={onClearRecents} size="sm" variant="ghost">
            {labels.clearRecents}
          </Button>
        </div>
      ) : null}
      <div
        className="max-h-80 overflow-y-auto p-2"
        id={id}
        role="listbox"
      >
        {state === "recent" ? (
          <div className="space-y-1">
            {items.map((item, index) => item.type === "recent" ? renderRecentItem(item, index) : null)}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => {
              if (item.type === "suggestion") {
                return renderSuggestionItem(item, index);
              }
              if (item.type === "result") {
                return renderResultAtIndex(item, index);
              }
              return null;
            })}
            {showFallbackHeading ? (
              <div className="px-3 pb-1 pt-1">
                <Type aria-hidden="true" as="div" className="text-muted-foreground" variant="caption">
                  {resultHeading}
                </Type>
              </div>
            ) : null}
            {state === "loading" ? (
              <SearchPanelStatusRow>
                <Spinner className="size-4" />
                <Type as="span" variant="caption">{labels.loading}</Type>
              </SearchPanelStatusRow>
            ) : state === "error" ? (
              <SearchPanelStatusRow>
                <MagnifyingGlass className="size-4" weight="regular" />
                <Type as="span" variant="caption">{labels.error}</Type>
              </SearchPanelStatusRow>
            ) : state === "empty" ? (
              <SearchPanelStatusRow>
                <MagnifyingGlass className="size-4" weight="regular" />
                <Type as="span" variant="caption">{labels.noMatches(query)}</Type>
              </SearchPanelStatusRow>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
