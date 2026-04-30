"use client";

import type { CommentListItem as ApiCommentListItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import type { PostThreadComment, PostThreadSubmitResult } from "@/components/compositions/posts/post-thread/post-thread.types";

import { getErrorMessage } from "@/lib/error-utils";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { resolveCommentAuthorLabel, toCommentViewerVote } from "@/app/authenticated-helpers/post-presentation";

export type ThreadCommentNode = {
  item: ApiCommentListItem;
  children: ThreadCommentNode[];
  hasLoadedReplies: boolean;
  loadingReplies: boolean;
  nextRepliesCursor: string | null;
};

export const THREAD_COMMENT_PAGE_LIMIT = "100";
export const AUTO_REPLY_PREVIEW_LIMIT = "5";
const AUTO_REPLY_PREVIEW_CONCURRENCY = 6;

type CommentPage = {
  items: ApiCommentListItem[];
  next_cursor: string | null;
};

function getCommentId(comment: ApiCommentListItem["comment"]): string {
  return comment.id ?? (comment as typeof comment & { comment?: string }).comment ?? "";
}

function getParentCommentId(comment: ApiCommentListItem["comment"]): string | null {
  return comment.parent_comment ?? (comment as typeof comment & { parent_comment_id?: string | null }).parent_comment_id ?? null;
}

export function collectCommentAuthorUserIds(items: ApiCommentListItem[]): string[] {
  return [...new Set(items
    .map((item) => item.comment.identity_mode === "public" ? item.comment.author_user : null)
    .filter((value): value is string => Boolean(value)))];
}

export function collectThreadCommentAuthorUserIds(nodes: ThreadCommentNode[]): string[] {
  return [...new Set(nodes.flatMap((node) => [
    ...collectCommentAuthorUserIds([node.item]),
    ...collectThreadCommentAuthorUserIds(node.children),
  ]))];
}

export function countThreadComments(nodes: ThreadCommentNode[]): number {
  return nodes.reduce((total, node) => total + 1 + node.item.comment.descendant_count, 0);
}

export function createThreadCommentNode(item: ApiCommentListItem): ThreadCommentNode {
  const commentId = getCommentId(item.comment);
  const parentCommentId = getParentCommentId(item.comment);
  return {
    item: {
      ...item,
      comment: {
        ...item.comment,
        id: commentId,
        parent_comment: parentCommentId,
      },
    },
    children: [],
    hasLoadedReplies: false,
    loadingReplies: false,
    nextRepliesCursor: null,
  };
}

export function buildThreadCommentTreeFromItems(items: ApiCommentListItem[]): ThreadCommentNode[] {
  const nodesByCommentId = new Map<string, ThreadCommentNode>();
  const roots: ThreadCommentNode[] = [];
  const linkedReplyIds: string[] = [];
  const orphanReplyIds: string[] = [];

  for (const item of items) {
    nodesByCommentId.set(getCommentId(item.comment), createThreadCommentNode(item));
  }

  for (const item of items) {
    const commentId = getCommentId(item.comment);
    const node = nodesByCommentId.get(commentId);
    if (!node) {
      continue;
    }

    const parentCommentId = getParentCommentId(item.comment);
    const parent = parentCommentId ? nodesByCommentId.get(parentCommentId) : null;
    if (parent) {
      parent.children.push(node);
      linkedReplyIds.push(commentId);
    } else {
      roots.push(node);
      if (parentCommentId) {
        orphanReplyIds.push(commentId);
      }
    }
  }

  if (linkedReplyIds.length > 0 || orphanReplyIds.length > 0) {
    logger.debug("[post-thread] built comment tree from flat page", {
      inputCount: items.length,
      linkedReplyIds,
      orphanReplyIds,
      rootCount: roots.length,
    });
  }

  return roots;
}

export function mergeThreadCommentNodes(
  previousNodes: ThreadCommentNode[],
  nextNodes: ThreadCommentNode[],
): ThreadCommentNode[] {
  const previousByCommentId = new Map(previousNodes.map((node) => [node.item.comment.id, node] as const));

  return nextNodes.map((node) => {
    const previousNode = previousByCommentId.get(node.item.comment.id);
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
  fetchPage: (cursor: string | null) => Promise<CommentPage>,
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

async function mapWithConcurrency<T, TResult>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index] as T, index);
    }
  }));

  return results;
}

