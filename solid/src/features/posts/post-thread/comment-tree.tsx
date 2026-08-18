import { For, Show, createEffect, createSignal } from "solid-js";

import {
  Button,
  IconCaretDown,
  Type,
  cn,
} from "../../../design-system";
import { createUiLocale } from "../../../lib/ui-locale";
import { triggerNavigationTapHaptic } from "../../../lib/haptics";
import { CommentCard } from "./comment-card";
import { postThreadCommonCopy } from "./copy";
import type { PostThreadComment, PostThreadReplyIdentity } from "./types";

const DEFAULT_MAX_COMMENT_DEPTH = 8;
const CHILD_COMMENT_INDENT_CLASS_NAME = "ms-3 mt-2 sm:ms-5 md:ms-8";
const MOBILE_NESTED_AVATAR_CLASS_NAME = "hidden sm:flex";

function getCommentKey(comment: PostThreadComment, fallbackKey: string): string {
  return comment.commentId ?? comment.replyId ?? fallbackKey;
}

function collectCommentKeys(comments: PostThreadComment[], parentKey = "comment"): Set<string> {
  const keys = new Set<string>();
  comments.forEach((comment, index) => {
    const key = getCommentKey(comment, `${parentKey}-${index}`);
    keys.add(key);
    for (const childKey of collectCommentKeys(comment.children ?? [], key)) keys.add(childKey);
  });
  return keys;
}

function collectInitiallyCollapsedKeys(comments: PostThreadComment[], seenKeys: Set<string>, parentKey = "comment"): string[] {
  const keys: string[] = [];
  comments.forEach((comment, index) => {
    const key = getCommentKey(comment, `${parentKey}-${index}`);
    if (comment.initiallyCollapsed && !seenKeys.has(key)) keys.push(key);
    keys.push(...collectInitiallyCollapsedKeys(comment.children ?? [], seenKeys, key));
  });
  return keys;
}

function commentHasExpandableContent(comment: PostThreadComment): boolean {
  return Boolean(
    comment.body
    || (comment.media?.length ?? 0) > 0
    || comment.originalBody
    || comment.status
    || comment.onDelete
    || comment.onReplySubmit
    || comment.onVote,
  );
}

function resolveReplyCount(comment: PostThreadComment, loadedChildrenCount: number): number {
  return comment.replyCount ?? comment.loadedReplyCount ?? loadedChildrenCount;
}

function commentAnchorId(comment: PostThreadComment, fallbackKey: string): string {
  return `comment-${encodeURIComponent(getCommentKey(comment, fallbackKey))}`;
}

function CollapsedCommentRow(props: { comment: PostThreadComment }) {
  return (
    <div class="min-w-0 flex-1">
      <Type as="div" variant="caption" class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Type as="span" variant="label" class="text-foreground"><bdi>{props.comment.authorLabel}</bdi></Type>
        {props.comment.authorCommunityRole ? <Type as="span" variant="caption">{props.comment.authorCommunityRole}</Type> : null}
        <span aria-hidden="true">·</span><span>{props.comment.timestampLabel}</span>
      </Type>
    </div>
  );
}

interface CommentTreeNodeProps {
  collapsedIds: () => Set<string>;
  comment: PostThreadComment;
  depth: number;
  maxDepth: number;
  nodeKey: string;
  onReplyIntent?: () => void;
  onReplyRequest?: (comment: PostThreadComment) => void;
  onToggleCollapsed: (key: string) => void;
  replyIdentity?: PostThreadReplyIdentity;
}

