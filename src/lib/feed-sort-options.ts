import type { FeedSortOption, TopTimeRangeOption } from "@/components/compositions/feed/feed";
import type { getLocaleMessages } from "@/locales";

type CommonRouteCopy = ReturnType<typeof getLocaleMessages<"routes">>["common"];

export function buildFeedSortOptions(copy: CommonRouteCopy): FeedSortOption[] {
  return [
    { value: "best", label: copy.bestTab },
    { value: "new", label: copy.newTab },
    { value: "top", label: copy.topTab },
  ];
}

export function buildTopTimeRangeOptions(copy: CommonRouteCopy): TopTimeRangeOption[] {
  return [
    { value: "hour", label: copy.topHour },
    { value: "day", label: copy.topDay },
    { value: "week", label: copy.topWeek },
    { value: "month", label: copy.topMonth },
    { value: "year", label: copy.topYear },
    { value: "all", label: copy.topAll },
  ];
}
