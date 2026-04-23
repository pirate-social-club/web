import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCard } from "../post-card";
import { PostCardSkeleton } from "../post-card-skeleton";
import type { PostCardProps } from "../post-card.types";
import { UiLocaleProvider } from "@/lib/ui-locale";

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
      title={undefined}
      content={{
        type: "link",
        href: "https://blog.pirate.sc/feed-ranking",
        previewTitle: "How We Think About Ranking Music Communities",
        linkLabel: "blog.pirate.sc/feed-ranking",
        previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
      }}
      engagement={{ ...basePost.engagement, score: 731, commentCount: 52 }}
    />
  ),
};

export const XEmbedPreview: Story = {
  name: "Embed / X Preview",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://x.com/pirate/status/1234567890123456789",
        originalUrl: "https://x.com/pirate/status/1234567890123456789",
        preview: {
          authorName: "Pirate",
          authorUrl: "https://x.com/pirate",
          hasMedia: true,
          mediaUrl: "https://picsum.photos/seed/pirate-x-embed/240/240",
          text: "Embedding should stay fast in the feed and expand only when someone asks for the official post.",
        },
        provider: "x",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 984, commentCount: 61 }}
    />
  ),
};

export const XEmbedOfficial: Story = {
  name: "Embed / X Official",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://twitter.com/Interior/status/463440424141459456",
        oembedHtml: `<blockquote class="twitter-tweet" data-theme="dark"><p lang="en" dir="ltr">Sunsets don&#39;t get much better than this one over <a href="https://twitter.com/GrandTetonNPS?ref_src=twsrc%5Etfw">@GrandTetonNPS</a>. <a href="https://twitter.com/hashtag/nature?src=hash&amp;ref_src=twsrc%5Etfw">#nature</a> <a href="https://twitter.com/hashtag/sunset?src=hash&amp;ref_src=twsrc%5Etfw">#sunset</a> <a href="http://t.co/YuKy2rcjyU">pic.x.com/YuKy2rcjyU</a></p>&mdash; US Department of the Interior (@Interior) <a href="https://twitter.com/Interior/status/463440424141459456?ref_src=twsrc%5Etfw">May 5, 2014</a></blockquote>`,
        originalUrl: "https://x.com/Interior/status/463440424141459456",
        preview: {
          authorName: "US Department of the Interior",
          authorUrl: "https://twitter.com/Interior",
          hasMedia: false,
          text: "Sunsets don't get much better than this one over @GrandTetonNPS. #nature #sunset",
        },
        provider: "x",
        renderMode: "official",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 984, commentCount: 61 }}
    />
  ),
};

export const XEmbedUnavailable: Story = {
  name: "Embed / X Unavailable",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://x.com/pirate/status/1234567890123456789",
        originalUrl: "https://x.com/pirate/status/1234567890123456789",
        preview: {
          authorName: "Pirate",
          hasMedia: false,
        },
        provider: "x",
        renderMode: "preview",
        state: "unavailable",
      }}
      engagement={{ ...basePost.engagement, score: 12, commentCount: 4 }}
    />
  ),
};

export const YouTubeEmbedPreview: Story = {
  name: "Embed / YouTube Preview",
  render: () => (
    <PostCard
      {...basePost}
      title="Tour visuals worth watching"
      content={{
        type: "embed",
        body: "The staging breakdown is the useful part here.",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        originalUrl: "https://youtu.be/dQw4w9WgXcQ",
        preview: {
          authorName: "Rick Astley",
          authorUrl: "https://www.youtube.com/@RickAstley",
          thumbnailHeight: 360,
          thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          thumbnailWidth: 480,
          title: "Never Gonna Give You Up",
        },
        provider: "youtube",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 412, commentCount: 38 }}
    />
  ),
};

export const YouTubeEmbedOfficial: Story = {
  name: "Embed / YouTube Official",
  render: () => (
    <PostCard
      {...basePost}
      title="Official YouTube embed"
      content={{
        type: "embed",
        body: "This should stay native in the feed and become the player on detail.",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        oembedHtml: `<iframe title="Never Gonna Give You Up" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
        originalUrl: "https://youtu.be/dQw4w9WgXcQ",
        preview: {
          authorName: "Rick Astley",
          thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          title: "Never Gonna Give You Up",
        },
        provider: "youtube",
        renderMode: "official",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 624, commentCount: 74 }}
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

export const RtlAuthorAlignment: Story = {
  name: "Layout: RTL Author Alignment",
  render: () => (
    <UiLocaleProvider dir="rtl" locale="ar">
      <div dir="rtl">
        <PostCard
          {...basePost}
          byline={{
            community: { kind: "community", label: "c/Infinity", href: "#" },
            author: {
              kind: "user",
              label: "sable-harbor-4143.pirate",
              href: "#",
              avatarSrc: "https://i.pravatar.cc/100?img=11",
            },
            timestampLabel: "31m",
          }}
          title="اختبار أهلاً بالعالم"
          titleDir="rtl"
          content={{ type: "text", body: "هل تسمعني؟", bodyDir: "rtl" }}
        />
      </div>
    </UiLocaleProvider>
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

export const SpoilerText: Story = {
  name: "Formatting: Spoilers",
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
  name: "State: Loading",
  render: () => (
    <div className="flex flex-col gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton showMedia={false} />
      <PostCardSkeleton />
    </div>
  ),
};

// ============================================================================
// AGENT-AUTHORED POSTS
// ============================================================================

export const AgentTextPost: Story = {
  name: "Agent: Text Post",
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
  name: "Agent: Home Feed",
  render: () => (
    <PostCard
      viewContext="home"
      byline={{
        community: { kind: "community", label: "c/synthwave", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=22" },
        author: { kind: "user", label: "u/nightrunner", href: "#" },
        agentAuthor: {
          label: "DJ Bot",
          ownerLabel: "u/nightrunner",
          ownerHref: "#",
        },
        timestampLabel: "12h",
      }}
      title="New remix just dropped"
      content={{
        type: "text",
        body: "Processed and catalogued 14 new uploads from the last 24 hours.",
      }}
      engagement={{ score: 89, commentCount: 5 }}
    />
  ),
};
