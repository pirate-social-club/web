import { createMemo, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { fixtureImage, basePostFixture } from "../post-card/fixtures";
import { PostThread } from "./post-thread";
import type { PostThreadComment, PostThreadIdentityMode, PostThreadProps } from "./types";

const threadPost: PostThreadProps["post"] = {
  ...basePostFixture,
  authorCommunityRole: "owner",
  identityPresentation: "author_with_community",
  viewContext: "community",
  content: {
    type: "text",
    body: "What's everyone listening to this week? Drop your top tracks below. Looking for new stuff across all genres.",
  },
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
    authorHref: "#synthline",
    timestampLabel: "22m",
    scoreLabel: "84 score",
    body: "The top end on Imaginal Disk has been stuck in my head all week. Feels like late-night city music.",
    children: [
      {
        commentId: "comment_1_1",
        authorLabel: "u/modmatrix.pirate",
        authorHref: "#modmatrix",
        authorCommunityRole: "moderator",
        timestampLabel: "18m",
        scoreLabel: "31 score",
        body: "The better thread question is which records still hold up three days later, not just what hit first.",
        media: [{ storageRef: fixtureImage("pirate-comment-sleeve", 720, 520), mimeType: "image/jpeg", alt: "Album sleeve photo" }],
        children: [
          {
            commentId: "comment_1_1_1",
            authorLabel: "u/softsignal",
            authorHref: "#softsignal",
            timestampLabel: "13m",
            scoreLabel: "12 score",
            body: "That is exactly why these weekly posts work. The replies become the actual listening log.",
          },
          {
            commentId: "comment_1_1_2",
            authorLabel: "u/ghostdisk",
            authorHref: "#ghostdisk",
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
    authorHref: "#dialsanddrums",
    timestampLabel: "15m",
    scoreLabel: "53 score",
    body: "If Pirate wants these threads to feel alive on mobile, the child branches need to stay narrow and fast instead of trying to show the whole tree.",
    media: [{ storageRef: fixtureImage("rotating-earth", 720, 520), mimeType: "image/svg+xml", alt: "Animated globe" }],
    initiallyCollapsed: true,
    children: [
      {
        commentId: "comment_2_1",
        authorLabel: "u/opalwave",
        authorHref: "#opalwave",
        timestampLabel: "11m",
        scoreLabel: "19 score",
        body: "Agree. After three tiers, switch to lighter indentation and let the branch do the context work.",
        children: [
          {
            commentId: "comment_2_1_1",
            authorLabel: "u/deckobserver",
            authorHref: "#deckobserver",
            timestampLabel: "8m",
            scoreLabel: "9 score",
            body: "Permalink mode can still open the full chain. The default surface should stay selective.",
            children: [{
              commentId: "comment_2_1_1_1",
              authorLabel: "u/washedtape",
              authorHref: "#washedtape",
              timestampLabel: "3m",
              scoreLabel: "2 score",
              status: "deleted",
            }],
          },
        ],
      },
    ],
    moreRepliesLabel: "Show 18 replies",
  },
];

const meta = {
  title: "App/Posts/PostThread",
  component: PostThread,
  args: { post: threadPost, comments: baseComments, commentsHeading: "Comments" },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div class="p-4">
        <div class="mx-auto w-full max-w-4xl"><Story /></div>
      </div>
    ),
  ],
} satisfies Meta<typeof PostThread>;

export default meta;
type Story = StoryObj<typeof meta>;

const rootReplyLabels = {
  rootReplyActionLabel: "Reply",
  rootReplyCancelLabel: "Cancel",
  rootReplyPlaceholder: "Write a reply",
  rootReplySubmitLabel: "Reply",
};

export const Default: Story = {
  render: () => {
    const [viewerVotes, setViewerVotes] = createSignal<Record<string, "up" | "down" | null>>({
      comment_1: null,
      comment_1_1: "up",
      comment_1_1_1: null,
      comment_1_1_2: null,
      comment_2: null,
      comment_2_1: null,
      comment_2_1_1: null,
      comment_2_1_1_1: null,
    });
    const [sort, setSort] = createSignal<"best" | "new" | "top">("best");
    const comments = createMemo(() => withCommentVoting(baseComments, viewerVotes(), (commentId, direction) => {
      setViewerVotes((current) => ({ ...current, [commentId]: direction }));
    }));
    return (
      <PostThread
        availableCommentSorts={[{ label: "Best", value: "best" }, { label: "New", value: "new" }, { label: "Top", value: "top" }]}
        commentSort={sort()}
        comments={comments()}
        commentsHeading="Comments"
        onCommentSortChange={(value) => setSort(value)}
        onRootReplySubmit={() => "submitted"}
        post={threadPost}
        {...rootReplyLabels}
      />
    );
  },
};

export const MediaCommentsAndComposer: Story = {
  render: () => {
    const [submitted, setSubmitted] = createSignal<Array<{ body: string; identityMode?: PostThreadIdentityMode; label?: string }>>([]);
    const comments = createMemo(() => withCommentVoting([
      ...baseComments,
      ...submitted().map((item, index) => ({
        commentId: `submitted_${index}`,
        authorLabel: item.identityMode === "anonymous" ? "anon_signal-lantern-28" : "you.pirate",
        timestampLabel: "now",
        scoreLabel: "0 score",
        body: item.body,
        media: item.label ? [{ storageRef: fixtureImage("submitted-comment-image", 720, 520), mimeType: "image/jpeg", alt: item.label }] : undefined,
        replyActionLabel: "Reply",
        replyPlaceholder: "Write a reply",
        cancelReplyLabel: "Cancel",
        submitReplyLabel: "Reply",
        onReplySubmit: () => "submitted" as const,
      })),
    ], {}, () => {}));
    return (
      <PostThread
        comments={comments()}
        commentsHeading="Comments"
        onRootReplySubmit={(input) => {
          setSubmitted((current) => [...current, { body: input.body, identityMode: input.identityMode, label: input.attachment?.label }]);
          return "submitted";
        }}
        post={threadPost}
        replyIdentity={{ allowAnonymousIdentity: true, anonymousLabel: "anon_signal-lantern-28", anonymousScope: "community_stable", publicLabel: "you.pirate" }}
        {...rootReplyLabels}
      />
    );
  },
};

export const AnonymousCommentsEnabled: Story = {
  render: () => {
    const [submitted, setSubmitted] = createSignal<Array<{ body: string; identityMode?: PostThreadIdentityMode }>>([]);
    const comments = createMemo(() => withCommentVoting([
      ...submitted().map((item, index) => ({
        commentId: `anonymous_submitted_${index}`,
        authorLabel: item.identityMode === "anonymous" ? "anon_signal-lantern-28" : "you.pirate",
        timestampLabel: "now",
        scoreLabel: "0 score",
        body: item.body,
        replyActionLabel: "Reply",
        replyPlaceholder: "Write a reply",
        cancelReplyLabel: "Cancel",
        submitReplyLabel: "Reply",
        onReplySubmit: () => "submitted" as const,
      })),
      ...baseComments,
    ], {}, () => {}));
    return (
      <PostThread
        comments={comments()}
        commentsHeading="Comments"
        onRootReplySubmit={(input) => {
          setSubmitted((current) => [...current, { body: input.body, identityMode: input.identityMode }]);
          return "submitted";
        }}
        post={threadPost}
        replyIdentity={{ allowAnonymousIdentity: true, anonymousLabel: "anon_signal-lantern-28", anonymousScope: "community_stable", publicLabel: "you.pirate" }}
        {...rootReplyLabels}
      />
    );
  },
};

export const ThreadStableAnonymousPolicy: Story = {
  args: {
    comments: baseComments,
    onRootReplySubmit: () => "submitted",
    replyIdentity: { allowAnonymousIdentity: true, anonymousLabel: "anon_fable-corsair-00", anonymousScope: "thread_stable", publicLabel: "you.pirate" },
    ...rootReplyLabels,
  },
};

export const NoRepliesYet: Story = { args: { comments: [] } };

export const SparseOneLevelReply: Story = {
  args: {
    comments: [{
      commentId: "sparse_parent",
      authorLabel: "nadia-park.pirate",
      authorHref: "#nadia",
      timestampLabel: "3h",
      scoreLabel: "2",
      body: "I would keep onboarding lightweight and make the first useful action obvious.",
      replyActionLabel: "Reply",
      replyPlaceholder: "Write a reply",
      cancelReplyLabel: "Cancel",
      submitReplyLabel: "Reply",
      onReplySubmit: () => "submitted",
      children: [{
        commentId: "sparse_reply",
        authorLabel: "eli-ramos.pirate",
        authorHref: "#eli",
        timestampLabel: "3h",
        scoreLabel: "0",
        body: "I would hide sparse counts for a bit and highlight unanswered threads instead.",
        replyActionLabel: "Reply",
        replyPlaceholder: "Write a reply",
        cancelReplyLabel: "Cancel",
        submitReplyLabel: "Reply",
        onReplySubmit: () => "submitted",
      }],
    }],
  },
};

function makeDeepThread(depth: number, maxDepth: number): PostThreadComment {
  const comment: PostThreadComment = {
    commentId: `deep_${depth}`,
    authorLabel: `u/deep_${depth}`,
    authorHref: `#deep-${depth}`,
    timestampLabel: `${maxDepth - depth}m`,
    scoreLabel: `${maxDepth - depth + 1} score`,
    body: depth === maxDepth
      ? "This is the deepest comment in the thread. Beyond this point the UI truncates and offers a Continue this thread link instead of nesting further."
      : `Comment at depth ${depth}. Each level indents slightly with a thread line on the left.`,
    replyActionLabel: "Reply",
    replyPlaceholder: "Write a reply",
    cancelReplyLabel: "Cancel",
    submitReplyLabel: "Reply",
    onReplySubmit: () => "submitted",
  };
  if (depth < maxDepth) comment.children = [makeDeepThread(depth + 1, maxDepth)];
  return comment;
}

export const DeeplyNested: Story = { args: { comments: [makeDeepThread(0, 10)] } };
