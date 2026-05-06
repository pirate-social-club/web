"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Comment as ApiComment, CommunityPreview as ApiCommunityPreview, CreateCommentRequest, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { ApiError, isApiNotFoundError } from "@/lib/api/client";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { findStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { postKeys } from "@/lib/query/keys";
import type { PublicThreadQueryData } from "@/lib/query/public-thread-cache";
import { toast } from "@/components/primitives/sonner";
import type { PostThreadReplyInput, PostThreadSubmitResult } from "@/components/compositions/posts/post-thread/post-thread.types";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { applyPostVote, submitOptimisticPostVote } from "@/app/authenticated-helpers/post-vote";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildThreadCommentTreeFromItems,
  collectCommentAuthorUserIds,
  collectThreadCommentAuthorUserIds,
  countThreadComments,
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

type MaybeLegacyPostResponse = ApiPost & {
  post: ApiPost["post"] & {
    post_id?: string | null;
    community_id?: string | null;
  };
};

function publicPostId(rawPostId: string): string {
  return rawPostId.startsWith("post_") ? rawPostId : `post_${rawPostId}`;
}

function publicCommunityId(rawCommunityId: string): string {
  return rawCommunityId.startsWith("com_") ? rawCommunityId : `com_${rawCommunityId}`;
}

function normalizePostResponse(response: ApiPost): ApiPost {
  const legacy = response as MaybeLegacyPostResponse;
  const postId = typeof legacy.post.id === "string" && legacy.post.id
    ? legacy.post.id
    : typeof legacy.post.post_id === "string" && legacy.post.post_id
      ? publicPostId(legacy.post.post_id)
      : null;
  const communityId = typeof legacy.post.community === "string" && legacy.post.community
    ? legacy.post.community
    : typeof legacy.post.community_id === "string" && legacy.post.community_id
      ? publicCommunityId(legacy.post.community_id)
      : null;

  if (!postId || !communityId) {
    throw new Error("Post response is missing its post or community identifier.");
  }

  if (postId === legacy.post.id && communityId === legacy.post.community) {
    return response;
  }

  return {
    ...response,
    post: {
      ...response.post,
      id: postId,
      community: communityId,
    },
  };
}

function toDeletedPostStub(response: ApiPost): ApiPost {
  return {
    ...response,
    post: {
      ...response.post,
      author_user: null,
      agent: null,
      agent_ownership_record: null,
      identity_mode: "public",
      anonymous_scope: null,
      anonymous_label: null,
      agent_handle_snapshot: null,
      agent_display_name_snapshot: null,
      agent_owner_handle_snapshot: null,
      agent_ownership_provider_snapshot: null,
      disclosed_qualifiers_json: null,
      label: null,
      post_type: "text",
      status: "deleted",
      title: null,
      body: null,
      caption: null,
      link_url: null,
      link_og_image_url: null,
      link_og_title: null,
      link_enrichment: null,
      embeds: null,
      media_refs: [],
      creator_relation: null,
      promotion_disclosure: null,
      source_language: null,
      translation_policy: "none",
      access_mode: null,
      asset: null,
      song_artifact_bundle: null,
      parent_post: null,
      song_mode: null,
      rights_basis: null,
      upstream_asset_refs: null,
      analysis_result_ref: null,
      content_safety_state: "safe",
      age_gate_policy: "none",
    },
    author_community_role: null,
    market_context: null,
    label: null,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    viewer_vote: null,
    viewer_reaction_kinds: [],
    age_gate_viewer_state: null,
    translation_state: "same_language",
    machine_translated: false,
    translated_body: null,
    translated_title: null,
    translated_caption: null,
    translated_embeds: null,
    source_hash: "",
  };
}

function toRemovedPostStub(response: ApiPost): ApiPost {
  return {
    ...response,
    post: {
      ...response.post,
      status: "removed",
    },
  };
}

