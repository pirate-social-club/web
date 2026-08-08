"use client";

import * as React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Input } from "@/components/primitives/input";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

export type AppSearchCommunity = {
  community: string;
  display_name: string;
  route_slug?: string | null;
};

export function AppSearchDialog({
  initialQuery = "",
  onNavigate,
  onOpenChange,
  open,
  searchCommunities,
}: {
  initialQuery?: string;
  onNavigate: (path: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  searchCommunities?: (query: string) => Promise<AppSearchCommunity[]>;
}) {
  const api = useApi();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "shell").appHeader;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState<AppSearchCommunity[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const resolvedSearch = React.useCallback(
    async (value: string) => searchCommunities
      ? searchCommunities(value)
      : (await api.publicCommunities.search(value, { limit: 10 })).communities,
    [api, searchCommunities],
  );

  React.useEffect(() => {
    if (!open) {
      setQuery(initialQuery);
      setResults([]);
      setStatus("idle");
      return;
    }
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [initialQuery, open]);

  React.useEffect(() => {
    const normalized = query.trim();
    if (!open || normalized.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timeout = window.setTimeout(() => {
      void resolvedSearch(normalized)
        .then((communities) => {
          if (cancelled) return;
          setResults(communities);
          setStatus("ready");
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setStatus("error");
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query, resolvedSearch]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="top-[max(1rem,10svh)] max-h-[min(80svh,42rem)] translate-y-0 overflow-hidden p-0 data-[state=closed]:translate-y-2 data-[state=open]:translate-y-0 sm:w-[min(100%-2rem,38rem)]">
        <DialogHeader className="border-b border-border-soft px-5 pb-4 pt-5 pe-16 text-start">
          <DialogTitle>{copy.searchTitle}</DialogTitle>
          <DialogDescription>{copy.searchDescription}</DialogDescription>
        </DialogHeader>
        <div className="relative px-5">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute start-8 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={copy.searchAriaLabel}
            className="ps-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            ref={inputRef}
            type="search"
            value={query}
          />
        </div>
        <div className="min-h-48 overflow-y-auto px-3 pb-5">
          <Type className="px-2 pb-2 pt-1" variant="caption">{copy.searchCommunitiesLabel}</Type>
          {status === "loading" ? (
            <div className="grid min-h-32 place-items-center"><Spinner className="size-6" /></div>
          ) : status === "error" ? (
            <Type className="px-2 py-8 text-center" variant="body">{copy.searchError}</Type>
          ) : status === "ready" && results.length === 0 ? (
            <Type className="px-2 py-8 text-center" variant="body">{copy.searchNoResults}</Type>
          ) : results.length > 0 ? (
            <ul className="space-y-1">
              {results.map((community) => (
                <li key={community.community}>
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigate(buildCommunityPath(community.community, community.route_slug));
                    }}
                    type="button"
                  >
                    <Avatar fallback={community.display_name} size="sm" />
                    <span className="min-w-0">
                      <Type className="truncate" variant="body-strong">{community.display_name}</Type>
                      <Type className="truncate" variant="caption">
                        {formatCommunityRouteLabel(community.community, community.route_slug)}
                      </Type>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Type className="px-2 py-8 text-center" variant="body">{copy.searchHint}</Type>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
