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
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=5" },
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
  title: "Compositions/Posts/PostCard",
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

export const TranslatedTextPost: Story = {
  name: "Translation: Text Post",
  render: () => (
    <PostCard
      {...basePost}
      content={{ type: "text", body: "What is everyone listening to this week? I want to find more live recordings." }}
      onToggleOriginal={() => undefined}
      showOriginalLabel="Show original"
      showTranslationLabel="Show translation"
      sourceLanguage="ja"
      title="What is everyone listening to this week?"
      titleDir="auto"
    />
  ),
};

export const TranslatedImagePost: Story = {
  name: "Translation: Image Caption",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        type: "image",
        src: "https://picsum.photos/seed/pirate-translated-caption/600/400",
        alt: "Crowd at a small venue",
        caption: "The room was full before the opener started.",
      }}
      engagement={{ ...basePost.engagement, score: 830, commentCount: 64 }}
      onToggleOriginal={() => undefined}
      showOriginalLabel="Show original"
      showTranslationLabel="Show translation"
      sourceLanguage="es"
      title="Small venue, huge sound"
    />
  ),
};

export const ToggleToOriginal: Story = {
  name: "Translation: Toggle To Original",
  render: function ToggleToOriginalStory() {
    const [showOriginal, setShowOriginal] = React.useState(false);

    return (
      <PostCard
        {...basePost}
        content={{
          type: "text",
          body: showOriginal
            ? "今週は何を聴いていますか？おすすめのライブ録音を探しています。"
            : "What are you listening to this week? Looking for live recording recommendations.",
          bodyDir: showOriginal ? "auto" : undefined,
          bodyLang: showOriginal ? "ja" : undefined,
        }}
        isViewingOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((value) => !value)}
        showOriginalLabel="Show original"
        showTranslationLabel="Show translation"
        sourceLanguage="ja"
        title={showOriginal ? "今週は何を聴いていますか？" : "What are you listening to this week?"}
      />
    );
  },
};

export const PublicAuthorNationalityBadge: Story = {
  name: "Public Author / Nationality Badge",
  render: () => (
    <PostCard
      {...basePost}
      authorNationalityBadgeCountry="US"
      authorNationalityBadgeLabel="Verified United States nationality"
      identityPresentation="author_primary"
      viewContext="community"
    />
  ),
};

export const CommunityOwnerBadge: Story = {
  name: "Public Author / Owner Badge",
  render: () => (
    <PostCard
      {...basePost}
      authorCommunityRole="owner"
      viewContext="community"
    />
  ),
};

export const CommunityModeratorBadge: Story = {
  name: "Public Author / Moderator Badge",
  render: () => (
    <PostCard
      {...basePost}
      authorCommunityRole="moderator"
      viewContext="community"
    />
  ),
};

export const UnverifiedCommunityBadge: Story = {
  name: "Community / Unverified Icon",
  render: () => (
    <div style={{ width: 360 }}>
      <PostCard
        {...basePost}
        authorCommunityRole="owner"
        byline={{
          community: {
            kind: "community",
            label: "Test",
            href: "#",
            avatarSrc: undefined,
            verificationStatus: "unverified",
          },
          author: {
            kind: "user",
            label: "swift-comet-1431.pirate",
            href: "#",
            avatarSrc: "https://i.pravatar.cc/100?img=5",
          },
          timestampLabel: "23h",
        }}
        content={{ type: "text", body: "The visible byline should use the display name and a status badge, not the raw cmt_ identifier." }}
        identityPresentation="community_with_author"
        title="Unverified community byline"
        viewContext="home"
      />
    </div>
  ),
};

export const DuplicateNationalityQualifier: Story = {
  name: "Nationality Qualifier / Badge Suppressed",
  render: () => (
    <PostCard
      {...basePost}
      authorNationalityBadgeCountry="US"
      authorNationalityBadgeLabel="Verified United States nationality"
      identityPresentation="author_primary"
      qualifierLabels={["US National"]}
      viewContext="community"
    />
  ),
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
        sourceLabel: "blog.pirate.sc",
        previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
      }}
      engagement={{ ...basePost.engagement, score: 731, commentCount: 52 }}
    />
  ),
};

