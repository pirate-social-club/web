import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  basePostFixture,
  fixtureImage,
  longTextPostBodyFixture,
  noop,
} from "./fixtures";
import { PostCard } from "./post-card";
import { PostCardSkeleton } from "./skeleton";
import type { PostCardProps } from "./types";

const basePost: PostCardProps = {
  ...basePostFixture,
  content: {
    type: "text",
    body: "Drop your top tracks below. Looking for new stuff across all genres.",
  },
};
const meta = {
  title: "App/Posts/PostCard/States",
  component: PostCard,
  args: basePost,
  decorators: [
    (Story) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// ENGAGEMENT STATES
// ============================================================================

export const Upvoted: Story = {
  name: "State / Upvoted",
  render: () => (
    <PostCard {...basePost} engagement={{ ...basePost.engagement, score: 343, viewerVote: "up" }} />
  ),
};

export const Downvoted: Story = {
  name: "State / Downvoted",
  render: () => (
    <PostCard {...basePost} engagement={{ ...basePost.engagement, score: -12, viewerVote: "down" }} />
  ),
};

export const Saved: Story = {
  name: "State / Saved",
  render: () => (
    <PostCard {...basePost} engagement={{ ...basePost.engagement, saved: true }} />
  ),
};

export const HighEngagement: Story = {
  name: "State / High Engagement",
  render: () => (
    <PostCard
      {...basePost}
      title="Announcing pirate v2 - the next generation of music discovery"
      content={{
        type: "image",
        src: fixtureImage("pirateweb", 600, 400),
        alt: "Feature announcement graphic",
      }}
      engagement={{ score: 12400, commentCount: 832, saved: true }}
    />
  ),
};

// ============================================================================
// LAYOUT VARIANTS
// ============================================================================

export const LongTitle: Story = {
  name: "Layout / Long Title",
  render: () => (
    <PostCard
      {...basePost}
      title="I spent three months building a recommendation engine from scratch using only collaborative filtering and cosine similarity - here is what I learned about the math behind music discovery and why most people get the fundamental approach wrong"
      content={{
        type: "text",
        body: "This is a long read. TL;DR: it's all about the weight matrix. The full writeup covers the dataset preparation, the cold start problem, and how I evaluated against existing solutions. I also open-sourced the training pipeline.",
      }}
      engagement={{ ...basePost.engagement, score: 4521, commentCount: 312 }}
    />
  ),
};

export const LongTextFeedPreview: Story = {
  name: "Layout / Long Text Feed Preview",
  render: () => (
    <PostCard
      {...basePost}
      content={{ type: "text", body: longTextPostBodyFixture }}
      engagement={{ ...basePost.engagement, score: 214, commentCount: 38 }}
      postHref="/p/post_long_text_story"
      onNavigate={noop}
      title="Long text post should not consume the feed"
      viewContext="community"
    />
  ),
};

export const NoClubContext: Story = {
  name: "Layout / No Community",
  render: () => (
    <PostCard
      viewContext="profile"
      byline={{
        author: { kind: "user", label: "u/captainjames", href: "#" },
        timestampLabel: "1h",
      }}
      title="Just a personal thought"
      content={{ type: "text", body: "Sometimes you just need to post something." }}
      engagement={{ score: 5, commentCount: 0 }}
    />
  ),
};

export const AvatarPlaceholder: Story = {
  name: "Layout / Avatar Placeholder",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        ...basePost.byline,
        author: { kind: "user", label: "u/newuser", href: "#" },
        community: { kind: "community", label: "c/music", href: "#" },
      }}
      title="Post with placeholder avatar"
      content={{ type: "text", body: "This shows the avatar fallback when no image is provided." }}
    />
  ),
};

