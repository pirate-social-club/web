import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { POSTS_BY_ID } from "@/app/mocks";
import { PostThread } from "../post-thread";
import type { PostThreadComment } from "../post-thread.types";

const threadPost = {
  ...POSTS_BY_ID.pst_01_weekly_listening,
  authorNationalityBadgeCountry: "US",
  authorNationalityBadgeLabel: "Verified United States nationality",
};

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

const baseComments: PostThreadComment[] = [
  {
    commentId: "comment_1",
    authorLabel: "u/synthline",
    authorHref: "#",
    timestampLabel: "22m",
    scoreLabel: "84 score",
    body: "The top end on Imaginal Disk has been stuck in my head all week. Feels like late-night city music.",
    children: [
      {
        commentId: "comment_1_1",
        authorLabel: "u/modmatrix.pirate",
        authorHref: "#",
        timestampLabel: "18m",
        scoreLabel: "31 score",
        metadataLabel: "mod",
        body: "The better thread question is which records still hold up three days later, not just what hit first.",
        children: [
          {
            commentId: "comment_1_1_1",
            authorLabel: "u/softsignal",
            authorHref: "#",
            timestampLabel: "13m",
            scoreLabel: "12 score",
            body: "That is exactly why these weekly posts work. The replies become the actual listening log.",
          },
          {
            commentId: "comment_1_1_2",
            authorLabel: "u/ghostdisk",
            authorHref: "#",
            timestampLabel: "7m",
            scoreLabel: "4 score",
            status: "removed",
          },
        ],
        moreRepliesLabel: "Load 6 more replies",
      },
    ],
  },
  {
    commentId: "comment_2",
    authorLabel: "u/dialsanddrums",
    authorHref: "#",
    timestampLabel: "15m",
    scoreLabel: "53 score",
    body: "If Pirate wants these threads to feel alive on mobile, the child branches need to stay narrow and fast instead of trying to show the whole tree.",
    initiallyCollapsed: true,
    children: [
      {
        commentId: "comment_2_1",
        authorLabel: "u/opalwave",
        authorHref: "#",
        timestampLabel: "11m",
        scoreLabel: "19 score",
        body: "Agree. After three tiers, switch to lighter indentation and let the branch do the context work.",
        children: [
          {
            commentId: "comment_2_1_1",
            authorLabel: "u/deckobserver",
            authorHref: "#",
            timestampLabel: "8m",
            scoreLabel: "9 score",
            body: "Permalink mode can still open the full chain. The default surface should stay selective.",
            children: [
              {
                commentId: "comment_2_1_1_1",
                authorLabel: "u/washedtape",
                authorHref: "#",
                timestampLabel: "3m",
                scoreLabel: "2 score",
                status: "deleted",
              },
            ],
          },
        ],
      },
    ],
    moreRepliesLabel: "Show 18 replies",
  },
];

const meta = {
  title: "Compositions/Posts/PostThread",
  component: PostThread,
  args: {
    post: threadPost,
    comments: baseComments,
    commentsHeading: "Comments",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ padding: 16 }}>
        <div style={{ margin: "0 auto", width: "min(100%, 880px)" }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PostThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [viewerVotes, setViewerVotes] = React.useState<Record<string, "up" | "down" | null>>({
      comment_1: null,
      comment_1_1: "up",
      comment_1_1_1: null,
      comment_1_1_2: null,
      comment_2: null,
      comment_2_1: null,
      comment_2_1_1: null,
      comment_2_1_1_1: null,
    });
    const [sort, setSort] = React.useState<"best" | "new" | "top">("best");

    const comments = withCommentVoting(baseComments, viewerVotes, (commentId, direction) => {
      setViewerVotes((current) => ({
        ...current,
        [commentId]: direction,
      }));
    });

    return (
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
    );
  },
};

export const NoRepliesYet: Story = {
  args: {
    comments: [],
  },
};

export const SparseOneLevelReply: Story = {
  args: {
    comments: [
      {
        commentId: "sparse_parent",
        authorLabel: "nadia-park.pirate",
        authorHref: "#",
        timestampLabel: "3h",
        scoreLabel: "2",
        body: "I would keep onboarding lightweight and make the first useful action obvious.",
        replyActionLabel: "Reply",
        replyPlaceholder: "Write a reply",
        cancelReplyLabel: "Cancel",
        submitReplyLabel: "Reply",
        onReplySubmit: () => "submitted",
        children: [
          {
            commentId: "sparse_reply",
            authorLabel: "eli-ramos.pirate",
            authorHref: "#",
            timestampLabel: "3h",
            scoreLabel: "0",
            body: "I would hide sparse counts for a bit and highlight unanswered threads instead.",
            replyActionLabel: "Reply",
            replyPlaceholder: "Write a reply",
            cancelReplyLabel: "Cancel",
            submitReplyLabel: "Reply",
            onReplySubmit: () => "submitted",
          },
        ],
      },
    ],
  },
};

function makeDeepThread(depth: number, maxDepth: number): PostThreadComment {
  const id = `deep_${depth}`;
  const comment: PostThreadComment = {
    commentId: id,
    authorLabel: `u/deep_${depth}`,
    authorHref: "#",
    timestampLabel: `${maxDepth - depth}m`,
    scoreLabel: `${maxDepth - depth + 1} score`,
    body: depth === maxDepth
      ? "This is the deepest comment in the thread. Beyond this point the UI truncates and offers a 'Continue this thread' link instead of nesting further."
      : `Comment at depth ${depth}. Each level indents slightly with a thread line on the left.`,
    replyActionLabel: "Reply",
    replyPlaceholder: "Write a reply",
    cancelReplyLabel: "Cancel",
    submitReplyLabel: "Reply",
    onReplySubmit: () => "submitted",
  };

  if (depth < maxDepth) {
    comment.children = [makeDeepThread(depth + 1, maxDepth)];
  }

  return comment;
}

export const DeeplyNested: Story = {
  args: {
    comments: [makeDeepThread(0, 10)],
  },
};