export const LinkPostWithSummary: Story = {
  name: "Link Post / Summary",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        author: { kind: "user", label: "alex.morgan", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=12" },
        timestampLabel: "9h",
      }}
      identityPresentation="author_primary"
      title="Update on aid flotilla interception"
      content={{
        type: "link",
        body: "Useful source for the timeline. Official and organizer statements differ on where the interception happened.",
        href: "https://www.reuters.com/world/middle-east/israel-begins-intercepting-gaza-aid-ships-far-shores-army-radio-says-2026-04-29/",
        previewTitle: "Aid boats bound for Gaza intercepted",
        linkLabel: "news.com",
        sourceLabel: "news.com",
        publishedLabel: "2h ago",
        previewImageSrc: "https://commons.wikimedia.org/wiki/Special:Redirect/file/View_of_many_people_on_a_boat_at_sea_(AM_80414-1).jpg?width=320",
        summary: {
          status: "ready",
          shortSummary: "Israel intercepted aid vessels headed toward Gaza. Organizers said the seizure happened in international waters, while officials described it as enforcement around Gaza access.",
          keyPoints: [
            "Israel intercepted aid vessels headed toward Gaza.",
            "Organizers said the seizure happened in international waters.",
            "Officials described it as enforcement around Gaza access.",
          ],
        },
      }}
      engagement={{ ...basePost.engagement, score: 246, commentCount: 37 }}
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

export const KalshiMarketEmbed: Story = {
  name: "Embed / Kalshi Market",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        originalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        preview: {
          chart: [
            0.18, 0.22, 0.2, 0.23, 0.21, 0.24, 0.26, 0.25, 0.27, 0.3,
            0.29, 0.32, 0.28, 0.31, 0.35, 0.33, 0.37, 0.4, 0.38, 0.36,
            0.39, 0.42, 0.41, 0.43, 0.44, 0.46, 0.45, 0.48, 0.47, 0.42,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
            volume: 1200 + index * 90,
          })),
          closeTime: "2026-06-01T00:00:00Z",
          lastPrice: 0.42,
          openInterest: 18420,
          question: "Will Kanye visit Israel before June?",
          status: "open",
          updatedAt: "2026-05-02T12:00:00Z",
          volume: 921000,
          volume24h: 64000,
          yesAsk: 0.43,
          yesBid: 0.41,
          yesPrice: 0.42,
        },
        provider: "kalshi",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 73, commentCount: 11 }}
    />
  ),
};

export const PolymarketMarketEmbed: Story = {
  name: "Embed / Polymarket Market",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        originalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        preview: {
          chart: [
            0.62, 0.58, 0.6, 0.56, 0.52, 0.55, 0.51, 0.49, 0.5, 0.48,
            0.44, 0.46, 0.43, 0.4, 0.42, 0.45, 0.47, 0.44, 0.49, 0.51,
            0.5, 0.54, 0.52, 0.55, 0.58, 0.56, 0.53, 0.55, 0.52, 0.53,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
          })),
          closeTime: "2026-07-15T00:00:00Z",
          imageUrl: "https://picsum.photos/seed/pirate-polymarket/180/180",
          lastPrice: 0.53,
          liquidity: 382000,
          question: "Will the example market resolve Yes?",
          status: "active",
          updatedAt: "2026-05-02T12:00:00Z",
          volume: 2_420_000,
          volume24h: 182_000,
          yesAsk: 0.54,
          yesBid: 0.52,
          yesPrice: 0.53,
        },
        provider: "polymarket",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 116, commentCount: 24 }}
    />
  ),
};

export const PolymarketMarketEmbedArabic: Story = {
  name: "Embed / Polymarket Market Arabic",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        originalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        preview: {
          chart: [
            0.62, 0.58, 0.6, 0.56, 0.52, 0.55, 0.51, 0.49, 0.5, 0.48,
            0.44, 0.46, 0.43, 0.4, 0.42, 0.45, 0.47, 0.44, 0.49, 0.51,
            0.5, 0.54, 0.52, 0.55, 0.58, 0.56, 0.53, 0.55, 0.52, 0.53,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
          })),
          closeTime: "2026-07-15T00:00:00Z",
          imageUrl: "https://picsum.photos/seed/pirate-polymarket/180/180",
          lastPrice: 0.53,
          question: "Will the example market resolve Yes?",
          questionDir: "rtl",
          questionLang: "ar",
          translatedQuestion: "هل سيحسم هذا السوق التجريبي بنعم؟",
          yesPrice: 0.53,
        },
        provider: "polymarket",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 116, commentCount: 24 }}
    />
  ),
};