async function loadRootReplyPreviews(
  nodes: ThreadCommentNode[],
  fetchReplies: (commentId: string) => Promise<CommentPage>,
): Promise<ThreadCommentNode[]> {
  const nodesWithReplies = nodes.filter((node) => node.item.comment.direct_reply_count > 0);
  if (nodesWithReplies.length === 0) {
    return nodes;
  }

  const hydratedNodes = await mapWithConcurrency(
    nodesWithReplies,
    AUTO_REPLY_PREVIEW_CONCURRENCY,
    async (node) => {
      const commentId = node.item.comment.id;
      try {
        const repliesPage = await fetchReplies(commentId);
        const childrenByCommentId = new Map(node.children.map((child) => [child.item.comment.id, child] as const));
        for (const child of buildThreadCommentTreeFromItems(repliesPage.items)) {
          childrenByCommentId.set(child.item.comment.id, child);
        }

        return {
          ...node,
          children: [...childrenByCommentId.values()],
          hasLoadedReplies: true,
          loadingReplies: false,
          nextRepliesCursor: repliesPage.next_cursor,
        };
      } catch (error) {
        logger.warn("[post-thread] failed to auto-load reply preview", {
          commentId,
          message: getErrorMessage(error, "unknown"),
        });
        return node;
      }
    },
  );
  const hydratedByCommentId = new Map(hydratedNodes.map((node) => [node.item.comment.id, node] as const));

  logger.debug("[post-thread] auto-loaded root reply previews", {
    requestedCount: nodesWithReplies.length,
    hydratedCount: hydratedNodes.filter((node) => node.hasLoadedReplies).length,
    limit: AUTO_REPLY_PREVIEW_LIMIT,
  });

  return nodes.map((node) => hydratedByCommentId.get(node.item.comment.id) ?? node);
}

export async function loadThreadCommentTree(
  api: ReturnType<typeof useApi>,
  communityId: string,
  postId: string,
  locale: string,
  canMutate = true,
  sort: "best" | "new" | "top" = "best",
): Promise<ThreadCommentNode[]> {
  const topLevelComments = await listAllCommentPages((cursor) => canMutate
    ? api.communities.listComments(communityId, postId, { cursor, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort })
    : api.publicComments.listPostComments(postId, { cursor, limit: THREAD_COMMENT_PAGE_LIMIT, locale, sort }));

  const rootNodes = buildThreadCommentTreeFromItems(topLevelComments);
  return await loadRootReplyPreviews(rootNodes, (commentId) => canMutate
    ? api.comments.listReplies(commentId, { cursor: null, limit: AUTO_REPLY_PREVIEW_LIMIT, locale, sort })
    : api.publicComments.listReplies(commentId, { cursor: null, limit: AUTO_REPLY_PREVIEW_LIMIT, locale, sort }));
}

