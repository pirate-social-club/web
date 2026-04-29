import * as React from "react";

import { COMMUNITY_RECORDS, HOME_POSTS, YOUR_COMMUNITIES_POSTS } from "@/app/mocks";
import { PillButton } from "@/components/primitives/pill-button";
import type { RecentPostRailItem } from "../recent-post-rail";
import type { FeedItem, FeedSortOption } from "../feed";
import { Type } from "@/components/primitives/type";
import { Avatar } from "@/components/primitives/avatar";
export { TopTimeRangeControl, topTimeRangeOptions } from "../feed";
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
  items: Array<{
    id: string;
    label: string;
    meta: string;
    stats?: string;
    avatarSrc?: string;
    thumbnailSrc?: string;
  }>;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
      <div className="px-5 py-4">
        <Type as="div" variant="label" className="uppercase tracking-[0.03em] text-muted-foreground">{title}</Type>
      </div>
      <div>
        {items.map((item) => (
          <a
            className="flex items-start gap-4 border-b border-border-soft px-5 py-4 last:border-b-0"
            href="#"
            key={item.id}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Avatar fallback={item.meta} size="xs" src={item.avatarSrc} />
                <Type as="div" variant="label" className="truncate text-muted-foreground">{item.meta}</Type>
              </div>
              <Type as="div" variant="body-strong" className="mt-3 line-clamp-2 leading-7">{item.label}</Type>
              {item.stats ? (
                <Type as="div" variant="body" className="mt-3 whitespace-nowrap text-muted-foreground">{item.stats}</Type>
              ) : null}
            </div>
            {item.thumbnailSrc ? (
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-surface-skeleton">
                <img alt="" className="h-full w-full object-cover" src={item.thumbnailSrc} />
              </div>
            ) : null}
          </a>
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

export const homeFeedItems = toFeedItems(HOME_POSTS);
export const yourCommunitiesFeedItems = toFeedItems(YOUR_COMMUNITIES_POSTS);
export const tameImpalaCommunity = COMMUNITY_RECORDS.gld_01_tame_impala;
export const tameImpalaFeedItems = toFeedItems(tameImpalaCommunity.posts);

export const recentPostRailItems = [
  {
    commentCount: 115,
    communityAvatarSrc: null,
    communityHref: "#",
    communityId: "c/gadgets",
    communityLabel: "r/gadgets",
    postHref: "#",
    postId: "recent-gadgets-launch",
    postTitle: "Clicks confirms launch plans for compact...",
    score: 614,
    thumbnailSrc: "https://picsum.photos/seed/compact-keyboard/240/240",
    timestampLabel: "15h ago",
  },
  {
    commentCount: 648,
    communityAvatarSrc: null,
    communityHref: "#",
    communityId: "c/no-stupid-questions",
    communityLabel: "r/NoStupidQuestions",
    postHref: "#",
    postId: "recent-space-survival",
    postTitle: "How long can a human survive in space without a space suit?",
    score: 1600,
    timestampLabel: "14h ago",
  },
  {
    commentCount: 2100,
    communityAvatarSrc: null,
    communityHref: "#",
    communityId: "c/okbuddycinephile",
    communityLabel: "r/okbuddycinephile",
    postHref: "#",
    postId: "recent-transformations",
    postTitle: "Actors who've underwent incredible transformations?",
    score: 8900,
    thumbnailSrc: "https://picsum.photos/seed/celebrity-transformations/240/240",
    timestampLabel: "6h ago",
  },
] satisfies readonly RecentPostRailItem[];

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