export const CommunityFeedPost: Story = {
  name: "Layout / Community Feed",
  render: () => (
    <PostCard
      {...basePost}
      viewContext="community"
      byline={{
        community: { kind: "community", label: "c/tameimpala", href: "#" },
        author: { kind: "user", label: "u/kevin.tameimpala", href: "#", avatarSrc: fixtureImage("avatar-author-2", 100, 100) },
        timestampLabel: "3h",
      }}
      title="Studio demo from last night"
    />
  ),
};

export const RtlAuthorAlignment: Story = {
  name: "Layout / RTL Author Alignment",
  globals: { direction: "rtl" },
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/Infinity", href: "#" },
        author: {
          kind: "user",
          label: "sable-harbor-4143.pirate",
          href: "#",
          avatarSrc: fixtureImage("avatar-rtl", 100, 100),
        },
        timestampLabel: "31m",
      }}
      title="اختبار أهلاً بالعالم"
      titleDir="rtl"
      content={{ type: "text", body: "هل تسمعني؟", bodyDir: "rtl" }}
    />
  ),
};

export const ClickableCard: Story = {
  name: "Interaction / Clickable Card",
  render: () => {
    const [navigatedTo, setNavigatedTo] = createSignal<string | null>(null);
    return (
      <div class="flex flex-col gap-2">
        <PostCard
          {...basePost}
          postHref="/p/pst_01_weekly_listening"
          onNavigate={setNavigatedTo}
          title="Clicking the card should open the post"
        />
        <output class="text-base text-muted-foreground" data-testid="navigated-to">
          {navigatedTo() ?? "not navigated"}
        </output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("link", { name: /Clicking the card should open the post/ }));
    await expect(canvas.getByTestId("navigated-to")).toHaveTextContent("/p/pst_01_weekly_listening");
  },
};

// ============================================================================
// FORMATTING / LOADING / MODERATION STATES
// ============================================================================

export const SpoilerText: Story = {
  name: "Formatting / Spoilers",
  render: () => (
    <PostCard
      {...basePost}
      title="The ending of that new album caught me off guard"
      content={{
        type: "text",
        body: "Can't believe they went with >!that twist in the final track!<. Also the collab with >!Daft Punk!< was unexpected.",
      }}
    />
  ),
};

export const Loading: Story = {
  name: "State / Loading",
  render: () => (
    <div class="flex flex-col gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton showMedia={false} />
      <PostCardSkeleton />
    </div>
  ),
};

export const ProcessingPost: Story = {
  name: "State / Processing Publish",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...basePost.byline, timestampLabel: "now" }}
      content={{
        type: "song",
        accessMode: "locked",
        artist: "u/kevin.tameimpala",
        karaoke: { status: "processing" },
        listingMode: "not_listed",
        playbackState: "idle",
        study: { status: "processing" },
        title: "Borderline rough mix",
      }}
      engagement={{ score: 0, commentCount: 0 }}
      menuItems={undefined}
      shareActions={undefined}
      title="Borderline rough mix"
      titleHref={undefined}
      postHref={undefined}
    />
  ),
};

export const FailedRetryablePost: Story = {
  name: "State / Publish Failed / Retryable",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...basePost.byline, timestampLabel: "2m" }}
      content={{
        type: "song",
        accessMode: "locked",
        artist: "u/kevin.tameimpala",
        listingMode: "not_listed",
        playbackState: "idle",
        title: "Borderline rough mix",
      }}
      engagement={{ score: 0, commentCount: 0 }}
      menuItems={undefined}
      shareActions={undefined}
      statusNotice={{
        tone: "destructive",
        label: "Publish failed",
        message: "Story royalty registration is temporarily unavailable.",
        action: { label: "Try again", onClick: noop },
      }}
      title="Borderline rough mix"
      titleHref={undefined}
      postHref={undefined}
    />
  ),
};

