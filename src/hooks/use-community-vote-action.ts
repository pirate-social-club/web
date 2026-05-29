"use client";

import * as React from "react";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import {
  submitOptimisticPostVote,
  toPostVoteValue,
  updateCommunityPostVote,
  type PostVoteOptions,
  type PostVoteValue,
} from "@/app/authenticated-helpers/post-vote";
import type {
  CommunityGateData,
  InteractionResult,
  RunGatedCommunityActionParams,
} from "@/hooks/use-community-interaction-gate.helpers";

type VoteDirection = "up" | "down" | null;

type RunGatedCommunityAction = (
  params: RunGatedCommunityActionParams,
) => Promise<InteractionResult>;

type VotePost = (
  postId: string,
  value: PostVoteValue,
  options?: PostVoteOptions,
) => Promise<{ value: PostVoteValue }>;

export interface UseCommunityVoteActionOptions {
  buildBlockedModalState?: RunGatedCommunityActionParams["buildBlockedModalState"];
  communityId?: string | null;
  gateData?: CommunityGateData | null;
  posts: ApiPost[];
  runGatedCommunityAction: RunGatedCommunityAction;
  setPosts: React.Dispatch<React.SetStateAction<ApiPost[]>>;
  vote: VotePost;
}

export function useCommunityVoteAction({
  buildBlockedModalState,
  communityId,
  gateData,
  posts,
  runGatedCommunityAction,
  setPosts,
  vote,
}: UseCommunityVoteActionOptions) {
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});

  return React.useCallback(
    async (postId: string, direction: VoteDirection) => {
      if (gateData === null) {
        return;
      }

      const previousPost = posts.find((candidate) => candidate.post.id === postId);
      if (!previousPost) {
        return;
      }
      if (!direction) {
        return;
      }

      const resolvedCommunityId = communityId ?? previousPost.post.community;
      if (!resolvedCommunityId) {
        return;
      }

      const voteValue = toPostVoteValue(direction);
      await runGatedCommunityAction({
        action: "vote_post",
        buildBlockedModalState,
        communityId: resolvedCommunityId,
        ...(gateData ? { gateData } : {}),
        onAllowed: async (context) => {
          await submitOptimisticPostVote({
            altchaPayload: context?.altchaPayload,
            direction,
            onApply: (nextValue) =>
              setPosts((current) =>
                updateCommunityPostVote(current, postId, nextValue),
              ),
            onRollback: (restoredPost) =>
              setPosts((current) =>
                current.map((post) =>
                  post.post.id === postId ? restoredPost : post
                ),
              ),
            postId,
            previousPost,
            requestIdsRef: voteRequestIdsRef,
            vote,
          });
        },
        postId,
        voteValue,
      });
    },
    [
      buildBlockedModalState,
      communityId,
      gateData,
      posts,
      runGatedCommunityAction,
      setPosts,
      vote,
    ],
  );
}
