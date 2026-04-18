import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { POSTS_BY_ID } from "@/app/mocks";
import { PostThread } from "../post-thread";
import type { PostThreadComment } from "../post-thread.types";

const threadPost = POSTS_BY_ID.pst_01_weekly_listening;

const comments: PostThreadComment[] = [
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
            highlighted: true,
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
  title: "Compositions/PostThread",
  component: PostThread,
  args: {
    post: threadPost,
    commentsHeading: "Comments",
    commentsBody: "Top-level comments land first. Branches expand only when someone asks for them.",
    comments,
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

export const Default: Story = {};

export const NoRepliesYet: Story = {
  args: {
    comments: [],
  },
};
