import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { POSTS_BY_ID } from "@/app/mocks";
import { PostThread } from "../post-thread";

const threadPost = POSTS_BY_ID.pst_01_weekly_listening;

const meta = {
  title: "Compositions/PostThread",
  component: PostThread,
  args: {
    post: threadPost,
    commentsHeading: "Comments",
    commentsBody: "Thread replies are not fully scaffolded yet. This composition locks the destination surface and row rhythm.",
    replies: [
      {
        replyId: "reply_1",
        authorLabel: "u/synthline",
        authorHref: "#",
        timestampLabel: "22m",
        scoreLabel: "84 score",
        body: "The top end on Imaginal Disk has been stuck in my head all week. Feels like late-night city music.",
      },
      {
        replyId: "reply_2",
        authorLabel: "u/modmatrix.pirate",
        authorHref: "#",
        timestampLabel: "9m",
        scoreLabel: "31 score",
        body: "If people keep posting lists like this, the follow-up question should be what actually held up after three days.",
      },
    ],
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
    replies: [],
  },
};