export const FailedTerminalPost: Story = {
  name: "State / Publish Failed / Terminal",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...basePost.byline, timestampLabel: "4m" }}
      content={{
        type: "song",
        accessMode: "public",
        artist: "u/kevin.tameimpala",
        listingMode: "not_listed",
        playbackState: "idle",
        title: "Borderline rough mix",
      }}
      engagement={{ score: 0, commentCount: 0 }}
      menuItems={undefined}
      shareActions={undefined}
      statusNotice={{
        tone: "destructive",
        label: "Publish failed",
        message: "Matched audio requires derivative rights and a reference.",
      }}
      title="Borderline rough mix"
      titleHref={undefined}
      postHref={undefined}
    />
  ),
};

export const DeletedPost: Story = {
  name: "State / Deleted",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...basePost.byline, timestampLabel: "4h" }}
      content={{ type: "text", body: "This post was deleted by its author." }}
      engagement={{ score: 0, commentCount: 12 }}
      menuItems={undefined}
      title={undefined}
    />
  ),
};

export const RemovedByModerator: Story = {
  name: "State / Removed By Moderator",
  render: () => (
    <PostCard
      {...basePost}
      authorCommunityRole="moderator"
      byline={{ ...basePost.byline, timestampLabel: "1d" }}
      content={{ type: "text", body: "This post was removed by the moderators of c/tameimpala." }}
      engagement={{ score: 0, commentCount: 6 }}
      menuItems={[
        { key: "appeal", label: "Appeal removal" },
        { key: "report", label: "Report", destructive: true },
      ]}
      title={undefined}
      viewContext="community"
    />
  ),
};

export const NsfwBlurred: Story = {
  name: "State / NSFW Blurred",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        type: "image",
        src: fixtureImage("pirate-nsfw-blur", 600, 400),
        alt: "Age-restricted image preview",
        ageGatePolicy: "18_plus",
        ageGateViewerState: "proof_required",
        contentSafetyState: "adult",
        onVerifyAge: noop,
      }}
      engagement={{ ...basePost.engagement, score: 81, commentCount: 14 }}
      title="Age-restricted behind-the-scenes photo"
    />
  ),
};

export const FailedEmbed: Story = {
  name: "State / Failed Embed",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        type: "embed",
        canonicalUrl: "https://www.youtube.com/watch?v=unavailable",
        originalUrl: "https://youtu.be/unavailable",
        preview: { title: "Unavailable video" },
        provider: "youtube",
        renderMode: "preview",
        state: "unavailable",
      }}
      engagement={{ ...basePost.engagement, score: 19, commentCount: 3 }}
      title="The tour breakdown video is gone"
    />
  ),
};

// ============================================================================
// AGENT-AUTHORED POSTS
// ============================================================================

export const AgentTextPost: Story = {
  name: "Agent / Text Post",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: basePost.byline.community,
        author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
        agentAuthor: {
          label: "Captain Bot",
          ownerLabel: "u/kevin.tameimpala",
          ownerHref: "#",
        },
        timestampLabel: "3h",
      }}
      title="Automated weekly digest: top tracks this week"
      content={{
        type: "text",
        body: "Here's your weekly summary. The most-played track was Eventually with 2.4k plays across the community.",
      }}
      engagement={{ score: 47, commentCount: 12 }}
    />
  ),
};

export const AgentPostHomeFeed: Story = {
  name: "Agent / Thread Detail",
  render: () => (
    <PostCard
      viewContext="home"
      byline={{
        community: { kind: "community", label: "c/synthwave", href: "#", avatarSrc: fixtureImage("avatar-synthwave", 100, 100) },
        author: { kind: "user", label: "u/nightrunner", href: "#" },
        agentAuthor: {
          label: "DJ Bot",
          ownerLabel: "u/nightrunner",
          ownerHref: "#",
        },
        timestampLabel: "12h",
      }}
      identityPresentation="community_with_author"
      title="New remix just dropped"
      content={{
        type: "text",
        body: "Processed and catalogued 14 new uploads from the last 24 hours.",
      }}
      engagement={{ score: 89, commentCount: 5 }}
    />
  ),
};
