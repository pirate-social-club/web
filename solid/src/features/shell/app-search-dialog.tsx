import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import {
  Avatar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  IconMagnifyingGlass,
  Input,
  Spinner,
  Type,
} from "../../design-system";

export interface AppSearchCommunity {
  community: string;
  display_name: string;
  route_slug?: string | null;
}

// Simplified community route helpers: the React app canonicalizes punycode
// handles in lib/community-routing; the story-facing port keeps the plain
// slug-or-id path and leaves full canonicalization to the host router.
function buildCommunityPath(communityId: string, routeSlug?: string | null): string {
  return `/c/${encodeURIComponent(routeSlug || communityId)}`;
}

function formatCommunityRouteLabel(communityId: string, routeSlug?: string | null): string {
  return `c/${routeSlug || communityId}`;
}

interface AppSearchDialogLabels {
  searchTitle?: string;
  searchDescription?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
  searchCommunitiesLabel?: string;
  searchError?: string;
  searchNoResults?: string;
  searchHint?: string;
}

export interface AppSearchDialogProps {
  initialQuery?: string;
  labels?: AppSearchDialogLabels;
  onNavigate: (path: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Host-provided search adapter; stories pass typed fixtures. */
  searchCommunities: (query: string) => Promise<AppSearchCommunity[]>;
}

/**
 * Community search dialog. Fully callback-driven: the host supplies
 * searchCommunities and onNavigate, and copy arrives via labels. Query
 * debounce (180ms) matches the React behavior.
 */
export function AppSearchDialog(props: AppSearchDialogProps) {
  let inputRef: HTMLInputElement | undefined;
  const [query, setQuery] = createSignal(props.initialQuery ?? "");
  const [results, setResults] = createSignal<AppSearchCommunity[]>([]);
  const [status, setStatus] = createSignal<"idle" | "loading" | "ready" | "error">("idle");

  const title = () => props.labels?.searchTitle ?? "Search";
  const description = () =>
    props.labels?.searchDescription ?? "Find communities to join or follow.";

  createEffect(
    () => props.open,
    (open) => {
      if (!open) {
        setQuery(props.initialQuery ?? "");
        setResults([]);
        setStatus("idle");
        return;
      }
      if (typeof window === "undefined") return;
      const timeout = window.setTimeout(() => inputRef?.focus(), 0);
      onCleanup(() => window.clearTimeout(timeout));
    },
  );

  createEffect(
    () => ({ open: props.open, query: query() }),
    ({ open, query: value }) => {
      const normalized = value.trim();
      if (!open || normalized.length < 2) {
        setResults([]);
        setStatus("idle");
        return;
      }
      let cancelled = false;
      setStatus("loading");
      const timeout = window.setTimeout(() => {
        void props
          .searchCommunities(normalized)
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
      onCleanup(() => {
        cancelled = true;
        window.clearTimeout(timeout);
      });
    },
  );

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent class="top-[max(1rem,10svh)] max-h-[min(80svh,42rem)] translate-y-0 overflow-hidden p-0 data-[state=closed]:translate-y-2 data-[state=open]:translate-y-0 sm:w-[min(100%-2rem,38rem)]">
        <DialogHeader class="border-b border-border-soft px-5 pb-4 pt-5 pe-16 text-start">
          <DialogTitle>{title()}</DialogTitle>
          <DialogDescription>{description()}</DialogDescription>
        </DialogHeader>
        <div class="relative px-5">
          <IconMagnifyingGlass class="pointer-events-none absolute start-8 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={props.labels?.searchAriaLabel ?? "Search"}
            class="ps-11"
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={props.labels?.searchPlaceholder ?? "Search communities"}
            ref={inputRef}
            type="search"
            value={query()}
          />
        </div>
        <div class="min-h-48 overflow-y-auto px-3 pb-5">
          <Type class="px-2 pb-2 pt-1" variant="caption">
            {props.labels?.searchCommunitiesLabel ?? "Communities"}
          </Type>
          <Show
            when={status() === "loading"}
            fallback={
              <Show
                when={status() === "error"}
                fallback={
                  <Show
                    when={status() === "ready" && results().length === 0}
                    fallback={
                      <Show
                        when={results().length > 0}
                        fallback={
                          <Type class="px-2 py-8 text-center" variant="body">
                            {props.labels?.searchHint ?? "Type at least two characters to search."}
                          </Type>
                        }
                      >
                        <ul class="space-y-1">
                          <For each={results()}>
                            {(community) => (
                              <li>
                                <button
                                  class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => {
                                    props.onOpenChange(false);
                                    props.onNavigate(
                                      buildCommunityPath(community.community, community.route_slug),
                                    );
                                  }}
                                  type="button"
                                >
                                  <Avatar fallback={community.display_name} size="sm" />
                                  <span class="min-w-0">
                                    <Type class="truncate" variant="body-strong">
                                      {community.display_name}
                                    </Type>
                                    <Type class="truncate" variant="caption">
                                      {formatCommunityRouteLabel(community.community, community.route_slug)}
                                    </Type>
                                  </span>
                                </button>
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                    }
                  >
                    <Type class="px-2 py-8 text-center" variant="body">
                      {props.labels?.searchNoResults ?? "No communities found."}
                    </Type>
                  </Show>
                }
              >
                <Type class="px-2 py-8 text-center" variant="body">
                  {props.labels?.searchError ?? "Search is unavailable right now."}
                </Type>
              </Show>
            }
          >
            <div class="grid min-h-32 place-items-center">
              <Spinner class="size-6" />
            </div>
          </Show>
        </div>
      </DialogContent>
    </Dialog>
  );
}