export function updateThreadCommentNode(
  nodes: ThreadCommentNode[],
  commentId: string,
  updater: (node: ThreadCommentNode) => ThreadCommentNode,
): ThreadCommentNode[] {
  return nodes.map((node) => {
    if (node.item.comment.id === commentId) {
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
    if (node.item.comment.id === commentId) {
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
    canLoadMoreReplies?: boolean;
    loadedReplyCount?: number;
    loadingReplies?: boolean;
    loadMoreRepliesLabel?: string;
    moreRepliesLabel?: string;
    onLoadMoreReplies?: () => void;
    onReplySubmit?: (input: { body: string; authorMode: "human" | "agent" }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
    onVote?: (direction: "up" | "down") => void;
    replyCount?: number;
  },
  children?: PostThreadComment[],
): PostThreadComment {
  const { comment } = item;
  const authorProfile = comment.author_user ? authorProfiles[comment.author_user] : null;
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
    authorAvatarSeed: comment.identity_mode === "public" ? authorProfile?.id ?? comment.author_user ?? undefined : undefined,
    authorAvatarSrc: comment.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
    authorHref: comment.identity_mode === "public" && comment.author_user && authorProfile
      ? buildPublicProfilePathForProfile(authorProfile)
      : undefined,
    authorLabel,
    body: defaultBody,
    bodyDir: textDirection,
    bodyLang: textLang,
    canLoadMoreReplies: opts?.canLoadMoreReplies,
    children,
    commentId: comment.id,
    cancelReplyLabel: opts?.onReplySubmit ? labels.cancelReplyLabel : undefined,
    loadedReplyCount: opts?.loadedReplyCount,
    loadingReplies: opts?.loadingReplies,
    loadMoreRepliesLabel: opts?.loadMoreRepliesLabel,
    moreRepliesLabel: opts?.moreRepliesLabel,
    onLoadMoreReplies: opts?.onLoadMoreReplies,
    onReplySubmit: opts?.onReplySubmit,
    onVote: opts?.onVote,
    originalBody,
    replyActionLabel: opts?.onReplySubmit ? labels.replyActionLabel : undefined,
    replyCount: opts?.replyCount,
    replyPlaceholder: opts?.onReplySubmit ? labels.replyPlaceholder : undefined,
    scoreLabel: String(comment.score),
    submitReplyLabel: opts?.onReplySubmit ? labels.submitReplyLabel : undefined,
    showOriginalLabel: originalBody ? labels.showOriginalLabel : undefined,
    showTranslationLabel: originalBody ? labels.showTranslationLabel : undefined,
    status: comment.status,
    timestampLabel: formatRelativeTimestamp(comment.created),
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

  if (!node.hasLoadedReplies) {
    const remainingReplies = Math.max(node.item.comment.direct_reply_count - node.children.length, 0);
    if (remainingReplies <= 0) {
      return undefined;
    }
    return `${labels.loadRepliesLabel} (${remainingReplies})`;
  }

  if (node.nextRepliesCursor) {
    const remainingReplies = Math.max(node.item.comment.direct_reply_count - node.children.length, 0);
    return remainingReplies > 0
      ? `${labels.loadMoreRepliesLabel} (${remainingReplies})`
      : labels.loadMoreRepliesLabel;
  }

  return undefined;
}

function canLoadThreadMoreReplies(node: ThreadCommentNode): boolean {
  return node.loadingReplies || Boolean(node.nextRepliesCursor) || node.item.comment.direct_reply_count > node.children.length;
}

export function mapThreadCommentNode(
  node: ThreadCommentNode,
  authorProfiles: Record<string, ApiProfile | null>,
  labels: Parameters<typeof toThreadComment>[2],
  onLoadReplies: (commentId: string) => void,
  onReplySubmit?: (commentId: string, input: { body: string; authorMode: "human" | "agent" }) => Promise<PostThreadSubmitResult | void>,
  onVote?: (commentId: string, direction: "up" | "down") => void,
): PostThreadComment {
  const loadMoreRepliesLabel = buildThreadMoreRepliesLabel(node, labels);

  return toThreadComment(
    node.item,
    authorProfiles,
    labels,
    {
      canLoadMoreReplies: canLoadThreadMoreReplies(node),
      replyCount: node.item.comment.direct_reply_count,
      loadedReplyCount: node.children.length,
      loadingReplies: node.loadingReplies,
      loadMoreRepliesLabel,
      moreRepliesLabel: loadMoreRepliesLabel,
      onLoadMoreReplies: node.item.comment.direct_reply_count > 0
        ? () => onLoadReplies(node.item.comment.id)
        : undefined,
      onReplySubmit: onReplySubmit
        ? async (input) => await onReplySubmit(node.item.comment.id, input)
        : undefined,
      onVote: onVote
        ? (direction) => onVote(node.item.comment.id, direction)
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
  logger.warn("[post-thread] failed to load replies", {
    commentId,
    message: getErrorMessage(error, "unknown"),
  });
}
