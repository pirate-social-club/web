"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { findStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { toast } from "@/components/primitives/sonner";
import type { PostThreadSubmitResult } from "@/components/compositions/posts/post-thread/post-thread.types";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { applyPostVote, submitOptimisticPostVote } from "@/app/authenticated-helpers/post-vote";
import { useCommunityInteractionGate } from "@/app/authenticated-helpers/community-interaction-gate";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildThreadCommentTreeFromItems,
  collectCommentAuthorUserIds,
  collectThreadCommentAuthorUserIds,
  findThreadCommentNode,
  loadThreadCommentTree,
  logReplyLoadFailure,
  mapThreadCommentNode,
  mergeThreadCommentNodes,
  THREAD_COMMENT_PAGE_LIMIT,
  type ThreadCommentNode,
  updateThreadCommentNode,
} from "./thread-state";

type AvailableSigningAgent = {
  agentId: string;
  displayName: string;
  privateKeyPem: string;
};

type PostReadMode = "authenticated" | "public";

async function resolveAvailableSigningAgent(agents: ApiUserAgent[]): Promise<AvailableSigningAgent | null> {
  for (const agent of agents) {
    if (agent.status !== "active" || !agent.current_ownership) {
      continue;
    }
    let storedKey = null;
    try {
      storedKey = await findStoredOwnedAgentKey(agent.agent_id);
    } catch (error) {
      logger.warn("[post-route] could not read local agent key", { agentId: agent.agent_id, error });
      continue;
    }
    if (!storedKey) {
      continue;
    }
    return {
      agentId: agent.agent_id,
      displayName: agent.display_name,
      privateKeyPem: storedKey.privateKeyPem,
    };
  }

  return null;
}