function CommentTreeNode(props: CommentTreeNodeProps) {
  const { locale } = createUiLocale();
  const commonCopy = () => postThreadCommonCopy(locale());
  const children = () => props.comment.children ?? [];
  const loadedChildrenCount = () => children().length;
  const replyCount = () => resolveReplyCount(props.comment, loadedChildrenCount());
  const hasLoadedChildren = () => loadedChildrenCount() > 0;
  const hasLoadMore = () => Boolean(props.comment.canLoadMoreReplies || props.comment.loadMoreRepliesLabel || props.comment.moreRepliesLabel);
  const loadMoreLabel = () => props.comment.loadMoreRepliesLabel ?? props.comment.moreRepliesLabel;
  const canCollapse = () => commentHasExpandableContent(props.comment) && hasLoadedChildren();
  const collapsed = () => canCollapse() && props.collapsedIds().has(props.nodeKey);
  const truncateDeepNesting = () => props.depth >= props.maxDepth && hasLoadedChildren();
  const articleId = () => commentAnchorId(props.comment, props.nodeKey);

  const toggleCollapsed = () => {
    if (!canCollapse()) return;
    triggerNavigationTapHaptic();
    props.onToggleCollapsed(props.nodeKey);
  };

  return (
    <Show
      when={!collapsed()}
      fallback={(
        <article
          class={cn("flex scroll-mt-24 gap-1.5 sm:gap-2", props.depth > 0 && "pt-3")}
          data-comment-id={props.comment.commentId ?? props.comment.replyId ?? props.nodeKey}
          id={articleId()}
        >
          <div class="flex w-4 shrink-0 flex-col items-center sm:w-5">
            <button
              aria-label={commonCopy().expandThread}
              class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              onClick={toggleCollapsed}
              type="button"
            >
              <IconCaretDown class="size-3 -rotate-90" />
            </button>
          </div>
          <div class="min-w-0 flex-1 pb-3"><CollapsedCommentRow comment={props.comment} /></div>
        </article>
      )}
    >
      <article
        class={cn("flex scroll-mt-24 gap-1.5 sm:gap-2", props.depth > 0 && "pt-3")}
        data-comment-id={props.comment.commentId ?? props.comment.replyId ?? props.nodeKey}
        id={articleId()}
      >
        <Show when={canCollapse()}>
          <div class="flex w-4 flex-col items-center sm:w-5">
            <button
              aria-label={commonCopy().collapseThread}
              class="mt-2 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              onClick={toggleCollapsed}
              type="button"
            >
              <IconCaretDown class="size-3" />
            </button>
            <Show when={hasLoadedChildren() && !truncateDeepNesting()}>
              <div class="mt-1 w-px flex-1 bg-border" />
            </Show>
          </div>
        </Show>

        <div class="min-w-0 flex-1 pb-3">
          <CommentCard
            authorLabel={props.comment.authorLabel}
            authorHref={props.comment.authorHref}
            authorAvatarSeed={props.comment.authorAvatarSeed}
            authorAvatarSrc={props.comment.authorAvatarSrc}
            authorCommunityRole={props.comment.authorCommunityRole}
            metadataLabel={props.comment.metadataLabel}
            scoreLabel={props.comment.scoreLabel}
            timestampLabel={props.comment.timestampLabel}
            body={props.comment.body}
            bodyDir={props.comment.bodyDir}
            bodyLang={props.comment.bodyLang}
            media={props.comment.media}
            originalBody={props.comment.originalBody}
            status={props.comment.status}
            viewerVote={props.comment.viewerVote}
            canDelete={props.comment.canDelete}
            deleteActionLabel={props.comment.deleteActionLabel}
            onDelete={props.comment.onDelete}
            onVote={props.comment.onVote}
            showOriginalLabel={props.comment.showOriginalLabel}
            showTranslationLabel={props.comment.showTranslationLabel}
            replyActionLabel={props.comment.replyActionLabel}
            replyPlaceholder={props.comment.replyPlaceholder}
            cancelReplyLabel={props.comment.cancelReplyLabel}
            submitReplyLabel={props.comment.submitReplyLabel}
            onReplySubmit={props.comment.onReplySubmit}
            onReplyRequest={props.onReplyRequest ? () => props.onReplyRequest?.(props.comment) : undefined}
            onReplyIntent={props.onReplyIntent}
            replyIdentity={props.replyIdentity}
            avatarClass={props.depth > 0 ? MOBILE_NESTED_AVATAR_CLASS_NAME : undefined}
          />

          <Show when={hasLoadedChildren() && !truncateDeepNesting()}>
            <div class={CHILD_COMMENT_INDENT_CLASS_NAME} data-comment-tree-children>
              <For each={children()}>
                {(child, index) => {
                  const childKey = getCommentKey(child, `${props.nodeKey}-${index()}`);
                  return (
                    <CommentTreeNode
              collapsedIds={props.collapsedIds}
                      comment={child}
                      depth={props.depth + 1}
                      maxDepth={props.maxDepth}
                      nodeKey={childKey}
                      onReplyIntent={props.onReplyIntent}
                      onReplyRequest={props.onReplyRequest}
                      onToggleCollapsed={props.onToggleCollapsed}
                      replyIdentity={props.replyIdentity}
                    />
                  );
                }}
              </For>
            </div>
          </Show>

          <Show when={truncateDeepNesting()}>
            <div class="mt-3"><Button size="sm" variant="ghost" onClick={props.comment.onLoadMoreReplies}>{commonCopy().continueThread}</Button></div>
          </Show>

          <Show when={hasLoadMore() && loadMoreLabel()}>
            <div class="pt-2"><Button size="sm" variant="ghost" disabled={props.comment.loadingReplies} onClick={props.comment.onLoadMoreReplies}>{loadMoreLabel()}</Button></div>
          </Show>
        </div>
      </article>
    </Show>
  );
}

export interface CommentTreeProps {
  comments: PostThreadComment[];
  class?: string;
  maxDepth?: number;
  onReplyIntent?: () => void;
  onReplyRequest?: (comment: PostThreadComment) => void;
  replyIdentity?: PostThreadReplyIdentity;
}

export function CommentTree(props: CommentTreeProps) {
  const [collapsedIds, setCollapsedIds] = createSignal<Set<string>>(
    new Set(collectInitiallyCollapsedKeys(props.comments, new Set())),
  );
  const initializedKeys = new Set<string>();

  createEffect(() => props.comments, (comments) => {
    const knownKeys = collectCommentKeys(comments);
    const initiallyCollapsedKeys = collectInitiallyCollapsedKeys(comments, initializedKeys);
    setCollapsedIds((current) => {
      const next = new Set<string>();
      for (const key of current) if (knownKeys.has(key)) next.add(key);
      for (const key of initiallyCollapsedKeys) next.add(key);
      return next;
    });
    for (const key of knownKeys) initializedKeys.add(key);
  });

  const handleToggleCollapsed = (key: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div class={props.class}>
      <For each={props.comments}>
        {(comment, index) => {
          const nodeKey = getCommentKey(comment, `comment-${index()}`);
          return (
            <CommentTreeNode
              collapsedIds={collapsedIds}
              comment={comment}
              depth={0}
              maxDepth={props.maxDepth ?? DEFAULT_MAX_COMMENT_DEPTH}
              nodeKey={nodeKey}
              onReplyIntent={props.onReplyIntent}
              onReplyRequest={props.onReplyRequest}
              onToggleCollapsed={handleToggleCollapsed}
              replyIdentity={props.replyIdentity}
            />
          );
        }}
      </For>
    </div>
  );
}