async function resolveAvailableSigningAgent(agents: ApiUserAgent[]): Promise<AvailableSigningAgent | null> {
  for (const agent of agents) {
    if (agent.status !== "active" || !agent.current_ownership) {
      continue;
    }
    let storedKey = null;
    try {
      storedKey = await findStoredOwnedAgentKey(agent.id);
    } catch (error) {
      logger.warn("[post-route] could not read local agent key", { agentId: agent.id, error });
      continue;
    }
    if (!storedKey) {
      continue;
    }
    return {
      agentId: agent.id,
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
  const queryClient = useQueryClient();
  const session = useSession();
  const { locale: uiLocale } = useUiLocale();
  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [community, setCommunity] = React.useState<ApiCommunityPreview | null>(null);
  const [authorProfile, setAuthorProfile] = React.useState<ApiProfile | null>(null);
  const [availableAgent, setAvailableAgent] = React.useState<AvailableSigningAgent | null>(null);
  const [commentNodes, setCommentNodes] = React.useState<ThreadCommentNode[]>([]);
  const [authorProfilesByUserId, setAuthorProfilesByUserId] = React.useState<Record<string, ApiProfile | null>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [threadPartial, setThreadPartial] = React.useState(false);
  const [readMode, setReadMode] = React.useState<PostReadMode>(hasSession ? "authenticated" : "public");
  const [commentSort, setCommentSort] = React.useState<"best" | "new" | "top">("best");
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const loadedCommentSortKeyRef = React.useRef<string | null>(null);
  const { gateModal, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: locale,
    routeKind: "post",
    uiLocale,
  });

  const publicThreadQuery = useQuery({
    queryKey: postKeys.publicThread({ postId, locale, sort: commentSort }),
    queryFn: async (): Promise<PublicThreadQueryData> => {
      const publicThread = await api.publicPosts.getThread(postId, {
        limit: THREAD_COMMENT_PAGE_LIMIT,
        locale,
        sort: commentSort,
      });
      const nextCommentNodes = buildThreadCommentTreeFromItems(publicThread.comments.items);
      const nextAuthorProfilesByUserId = await loadProfilesByUserId(
        api,
        [
          ...(publicThread.post.post.identity_mode === "public" && publicThread.post.post.author_user ? [publicThread.post.post.author_user] : []),
          ...collectThreadCommentAuthorUserIds(nextCommentNodes),
        ],
        session?.profile ? { [session.user.id]: session.profile } : {},
      );
      return {
        post: normalizePostResponse(publicThread.post),
        community: publicThread.community,
        comments: nextCommentNodes,
        authorProfiles: nextAuthorProfilesByUserId,
        partial: false,
        source: "thread_api",
      };
    },
    enabled: !hasSession,
  });

  const applyPublicThreadQueryData = React.useCallback((data: PublicThreadQueryData, sort: "best" | "new" | "top") => {
    const nextPost = normalizePostResponse(data.post);
    setPost(nextPost);
    setCommunity(data.community);
    setCommentNodes(data.comments);
    setAuthorProfilesByUserId((current) => ({ ...current, ...data.authorProfiles }));
    setAuthorProfile(
      nextPost.post.identity_mode === "public" && nextPost.post.author_user
        ? data.authorProfiles[nextPost.post.author_user] ?? null
        : null,
    );
    setReadMode("public");
    setThreadPartial(data.partial);
    setLoading(false);
    setError(null);
    if (!data.partial) {
      loadedCommentSortKeyRef.current = `${nextPost.post.community}:public:${sort}`;
    }
  }, []);

  const loadTopLevelComments = React.useCallback(async (
    communityId: string,
    nextReadMode: PostReadMode,
    sort: "best" | "new" | "top",
  ) => {
    const nextCommentNodes = await loadThreadCommentTree(api, communityId, postId, locale, nextReadMode === "authenticated", sort);
    const nextAuthorProfilesByUserId = await loadProfilesByUserId(
      api,
      collectThreadCommentAuthorUserIds(nextCommentNodes),
      session?.profile ? { [session.user.id]: session.profile } : {},
    );

    return { authorProfilesByUserId: nextAuthorProfilesByUserId, commentNodes: nextCommentNodes };
  }, [api, locale, postId, session]);

  const refreshTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextThreadState = await loadTopLevelComments(communityId, readMode, commentSort);
    setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
    setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
  }, [commentSort, loadTopLevelComments, readMode]);

  const buildCommentRequestBody = React.useCallback(async (input: PostThreadReplyInput): Promise<CreateCommentRequest> => {
    const body: CreateCommentRequest = { body: input.body };
    if (input.attachment?.file) {
      const uploaded = await api.communities.uploadMedia({
        kind: "comment_image",
        file: input.attachment.file,
      });
      body.media_refs = [{
        storage_ref: uploaded.media_ref,
        mime_type: uploaded.mime_type,
        size_bytes: uploaded.size_bytes,
      }];
    }
    return body;
  }, [api.communities]);

  const getCommentSubmitErrorMessage = React.useCallback((error: unknown) => {
    if (error instanceof ApiError && error.code === "comment_media_rejected") {
      return "This image cannot be posted.";
    }
    return getErrorMessage(error, "Could not post this reply.");
  }, []);

  const signAgentAuthoredCommentBody = React.useCallback(async (path: string, body: CreateCommentRequest) => {
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
      const nextProfiles = await loadProfilesByUserId(api, collectCommentAuthorUserIds(repliesPage.items), session?.profile ? { [session.user.id]: session.profile } : {});
      logger.debug("[post-thread] load replies complete", {
        commentId,
        nextCursor: repliesPage.next_cursor,
        receivedCount: repliesPage.items.length,
      });
      setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => {
        const nextChildrenById = new Map(node.children.map((child) => [child.item.comment.id, child] as const));
        for (const child of buildThreadCommentTreeFromItems(repliesPage.items)) {
          nextChildrenById.set(child.item.comment.id, child);
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

  const createTopLevelComment = React.useCallback(async (input: PostThreadReplyInput): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const communityId = post.post.community;
    const nextPostId = post.post.id;
    const result = await runGatedCommunityAction({
      action: "reply_post",
      communityId,
      onAllowed: async () => {
        try {
          const commentBody = await buildCommentRequestBody(input);
          await api.communities.createComment(
            communityId,
            nextPostId,
            input.authorMode === "agent"
              ? await signAgentAuthoredCommentBody(
                `/communities/${communityId}/posts/${nextPostId}/comments`,
                commentBody,
              )
              : commentBody,
          );
          await refreshTopLevelComments(communityId);
        } catch (nextError) {
          toast.error(getCommentSubmitErrorMessage(nextError));
          throw nextError;
        }
      },
      postId: nextPostId,
    });
    return result === "allowed" ? "submitted" : "blocked";
  }, [api, buildCommentRequestBody, getCommentSubmitErrorMessage, post, refreshTopLevelComments, runGatedCommunityAction, signAgentAuthoredCommentBody]);

  const createReply = React.useCallback(async (commentId: string, input: PostThreadReplyInput): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const result = await runGatedCommunityAction({
      action: "reply_comment",
      communityId: post.post.community,
      onAllowed: async () => {
        try {
          const commentBody = await buildCommentRequestBody(input);
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
          ], session?.profile ? { [session.user.id]: session.profile } : {});

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
          toast.error(getCommentSubmitErrorMessage(nextError));
          throw nextError;
        }
      },
      postId: post.post.id,
    });
    return result === "allowed" ? "submitted" : "blocked";
  }, [api, buildCommentRequestBody, getCommentSubmitErrorMessage, locale, post, runGatedCommunityAction, session, signAgentAuthoredCommentBody]);

  const voteOnComment = React.useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!post) return;
    await runGatedCommunityAction({
      action: "vote_comment",
      communityId: post.post.community,
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
      postId: post.post.id,
    });
  }, [api, commentNodes, post, runGatedCommunityAction]);

  const deleteComment = React.useCallback(async (commentId: string) => {
    if (!post) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this comment?")) return;

    const previousNodes = commentNodes;
    const applyDeletedComment = (deleted?: ApiComment) => {
      setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
        ...node,
        item: {
          ...node.item,
          comment: {
            ...node.item.comment,
            ...deleted,
            id: deleted?.id ?? node.item.comment.id,
            parent_comment: deleted?.parent_comment ?? node.item.comment.parent_comment,
            body: deleted?.body ?? "[deleted]",
            media_refs: deleted?.media_refs ?? [],
            status: "deleted",
          },
          machine_translated: false,
          translated_body: null,
          translation_state: "same_language",
          viewer_can_delete: false,
        },
      })));
    };

    applyDeletedComment();
    try {
      const deleted = await api.comments.delete(commentId);
      applyDeletedComment(deleted);
    } catch (nextError) {
      setCommentNodes(previousNodes);
      toast.error(getErrorMessage(nextError, "Could not delete this comment."));
    }
  }, [api.comments, commentNodes, post]);

  const voteOnPost = React.useCallback(async (direction: "up" | "down" | null) => {
    if (!post) return;
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: post.post.community,
      onAllowed: async () => {
        const nextPostId = post.post.id;
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
      postId: post.post.id,
    });
  }, [api.posts.vote, post, runGatedCommunityAction]);

  const deletePost = React.useCallback(async () => {
    if (!post) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;

    const previousPost = post;
    setPost(toDeletedPostStub(post));
    try {
      await api.posts.delete(post.post.community, post.post.id);
      const nextPost = await api.posts.get(post.post.id, { locale }).catch(() => null);
      if (nextPost) {
        setPost(normalizePostResponse(nextPost));
      }
    } catch (nextError) {
      setPost(previousPost);
      toast.error(getErrorMessage(nextError, "Could not delete this post."));
    }
  }, [api.posts, locale, post]);

  const removePost = React.useCallback(async () => {
    if (!post) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this post?")) return;

    const previousPost = post;
    setPost(toRemovedPostStub(post));
    try {
      const removed = await api.posts.remove(post.post.community, post.post.id);
      setPost((current) => current
        ? normalizePostResponse({
            ...current,
            post: {
              ...current.post,
              ...removed,
            },
          })
        : current);
    } catch (nextError) {
      setPost(previousPost);
      toast.error(getErrorMessage(nextError, "Could not remove this post."));
    }
  }, [api.posts, post]);

  const markAgeGateVerified = React.useCallback(() => {
    setPost((current) => current
      ? {
          ...current,
          age_gate_viewer_state: "verified_allowed",
        }
      : current);
  }, []);

  React.useEffect(() => {
    if (hasSession) return;
    if (publicThreadQuery.data) {
      applyPublicThreadQueryData(publicThreadQuery.data, commentSort);
      return;
    }
    if (publicThreadQuery.error) {
      setError(publicThreadQuery.error);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
  }, [applyPublicThreadQueryData, commentSort, hasSession, publicThreadQuery.data, publicThreadQuery.error]);

  React.useEffect(() => {
    let cancelled = false;

    if (!hasSession) {
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);
    setPost(null);
    setCommunity(null);
    setAuthorProfile(null);
    setCommentNodes([]);
    setAuthorProfilesByUserId({});
    setThreadPartial(false);
    setReadMode(hasSession ? "authenticated" : "public");

    const cachedPublicThread = queryClient.getQueryData<PublicThreadQueryData>(
      postKeys.publicThread({ postId, locale, sort: "best" }),
    );
    if (cachedPublicThread) {
      applyPublicThreadQueryData(cachedPublicThread, "best");
    }

    const loadPost = async (): Promise<{ post: ApiPost; readMode: PostReadMode; publicThread?: Awaited<ReturnType<typeof api.publicPosts.getThread>> }> => {
      try {
        return {
          post: normalizePostResponse(await api.posts.get(postId, { locale })),
          readMode: "authenticated",
        };
      } catch (nextError) {
        if (!isApiNotFoundError(nextError)) {
          throw nextError;
        }

        logger.info("[post-route] falling back to public read", { postId });
        return {
          post: normalizePostResponse(await api.publicPosts.get(postId, { locale })),
          readMode: "public",
        };
      }
    };

    void loadPost()
      .then(({ post: p, readMode: nextReadMode, publicThread }) => {
        if (cancelled) return;
        setPost(p);
        setReadMode(nextReadMode);
        setThreadPartial(true);
        setLoading(false);

        void loadProfilesByUserId(
          api,
          [...(p.post.identity_mode === "public" && p.post.author_user ? [p.post.author_user] : [])],
          session?.profile ? { [session.user.id]: session.profile } : {},
        )
          .then((authorProfilesByUserId) => {
            if (cancelled) return;
            if (p.post.identity_mode === "public" && p.post.author_user && !authorProfilesByUserId[p.post.author_user]) {
              logger.warn("[post-route] author handle fallback", {
                postId: p.post.id,
                readMode: nextReadMode,
                userId: p.post.author_user,
              });
            }
            setAuthorProfile(p.post.identity_mode === "public" && p.post.author_user ? authorProfilesByUserId[p.post.author_user] ?? null : null);
            setAuthorProfilesByUserId((current) => ({ ...current, ...authorProfilesByUserId }));
          })
          .catch((nextError: unknown) => {
            if (!cancelled) {
              logger.warn("[post-route] author profile load failed", {
                error: nextError,
                postId: p.post.id,
              });
            }
          });

        if (publicThread) {
          const nextCommentNodes = buildThreadCommentTreeFromItems(publicThread.comments.items);
          void loadProfilesByUserId(
            api,
            collectThreadCommentAuthorUserIds(nextCommentNodes),
            session?.profile ? { [session.user.id]: session.profile } : {},
          )
            .then((commentAuthorProfilesByUserId) => {
              if (cancelled) return;
              setCommunity(publicThread.community);
              setCommentNodes(nextCommentNodes);
              setAuthorProfilesByUserId((current) => ({ ...current, ...commentAuthorProfilesByUserId }));
              setThreadPartial(false);
              loadedCommentSortKeyRef.current = `${p.post.community}:${nextReadMode}:${commentSort}`;
            })
            .catch((nextError: unknown) => {
              if (!cancelled) {
                logger.warn("[post-route] bundled public thread comments profile load failed", {
                  error: nextError,
                  postId: p.post.id,
                });
                setCommunity(publicThread.community);
                setCommentNodes(nextCommentNodes);
                setThreadPartial(false);
                loadedCommentSortKeyRef.current = `${p.post.community}:${nextReadMode}:${commentSort}`;
              }
            });
          return;
        }

        void Promise.all([
          (hasSession
            ? api.communities.preview(p.post.community, { locale })
            : api.publicCommunities.get(p.post.community, { locale })).catch(() => null),
          loadTopLevelComments(p.post.community, nextReadMode, commentSort),
          hasSession ? api.agents.list().catch(() => null) : Promise.resolve(null),
        ])
          .then(async ([communityResult, commentTree, ownedAgentsResult]) => {
            const nextAvailableAgent = ownedAgentsResult ? await resolveAvailableSigningAgent(ownedAgentsResult.items) : null;
            if (cancelled) return;
            setCommunity(communityResult);
            setAvailableAgent(nextAvailableAgent);
            setCommentNodes(commentTree.commentNodes);
            setAuthorProfilesByUserId((current) => ({ ...current, ...commentTree.authorProfilesByUserId }));
            setThreadPartial(false);
            loadedCommentSortKeyRef.current = `${p.post.community}:${nextReadMode}:${commentSort}`;
          })
          .catch((nextError: unknown) => {
            if (!cancelled) {
              logger.warn("[post-route] supplemental load failed", {
                error: nextError,
                postId: p.post.id,
              });
            }
          });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, applyPublicThreadQueryData, hasSession, loadTopLevelComments, locale, postId, queryClient, session]);

  React.useEffect(() => {
    if (!post || !community || loading) return;

    const sortKey = `${community.id}:${readMode}:${commentSort}`;
    if (loadedCommentSortKeyRef.current === sortKey) return;

    let cancelled = false;
    void loadTopLevelComments(community.id, readMode, commentSort)
      .then((nextThreadState) => {
        if (cancelled) return;
        setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
        setCommentNodes(nextThreadState.commentNodes);
        setThreadPartial(false);
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
    deleteComment,
  )), [authorProfilesByUserId, commentNodes, createReply, deleteComment, labels, loadRepliesForComment, voteOnComment]);
  const commentCount = React.useMemo(() => countThreadComments(commentNodes), [commentNodes]);

  React.useEffect(() => {
    if (!community) return;
    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.id,
      displayName: community.display_name,
      routeSlug: community.route_slug ?? null,
    });
  }, [community]);

  return {
    post,
    community,
    authorProfile,
    comments,
    commentCount,
    availableAgent,
    createTopLevelComment,
    deletePost,
    removePost,
    error,
    gateModal,
    markAgeGateVerified,
    loading,
    threadPartial,
    voteOnPost,
    commentSort,
    setCommentSort,
  };
}
