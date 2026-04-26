import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";

export type PostThreadAuthorMode = "human" | "agent";
export type PostThreadSubmitResult = "blocked" | "submitted";
export type CommentSort = "best" | "new" | "top";

export type PostThreadCommentStatus = "published" | "hidden" | "removed" | "deleted";

export interface PostThreadComment {
  commentId?: string;
  replyId?: string;
  authorLabel: string;
  authorHref?: string;
  timestampLabel: string;
  scoreLabel?: string;
  viewerVote?: "up" | "down" | null;
  body?: string;
  bodyDir?: "ltr" | "rtl" | "auto";
  bodyLang?: string;
  originalBody?: string;
  status?: PostThreadCommentStatus;
  metadataLabel?: string;
  initiallyCollapsed?: boolean;
  replyCount?: number;
  loadedReplyCount?: number;
  canLoadMoreReplies?: boolean;
  loadMoreRepliesLabel?: string;
  loadingReplies?: boolean;
  moreRepliesLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  onLoadMoreReplies?: () => void;
  onReplySubmit?: (input: { body: string; authorMode: PostThreadAuthorMode }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  onVote?: (direction: "up" | "down") => void;
  children?: PostThreadComment[];
}

export interface PostThreadProps {
  post: PostCardProps;
  postOriginal?: PostCardProps;
  commentsHeading?: string;
  commentsHeadingDir?: "ltr" | "rtl" | "auto";
  commentsHeadingLang?: string;
  commentsBody?: string;
  comments?: PostThreadComment[];
  replies?: PostThreadComment[];
  emptyCommentsLabel?: string;
  rootReplyActionLabel?: string;
  rootReplyPlaceholder?: string;
  rootReplyCancelLabel?: string;
  rootReplySubmitLabel?: string;
  onRootReplySubmit?: (input: { body: string; authorMode: PostThreadAuthorMode }) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  commentSort?: CommentSort;
  availableCommentSorts?: { label: string; value: CommentSort }[];
  onCommentSortChange?: (sort: CommentSort) => void;
  className?: string;
}
