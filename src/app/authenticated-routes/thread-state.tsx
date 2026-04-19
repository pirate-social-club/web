"use client";

import type { CommentListItem as ApiCommentListItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import type { PostThreadComment } from "@/components/compositions/post-thread/post-thread.types";

import { formatRelativeTimestamp, getErrorMessage } from "./route-core";
import { resolveCommentAuthorLabel, toCommentViewerVote } from "./post-presentation";

export type ThreadCommentNode = {
  item: ApiCommentListItem;
  children: ThreadCommentNode[];
  hasLoadedReplies: boolean;
  loadingReplies: boolean;
  nextRepliesCursor: string | null;
};

export const THREAD_COMMENT_PAGE_LIMIT = "100";

export function collectCommentAuthorUserIds(items: ApiCommentListItem[]): string[] {
  return [...new Set(items
    .map((item) => item.comment.identity_mode === "public" ? item.comment.author_user_id : null)
    .filter((value): value is string => Boolean(value)))];
}

export function collectThreadCommentAuthorUserIds(nodes: ThreadCommentNode[]): string[] {
  return [...new Set(nodes.flatMap((node) => [
    ...collectCommentAuthorUserIds([node.item]),
    ...collectThreadCommentAuthorUserIds(node.children),
  ]))];
}

export function createThreadCommentNode(item: ApiCommentListItem): ThreadCommentNode {
  return {
    item,
    children: [],
    hasLoadedReplies: false,
    loadingReplies: false,
    nextRepliesCursor: null,
  };
}

export function mergeThreadCommentNodes(
  previousNodes: ThreadCommentNode[],
  nextNodes: ThreadCommentNode[],
): ThreadCommentNode[] {
  const previousByCommentId = new Map(previousNodes.map((node) => [node.item.comment.comment_id, node] as const));

  return nextNodes.map((node) => {
    const previousNode = previousByCommentId.get(node.item.comment.comment_id);
    if (!previousNode) {
      return node;
    }

    return {
      ...node,
      children: mergeThreadCommentNodes(previousNode.children, node.children.length > 0 ? node.children : previousNode.children),
      hasLoadedReplies: previousNode.hasLoadedReplies,
      loadingReplies: previousNode.loadingReplies,
      nextRepliesCursor: previousNode.nextRepliesCursor,
    };
  });
}

async function listAllCommentPages(
  fetchPage: (cursor: string | null) => Promise<{ items: ApiCommentListItem[]; next_cursor: string | null }>,
): Promise<ApiCommentListItem[]> {
  const items: ApiCommentListItem[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor);
    items.push(...page.items);
    if (!page.next_cursor) {
      return items;
    }
    cursor = page.next_cursor;
  }
}

export async function loadThreadCommentTree(
  api: ReturnType<typeof useApi>,
  communityId: string,
  postId: string,
  locale: string,
  canMutate = true,
): Promise<ThreadCommentNode[]> {
  const topLevelComments = await listAllCommentPages((cursor) => canMutate
    ? api.communities.listComments(communityId, postId, { cursor, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: "best" })
    : api.publicComments.listPostComments(postId, { cursor, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort: "best" }));

  return topLevelComments.map((item) => createThreadCommentNode(item));
}

export function updateThreadCommentNode(
  nodes: ThreadCommentNode[],
  commentId: string,
  updater: (node: ThreadCommentNode) => ThreadCommentNode,
): ThreadCommentNode[] {
  return nodes.map((node) => {
    if (node.item.comment.comment_id === commentId) {
      return updater(node);
    }

    if (node.children.length === 0) {
      return node;
    }

    const nextChildren = updateThreadCommentNode(node.children, commentId, updater);
    return nextChildren === node.children ? node : { ...node, children: nextChildren };
  });
}

