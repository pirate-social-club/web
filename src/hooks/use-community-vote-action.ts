"use client";

import * as React from "react";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import { useQueryClient } from "@tanstack/react-query";

import {
  submitOptimisticPostVote,
  toPostVoteValue,
  updateCommunityPostVote,
  type PostVoteOptions,
  type PostVoteValue,
  type ClearPostVote,
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
  locale: string;
  posts: ApiPost[];
  runGatedCommunityAction: RunGatedCommunityAction;
  setPosts: React.Dispatch<React.SetStateAction<ApiPost[]>>;
  vote: VotePost;
  clearVote: ClearPostVote;
}

export function useCommunityVoteAction({
  buildBlockedModalState,
  clearVote,
  communityId,
  gateData,
  locale,
  posts,
  runGatedCommunityAction,
  setPosts,
  vote,
}: UseCommunityVoteActionOptions) {
  const queryClient = useQueryClient();
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
      const resolvedCommunityId = communityId ?? previousPost.post.community;
      if (!resolvedCommunityId) {
        return;
      }

      const voteValue = direction ? toPostVoteValue(direction) : "clear";
      try {
        await runGatedCommunityAction({
          action: "vote_post",
          buildBlockedModalState,
          communityId: resolvedCommunityId,
          ...(gateData ? { gateData } : {}),
          onAllowed: async (context) => {
            await submitOptimisticPostVote({
              altchaPayload: context?.altchaPayload,
              clearVote,
              direction,
              locale,
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
              queryClient,
              requestIdsRef: voteRequestIdsRef,
              vote,
            });
          },
          postId,
          voteValue,
        });
      } catch {
        // The submitter owns rollback and error display; the gate only needs
        // the rejection long enough to invalidate contradictory membership.
      }
    },
    [
      buildBlockedModalState,
      clearVote,
      communityId,
      gateData,
      locale,
      posts,
      queryClient,
      runGatedCommunityAction,
      setPosts,
      vote,
    ],
  );
}
