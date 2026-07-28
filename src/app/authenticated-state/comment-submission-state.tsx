"use client";

import * as React from "react";
import type { Comment as ApiComment, CommentListItem as ApiCommentListItem, CreateCommentRequest } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import type { useSession } from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { toast } from "@/components/primitives/sonner";
import type { PostThreadReplyInput, PostThreadSubmitResult } from "@/components/compositions/posts/post-thread/post-thread.types";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import type { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { isMembershipRequiredWriteRejection } from "@/hooks/community-interaction-gate/membership-write-rejection";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildThreadCommentTreeFromItems,
  collectCommentAuthorUserIds,
  createThreadCommentNode,
  findThreadCommentNode,
  mergeThreadCommentNodes,
  THREAD_COMMENT_PAGE_LIMIT,
  type ThreadCommentNode,
  updateThreadCommentNode,
  upsertThreadCommentNodes,
} from "./thread-state";

export type PostReadMode = "authenticated" | "public";

export type AvailableSigningAgent = {
  agentId: string;
  displayName: string;
  privateKeyPem: string;
};

type CommunityGate = ReturnType<typeof useCommunityInteractionGate>;
type Session = ReturnType<typeof useSession>;

type TopLevelCommentsLoader = (
  communityId: string,
  nextReadMode: PostReadMode,
  sort: "best" | "new" | "top",
) => Promise<{
  authorProfilesByUserId: Record<string, ApiProfile | null>;
  commentNodes: ThreadCommentNode[];
}>;

function commentDraftSignature(input: PostThreadReplyInput): string {
  return JSON.stringify([
    input.body,
    input.authorMode,
    input.identityMode ?? null,
    input.anonymousScope ?? null,
    input.attachment?.file
      ? `${input.attachment.file.name}:${input.attachment.file.size}:${input.attachment.file.type}:${input.attachment.file.lastModified}`
      : null,
  ]);
}

/**
 * Deterministic CommentListItem for a just-created comment, built from the
 * POST 201 response so the comment is visible immediately without waiting on
 * a list refetch (which may hit an edge-cached or access-gated read path).
 */
function buildLocalEchoListItem(created: ApiComment, locale: string): ApiCommentListItem {
  return {
    id: created.id,
    object: "comment_list_item",
    comment: created,
    viewer_vote: null,
    viewer_can_delete: true,
    resolved_locale: locale,
    translation_state: "same_language",
    machine_translated: false,
    translated_body: null,
    source_hash: created.content_hash ?? "",
  };
}

/**
 * Comment submission (top-level + replies) for a post thread. Owns the
 * idempotency keys, the immediate local echo of the 201 response, and the
 * best-effort post-submit reconciliation — extracted from post-state to keep
 * that hook under the oversized-file ratchet.
 */