export const KalshiMarketEmbedClosed: Story = {
  name: "Embed / Kalshi Market Closed",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        originalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        preview: {
          chart: [
            0.18, 0.22, 0.2, 0.23, 0.21, 0.24, 0.26, 0.25, 0.27, 0.3,
            0.29, 0.32, 0.28, 0.31, 0.35, 0.33, 0.37, 0.4, 0.38, 0.36,
            0.39, 0.42, 0.41, 0.43, 0.44, 0.46, 0.45, 0.48, 0.47, 0.42,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
          })),
          closeTime: "2026-06-01T00:00:00Z",
          lastPrice: 0.42,
          question: "Will Kanye visit Israel before June?",
          status: "closed",
          yesPrice: 0.42,
        },
        provider: "kalshi",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 73, commentCount: 11 }}
    />
  ),
};

export const KalshiMarketEmbedResolvedYes: Story = {
  name: "Embed / Kalshi Market Resolved Yes",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        originalUrl: "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael",
        preview: {
          chart: [
            0.18, 0.22, 0.2, 0.23, 0.21, 0.24, 0.26, 0.25, 0.27, 0.3,
            0.29, 0.32, 0.28, 0.31, 0.35, 0.33, 0.37, 0.4, 0.38, 0.36,
            0.39, 0.42, 0.49, 0.56, 0.68, 0.74, 0.82, 0.91, 0.97, 1,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
          })),
          closeTime: "2026-06-01T00:00:00Z",
          lastPrice: 1,
          question: "Will Kanye visit Israel before June?",
          resolution: "yes",
          status: "settled",
          yesPrice: 1,
        },
        provider: "kalshi",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 73, commentCount: 11 }}
    />
  ),
};

export const PolymarketMarketEmbedResolvedNo: Story = {
  name: "Embed / Polymarket Market Resolved No",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        originalUrl: "https://polymarket.com/event/example-market/will-example-resolve-yes",
        preview: {
          chart: [
            0.62, 0.58, 0.6, 0.56, 0.52, 0.55, 0.51, 0.49, 0.5, 0.48,
            0.44, 0.46, 0.43, 0.4, 0.42, 0.39, 0.34, 0.3, 0.24, 0.19,
            0.15, 0.13, 0.1, 0.08, 0.06, 0.04, 0.03, 0.02, 0.01, 0,
          ].map((price, index) => ({
            price,
            ts: 1_714_000_000 + index * 86_400,
          })),
          closeTime: "2026-07-15T00:00:00Z",
          imageUrl: "https://picsum.photos/seed/pirate-polymarket/180/180",
          lastPrice: 0,
          question: "Will the example market resolve Yes?",
          resolution: "no",
          status: "closed",
          yesPrice: 0,
        },
        provider: "polymarket",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 116, commentCount: 24 }}
    />
  ),
};

export const PolymarketEventMultiOutcome: Story = {
  name: "Embed / Polymarket Event Multi-Outcome",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://polymarket.com/event/fda-bpc157-reclassification",
        originalUrl: "https://polymarket.com/event/fda-bpc157-reclassification",
        preview: {
          closeTime: "2027-01-01T00:00:00Z",
          imageUrl: "https://picsum.photos/seed/pirate-fda-market/180/180",
          outcomes: [
            { label: "Before 2027", probability: 0.77 },
            { label: "Before November 2026", probability: 0.75 },
            { label: "Before September 2026", probability: 0.18 },
          ],
          question: "When will the FDA reclassify BPC-157 to Category 1?",
          status: "active",
        },
        provider: "polymarket",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 89, commentCount: 31 }}
    />
  ),
};

export const PolymarketEventResolvedOutcome: Story = {
  name: "Embed / Polymarket Event Resolved Outcome",
  render: () => (
    <PostCard
      {...basePost}
      title={undefined}
      content={{
        type: "embed",
        canonicalUrl: "https://polymarket.com/event/fda-bpc157-reclassification",
        originalUrl: "https://polymarket.com/event/fda-bpc157-reclassification",
        preview: {
          closeTime: "2027-01-01T00:00:00Z",
          imageUrl: "https://picsum.photos/seed/pirate-fda-market-resolved/180/180",
          outcomes: [
            { label: "Before 2027", probability: 1 },
            { label: "Before November 2026", probability: 0 },
            { label: "Before September 2026", probability: 0 },
          ],
          question: "When will the FDA reclassify BPC-157 to Category 1?",
          resolvedOutcome: "Before 2027",
          status: "closed",
        },
        provider: "polymarket",
        renderMode: "preview",
        state: "embed",
      }}
      engagement={{ ...basePost.engagement, score: 89, commentCount: 31 }}
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
        src: "https://picsum.photos/seed/pirateweb/600/400",
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
  name: "Agent: Thread Detail",
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
