"use client";

import * as React from "react";
import type { HomeFeedItem } from "@pirate/api-contracts";
import type { QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/primitives/sonner";
import type { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import type { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { selectPostVoteGateData } from "@/hooks/use-community-interaction-gate.helpers";
import { submitOptimisticPostVote, toPostVoteValue, updateHomeFeedEntryPostVote } from "@/app/authenticated-helpers/post-vote";

type FeedEntriesUpdate = React.SetStateAction<HomeFeedItem[]>;
type VoteGateData = NonNullable<ReturnType<typeof selectPostVoteGateData>>;

export function useHomeFeedPostActions({
  api,
  contentLocale,
  feedEntries,
  queryClient,
  runGatedCommunityAction,
  setFeedEntries,
  voteGateDataByPostId,
}: {
  api: ReturnType<typeof useApi>;
  contentLocale: string;
  feedEntries: HomeFeedItem[];
  queryClient: QueryClient;
  runGatedCommunityAction: ReturnType<typeof useCommunityInteractionGate>["runGatedCommunityAction"];
  setFeedEntries: (update: FeedEntriesUpdate) => void;
  voteGateDataByPostId: Map<string, VoteGateData>;
}) {
  const feedEntriesRef = React.useRef(feedEntries);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const voteGateDataByPostIdRef = React.useRef(voteGateDataByPostId);
  feedEntriesRef.current = feedEntries;
  voteGateDataByPostIdRef.current = voteGateDataByPostId;

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    const entry = feedEntriesRef.current.find((candidate) => candidate.post.post.id === postId);
    if (!entry) return;
    const voteValue = direction ? toPostVoteValue(direction) : "clear";
    const voteGateData = voteGateDataByPostIdRef.current.get(postId) ?? null;
    try {
      await runGatedCommunityAction({
        action: "vote_post",
        communityId: voteGateData?.preview.id ?? entry.community.id,
        ...(voteGateData ? { gateData: voteGateData } : {}),
        onAllowed: async (context) => {
          const previousPost = entry.post;
          await submitOptimisticPostVote({
            altchaPayload: context?.altchaPayload,
            clearVote: api.posts.clearVote,
            direction,
            locale: contentLocale,
            onApply: (nextValue) => setFeedEntries((current) => updateHomeFeedEntryPostVote(current, postId, nextValue)),
            onRollback: (restoredPost) => setFeedEntries((current) => current.map((currentEntry) => currentEntry.post.post.id === postId ? { ...currentEntry, post: restoredPost } : currentEntry)),
            postId,
            previousPost: previousPost ?? null,
            queryClient,
            requestIdsRef: voteRequestIdsRef,
            vote: api.posts.vote,
          });
        },
        postId,
        voteValue,
      });
    } catch {
      // The optimistic submitter already rolled back and displayed the error.
    }
  }, [api.posts.clearVote, api.posts.vote, contentLocale, queryClient, runGatedCommunityAction, setFeedEntries]);

  const deletePost = React.useCallback(async (postId: string) => {
    const entry = feedEntriesRef.current.find((candidate) => candidate.post.post.id === postId);
    if (!entry) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;
    const previousEntries = feedEntriesRef.current;
    setFeedEntries((current) => current.filter((candidate) => candidate.post.post.id !== postId));
    try {
      await api.posts.delete(entry.post.post.community, postId);
    } catch (nextError) {
      setFeedEntries(previousEntries);
      toast.error(getErrorMessage(nextError, "Could not delete this post."));
    }
  }, [api.posts, setFeedEntries]);

  const cancelEvent = React.useCallback(async (postId: string) => {
    const entry = feedEntriesRef.current.find((candidate) => candidate.post.post.id === postId);
    if (!entry) return;
    if (typeof window !== "undefined" && !window.confirm("Cancel this event?")) return;
    const previousEntries = feedEntriesRef.current;
    try {
      const updated = await api.posts.cancelEvent(entry.post.post.community, postId);
      setFeedEntries((current) => current.map((candidate) => (
        candidate.post.post.id === postId ? { ...candidate, post: updated } : candidate
      )));
    } catch (nextError) {
      setFeedEntries(previousEntries);
      toast.error(getErrorMessage(nextError, "Could not cancel this event."));
    }
  }, [api.posts, setFeedEntries]);

  return { cancelEvent, deletePost, voteOnPost };
}
