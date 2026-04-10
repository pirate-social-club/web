"use client";

import * as React from "react";

import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { PostCard } from "../post-card/post-card";
import { SongItem } from "../song-item/song-item";
import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePageProps,
  ProfileScrobbleItem,
  ProfileVerificationItem,
} from "./profile-page.types";

function Panel({
  children,
  emptyCopy,
  hasContent,
  title,
}: {
  children?: React.ReactNode;
  emptyCopy: string;
  hasContent: boolean;
  title: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {hasContent ? children : (
        <div className="px-5 py-8 text-base leading-7 text-muted-foreground">
          {emptyCopy}
        </div>
      )}
    </Card>
  );
}

function FeedEmptyState({ copy }: { copy: string }) {
  return (
    <Card className="px-5 py-8 text-base leading-7 text-muted-foreground">
      {copy}
    </Card>
  );
}

function FeedStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function toSongItemProps(scrobble: ProfileScrobbleItem) {
  const { scrobbleId: _scrobbleId, ...songItem } = scrobble;
  return songItem;
}

function CommentRow({ comment }: { comment: ProfileCommentItem }) {
  return (
    <article className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground">
        {comment.communityLabel ? (
          comment.communityHref ? (
            <a className="font-medium text-foreground hover:underline" href={comment.communityHref}>
              {comment.communityLabel}
            </a>
          ) : (
            <span className="font-medium text-foreground">{comment.communityLabel}</span>
          )
        ) : null}
        <span>{comment.timestampLabel}</span>
        {comment.scoreLabel ? <span>{comment.scoreLabel}</span> : null}
      </div>
      <p className="text-base leading-7 text-foreground">{comment.body}</p>
      {comment.postTitle ? (
        comment.postHref ? (
          <a className="text-base font-medium text-primary hover:underline" href={comment.postHref}>
            {comment.postTitle}
          </a>
        ) : (
          <div className="text-base font-medium text-primary">{comment.postTitle}</div>
        )
      ) : null}
    </article>
  );
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
          <div className="space-y-2 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-base text-muted-foreground">{item.label}</div>
              <div className="text-base font-semibold text-foreground">{item.value}</div>
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

function ActivityRows({ items }: { items: ProfileActivityItem[] }) {
  return (
    <FeedStack>
      {items.map((item) => {
        if (item.kind === "post") {
          return (
            <Card className="overflow-hidden" key={item.id}>
              <PostCard className="border-b-0" {...item.post.post} />
            </Card>
          );
        }

        if (item.kind === "comment") {
          return (
            <Card className="overflow-hidden" key={item.id}>
              <CommentRow comment={item.comment} />
            </Card>
          );
        }

        return (
          <Card className="overflow-hidden" key={item.id}>
            <SongItem {...toSongItemProps(item.scrobble)} />
          </Card>
        );
      })}
    </FeedStack>
  );
}

export function OverviewPanel({ items }: { items: ProfileActivityItem[] }) {
  if (items.length === 0) return <FeedEmptyState copy="No activity yet." />;
  return <ActivityRows items={items} />;
}

export function PostsPanel({
  posts,
}: {
  posts: NonNullable<ProfilePageProps["posts"]>;
}) {
  if (posts.length === 0) return <FeedEmptyState copy="No posts yet." />;

  return (
    <FeedStack>
      {posts.map((post) => (
        <Card className="overflow-hidden" key={post.postId}>
          <PostCard className="border-b-0" {...post.post} />
        </Card>
      ))}
    </FeedStack>
  );
}

export function CommentsPanel({
  comments,
}: {
  comments: NonNullable<ProfilePageProps["comments"]>;
}) {
  return (
    <Panel emptyCopy="No comments yet." hasContent={comments.length > 0} title="Comments">
      <FeedStack>
        {comments.map((comment) => (
          <Card className="overflow-hidden" key={comment.commentId}>
            <CommentRow comment={comment} />
          </Card>
        ))}
      </FeedStack>
    </Panel>
  );
}

export function ScrobblesPanel({
  scrobbles,
}: {
  scrobbles: NonNullable<ProfilePageProps["scrobbles"]>;
}) {
  return (
    <Panel emptyCopy="No scrobbles yet." hasContent={scrobbles.length > 0} title="Scrobbles">
      <FeedStack>
        {scrobbles.map((scrobble) => (
          <Card className="overflow-hidden" key={scrobble.scrobbleId}>
            <SongItem {...toSongItemProps(scrobble)} />
          </Card>
        ))}
      </FeedStack>
    </Panel>
  );
}
