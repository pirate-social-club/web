import * as React from "react";

import { COMMUNITY_RECORDS, HOME_POSTS, YOUR_COMMUNITIES_POSTS } from "@/app/mocks";
import { PillButton } from "@/components/primitives/pill-button";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
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
          <button
            className="flex w-full items-start gap-4 border-b border-border-soft px-5 py-4 text-start last:border-b-0"
            key={item.id}
            type="button"
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
              <div className="size-28 shrink-0 overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-surface-skeleton">
                <img alt="" className="h-full w-full object-cover" src={item.thumbnailSrc} />
              </div>
            ) : null}
          </button>
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

const longTextPostBody = Array.from({ length: 26 }, (_, index) => (
  `Paragraph ${index + 1}: this field report is intentionally long so feed cards prove they do not occupy the entire viewport. It should preview enough text to be useful, then hand off to the full post page.`
)).join("\n\n");

export const longTextHomeFeedItems: FeedItem[] = [
  {
    ...homeFeedItems[0],
    id: "post_long_text_home_story",
    post: {
      ...homeFeedItems[0].post,
      content: { type: "text", body: longTextPostBody },
      engagement: { score: 214, commentCount: 38 },
      postHref: "/p/post_long_text_home_story",
      title: "Long text post should not consume the home feed",
      titleHref: "/p/post_long_text_home_story",
      viewContext: "home",
    },
  },
  ...homeFeedItems.slice(1, 4),
];

export const longTextCommunityFeedItems: FeedItem[] = [
  {
    ...tameImpalaFeedItems[0],
    id: "post_long_text_story",
    post: {
      ...tameImpalaFeedItems[0].post,
      content: { type: "text", body: longTextPostBody },
      engagement: { score: 214, commentCount: 38 },
      postHref: "/p/post_long_text_story",
      title: "Long text post should not consume the feed",
      titleHref: "/p/post_long_text_story",
      viewContext: "community",
    },
  },
  ...tameImpalaFeedItems.slice(1, 4),
];

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

const noop = () => {};

function publishStateSongPost(
  post: PostCardProps,
  overrides: Pick<PostCardProps, "byline" | "statusNotice" | "title">,
): PostCardProps {
  return {
    ...post,
    ...overrides,
    content: {
      type: "song",
      accessMode: "locked",
      artist: post.byline.author?.label ?? post.byline.community?.label ?? "Unknown artist",
      listingMode: "not_listed",
      playbackState: "idle",
      title: overrides.title ?? "Midnight demo",
    },
    engagement: { score: 0, commentCount: 0 },
    menuItems: undefined,
    onComment: undefined,
    onShare: undefined,
    onVote: undefined,
    postHref: undefined,
    shareActions: undefined,
    titleHref: undefined,
  };
}

export const mixedPublishStateFeedItems: FeedItem[] = [
  {
    ...homeFeedItems[0],
    id: "post_publish_processing_story",
    post: publishStateSongPost(homeFeedItems[0].post, {
      byline: {
        ...homeFeedItems[0].post.byline,
        timestampLabel: "now",
      },
      statusNotice: {
        tone: "neutral",
        label: "Finishing publish",
        message: "Visible only to you until checks complete.",
      },
      title: "Midnight demo",
    }),
  },
  {
    ...homeFeedItems[1],
    id: "post_publish_failed_story",
    post: publishStateSongPost(homeFeedItems[1].post, {
      byline: {
        ...homeFeedItems[1].post.byline,
        timestampLabel: "2m",
      },
      statusNotice: {
        tone: "destructive",
        label: "Publish failed",
        message: "Story royalty registration is temporarily unavailable.",
        action: {
          label: "Try again",
          onClick: noop,
        },
      },
      title: "Late night stem bounce",
    }),
  },
  ...homeFeedItems.slice(0, 3).map((item, index) => ({
    ...item,
    id: `post_publish_published_story_${index + 1}`,
  })),
];