export function findThreadCommentNode(
  nodes: ThreadCommentNode[],
  commentId: string,
): ThreadCommentNode | null {
  for (const node of nodes) {
    if (node.item.comment.comment_id === commentId) {
      return node;
    }
    const child = findThreadCommentNode(node.children, commentId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function toThreadComment(
  item: ApiCommentListItem,
  authorProfiles: Record<string, ApiProfile | null>,
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
  opts?: {
    moreRepliesLabel?: string;
    onLoadMoreReplies?: () => void;
    onReplySubmit?: (body: string) => Promise<void> | void;
    onVote?: (direction: "up" | "down") => void;
  },
  children?: PostThreadComment[],
): PostThreadComment {
  const { comment } = item;
  const authorProfile = comment.author_user_id ? authorProfiles[comment.author_user_id] : null;
  const authorLabel = resolveCommentAuthorLabel(comment, authorProfile);
  const defaultBody = item.translated_body ?? comment.body ?? "";
  const originalBody = item.translation_state === "ready" && item.translated_body && item.translated_body !== comment.body
    ? comment.body ?? undefined
    : undefined;
  const textDirection = item.translation_state === "ready" && String(item.resolved_locale).toLowerCase().startsWith("ar")
    ? "rtl"
    : "auto";
  const textLang = item.translation_state === "ready" && String(item.resolved_locale).toLowerCase().startsWith("ar")
    ? "ar"
    : undefined;

  return {
    authorHref: comment.identity_mode === "public" && comment.author_user_id && authorProfile
      ? buildPublicProfilePathForProfile(authorProfile)
      : undefined,
    authorLabel,
    body: defaultBody,
    bodyDir: textDirection,
    bodyLang: textLang,
    children,
    commentId: comment.comment_id,
    cancelReplyLabel: opts?.onReplySubmit ? labels.cancelReplyLabel : undefined,
    moreRepliesLabel: opts?.moreRepliesLabel,
    onLoadMoreReplies: opts?.onLoadMoreReplies,
    onReplySubmit: opts?.onReplySubmit,
    onVote: opts?.onVote,
    originalBody,
    replyActionLabel: opts?.onReplySubmit ? labels.replyActionLabel : undefined,
    replyPlaceholder: opts?.onReplySubmit ? labels.replyPlaceholder : undefined,
    scoreLabel: String(comment.score),
    submitReplyLabel: opts?.onReplySubmit ? labels.submitReplyLabel : undefined,
    showOriginalLabel: originalBody ? labels.showOriginalLabel : undefined,
    showTranslationLabel: originalBody ? labels.showTranslationLabel : undefined,
    status: comment.status,
    timestampLabel: formatRelativeTimestamp(comment.created_at),
    viewerVote: toCommentViewerVote(item.viewer_vote),
  };
}

function buildThreadMoreRepliesLabel(
  node: ThreadCommentNode,
  labels: Pick<Parameters<typeof toThreadComment>[2], "loadMoreRepliesLabel" | "loadRepliesLabel" | "loadingRepliesLabel">,
): string | undefined {
  if (node.loadingReplies) {
    return labels.loadingRepliesLabel;
  }

  const remainingReplies = Math.max(node.item.comment.direct_reply_count - node.children.length, 0);
  if (remainingReplies <= 0) {
    return undefined;
  }

  if (!node.hasLoadedReplies) {
    return `${labels.loadRepliesLabel} (${remainingReplies})`;
  }

  if (node.nextRepliesCursor) {
    return `${labels.loadMoreRepliesLabel} (${remainingReplies})`;
  }

  return undefined;
}

export function mapThreadCommentNode(
  node: ThreadCommentNode,
  authorProfiles: Record<string, ApiProfile | null>,
  labels: Parameters<typeof toThreadComment>[2],
  onLoadReplies: (commentId: string) => void,
  onReplySubmit?: (commentId: string, body: string) => Promise<void>,
  onVote?: (commentId: string, direction: "up" | "down") => void,
): PostThreadComment {
  return toThreadComment(
    node.item,
    authorProfiles,
    labels,
    {
      moreRepliesLabel: buildThreadMoreRepliesLabel(node, labels),
      onLoadMoreReplies: node.item.comment.direct_reply_count > 0
        ? () => onLoadReplies(node.item.comment.comment_id)
        : undefined,
      onReplySubmit: onReplySubmit
        ? async (body) => await onReplySubmit(node.item.comment.comment_id, body)
        : undefined,
      onVote: onVote
        ? (direction) => onVote(node.item.comment.comment_id, direction)
        : undefined,
    },
    node.children.map((child) => mapThreadCommentNode(
      child,
      authorProfiles,
      labels,
      onLoadReplies,
      onReplySubmit,
      onVote,
    )),
  );
}

export function logReplyLoadFailure(commentId: string, error: unknown) {
  console.warn("[post-thread] failed to load replies", {
    commentId,
    message: getErrorMessage(error, "unknown"),
  });
}
