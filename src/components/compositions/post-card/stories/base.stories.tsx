import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCard } from "../post-card";
import { PostCardSkeleton } from "../post-card-skeleton";
import type { PostCardProps } from "../post-card.types";

const basePost: PostCardProps = {
  viewContext: "home",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=10" },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "9d",
  },
  title: "What's everyone listening to this week?",
  content: { type: "text", body: "Drop your top tracks below. Looking for new stuff across all genres." },
  engagement: { score: 342, commentCount: 47 },
  menuItems: [
    { key: "save", label: "Save post" },
    { key: "hide", label: "Hide post" },
    { key: "report", label: "Report", destructive: true },
  ],
};

const meta = {
  title: "Compositions/PostCard",
  component: PostCard,
  args: basePost,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 560px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// ============================================================================
// BASE POST TYPES
// ============================================================================

export const TextPost: Story = {
  name: "Text Post",
  render: () => <PostCard {...basePost} />,
};

export const ImagePost: Story = {
  name: "Image Post",
  render: () => (
    <PostCard
      {...basePost}
      title="Album art for the new EP just dropped"
      content={{
        type: "image",
        src: "https://picsum.photos/seed/pirate-cover/600/400",
        alt: "Album artwork",
        caption: "Cover art by @visuals",
      }}
      engagement={{ ...basePost.engagement, score: 1203, commentCount: 89 }}
    />
  ),
};

export const VideoPost: Story = {
  name: "Video Post",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...basePost.byline, timestampLabel: "2h" }}
      title="Live session from the studio last night"
      content={{
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        posterSrc: "https://picsum.photos/seed/pirate-video/600/340",
        durationLabel: "4:32",
        accessMode: "public",
      }}
      engagement={{ ...basePost.engagement, score: 567 }}
    />
  ),
};

export const LinkPost: Story = {
  name: "Link Post",
  render: () => (
    <PostCard
      {...basePost}
      title="This product breakdown on feed ranking is worth reading"
      content={{
        type: "link",
        href: "https://pirate.sc/blog/feed-ranking",
        linkTitle: "How We Think About Ranking Music Communities",
        linkLabel: "pirate.sc/blog/feed-ranking",
        previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
      }}
      engagement={{ ...basePost.engagement, score: 731, commentCount: 52 }}
    />
  ),
};

// ============================================================================
// ENGAGEMENT STATES
// ============================================================================

export const Upvoted: Story = {
  name: "State: Upvoted",
  render: () => (
    <PostCard
      {...basePost}
      engagement={{ ...basePost.engagement, score: 343, viewerVote: "up" }}
    />
  ),
};

export const Downvoted: Story = {
  name: "State: Downvoted",
  render: () => (
    <PostCard
      {...basePost}
      engagement={{ ...basePost.engagement, score: -12, viewerVote: "down" }}
    />
  ),
};

export const Saved: Story = {
  name: "State: Saved",
  render: () => (
    <PostCard
      {...basePost}
      engagement={{ ...basePost.engagement, saved: true }}
    />
  ),
};

export const HighEngagement: Story = {
  name: "State: High Engagement",
  render: () => (
    <PostCard
      {...basePost}
      title="Announcing pirate v2 - the next generation of music discovery"
      content={{
        type: "image",
        src: "https://picsum.photos/seed/pirate-v2/600/400",
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
  name: "Layout: Long Title",
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

export const NoClubContext: Story = {
  name: "Layout: No Community",
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
  name: "Layout: Avatar Placeholder",
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
  name: "Layout: Community Feed",
  render: () => (
    <PostCard
      {...basePost}
      viewContext="community"
      byline={{
        community: { kind: "community", label: "c/tameimpala", href: "#" },
        author: { kind: "user", label: "u/kevin.tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=11" },
        timestampLabel: "3h",
      }}
      title="Studio demo from last night"
    />
  ),
};

export const AuthorPrimary: Story = {
  name: "Presentation: Author Primary",
  render: () => (
    <PostCard
      {...basePost}
      identityPresentation="author_primary"
      title="Mixed feed author-first row"
    />
  ),
};

export const AuthorWithCommunity: Story = {
  name: "Presentation: Author With Community",
  render: () => (
    <PostCard
      {...basePost}
      identityPresentation="author_with_community"
      title="Mixed feed row with supporting community context"
    />
  ),
};

export const AnonymousWithQualifiers: Story = {
  name: "Presentation: Anonymous With Qualifiers",
  render: () => (
    <PostCard
      {...basePost}
      identityPresentation="anonymous_primary"
      byline={{
        community: { kind: "community", label: "c/producers-only", href: "#" },
        author: { kind: "user", label: "Anonymous Producer 14", href: "#" },
        timestampLabel: "48m",
      }}
      qualifierLabels={["Verified adult", "Translated"]}
      title="Need feedback on this locked preview"
      content={{
        type: "song",
        title: "Night Window",
        artworkSrc: "https://picsum.photos/seed/pirate-anon-song/120/120",
        durationLabel: "2:41",
        accessMode: "locked",
        listingMode: "listed",
        listingStatus: "active",
        priceLabel: "$2.99",
      }}
    />
  ),
};

export const ClickableCard: Story = {
  name: "Interaction: Clickable Card",
  render: () => (
    <PostCard
      {...basePost}
      postHref="/p/pst_01_weekly_listening"
      title="Clicking the card should open the post"
    />
  ),
};

// ============================================================================
// LOADING STATES
// ============================================================================

export const Loading: Story = {
  name: "State: Loading",
  render: () => (
    <div className="flex flex-col gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton showMedia={false} />
      <PostCardSkeleton />
    </div>
  ),
};
