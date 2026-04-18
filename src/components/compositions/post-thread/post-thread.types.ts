import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";

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
  originalBody?: string;
  status?: PostThreadCommentStatus;
  metadataLabel?: string;
  highlighted?: boolean;
  initiallyCollapsed?: boolean;
  moreRepliesLabel?: string;
  replyActionLabel?: string;
  replyPlaceholder?: string;
  cancelReplyLabel?: string;
  submitReplyLabel?: string;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
  onLoadMoreReplies?: () => void;
  onReplySubmit?: (body: string) => Promise<void> | void;
  onVote?: (direction: "up" | "down") => void;
  children?: PostThreadComment[];
}

export interface PostThreadProps {
  post: PostCardProps;
  postOriginal?: PostCardProps;
  postShowOriginalLabel?: string;
  postShowTranslationLabel?: string;
  commentsHeading?: string;
  commentsBody?: string;
  comments?: PostThreadComment[];
  replies?: PostThreadComment[];
  emptyCommentsLabel?: string;
  rootReplyActionLabel?: string;
  rootReplyPlaceholder?: string;
  rootReplyCancelLabel?: string;
  rootReplySubmitLabel?: string;
  onRootReplySubmit?: (body: string) => Promise<void> | void;
  className?: string;
}