export function useCommentSubmission(input: {
  api: ReturnType<typeof useApi>;
  post: ApiPost | null;
  readMode: PostReadMode;
  commentSort: "best" | "new" | "top";
  locale: string;
  session: Session;
  availableAgent: AvailableSigningAgent | null;
  loadTopLevelComments: TopLevelCommentsLoader;
  runGatedCommunityAction: CommunityGate["runGatedCommunityAction"];
  invalidateCommunityGate: CommunityGate["invalidateCommunityGate"];
  setCommentNodes: React.Dispatch<React.SetStateAction<ThreadCommentNode[]>>;
  setAuthorProfilesByUserId: React.Dispatch<React.SetStateAction<Record<string, ApiProfile | null>>>;
}): {
  createTopLevelComment: (input: PostThreadReplyInput) => Promise<PostThreadSubmitResult>;
  createReply: (commentId: string, input: PostThreadReplyInput) => Promise<PostThreadSubmitResult>;
} {
  const {
    api,
    post,
    readMode,
    commentSort,
    locale,
    session,
    availableAgent,
    loadTopLevelComments,
    runGatedCommunityAction,
    invalidateCommunityGate,
    setCommentNodes,
    setAuthorProfilesByUserId,
  } = input;

  // Per-composer idempotency keys, retained across submit retries of an
  // unchanged draft so a retried submit dedupes server-side instead of
  // double-posting (the API dedupes on idempotency_key per author/community).
  const commentIdempotencyKeysRef = React.useRef(new Map<string, { signature: string; key: string }>());

  const resolveCommentIdempotencyKey = React.useCallback((target: string, draft: PostThreadReplyInput): string => {
    const signature = commentDraftSignature(draft);
    const existing = commentIdempotencyKeysRef.current.get(target);
    if (existing && existing.signature === signature) {
      return existing.key;
    }
    const key = crypto.randomUUID();
    commentIdempotencyKeysRef.current.set(target, { signature, key });
    return key;
  }, []);

  const insertCreatedCommentNode = React.useCallback((created: ApiComment, parentCommentId: string | null) => {
    const node: ThreadCommentNode = {
      ...createThreadCommentNode(buildLocalEchoListItem(created, locale)),
      hasLoadedReplies: true,
      isLocalEcho: true,
    };
    setCommentNodes((current) => {
      if (findThreadCommentNode(current, node.item.comment.id)) {
        return current;
      }
      if (!parentCommentId) {
        return [node, ...current];
      }
      return updateThreadCommentNode(current, parentCommentId, (parent) => ({
        ...parent,
        children: [...parent.children, node],
        hasLoadedReplies: true,
      }));
    });
    if (session?.profile && created.identity_mode === "public" && created.author_user === session.user.id) {
      setAuthorProfilesByUserId((current) => ({ ...current, [session.user.id]: session.profile }));
    }
  }, [locale, session?.profile, session?.user?.id, setAuthorProfilesByUserId, setCommentNodes]);

  const refreshTopLevelComments = React.useCallback(async (communityId: string) => {
    const nextThreadState = await loadTopLevelComments(communityId, readMode, commentSort);
    setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
    setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
  }, [commentSort, loadTopLevelComments, readMode, setAuthorProfilesByUserId, setCommentNodes]);

  /**
   * Best-effort reconcile after a comment commit. The created comment is
   * already inserted locally, so a refresh failure (edge-cached public page,
   * membership-gated 404, network) must never surface as a submit failure.
   * A 404 from the member read path retried through the public path covers
   * the deliberate "Community not found" returned to non-members.
   */
  const reconcileCommentsAfterSubmit = React.useCallback(async (communityId: string) => {
    try {
      await refreshTopLevelComments(communityId);
      return;
    } catch (refreshError) {
      logger.warn("[post-thread] post-submit comment refresh failed", {
        communityId,
        error: refreshError,
      });
    }
    if (readMode !== "authenticated") {
      return;
    }
    try {
      const nextThreadState = await loadTopLevelComments(communityId, "public", commentSort);
      setAuthorProfilesByUserId((current) => ({ ...current, ...nextThreadState.authorProfilesByUserId }));
      setCommentNodes((current) => mergeThreadCommentNodes(current, nextThreadState.commentNodes));
    } catch (fallbackError) {
      logger.warn("[post-thread] post-submit public comment refresh failed", {
        communityId,
        error: fallbackError,
      });
    }
  }, [commentSort, loadTopLevelComments, readMode, refreshTopLevelComments, setAuthorProfilesByUserId, setCommentNodes]);

  const buildCommentRequestBody = React.useCallback(async (draft: PostThreadReplyInput, idempotencyKey: string): Promise<CreateCommentRequest> => {
    const body: CreateCommentRequest = { body: draft.body, idempotency_key: idempotencyKey };
    if (draft.identityMode === "anonymous" && draft.anonymousScope) {
      body.identity_mode = "anonymous";
      body.anonymous_scope = draft.anonymousScope;
    }
    if (draft.attachment?.file) {
      const uploaded = await api.communities.uploadMedia({
        kind: "comment_image",
        file: draft.attachment.file,
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

  const createTopLevelComment = React.useCallback(async (draft: PostThreadReplyInput): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const communityId = post.post.community;
    const nextPostId = post.post.id;
    const idempotencyTarget = `post:${nextPostId}`;
    const idempotencyKey = resolveCommentIdempotencyKey(idempotencyTarget, draft);
    try {
      const result = await runGatedCommunityAction({
        action: "reply_post",
        communityId,
        onAllowed: async (allowedContext) => {
          const commentBody = await buildCommentRequestBody(draft, idempotencyKey);
          const created = await api.communities.createComment(
            communityId,
            nextPostId,
            draft.authorMode === "agent"
              ? await signAgentAuthoredCommentBody(
                `/communities/${communityId}/posts/${nextPostId}/comments`,
                commentBody,
              )
              : commentBody,
            { altchaPayload: allowedContext?.altchaPayload },
          );
          // Committed: rotate the idempotency key, echo the 201 response
          // locally, and reconcile best-effort from here on.
          commentIdempotencyKeysRef.current.delete(idempotencyTarget);
          insertCreatedCommentNode(created, null);
          await reconcileCommentsAfterSubmit(communityId);
        },
        postId: nextPostId,
        requireMembership: post.post.visibility === "members_only",
      });
      return result === "allowed" ? "submitted" : "blocked";
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.code === "gate_unsatisfied") {
        invalidateCommunityGate(communityId);
        await runGatedCommunityAction({
          action: "reply_post",
          communityId,
          onAllowed: () => undefined,
          postId: nextPostId,
        });
        return "blocked";
      }
      if (isMembershipRequiredWriteRejection(nextError)) {
        const recoveryResult = await runGatedCommunityAction({
          action: "reply_post",
          communityId,
          onAllowed: () => undefined,
          postId: nextPostId,
          requireMembership: true,
        });
        if (recoveryResult === "allowed") {
          toast.error("Join this community to reply to this members-only thread.");
        }
        return "blocked";
      }
      toast.error(getCommentSubmitErrorMessage(nextError));
      return "blocked";
    }
  }, [api, buildCommentRequestBody, getCommentSubmitErrorMessage, insertCreatedCommentNode, invalidateCommunityGate, post, reconcileCommentsAfterSubmit, resolveCommentIdempotencyKey, runGatedCommunityAction, signAgentAuthoredCommentBody]);

  const createReply = React.useCallback(async (commentId: string, draft: PostThreadReplyInput): Promise<PostThreadSubmitResult> => {
    if (!post) return "blocked";
    const communityId = post.post.community;
    const idempotencyTarget = `comment:${commentId}`;
    const idempotencyKey = resolveCommentIdempotencyKey(idempotencyTarget, draft);
    try {
      const result = await runGatedCommunityAction({
        action: "reply_comment",
        commentId,
        communityId,
        onAllowed: async (allowedContext) => {
          const commentBody = await buildCommentRequestBody(draft, idempotencyKey);
          const created = await api.comments.createReply(
            commentId,
            draft.authorMode === "agent"
              ? await signAgentAuthoredCommentBody(`/comments/${commentId}/replies`, commentBody)
              : commentBody,
            { altchaPayload: allowedContext?.altchaPayload },
          );
          // Committed: rotate the key and echo the 201 response locally. The
          // reconcile below is best-effort — the member-only context endpoint
          // 404s non-members by design ("Community not found") even though
          // the reply committed, so it must never fail the submit.
          commentIdempotencyKeysRef.current.delete(idempotencyTarget);
          insertCreatedCommentNode(created, commentId);
          try {
            if (readMode === "authenticated") {
              const context = await api.comments.getContext(commentId, { limit: THREAD_COMMENT_PAGE_LIMIT, locale });
              const nextProfiles = await loadProfilesByUserId(api, [
                ...collectCommentAuthorUserIds([context.comment]),
                ...collectCommentAuthorUserIds(context.replies),
              ], session?.profile ? { [session.user.id]: session.profile } : {});

              setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
              setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
                ...node,
                item: context.comment,
                children: upsertThreadCommentNodes(node.children, buildThreadCommentTreeFromItems(context.replies)),
                hasLoadedReplies: true,
                loadingReplies: false,
                nextRepliesCursor: context.next_replies_cursor,
              })));
            } else {
              const repliesPage = await api.publicComments.listReplies(commentId, { cursor: null, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: commentSort });
              const nextProfiles = await loadProfilesByUserId(api, collectCommentAuthorUserIds(repliesPage.items), session?.profile ? { [session.user.id]: session.profile } : {});

              setAuthorProfilesByUserId((current) => ({ ...current, ...nextProfiles }));
              setCommentNodes((current) => updateThreadCommentNode(current, commentId, (node) => ({
                ...node,
                children: upsertThreadCommentNodes(node.children, buildThreadCommentTreeFromItems(repliesPage.items)),
                hasLoadedReplies: true,
                loadingReplies: false,
                nextRepliesCursor: repliesPage.next_cursor,
              })));
            }
          } catch (reconcileError) {
            logger.warn("[post-thread] post-submit reply reconcile failed", {
              commentId,
              error: reconcileError,
            });
          }
        },
        postId: post.post.id,
        requireMembership: post.post.visibility === "members_only",
      });
      return result === "allowed" ? "submitted" : "blocked";
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.code === "gate_unsatisfied") {
        invalidateCommunityGate(communityId);
        await runGatedCommunityAction({
          action: "reply_comment",
          commentId,
          communityId,
          onAllowed: () => undefined,
          postId: post.post.id,
        });
        return "blocked";
      }
      if (isMembershipRequiredWriteRejection(nextError)) {
        const recoveryResult = await runGatedCommunityAction({
          action: "reply_comment",
          commentId,
          communityId,
          onAllowed: () => undefined,
          postId: post.post.id,
          requireMembership: true,
        });
        if (recoveryResult === "allowed") {
          toast.error("Join this community to reply to this members-only thread.");
        }
        return "blocked";
      }
      toast.error(getCommentSubmitErrorMessage(nextError));
      return "blocked";
    }
  }, [api, buildCommentRequestBody, commentSort, getCommentSubmitErrorMessage, insertCreatedCommentNode, invalidateCommunityGate, locale, post, readMode, resolveCommentIdempotencyKey, runGatedCommunityAction, session, signAgentAuthoredCommentBody, setAuthorProfilesByUserId, setCommentNodes]);

  return { createTopLevelComment, createReply };
}
