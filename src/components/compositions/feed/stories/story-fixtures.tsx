import * as React from "react";

import { COMMUNITY_RECORDS, HOME_POSTS, YOUR_COMMUNITIES_POSTS } from "@/app/mocks";
import { PillButton, pillButtonVariants } from "@/components/primitives/pill-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import type { FeedItem, FeedSortOption } from "../feed";

export function toFeedItems(posts: typeof HOME_POSTS): FeedItem[] {
  return posts.map((post) => ({
    id: post.postId,
    post,
  }));
}

export function StoryRail({
  items,
  title,
}: {
  items: Array<{ id: string; label: string; meta: string }>;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
      <div className="border-b border-border-soft px-5 py-4">
        <div className="text-lg font-semibold text-foreground">{title}</div>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map((item) => (
          <div className="px-5 py-4" key={item.id}>
            <div className="text-base font-medium text-foreground">{item.label}</div>
            <div className="text-base text-muted-foreground">{item.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommunityFlairControls() {
  return (
    <>
      <PillButton>All</PillButton>
      <PillButton>Discussion</PillButton>
      <PillButton>Media</PillButton>
    </>
  );
}

export const sortOptions: FeedSortOption[] = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export const topTimeRangeOptions = [
  { value: "hour", label: "This hour" },
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
] as const;

export function TopTimeRangeControl({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        className={cn(
          pillButtonVariants({ tone: "default" }),
          "w-full min-w-[10rem] justify-between bg-card py-0 pl-4 pr-3 shadow-none md:w-[11rem]",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {topTimeRangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const homeFeedItems = toFeedItems(HOME_POSTS);
export const yourCommunitiesFeedItems = toFeedItems(YOUR_COMMUNITIES_POSTS);
export const tameImpalaCommunity = COMMUNITY_RECORDS.gld_01_tame_impala;
export const tameImpalaFeedItems = toFeedItems(tameImpalaCommunity.posts);

export const recentPostRailItems = HOME_POSTS.slice(0, 5).map((post) => ({
  id: `recent-${post.postId}`,
  label: post.title ?? post.byline.community?.label ?? post.byline.author?.label ?? "Post",
  meta: [post.byline.community?.label, post.byline.timestampLabel].filter(Boolean).join(" · "),
}));

export const yourSpacesRailItems = Object.values(COMMUNITY_RECORDS).map((community) => ({
  id: community.id,
  label: community.label,
  meta: `${community.memberCount.toLocaleString("en-US")} members`,
}));

export const communityRailItems = [
  { id: "rules", label: "Rules", meta: "3 active" },
  { id: "flair", label: "Flair", meta: "Discussion, Media" },
];

export const translatedMixItems: FeedItem[] = [
  {
    ...homeFeedItems[0],
    post: {
      ...homeFeedItems[0].post,
      content: {
        type: "text",
        body: "Texto traducido en línea. El original sigue disponible debajo del salto.",
      },
      qualifierLabels: ["Translated"],
    },
  },
  {
    ...homeFeedItems[1],
    post: {
      ...homeFeedItems[1].post,
      identityPresentation: "author_primary",
      qualifierLabels: ["18+"],
    },
  },
  homeFeedItems[2],
];
