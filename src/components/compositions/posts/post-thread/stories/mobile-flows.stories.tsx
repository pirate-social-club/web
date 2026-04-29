import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { SlidersHorizontal } from "@phosphor-icons/react";

import { POSTS_BY_ID } from "@/app/mocks";
import { IconButton } from "@/components/primitives/icon-button";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";

import { MobileReplyScreen } from "../mobile-reply-screen";
import { MobileThreadScreen } from "../mobile-thread-screen";
import { PostThread } from "../post-thread";
import { ReplyContextCard } from "../reply-context-card";
import type { PostThreadComment } from "../post-thread.types";

const threadPost = {
  ...POSTS_BY_ID.pst_01_weekly_listening,
  authorCommunityRole: "owner" as const,
  authorNationalityBadgeCountry: "US",
  authorNationalityBadgeLabel: "Verified United States nationality",
  identityPresentation: "author_with_community" as const,
  viewContext: "community" as const,
};

const mobileThreadComments: PostThreadComment[] = [
  {
    commentId: "mobile-thread-1",
    authorLabel: "u/synthline",
    authorHref: "#",
    body: "Top-level comments work on mobile. The trouble starts once reply composition tries to live inside the same tree.",
    scoreLabel: "84",
    timestampLabel: "22m",
    children: [
      {
        commentId: "mobile-thread-1-1",
        authorLabel: "u/modmatrix.pirate",
        authorHref: "#",
        body: "Keep the thread readable, then open a separate reply view when someone commits to writing.",
        authorCommunityRole: "moderator",
        scoreLabel: "31",
        timestampLabel: "18m",
      },
    ],
  },
  {
    commentId: "mobile-thread-2",
    authorLabel: "u/dialsanddrums",
    authorHref: "#",
    body: "A focused reply route can pin the parent comment, lift the keyboard immediately, and avoid the footer fighting for space.",
    scoreLabel: "53",
    timestampLabel: "15m",
  },
];

function withCommentVoting(
  comments: PostThreadComment[],
  viewerVotes: Record<string, "up" | "down" | null>,
  onVote: (commentId: string, direction: "up" | "down") => void,
): PostThreadComment[] {
  return comments.map((comment) => {
    const commentId = comment.commentId ?? "";

    return {
      ...comment,
      cancelReplyLabel: "Cancel",
      children: comment.children ? withCommentVoting(comment.children, viewerVotes, onVote) : undefined,
      onVote: commentId ? (direction) => onVote(commentId, direction) : undefined,
      onReplySubmit: () => "submitted" as const,
      replyActionLabel: "Reply",
      replyPlaceholder: "Write a reply",
      status: comment.status ?? "published",
      submitReplyLabel: "Reply",
      viewerVote: viewerVotes[commentId] ?? null,
    };
  });
}

const meta = {
  title: "Compositions/Posts/PostThread/MobileFlows",
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreadRead: Story = {
  render: function ThreadReadStory() {
    const [viewerVotes, setViewerVotes] = React.useState<Record<string, "up" | "down" | null>>({
      "mobile-thread-1": "up",
      "mobile-thread-1-1": null,
      "mobile-thread-2": null,
    });
    const [sort, setSort] = React.useState<"best" | "new" | "top">("best");

    const comments = withCommentVoting(mobileThreadComments, viewerVotes, (commentId, direction) => {
      setViewerVotes((current) => ({
        ...current,
        [commentId]: direction,
      }));
    });

    return (
      <MobileThreadScreen
        title="c/yeezy"
        trailingAction={(
          <ResponsiveOptionSelect
            ariaLabel="Sort comments"
            drawerTitle="Comments"
            mobileTrigger={(
              <IconButton aria-label="Sort comments" variant="ghost">
                <SlidersHorizontal className="size-6" weight="bold" />
              </IconButton>
            )}
            onValueChange={setSort}
            options={[
              { label: "Best", value: "best" },
              { label: "New", value: "new" },
              { label: "Top", value: "top" },
            ]}
            value={sort}
          />
        )}
      >
        <div className="space-y-3 pb-4">
          <PostThread
            availableCommentSorts={[
              { label: "Best", value: "best" },
              { label: "New", value: "new" },
              { label: "Top", value: "top" },
            ]}
            commentSort={sort}
            comments={comments}
            commentsHeading="Comments"
            onCommentSortChange={setSort}
            post={threadPost}
          />
        </div>
      </MobileThreadScreen>
    );
  },
};

export const ReplyToPost: Story = {
  render: function ReplyToPostStory() {
    const [body, setBody] = React.useState("");

    return (
      <MobileReplyScreen
        body={body}
        context={(
          <ReplyContextCard
            authorLabel="u/kevin.tameimpala"
            body="What's everyone listening to this week? Drop your top tracks below. Looking for new stuff across all genres."
            eyebrow="c/yeezy"
            metadata="9d"
          />
        )}
        onBodyChange={setBody}
        title="Reply"
      />
    );
  },
};

export const ReplyToComment: Story = {
  render: function ReplyToCommentStory() {
    const [body, setBody] = React.useState("");

    return (
      <MobileReplyScreen
        body={body}
        context={(
          <ReplyContextCard
            authorLabel="u/dialsanddrums"
            body="A focused reply route can pin the parent comment, lift the keyboard immediately, and avoid the footer fighting for space."
            metadata="15m"
          />
        )}
        onBodyChange={setBody}
        title="Reply"
      />
    );
  },
};
