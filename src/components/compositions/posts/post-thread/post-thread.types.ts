import type { CommunityAuthorRole, PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";

export type PostThreadAuthorMode = "human" | "agent";
export type PostThreadSubmitResult = "blocked" | "submitted";
export type CommentSort = "best" | "new" | "top";

export type PostThreadCommentStatus = "published" | "hidden" | "removed" | "deleted";

export interface PostThreadCommentMedia {
  storageRef: string;
  mimeType?: string | null;
  alt?: string;
}

export interface PostThreadReplyAttachment {
  file?: File;
  label: string;
  mimeType?: string | null;
  previewUrl: string;
  sizeBytes?: number | null;
}

export interface PostThreadReplyInput {
  attachment?: PostThreadReplyAttachment | null;
  authorMode: PostThreadAuthorMode;
  body: string;
}

export interface PostThreadComment {
  commentId?: string;
  replyId?: string;
  authorLabel: string;
  authorHref?: string;
  authorAvatarSeed?: string;
  authorAvatarSrc?: string;
  authorCommunityRole?: CommunityAuthorRole | null;
  timestampLabel: string;
  scoreLabel?: string;
  viewerVote?: "up" | "down" | null;
  body?: string;
  bodyDir?: "ltr" | "rtl" | "auto";
  bodyLang?: string;
  media?: PostThreadCommentMedia[];
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
  canDelete?: boolean;
  deleteActionLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  onLoadMoreReplies?: () => void;
  onDelete?: () => void;
  onReplySubmit?: (input: PostThreadReplyInput) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
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
  onRootReplySubmit?: (input: PostThreadReplyInput) => Promise<PostThreadSubmitResult | void> | PostThreadSubmitResult | void;
  commentSort?: CommentSort;
  availableCommentSorts?: { label: string; value: CommentSort }[];
  onCommentSortChange?: (sort: CommentSort) => void;
  className?: string;
}
