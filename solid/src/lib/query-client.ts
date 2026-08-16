import { dehydrate, hydrate, QueryClient } from "@tanstack/solid-query";

const QUERY_CACHE_STORAGE_KEY = "pirate-solid-query-cache-v1";

let browserQueryClient: QueryClient | undefined;

function createConfiguredQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
    },
  });
}

function restoreBrowserQueryCache(client: QueryClient): void {
  try {
    const serialized = window.sessionStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    if (serialized) hydrate(client, JSON.parse(serialized));
  } catch {
    // Browser storage is optional and may contain data from an older shape.
  }
}

function persistBrowserQueryCache(client: QueryClient): void {
  client.getQueryCache().subscribe(event => {
    if ((event.type === "added" || event.type === "updated") && event.query.state.status === "success") {
      try {
        window.sessionStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(dehydrate(client)));
      } catch {
        // Browser storage is optional and may be unavailable or full.
      }
    }
  });
}

export function createAppQueryClient() {
  if (typeof window === "undefined") return createConfiguredQueryClient();
  if (browserQueryClient) return browserQueryClient;

  browserQueryClient = createConfiguredQueryClient();
  restoreBrowserQueryCache(browserQueryClient);
  persistBrowserQueryCache(browserQueryClient);
  return browserQueryClient;
}
