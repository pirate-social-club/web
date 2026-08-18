import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { IconButton, IconCaretDown, ResponsiveOptionSelect } from "../../../design-system";
import { basePostFixture } from "../post-card/fixtures";
import { MobileReplyScreen } from "./mobile-reply-screen";
import { MobileThreadScreen } from "./mobile-thread-screen";
import { PostThread } from "./post-thread";
import { ReplyContextCard } from "./reply-context-card";
import { ReplyIdentitySelect } from "./reply-identity-select";
import type { PostThreadComment, PostThreadIdentityMode } from "./types";

const threadPost = {
  ...basePostFixture,
  authorCommunityRole: "owner" as const,
  identityPresentation: "author_with_community" as const,
  viewContext: "community" as const,
  content: {
    type: "text" as const,
    body: "What's everyone listening to this week? Drop your top tracks below. Looking for new stuff across all genres.",
  },
};

const mobileThreadComments: PostThreadComment[] = [
  {
    commentId: "mobile-thread-1",
    authorLabel: "u/synthline",
    authorHref: "#synthline",
    body: "Top-level comments work on mobile. The trouble starts once reply composition tries to live inside the same tree.",
    scoreLabel: "84",
    timestampLabel: "22m",
    children: [{
      commentId: "mobile-thread-1-1",
      authorLabel: "u/modmatrix.pirate",
      authorHref: "#modmatrix",
      body: "Keep the thread readable, then open a separate reply view when someone commits to writing.",
      authorCommunityRole: "moderator",
      scoreLabel: "31",
      timestampLabel: "18m",
    }],
  },
  {
    commentId: "mobile-thread-2",
    authorLabel: "u/dialsanddrums",
    authorHref: "#dialsanddrums",
    body: "A focused reply route can pin the parent comment, lift the keyboard immediately, and avoid the footer fighting for space.",
    scoreLabel: "53",
    timestampLabel: "15m",
  },
];

function withCommentVoting(comments: PostThreadComment[], viewerVotes: Record<string, "up" | "down" | null>, onVote: (commentId: string, direction: "up" | "down") => void): PostThreadComment[] {
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
  title: "App/Posts/PostThread/MobileFlows",
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreadRead: Story = {
  render: () => {
    const [viewerVotes, setViewerVotes] = createSignal<Record<string, "up" | "down" | null>>({
      "mobile-thread-1": "up",
      "mobile-thread-1-1": null,
      "mobile-thread-2": null,
    });
    const [sort, setSort] = createSignal<"best" | "new" | "top">("best");
    const comments = () => withCommentVoting(mobileThreadComments, viewerVotes(), (commentId, direction) => {
      setViewerVotes((current) => ({ ...current, [commentId]: direction }));
    });
    const sortOptions: { label: string; value: "best" | "new" | "top" }[] = [
      { label: "Best", value: "best" },
      { label: "New", value: "new" },
      { label: "Top", value: "top" },
    ];
    return (
      <MobileThreadScreen
        title="c/yeezy"
        trailingAction={(
          <ResponsiveOptionSelect
            ariaLabel="Sort comments"
            drawerTitle="Comments"
            mobileTriggerContent={<IconButton aria-label="Sort comments" variant="ghost"><IconCaretDown class="size-6" /></IconButton>}
            onValueChange={(value) => setSort(value as "best" | "new" | "top")}
            options={sortOptions}
            value={sort()}
          />
        )}
      >
        <div class="space-y-3 pb-4">
          <PostThread
            availableCommentSorts={sortOptions}
            commentSort={sort()}
            comments={comments()}
            commentsHeading="Comments"
            onCommentSortChange={(value) => setSort(value)}
            post={threadPost}
          />
        </div>
      </MobileThreadScreen>
    );
  },
};

export const ReplyToPost: Story = {
  render: () => {
    const [body, setBody] = createSignal("");
    const [identityMode, setIdentityMode] = createSignal<PostThreadIdentityMode>("public");
    return (
      <MobileReplyScreen
        body={body()}
        context={<ReplyContextCard authorLabel="u/kevin.tameimpala" body="What's everyone listening to this week? Drop your top tracks below. Looking for new stuff across all genres." eyebrow="c/yeezy" metadata="9d" />}
        identityControl={<ReplyIdentitySelect identity={{ allowAnonymousIdentity: true, anonymousLabel: "anon_signal-lantern-28", anonymousScope: "community_stable", publicLabel: "you.pirate" }} onChange={setIdentityMode} value={identityMode()} />}
        onBodyChange={setBody}
        title="Reply"
      />
    );
  },
};

export const ReplyToComment: Story = {
  render: () => {
    const [body, setBody] = createSignal("");
    const [identityMode, setIdentityMode] = createSignal<PostThreadIdentityMode>("public");
    return (
      <MobileReplyScreen
        body={body()}
        context={<ReplyContextCard authorLabel="u/dialsanddrums" body="A focused reply route can pin the parent comment, lift the keyboard immediately, and avoid the footer fighting for space." metadata="15m" />}
        identityControl={<ReplyIdentitySelect identity={{ allowAnonymousIdentity: true, anonymousLabel: "anon_fable-corsair-00", anonymousScope: "thread_stable", publicLabel: "you.pirate" }} onChange={setIdentityMode} value={identityMode()} />}
        onBodyChange={setBody}
        title="Reply"
      />
    );
  },
};
