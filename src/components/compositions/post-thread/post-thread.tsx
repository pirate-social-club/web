import * as React from "react";

import { PostCard } from "@/components/compositions/post-card/post-card";
import { cn } from "@/lib/utils";
import type { PostThreadProps } from "./post-thread.types";

function ReplyRow({
  authorHref,
  authorLabel,
  body,
  scoreLabel,
  timestampLabel,
}: {
  authorHref?: string;
  authorLabel: string;
  body: string;
  scoreLabel?: string;
  timestampLabel: string;
}) {
  return (
    <article className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-[1.25] text-muted-foreground">
        {authorHref ? (
          <a className="font-semibold text-foreground hover:underline" href={authorHref}>
            {authorLabel}
          </a>
        ) : (
          <span className="font-semibold text-foreground">{authorLabel}</span>
        )}
        <span aria-hidden="true">·</span>
        <span>{timestampLabel}</span>
        {scoreLabel ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{scoreLabel}</span>
          </>
        ) : null}
      </div>
      <p className="text-base leading-[1.4] text-foreground">{body}</p>
    </article>
  );
}

export function PostThread({
  post,
  commentsHeading = "Comments",
  commentsBody,
  replies = [],
  className,
}: PostThreadProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
        <PostCard {...post} className="border-b-0" />
      </div>

      <section className="space-y-3">
        <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card px-4 py-3">
          <div className="text-base font-medium text-foreground">{commentsHeading}</div>
          {commentsBody ? (
            <p className="mt-2 text-base leading-[1.4] text-muted-foreground">{commentsBody}</p>
          ) : null}
        </div>

        {replies.map((reply) => (
          <ReplyRow
            authorHref={reply.authorHref}
            authorLabel={reply.authorLabel}
            body={reply.body}
            key={reply.replyId}
            scoreLabel={reply.scoreLabel}
            timestampLabel={reply.timestampLabel}
          />
        ))}
      </section>
    </div>
  );
}