export function usePost(
  postId: string,
  locale: string,
  hasSession: boolean,
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
  const { locale: uiLocale } = useUiLocale();
  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [community, setCommunity] = React.useState<ApiCommunityPreview | null>(null);
  const [communityOwnerUserId, setCommunityOwnerUserId] = React.useState<string | null>(null);
  const [authorProfile, setAuthorProfile] = React.useState<ApiProfile | null>(null);
  const [availableAgent, setAvailableAgent] = React.useState<AvailableSigningAgent | null>(null);
  const [commentNodes, setCommentNodes] = React.useState<ThreadCommentNode[]>([]);
  const [authorProfilesByUserId, setAuthorProfilesByUserId] = React.useState<Record<string, ApiProfile | null>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [readMode, setReadMode] = React.useState<PostReadMode>(hasSession ? "authenticated" : "public");
  const [commentSort, setCommentSort] = React.useState<"best" | "new" | "top">("best");
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const loadedCommentSortKeyRef = React.useRef<string | null>(null);
  const { gateModal, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: locale,
    routeKind: "post",
    uiLocale,
  });

  const loadTopLevelComments = React.useCallback(async (
    communityId: string,
    nextReadMode: PostReadMode,
    sort: "best" | "new" | "top",
  ) => {
    const nextCommentNodes = await loadThreadCommentTree(api, communityId, postId, locale, nextReadMode === "authenticated", sort);
    const nextAuthorProfilesByUserId = await loadProfilesByUserId(
      api,
      collectThreadCommentAuthorUserIds(nextCommentNodes),
      session?.profile ? { [session.user.user_id]: session.profile } : {},
    );

    return { authorProfilesByUserId: nextAuthorProfilesByUserId, commentNodes: nextCommentNodes };
  }, [api, locale, postId, session]);

  const refreshTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextThreadState = await loadTopLevelComments(communityId, readMode, commentSort);
    setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
    setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
  }, [commentSort, loadTopLevelComments, readMode]);

  const signAgentAuthoredCommentBody = React.useCallback(async (path: string, body: { body: string }) => {
    if (!availableAgent) {
      throw new Error("No local agent key is available for this reply.");
    }

    const proof = await buildAgentActionProof({
      method: "POST",
      url: path,
      body,
      privateKeyPem: availableAgent.privateKeyPem,
    });

    return {
      ...body,
      authorship_mode: "user_agent" as const,
      agent_id: availableAgent.agentId,
      agent_action_proof: proof,
    };
  }, [availableAgent]);

  const loadRepliesForComment = React.useCallback(async (commentId: string) => {
    const currentNode = findThreadCommentNode(commentNodes, commentId);
    if (!currentNode || currentNode.loadingReplies || (currentNode.hasLoadedReplies && !currentNode.nextRepliesCursor)) return;

    logger.debug("[post-thread] load replies start", {
      commentId,
      cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null,
      loadedChildren: currentNode.children.length,
      replyCount: currentNode.item.comment.direct_reply_count,
    });
    setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({ ...node, loadingReplies: true })));

    try {
      const repliesPage = readMode === "authenticated"
        ? await api.comments.listReplies(commentId, { cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: commentSort })
        : await api.publicComments.listReplies(commentId, { cursor: currentNode.hasLoadedReplies ? currentNode.nextRepliesCursor : null, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: commentSort });
      const nextProfiles = await loadProfilesByUserId(api, collectCommentAuthorUserIds(repliesPage.items), session?.profile ? { [session.user.user_id]: session.profile } : {});
      logger.debug("[post-thread] load replies complete", {
        commentId,
        nextCursor: repliesPage.next_cursor,
        receivedCount: repliesPage.items.length,
      });
      setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => {
        const nextChildrenById = new Map(node.children.map((child) => [child.item.comment.comment_id, child] as const));
        for (const child of buildThreadCommentTreeFromItems(repliesPage.items)) {
          nextChildrenById.set(child.item.comment.comment_id, child);
        }

        return {
          ...node,
          children: [...nextChildrenById.values()],
          hasLoadedReplies: true,
          loadingReplies: false,
          nextRepliesCursor: repliesPage.next_cursor,
        };
      }));
    } catch (nextError) {
      logReplyLoadFailure(commentId, nextError);
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({ ...node, loadingReplies: false })));
      toast.error(getErrorMessage(nextError, "Could not load replies."));
    }
  }, [api, commentSort, readMode, commentNodes, locale, session]);

  const createTopLevelComment = React.useCallback(async (input: { body: string; authorMode: "human" | "agent" }): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const result = await runGatedCommunityAction({
      action: "reply_post",
      communityId: post.post.community_id,
      onAllowed: async () => {
        try {
          const commentBody = { body: input.body };
          await api.communities.createComment(
            post.post.community_id,
            post.post.post_id,
            input.authorMode === "agent"
              ? await signAgentAuthoredCommentBody(
                `/communities/${post.post.community_id}/posts/${post.post.post_id}/comments`,
                commentBody,
              )
              : commentBody,
          );
          await refreshTopLevelComments(post.post.community_id);
        } catch (nextError) {
          toast.error(getErrorMessage(nextError, "Could not post this reply."));
          throw nextError;
        }
      },
      postId: post.post.post_id,
    });
    return result === "allowed" ? "submitted" : "blocked";
  }, [api, post, refreshTopLevelComments, runGatedCommunityAction, signAgentAuthoredCommentBody]);

  const createReply = React.useCallback(async (commentId: string, input: { body: string; authorMode: "human" | "agent" }): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const result = await runGatedCommunityAction({
      action: "reply_comment",
      communityId: post.post.community_id,
      onAllowed: async () => {
        try {
          const commentBody = { body: input.body };
          await api.comments.createReply(
            commentId,
            input.authorMode === "agent"
              ? await signAgentAuthoredCommentBody(`/comments/${commentId}/replies`, commentBody)
              : commentBody,
          );
          const context = await api.comments.getContext(commentId, { limit: THREAD_COMMENT_PAGE_LIMIT, locale });
          const nextProfiles = await loadProfilesByUserId(api, [
            ...collectCommentAuthorUserIds([context.comment]),
            ...collectCommentAuthorUserIds(context.replies),
          ], session?.profile ? { [session.user.user_id]: session.profile } : {});

          setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
          setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
            ...node,
            item: context.comment,
            children: buildThreadCommentTreeFromItems(context.replies),
            hasLoadedReplies: true,
            loadingReplies: false,
            nextRepliesCursor: context.next_replies_cursor,
          })));
        } catch (nextError) {
          toast.error(getErrorMessage(nextError, "Could not post this reply."));
          throw nextError;
        }
      },
      postId: post.post.post_id,
    });
    return result === "allowed" ? "submitted" : "blocked";
  }, [api, locale, post, runGatedCommunityAction, session, signAgentAuthoredCommentBody]);

  const voteOnComment = React.useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!post) return;
    await runGatedCommunityAction({
      action: "vote_comment",
      communityId: post.post.community_id,
      onAllowed: async () => {
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
      },
      postId: post.post.post_id,
    });
  }, [api, commentNodes, post, runGatedCommunityAction]);

  const voteOnPost = React.useCallback(async (direction: "up" | "down" | null) => {
    if (!post) return;
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: post.post.community_id,
      onAllowed: async () => {
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
      },
      postId: post.post.post_id,
    });
  }, [api.posts.vote, post, runGatedCommunityAction]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCommentNodes([]);
    setAuthorProfilesByUserId({});
    setCommunityOwnerUserId(null);
    setReadMode(hasSession ? "authenticated" : "public");

    const loadPost = async (): Promise<{ post: ApiPost; readMode: PostReadMode }> => {
      if (!hasSession) {
        return {
          post: await api.publicPosts.get(postId, { locale }),
          readMode: "public",
        };
      }

      try {
        return {
          post: await api.posts.get(postId, { locale }),
          readMode: "authenticated",
        };
      } catch (nextError) {
        if (!isApiNotFoundError(nextError)) {
          throw nextError;
        }

        logger.info("[post-route] falling back to public read", { postId });
        return {
          post: await api.publicPosts.get(postId, { locale }),
          readMode: "public",
        };
      }
    };

    void loadPost()
      .then(async ({ post: p, readMode: nextReadMode }) => {
        const [communityResult, commentTree, ownedAgentsResult] = await Promise.all([
          (hasSession
            ? api.communities.preview(p.post.community_id, { locale })
            : api.publicCommunities.get(p.post.community_id, { locale })).catch(() => null),
          loadTopLevelComments(p.post.community_id, nextReadMode, commentSort),
          hasSession ? api.agents.list().catch(() => null) : Promise.resolve(null),
        ]);
        const ownerCommunityResult = hasSession && communityResult && !communityResult.moderator
          ? await api.communities.get(p.post.community_id, { locale }).catch((): ApiCommunity | null => null)
          : null;
        const authorProfilesByUserId = await loadProfilesByUserId(
          api,
          [...(p.post.identity_mode === "public" && p.post.author_user_id ? [p.post.author_user_id] : [])],
          session?.profile ? { [session.user.user_id]: session.profile } : {},
        );
        if (cancelled) return;
        setPost(p);
        setCommunity(communityResult);
        setCommunityOwnerUserId(ownerCommunityResult?.created_by_user_id ?? null);
        setReadMode(nextReadMode);
        setAvailableAgent(ownedAgentsResult ? await resolveAvailableSigningAgent(ownedAgentsResult.items) : null);
        if (p.post.identity_mode === "public" && p.post.author_user_id && !authorProfilesByUserId[p.post.author_user_id]) {
          logger.warn("[post-route] author handle fallback", {
            postId: p.post.post_id,
            readMode: nextReadMode,
            userId: p.post.author_user_id,
          });
        }
        setAuthorProfile(p.post.identity_mode === "public" && p.post.author_user_id ? authorProfilesByUserId[p.post.author_user_id] ?? null : null);
        setCommentNodes(commentTree.commentNodes);
        setAuthorProfilesByUserId({ ...commentTree.authorProfilesByUserId, ...authorProfilesByUserId });
        loadedCommentSortKeyRef.current = `${p.post.community_id}:${nextReadMode}:${commentSort}`;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, hasSession, loadTopLevelComments, locale, postId, session]);

  React.useEffect(() => {
    if (!post || !community || loading) return;

    const sortKey = `${community.community_id}:${readMode}:${commentSort}`;
    if (loadedCommentSortKeyRef.current === sortKey) return;

    let cancelled = false;
    void loadTopLevelComments(community.community_id, readMode, commentSort)
      .then((nextThreadState) => {
        if (cancelled) return;
        setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
        setCommentNodes(nextThreadState.commentNodes);
        loadedCommentSortKeyRef.current = sortKey;
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        toast.error(getErrorMessage(nextError, "Could not sort comments."));
      });

    return () => { cancelled = true; };
  }, [commentSort, community, loadTopLevelComments, loading, post, readMode]);

  const comments = React.useMemo(() => commentNodes.map((node) => mapThreadCommentNode(
    node,
    authorProfilesByUserId,
    labels,
    loadRepliesForComment,
    createReply,
    voteOnComment,
  )), [authorProfilesByUserId, commentNodes, createReply, labels, loadRepliesForComment, voteOnComment]);

  React.useEffect(() => {
    if (!community) return;
    rememberKnownCommunity({ avatarSrc: community.avatar_ref ?? undefined, communityId: community.community_id, displayName: community.display_name });
  }, [community]);

  return {
    post,
    community,
    communityOwnerUserId,
    authorProfile,
    comments,
    availableAgent,
    createTopLevelComment,
    error,
    gateModal,
    loading,
    voteOnPost,
    commentSort,
    setCommentSort,
  };
}
