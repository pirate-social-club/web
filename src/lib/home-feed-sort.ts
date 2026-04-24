export type HomeFeedSort = "best" | "new" | "top";

export const HOME_FEED_SORT_CHANGE_EVENT = "pirate:home-feed-sort-change";

let currentHomeFeedSort: HomeFeedSort = "best";

export function getCurrentHomeFeedSort(): HomeFeedSort {
  return currentHomeFeedSort;
}

export function setCurrentHomeFeedSort(sort: HomeFeedSort): void {
  currentHomeFeedSort = sort;
}

export function dispatchHomeFeedSortChange(sort: HomeFeedSort): void {
  setCurrentHomeFeedSort(sort);

  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent<HomeFeedSort>(HOME_FEED_SORT_CHANGE_EVENT, {
    detail: sort,
  }));
}

