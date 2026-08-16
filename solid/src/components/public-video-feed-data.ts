import type { InfiniteData } from "@tanstack/query-core";
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/solid-query";
import { createMemo, type Accessor } from "solid-js";
import {
  createPublicVideoFeedInfiniteQuery,
  publicVideoFeedKey,
  type PublicVideoFeedItem,
  type PublicVideoFeedPage,
} from "../lib/api/public-feed";
import { projectQueryData } from "../lib/async-query-projection";
import type { UiLocaleCode } from "../lib/ui-locale-core";

export type PublicVideoFeedQuery = UseInfiniteQueryResult<
  InfiniteData<PublicVideoFeedPage, string | null>,
  Error
>;

export function flattenPublicVideoFeedPages(
  data: InfiniteData<PublicVideoFeedPage, string | null>,
): PublicVideoFeedItem[] {
  const seen = new Set<string>();
  return data.pages.flatMap(page => page.items.filter(item => {
    const id = item.post.post.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }));
}

export function createPublicVideoFeedData(locale: Accessor<UiLocaleCode>) {
  const query = useInfiniteQuery<
    PublicVideoFeedPage,
    Error,
    InfiniteData<PublicVideoFeedPage, string | null>,
    ReturnType<typeof publicVideoFeedKey>,
    string | null
  >(() => createPublicVideoFeedInfiniteQuery(locale()) as never);
  // TanStack's promise is the async read for the initial boundary. Once data
  // exists, query.data wins so pagination and refetching keep stale cards live.
  const data = createMemo<InfiniteData<PublicVideoFeedPage, string | null>>(() =>
    projectQueryData(
      query.data,
      query.promise as unknown as Promise<InfiniteData<PublicVideoFeedPage, string | null>>,
    ) as InfiniteData<PublicVideoFeedPage, string | null>,
  );
  const items = createMemo(() => flattenPublicVideoFeedPages(data()));
  const nextCursor = createMemo(() => data().pages.at(-1)?.next_cursor ?? null);

  function loadMore(): void {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }

  return { query, data, items, nextCursor, loadMore };
}
