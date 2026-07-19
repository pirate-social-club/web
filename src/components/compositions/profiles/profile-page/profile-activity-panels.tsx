"use client";

import { Type } from "@/components/primitives/type";
import * as React from "react";

import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentCard } from "../../posts/post-thread/comment-card";
import { PostCard } from "../../posts/post-card/post-card";
import { PostCardSkeleton } from "../../posts/post-card/post-card-skeleton";
export { WalletPanel } from "./profile-wallet-panel";
import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePageProps,
  ProfileVerificationItem,
} from "./profile-page.types";

function FeedEmptyState({ copy }: { copy: string }) {
  const isMobile = useIsMobile();
  return (
    <Card className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "border-0 bg-transparent px-0 shadow-none")}>
      {copy}
    </Card>
  );
}

function FeedSkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <FeedStack>
      {Array.from({ length: count }, (_, rowNumber) => (
        <PostCardSkeleton key={`profile-activity-skeleton-${rowNumber}`} showMedia={rowNumber === 0} />
      ))}
    </FeedStack>
  );
}

function FeedStack({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <div className={cn(
      "space-y-3",
      isMobile && "overflow-hidden border-y border-border-soft space-y-0",
    )}>
      {children}
    </div>
  );
}

function MobileFlatCard({
  children,
  isLast,
}: {
  children: React.ReactNode;
  isLast: boolean;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden",
        "rounded-none border-x-0 border-t-0 bg-transparent shadow-none md:rounded-[var(--radius-lg)] md:border md:bg-card md:shadow-[var(--shadow-md)]",
        isLast && "border-b-0 md:border",
      )}
    >
      {children}
    </Card>
  );
}

function isInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(
    'a, button, input, textarea, select, summary, [role="button"], [role="link"], [data-post-card-interactive="true"]',
  );

  return interactiveElement != null && currentTarget.contains(interactiveElement);
}

function CommentRow({
  comment,
  isLast = false,
  onNavigate = defaultNavigate,
}: {
  comment: ProfileCommentItem;
  isLast?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const isClickable = Boolean(comment.postHref);

  return (
    <article
      className={cn(
        "border-b border-border-soft px-5 py-4 text-start transition-colors md:border-b-0",
        isLast && "border-b-0",
        isClickable && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
      )}
      onClick={(event) => {
        if (!isClickable || !comment.postHref || isInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        onNavigate(comment.postHref);
      }}
      onKeyDown={(event) => {
        if (!isClickable || !comment.postHref || isInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        onNavigate(comment.postHref);
      }}
      role={isClickable ? "link" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <CommentCard
        authorLabel={comment.authorLabel}
        authorHref={comment.authorHref}
        authorAvatarSeed={comment.authorAvatarSeed}
        authorAvatarSrc={comment.authorAvatarSrc}
        metadataLabel={comment.communityLabel}
        scoreLabel={comment.scoreLabel}
        timestampLabel={comment.timestampLabel}
        body={comment.body}
        bodyDir={comment.bodyDir}
        bodyLang={comment.bodyLang}
        viewerVote={comment.viewerVote}
        onVote={comment.onVote}
      />
      {comment.postTitle ? (
        <div className="mt-3">
          {comment.postHref ? (
            <a className="text-base font-medium text-foreground hover:underline" href={comment.postHref}>
              {comment.postTitle}
            </a>
          ) : (
            <div className="text-base font-medium text-foreground">{comment.postTitle}</div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function defaultNavigate(href: string) {
  if (typeof window !== "undefined") {
    window.location.assign(href);
  }
}

export function VerificationRows({
  verificationItems,
}: {
  verificationItems: ProfileVerificationItem[];
}) {
  return (
    <div>
      {verificationItems.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <Separator /> : null}
          <div className="space-y-2 px-5 py-4 text-start">
            <div className="flex items-start justify-between gap-4">
              <div className="text-base text-muted-foreground">{item.label}</div>
              <Type as="div" variant="body-strong">{item.value}</Type>
            </div>
            {item.note ? (
              <div className="text-base leading-6 text-muted-foreground">{item.note}</div>
            ) : null}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function ActivityRows({
  items,
  onNavigate,
}: {
  items: ProfileActivityItem[];
  onNavigate?: (href: string) => void;
}) {
  return (
    <FeedStack>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (item.kind === "post") {
          return (
            <MobileFlatCard isLast={isLast} key={item.id}>
              <PostCard className="border-b-0" {...item.post.post} />
            </MobileFlatCard>
          );
        }

        if (item.kind === "comment") {
          return <CommentRow isLast={isLast} key={item.id} comment={item.comment} onNavigate={onNavigate} />;
        }
      })}
    </FeedStack>
  );
}

export function OverviewPanel({
  error,
  items,
  loading = false,
  onNavigate,
}: {
  error?: string | null;
  items: ProfileActivityItem[];
  loading?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  if (error) return <FeedEmptyState copy={error} />;
  if (loading) return <FeedSkeletonRows />;
  if (items.length === 0) return <FeedEmptyState copy={copy.emptyState} />;
  return <ActivityRows items={items} onNavigate={onNavigate} />;
}

export function PostsPanel({
  error,
  loading = false,
  posts,
}: {
  error?: string | null;
  loading?: boolean;
  posts: NonNullable<ProfilePageProps["posts"]>;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  if (error) return <FeedEmptyState copy={error} />;
  if (loading) return <FeedSkeletonRows />;
  if (posts.length === 0) return <FeedEmptyState copy={copy.emptyState} />;

  return (
    <FeedStack>
      {posts.map((post, index) => (
        <MobileFlatCard isLast={index === posts.length - 1} key={post.postId}>
          <PostCard className="border-b-0" {...post.post} />
        </MobileFlatCard>
      ))}
    </FeedStack>
  );
}

export function CommentsPanel({
  comments,
  error,
  loading = false,
  onNavigate,
}: {
  comments: NonNullable<ProfilePageProps["comments"]>;
  error?: string | null;
  loading?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  const isMobile = useIsMobile();

  if (error) {
    return <FeedEmptyState copy={error} />;
  }

  if (loading) {
    return <FeedSkeletonRows />;
  }

  if (comments.length === 0) {
    return (
      <div className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "px-0")}>
        {copy.emptyState}
      </div>
    );
  }

  return (
    <FeedStack>
      {comments.map((comment, index) => (
        <CommentRow
          isLast={index === comments.length - 1}
          key={comment.commentId}
          comment={comment}
          onNavigate={onNavigate}
        />
      ))}
    </FeedStack>
  );
}
