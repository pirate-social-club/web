import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { FeedSort } from "@/components/compositions/posts/feed/feed";

import { getPostCommentCount } from "./post-presentation";

type TopTimeRange = "hour" | "day" | "week" | "month" | "year" | "all";

function getCreatedAtMs(createdAt: string | number): number {
  const timestamp = typeof createdAt === "number" ? createdAt * 1000 : Date.parse(createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getScore(upvoteCount: number, downvoteCount: number): number {
  return upvoteCount - downvoteCount;
}

function getEngagementScore(input: {
  commentCount: number;
  downvoteCount: number;
  likeCount: number;
  upvoteCount: number;
}): number {
  const voteScore = getScore(input.upvoteCount, input.downvoteCount);
  return voteScore * 3 + input.commentCount * 2 + input.likeCount;
}

function getRichnessScore(input: {
  bodyLength: number;
  captionLength: number;
  mediaCount: number;
  titleLength: number;
}): number {
  return input.titleLength * 2 + input.bodyLength + input.captionLength + input.mediaCount * 120;
}

function getBestRank(score: number, createdAt: string | number, now: number): number {
  const ageHours = Math.max(0, (now - getCreatedAtMs(createdAt)) / 3_600_000);
  return score / Math.pow(ageHours + 2, 1.5);
}

function getTimeRangeCutoffMs(timeRange: TopTimeRange, now: number): number | null {
  if (timeRange === "all") return null;

  const hoursByRange: Record<Exclude<TopTimeRange, "all">, number> = {
    hour: 1,
    day: 24,
    week: 168,
    month: 720,
    year: 8760,
  };

  return now - hoursByRange[timeRange] * 3_600_000;
}

function compareFeedEntries(
  left: {
    bodyLength: number;
    captionLength: number;
    commentCount: number;
    createdAt: string | number;
    downvoteCount: number;
    likeCount: number;
    mediaCount: number;
    postId: string;
    titleLength: number;
    upvoteCount: number;
  },
  right: {
    bodyLength: number;
    captionLength: number;
    commentCount: number;
    createdAt: string | number;
    downvoteCount: number;
    likeCount: number;
    mediaCount: number;
    postId: string;
    titleLength: number;
    upvoteCount: number;
  },
  sort: FeedSort,
  now: number,
): number {
  if (sort === "new") {
    const createdAtDiff = getCreatedAtMs(right.createdAt) - getCreatedAtMs(left.createdAt);
    if (createdAtDiff !== 0) return createdAtDiff;
    return right.postId.localeCompare(left.postId);
  }

  if (sort === "top") {
    const scoreDiff = getEngagementScore(right) - getEngagementScore(left);
    if (scoreDiff !== 0) return scoreDiff;

    const richnessDiff = getRichnessScore(right) - getRichnessScore(left);
    if (richnessDiff !== 0) return richnessDiff;
  } else {
    const rankDiff = getBestRank(
      getEngagementScore(right) + getRichnessScore(right) * 0.05,
      right.createdAt,
      now,
    ) - getBestRank(
      getEngagementScore(left) + getRichnessScore(left) * 0.05,
      left.createdAt,
      now,
    );
    if (rankDiff !== 0) return rankDiff;

    const richnessDiff = getRichnessScore(right) - getRichnessScore(left);
    if (richnessDiff !== 0) return richnessDiff;
  }

  const createdAtDiff = getCreatedAtMs(right.createdAt) - getCreatedAtMs(left.createdAt);
  if (createdAtDiff !== 0) return createdAtDiff;
  return right.postId.localeCompare(left.postId);
}

export function getFeedOrderSignature(
  items: ReadonlyArray<{ post: { id?: string; post?: string } } | { post: { post: { id?: string; post?: string } } }>,
): string {
  return items.map((item) => {
    const outerPost = item.post as { id?: string; post?: string | { id?: string; post?: string } };
    const post = typeof outerPost.post === "object" && outerPost.post !== null ? outerPost.post : outerPost;
    return post.id ?? post.post ?? "";
  }).join(",");
}

export function sortCommunityFeedPosts(
  posts: readonly ApiPost[],
  sort: FeedSort,
  now = Date.now(),
): ApiPost[] {
  return [...posts].sort((left, right) => compareFeedEntries({
    bodyLength: (left.post.body ?? "").trim().length,
    captionLength: (left.post.caption ?? "").trim().length,
    commentCount: getPostCommentCount(left),
    createdAt: left.post.created,
    downvoteCount: left.downvote_count,
    likeCount: left.like_count,
    mediaCount: left.post.media_refs?.length ?? 0,
    postId: left.post.id,
    titleLength: (left.post.title ?? "").trim().length,
    upvoteCount: left.upvote_count,
  }, {
    bodyLength: (right.post.body ?? "").trim().length,
    captionLength: (right.post.caption ?? "").trim().length,
    commentCount: getPostCommentCount(right),
    createdAt: right.post.created,
    downvoteCount: right.downvote_count,
    likeCount: right.like_count,
    mediaCount: right.post.media_refs?.length ?? 0,
    postId: right.post.id,
    titleLength: (right.post.title ?? "").trim().length,
    upvoteCount: right.upvote_count,
  }, sort, now));
}

export function sortHomeFeedEntries(
  entries: readonly ApiHomeFeedItem[],
  input: { sort: FeedSort; topTimeRange?: string | null; now?: number },
): ApiHomeFeedItem[] {
  const now = input.now ?? Date.now();
  const topTimeRange = (input.topTimeRange ?? "all") as TopTimeRange;
  const cutoffMs = input.sort === "top" ? getTimeRangeCutoffMs(topTimeRange, now) : null;
  const visibleEntries = cutoffMs == null
    ? entries
    : entries.filter((entry) => getCreatedAtMs(entry.post.post.created) >= cutoffMs);

  return [...visibleEntries].sort((left, right) => compareFeedEntries({
    bodyLength: (left.post.post.body ?? "").trim().length,
    captionLength: (left.post.post.caption ?? "").trim().length,
    commentCount: getPostCommentCount(left.post),
    createdAt: left.post.post.created,
    downvoteCount: left.post.downvote_count,
    likeCount: left.post.like_count,
    mediaCount: left.post.post.media_refs?.length ?? 0,
    postId: left.post.post.id,
    titleLength: (left.post.post.title ?? "").trim().length,
    upvoteCount: left.post.upvote_count,
  }, {
    bodyLength: (right.post.post.body ?? "").trim().length,
    captionLength: (right.post.post.caption ?? "").trim().length,
    commentCount: getPostCommentCount(right.post),
    createdAt: right.post.post.created,
    downvoteCount: right.post.downvote_count,
    likeCount: right.post.like_count,
    mediaCount: right.post.post.media_refs?.length ?? 0,
    postId: right.post.post.id,
    titleLength: (right.post.post.title ?? "").trim().length,
    upvoteCount: right.post.upvote_count,
  }, input.sort, now));
}
