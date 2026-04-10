import type { PostCardProps } from "@/components/compositions/post-card/post-card.types";

export interface PostThreadReply {
  replyId: string;
  authorLabel: string;
  authorHref?: string;
  timestampLabel: string;
  scoreLabel?: string;
  body: string;
}

export interface PostThreadProps {
  post: PostCardProps;
  commentsHeading?: string;
  commentsBody?: string;
  replies?: PostThreadReply[];
  className?: string;
}
