"use client";

import * as React from "react";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { toast } from "@/components/primitives/sonner";

import { getErrorMessage } from "./route-core";

export type PostVoteValue = -1 | 1;

function toPostVoteValue(direction: "up" | "down"): PostVoteValue {
  return direction === "up" ? 1 : -1;
}

export function applyPostVote(postResponse: ApiPost, nextValue: PostVoteValue | null): ApiPost {
  const previousValue = postResponse.viewer_vote;

  if (previousValue === nextValue) {
    return postResponse;
  }

  return {
    ...postResponse,
    downvote_count: postResponse.downvote_count
      + (nextValue === -1 ? 1 : 0)
      - (previousValue === -1 ? 1 : 0),
    upvote_count: postResponse.upvote_count
      + (nextValue === 1 ? 1 : 0)
      - (previousValue === 1 ? 1 : 0),
    viewer_vote: nextValue,
  };
}

export function updateHomeFeedEntryPostVote(
  entries: ApiHomeFeedItem[],
  postId: string,
  nextValue: PostVoteValue | null,
): ApiHomeFeedItem[] {
  let didUpdate = false;

  const nextEntries = entries.map((entry) => {
    if (entry.post.post.post_id !== postId) {
      return entry;
    }

    const nextPost = applyPostVote(entry.post, nextValue);
    if (nextPost === entry.post) {
      return entry;
    }

    didUpdate = true;
    return {
      ...entry,
      post: nextPost,
    };
  });

  return didUpdate ? nextEntries : entries;
}

export function updateCommunityPostVote(
  posts: ApiPost[],
  postId: string,
  nextValue: PostVoteValue | null,
): ApiPost[] {
  let didUpdate = false;

  const nextPosts = posts.map((postResponse) => {
    if (postResponse.post.post_id !== postId) {
      return postResponse;
    }

    const nextPost = applyPostVote(postResponse, nextValue);
    if (nextPost === postResponse) {
      return postResponse;
    }

    didUpdate = true;
    return nextPost;
  });

  return didUpdate ? nextPosts : posts;
}

export async function submitOptimisticPostVote({
  direction,
  onApply,
  onRollback,
  postId,
  previousPost,
  requestIdsRef,
  vote,
}: {
  postId: string;
  direction: "up" | "down" | null;
  previousPost: ApiPost | null;
  requestIdsRef: React.MutableRefObject<Record<string, number>>;
  vote: (postId: string, value: PostVoteValue) => Promise<{ value: PostVoteValue }>;
  onApply: (nextValue: PostVoteValue) => void;
  onRollback: (previousPost: ApiPost) => void;
}) {
  if (!direction || !previousPost) {
    return;
  }

  const nextValue = toPostVoteValue(direction);
  const requestId = (requestIdsRef.current[postId] ?? 0) + 1;
  requestIdsRef.current[postId] = requestId;

  onApply(nextValue);

  try {
    const response = await vote(postId, nextValue);
    if (requestIdsRef.current[postId] !== requestId) {
      return;
    }

    onApply(response.value);
  } catch (nextError) {
    if (requestIdsRef.current[postId] !== requestId) {
      return;
    }

    onRollback(previousPost);
    toast.error(getErrorMessage(nextError, "Could not update this vote."));
  }
}
