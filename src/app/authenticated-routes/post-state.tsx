"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { toast } from "@/components/primitives/sonner";

import { loadProfilesByUserId } from "./community-data";
import { applyPostVote, submitOptimisticPostVote } from "./post-vote";
import { getErrorMessage } from "./route-core";
import {
  collectCommentAuthorUserIds,
  collectThreadCommentAuthorUserIds,
  createThreadCommentNode,
  findThreadCommentNode,
  loadThreadCommentTree,
  logReplyLoadFailure,
  mapThreadCommentNode,
  mergeThreadCommentNodes,
  THREAD_COMMENT_PAGE_LIMIT,
  type ThreadCommentNode,
  updateThreadCommentNode,
} from "./thread-state";

export function usePost(
  postId: string,
  locale: string,
  canMutate: boolean,
  labels: {
    cancelReplyLabel: string;
    loadMoreRepliesLabel: string;
    loadRepliesLabel: string;
    loadingRepliesLabel: string;
    replyActionLabel: string;
    replyPlaceholder: string;
    showOriginalLabel: string;
    submitReplyLabel: string;
    showTranslationLabel: string;
  },
) {
  const api = useApi();
  const session = useSession();
  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [authorProfile, setAuthorProfile] = React.useState<ApiProfile | null>(null);
  const [commentNodes, setCommentNodes] = React.useState<ThreadCommentNode[]>([]);
  const [authorProfilesByUserId, setAuthorProfilesByUserId] = React.useState<Record<string, ApiProfile | null>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});

  const loadTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextCommentNodes = await loadThreadCommentTree(api, communityId, postId, locale, canMutate);
    const nextAuthorProfilesByUserId = await loadProfilesByUserId(
      api,
      collectThreadCommentAuthorUserIds(nextCommentNodes),
      session?.profile ? { [session.user.user_id]: session.profile } : {},
    );

    return { authorProfilesByUserId: nextAuthorProfilesByUserId, commentNodes: nextCommentNodes };
  }, [api, canMutate, locale, postId, session]);

  const refreshTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextThreadState = await loadTopLevelComments(communityId);
    setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
    setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
  }, [loadTopLevelComments]);

  const loadRepliesForComment = React.useCallback(async (commentId: string) => {
    const currentNode = findThreadCommentNode(commentNodes, commentId);
    if (!currentNode || currentNode.loadingReplies || (currentNode.hasLoadedReplies && !currentNode.nextRepliesCursor)) return;

    setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({ ...node, loadingReplies: true })));

    try {
      const repliesPage = canMutate
        ? await api.comments.listReplies(commentId, { cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: "best" })
        : await api.publicComments.listReplies(commentId, { cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: "best" });
      const nextProfiles = await loadProfilesByUserId(api, collectCommentAuthorUserIds(repliesPage.items), session?.profile ? { [session.user.user_id]: session.profile } : {});
      setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        children: [...node.children, ...repliesPage.items.map((item) => createThreadCommentNode(item))],
        hasLoadedReplies: true,
        loadingReplies: false,
        nextRepliesCursor: repliesPage.next_cursor,
      })));
    } catch (nextError) {
      logReplyLoadFailure(commentId, nextError);
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({ ...node, loadingReplies: false })));
      toast.error(getErrorMessage(nextError, "Could not load replies."));
    }
  }, [api, canMutate, commentNodes, locale, session]);

  const createTopLevelComment = React.useCallback(async (body: string) => {
    if (!canMutate || !post) return;
    try {
      await api.communities.createComment(post.post.community_id, post.post.post_id, { body });
      await refreshTopLevelComments(post.post.community_id);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not post this reply."));
      throw nextError;
    }
  }, [api, canMutate, post, refreshTopLevelComments]);

  const createReply = React.useCallback(async (commentId: string, body: string) => {
    if (!canMutate) return;
    try {
      await api.comments.createReply(commentId, { body });
      const context = await api.comments.getContext(commentId, { limit: THREAD_COMMENT_PAGE_LIMIT, locale });
      const nextProfiles = await loadProfilesByUserId(api, [
        ...collectCommentAuthorUserIds([context.comment]),
        ...collectCommentAuthorUserIds(context.replies),
      ], session?.profile ? { [session.user.user_id]: session.profile } : {});

      setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: context.comment,
        children: context.replies.map((item) => createThreadCommentNode(item)),
        hasLoadedReplies: true,
        loadingReplies: false,
        nextRepliesCursor: context.next_replies_cursor,
      })));
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not post this reply."));
      throw nextError;
    }
  }, [api, canMutate, locale, session]);

  const voteOnComment = React.useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!canMutate) return;
    const nextValue = direction === "up" ? 1 : -1;
    const currentNode = findThreadCommentNode(commentNodes, commentId);
    const previousVote = currentNode?.item.viewer_vote ?? null;
    const previousScore = currentNode?.item.comment.score ?? 0;

    setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
      ...node,
      item: {
        ...node.item,
        comment: { ...node.item.comment, score: node.item.comment.score + (nextValue - (node.item.viewer_vote ?? 0)) },
        viewer_vote: nextValue,
      },
    })));

    try {
      const response = await api.comments.vote(commentId, nextValue);
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({ ...node, item: { ...node.item, viewer_vote: response.value } })));
    } catch (nextError) {
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: { ...node.item, comment: { ...node.item.comment, score: previousScore }, viewer_vote: previousVote },
      })));
      toast.error(getErrorMessage(nextError, "Could not update this vote."));
    }
  }, [api, canMutate, commentNodes]);

  const voteOnPost = React.useCallback(async (direction: "up" | "down" | null) => {
    if (!canMutate || !post) return;
    const nextPostId = post.post.post_id;
    await submitOptimisticPostVote({
      direction,
      onApply: (nextValue) => setPost((current) => current ? applyPostVote(current, nextValue) : current),
      onRollback: (restoredPost) => setPost(restoredPost),
      postId: nextPostId,
      previousPost: post,
      requestIdsRef: voteRequestIdsRef,
      vote: api.posts.vote,
    });
  }, [api.posts, canMutate, post]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCommentNodes([]);
    setAuthorProfilesByUserId({});

    const postRequest = canMutate ? api.posts.get(postId, { locale }) : api.publicPosts.get(postId, { locale });
    void postRequest
      .then(async (p) => {
        const [communityResult, commentTree] = await Promise.all([
          (canMutate ? api.communities.get(p.post.community_id) : Promise.resolve(null)).catch(() => null),
          loadTopLevelComments(p.post.community_id),
        ]);
        const authorProfilesByUserId = await loadProfilesByUserId(
          api,
          [...(p.post.identity_mode === "public" && p.post.author_user_id ? [p.post.author_user_id] : [])],
          session?.profile ? { [session.user.user_id]: session.profile } : {},
        );
        if (cancelled) return;
        setPost(p);
        setCommunity(communityResult);
        setAuthorProfile(p.post.identity_mode === "public" && p.post.author_user_id ? authorProfilesByUserId[p.post.author_user_id] ?? null : null);
        setCommentNodes(commentTree.commentNodes);
        setAuthorProfilesByUserId({ ...commentTree.authorProfilesByUserId, ...authorProfilesByUserId });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, canMutate, loadTopLevelComments, locale, postId, session]);

  const comments = React.useMemo(() => commentNodes.map((node) => mapThreadCommentNode(
    node,
    authorProfilesByUserId,
    labels,
    loadRepliesForComment,
    canMutate ? createReply : undefined,
    canMutate ? voteOnComment : undefined,
  )), [authorProfilesByUserId, canMutate, commentNodes, createReply, labels, loadRepliesForComment, voteOnComment]);

  React.useEffect(() => {
    if (!community) return;
    rememberKnownCommunity({ avatarSrc: community.avatar_ref ?? undefined, communityId: community.community_id, displayName: community.display_name });
  }, [community]);

  return {
    post,
    community,
    authorProfile,
    comments,
    createTopLevelComment: canMutate ? createTopLevelComment : undefined,
    error,
    loading,
    voteOnPost: canMutate ? voteOnPost : undefined,
  };
}
