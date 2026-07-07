import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { ArrowsClockwise, Copy, ShareNetwork } from "@phosphor-icons/react";

import { PostCard } from "../post-card";
import { PostCardSkeleton } from "../post-card-skeleton";
import type { PostCardProps, PostCardShareAction } from "../post-card.types";
import { UiLocaleProvider } from "@/lib/ui-locale";

const shareActions: PostCardShareAction[] = [
  { key: "crosspost", label: "Crosspost", icon: <ArrowsClockwise className="size-5" /> },
  { key: "copy-link", label: "Copy link", icon: <Copy className="size-5" /> },
  { key: "native-share", label: "Share...", icon: <ShareNetwork className="size-5" /> },
];

const ineligibleShareActions: PostCardShareAction[] = [
  { key: "copy-link", label: "Copy link", icon: <Copy className="size-5" /> },
  { key: "native-share", label: "Share...", icon: <ShareNetwork className="size-5" /> },
];

const noop = () => undefined;

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
  shareActions,
  menuItems: [
    { key: "save", label: "Save post" },
    { key: "hide", label: "Hide post" },
    { key: "report", label: "Report", destructive: true },
  ],
};

const longTextPostBody = Array.from({ length: 26 }, (_, index) => (
  `Paragraph ${index + 1}: this field report is intentionally long so feed cards prove they do not occupy the entire viewport. It should preview enough text to be useful, then hand off to the full post page.`
)).join("\n\n");

const cityEventByline: PostCardProps["byline"] = {
  community: { kind: "community", label: "c/tbilisi", href: "#", avatarSrc: "https://picsum.photos/seed/tbilisi-community/80/80" },
  author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
  timestampLabel: "18m",
};

const communityMeetupEvent = {
  address: "14 Merab Kostava St",
  endsAt: "2026-06-05T18:00:00+04:00",
  locationName: "Auditorium Books",
  startsAt: "2026-06-05T16:30:00+04:00",
  status: "scheduled",
  timezone: "Asia/Tbilisi",
} satisfies NonNullable<PostCardProps["event"]>;

const ticketedLinkEvent = {
  eventUrl: "https://ra.co/events/example-tbilisi",
  endsAt: "2026-06-12T23:30:00+04:00",
  locationName: "Left Bank",
  startsAt: "2026-06-12T20:00:00+04:00",
  status: "scheduled",
  timezone: "Asia/Tbilisi",
} satisfies NonNullable<PostCardProps["event"]>;

const fabrikaPlace = {
  address: "8 Egnate Ninoshvili St, Tbilisi",
  city: "Tbilisi",
  countryCode: "ge",
  label: "Fabrika",
  lat: 41.70982,
  lon: 44.80398,
  providerPlaceId: "geoapify:fabrika-tbilisi-storybook",
  source: "geoapify",
} satisfies NonNullable<PostCardProps["event"]>["place"];

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

export const SharePillActions: Story = {
  name: "Share Pill / Crosspost and Link",
  render: () => (
    <PostCard
      {...basePost}
      shareActions={shareActions.map((action) => ({
        ...action,
        onSelect: () => undefined,
      }))}
    />
  ),
};

export const SharePillCrosspostIneligible: Story = {
  name: "Share Pill / Link Only",
  render: () => (
    <PostCard
      {...basePost}
      title="Crosspost source is not eligible to be crossposted again"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "text",
          title: "What makes a great opener for a live set?",
          postHref: "#",
        },
      }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostAvailable: Story = {
  name: "Crosspost / Available Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "14m",
      }}
      title="Bringing this discussion here"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "text",
          title: "What makes a great opener for a live set?",
          postHref: "#",
        },
      }}
      engagement={{ score: 12, commentCount: 3 }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostImageSource: Story = {
  name: "Crosspost / Image Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "18m",
      }}
      title="Photo thread for the Georgian scene"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "image",
          thumbnailAlt: "Crowd pressed against the stage at a small venue",
          thumbnailSrc: "https://picsum.photos/seed/crosspost-source-image/320/320",
          title: "Front row photo from last night",
          postHref: "#",
        },
      }}
      engagement={{ score: 18, commentCount: 5 }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostVideoSource: Story = {
  name: "Crosspost / Video Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "24m",
      }}
      title="Encore clip worth discussing"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "video",
          thumbnailAlt: "Performer lit by red stage lights",
          thumbnailSrc: "https://picsum.photos/seed/crosspost-source-video/320/320",
          title: "Five-minute live clip from the encore",
          postHref: "#",
        },
      }}
      engagement={{ score: 27, commentCount: 8 }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostLinkSource: Story = {
  name: "Crosspost / Link Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "28m",
      }}
      title="Useful venue context"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "link",
          thumbnailAlt: "Venue entrance at night",
          thumbnailSrc: "https://picsum.photos/seed/crosspost-source-link/320/320",
          title: "Interview: rebuilding underground venues after a shutdown",
          postHref: "#",
        },
      }}
      engagement={{ score: 31, commentCount: 6 }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostSongSource: Story = {
  name: "Crosspost / Song Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "31m",
      }}
      title="New local demo"
      content={{
        type: "crosspost",
        source: {
          status: "available",
          communityLabel: "music.pirate",
          communityHref: "#",
          authorLabel: "ana.pirate",
          authorHref: "#",
          postType: "song",
          thumbnailAlt: "Album artwork with a night road",
          thumbnailSrc: "https://picsum.photos/seed/crosspost-source-song/320/320",
          title: "New demo: Rustavi night drive",
          postHref: "#",
          mediaPreview: {
            type: "song",
            accessMode: "locked",
            artworkSrc: "https://picsum.photos/seed/crosspost-source-song/320/320",
            durationMs: 214000,
            hasEntitlement: false,
            listingMode: "listed",
            listingStatus: "active",
            onBuy: noop,
            onPlay: noop,
            onSeek: noop,
            playbackState: "idle",
            previewDurationMs: 30000,
            priceLabel: "$4.00",
            title: "New demo: Rustavi night drive",
          },
        },
      }}
      engagement={{ score: 33, commentCount: 11 }}
      shareActions={ineligibleShareActions}
    />
  ),
};

export const CrosspostUnavailableSource: Story = {
  name: "Crosspost / Unavailable Source",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/@🇬🇪", href: "#", avatarSrc: "https://picsum.photos/seed/georgia-community/80/80" },
        author: { kind: "user", label: "u/nino", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=32" },
        timestampLabel: "1h",
      }}
      title="Discussion moved here"
      content={{
        type: "crosspost",
        source: {
          status: "deleted",
          communityLabel: "music.pirate",
        },
      }}
      engagement={{ score: 21, commentCount: 9 }}
      shareActions={ineligibleShareActions}
    />
  ),
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
        previewDescription: "A product note on using member activity, post quality, and community context to make feeds more useful.",
        linkLabel: "blog.pirate.sc/feed-ranking",
        sourceLabel: "blog.pirate.sc",
        previewImageSrc: "https://picsum.photos/seed/pirate-link/240/240",
      }}
      engagement={{ ...basePost.engagement, score: 731, commentCount: 52 }}
    />
  ),
};

export const TextPostWithEvent: Story = {
  name: "Event / Text Post",
  render: () => (
    <PostCard
      {...basePost}
      byline={cityEventByline}
      content={{
        type: "text",
        body: "Bring questions about paperwork, leases, banking, and neighborhood logistics. Locals and recent arrivals are both welcome.",
      }}
      engagement={{ score: 42, commentCount: 14 }}
      event={communityMeetupEvent}
      title="Newcomer meetup and practical Q&A"
    />
  ),
};

export const LinkPostWithEvent: Story = {
  name: "Event / Link Post",
  render: () => (
    <PostCard
      {...basePost}
      byline={cityEventByline}
      content={{
        type: "link",
        body: "Good option for people who want to meet up after the night market closes.",
        href: "https://ra.co/events/example-tbilisi",
        linkLabel: "ra.co/events/example-tbilisi",
        previewImageSrc: "https://picsum.photos/seed/tbilisi-event-link/240/240",
        previewTitle: "Tbilisi night market afterparty",
        previewDescription: "Local DJs and late entry after the market closes at Left Bank.",
        sourceLabel: "ra.co",
      }}
      engagement={{ score: 88, commentCount: 21 }}
      event={ticketedLinkEvent}
      title="Afterparty for the night market next Friday"
    />
  ),
};

export const ImagePostWithEvent: Story = {
  name: "Event / Image Post",
  render: () => (
    <PostCard
      {...basePost}
      byline={cityEventByline}
      content={{
        type: "image",
        alt: "Poster for a community film night",
        caption: "Poster from the organizer.",
        src: "https://picsum.photos/seed/tbilisi-film-night/600/400",
      }}
      engagement={{ score: 64, commentCount: 18 }}
      event={{
        eventUrl: "https://example.com/film-night",
        locationName: "Fabrika courtyard",
        startsAt: "2026-06-19T19:30:00+04:00",
        status: "scheduled",
        timezone: "Asia/Tbilisi",
      }}
      title="Outdoor film night: local shorts"
    />
  ),
};

export const GeocodedEvent: Story = {
  name: "Event / Geocoded Place",
  render: () => (
    <PostCard
      {...basePost}
      byline={cityEventByline}
      content={{
        type: "text",
        body: "Bring a notebook. We will split into small groups after the first round of introductions.",
      }}
      engagement={{ score: 51, commentCount: 12 }}
      event={{
        eventUrl: "https://example.com/fabrika-writing-night",
        locationName: fabrikaPlace.label,
        place: fabrikaPlace,
        startsAt: "2026-06-21T18:30:00+04:00",
        status: "scheduled",
        timezone: "Asia/Tbilisi",
      }}
      title="Writing night at Fabrika"
    />
  ),
};

export const AmbiguousManualEvent: Story = {
  name: "Event / Ambiguous Manual Location",
  render: () => (
    <PostCard
      {...basePost}
      byline={cityEventByline}
      content={{
        type: "text",
        body: "Organizer will pin the exact entrance in the comments once the route is confirmed.",
      }}
      engagement={{ score: 36, commentCount: 16 }}
      event={{
        address: "near the main entrance",
        locationName: "Old botanical garden gate",
        startsAt: "2026-06-14T09:30:00+04:00",
        status: "scheduled",
        timezone: "Asia/Tbilisi",
      }}
      title="Morning photo walk"
    />
  ),
};

export const EventStatusVariants: Story = {
  name: "Event / Status Variants",
  render: () => (
    <div className="flex flex-col">
      <PostCard
        {...basePost}
        byline={{ ...cityEventByline, timestampLabel: "1h" }}
        content={{ type: "text", body: "The organizer is finding a new venue. Keep the thread watched for updates." }}
        engagement={{ score: 19, commentCount: 7 }}
        event={{
          eventUrl: "https://example.com/postponed-walk",
          locationName: "Vake Park",
          startsAt: "2026-06-07T10:00:00+04:00",
          status: "postponed",
          timezone: "Asia/Tbilisi",
        }}
        title="Architecture walk postponed"
      />
      <PostCard
        {...basePost}
        byline={{ ...cityEventByline, timestampLabel: "3h" }}
        content={{ type: "text", body: "Cancelled due to venue repairs. Refunds are handled by the ticketing site." }}
        engagement={{ score: 11, commentCount: 5 }}
        event={{
          eventUrl: "https://example.com/cancelled-workshop",
          locationName: "Sololaki coworking room",
          startsAt: "2026-06-09T18:00:00+04:00",
          status: "canceled",
          timezone: "Asia/Tbilisi",
        }}
        title="Contract translation workshop cancelled"
      />
    </div>
  ),
};

export const PastEvent: Story = {
  name: "Event / Past",
  render: () => (
    <PostCard
      {...basePost}
      byline={{ ...cityEventByline, timestampLabel: "3w" }}
      content={{
        type: "text",
        body: "Drop photos, notes, and useful follow-up links here so people can catch up after the meetup.",
      }}
      engagement={{ score: 103, commentCount: 32 }}
      event={{
        endsAt: "2026-05-07T20:00:00+04:00",
        locationName: "Dedaena Bar",
        startsAt: "2026-05-07T18:00:00+04:00",
        status: "ended",
        timezone: "Asia/Tbilisi",
      }}
      title="Recap thread for last month's language exchange"
    />
  ),
};

export const MinimalEvent: Story = {
  name: "Event / Minimal",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        community: { kind: "community", label: "c/remote-workers", href: "#", avatarSrc: "https://picsum.photos/seed/remote-community/80/80" },
        author: { kind: "user", label: "u/mira", href: "#", avatarSrc: "https://i.pravatar.cc/100?img=44" },
        timestampLabel: "44m",
      }}
      content={{ type: "text", body: "Agenda will be posted once speakers confirm." }}
      engagement={{ score: 25, commentCount: 9 }}
      event={{
        isOnline: true,
        startsAt: "2026-06-20T17:00:00Z",
        status: "scheduled",
        timezone: "UTC",
      }}
      title="Remote worker tax chat"
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
          summaryParagraph: "Reuters reports that Israel intercepted aid vessels headed toward Gaza, while flotilla organizers described the seizure as taking place in international waters and criticized it as an obstruction of aid. Officials framed the action as enforcement around Gaza access, leaving the location and legal basis of the interception central to the dispute.",
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

export const LinkPostSummaryBulletsOnly: Story = {
  name: "Link Post / Summary Bullets Only",
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

export const LinkPostLongSummary: Story = {
  name: "Link Post / Long Summary",
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
          summaryParagraph: "Reuters reports that Israel intercepted vessels carrying aid toward Gaza after organizers said the boats were stopped far from shore. The account emphasizes the dispute between organizers, who characterized the incident as taking place in international waters, and officials, who described the action as enforcement around Gaza access. The article centers on the timeline, the location of the interception, and how each side framed the legal and humanitarian stakes.",
          keyPoints: [
            "Aid vessels headed toward Gaza were intercepted.",
            "Organizers disputed the location and legality of the seizure.",
            "Officials framed the action as enforcement around Gaza access.",
          ],
        },
      }}
      engagement={{ ...basePost.engagement, score: 246, commentCount: 37 }}
    />
  ),
};

type EmbedContent = Extract<PostCardProps["content"], { type: "embed" }>;
type EmbedVariant = {
  content: EmbedContent;
  engagement: PostCardProps["engagement"];
  label: string;
  title?: string;
};

function chart(prices: number[], withVolume = false): NonNullable<NonNullable<EmbedContent["preview"]>["chart"]> {
  return prices.map((price, index) => ({
    price,
    ts: 1_714_000_000 + index * 86_400,
    ...(withVolume ? { volume: 1200 + index * 90 } : {}),
  }));
}

const kalshiUrl = "https://kalshi.com/markets/kxkanyeisrael/will-kanye-visit-area/kxkanyeisrael";
const polymarketUrl = "https://polymarket.com/event/example-market/will-example-resolve-yes";
const polymarketEventUrl = "https://polymarket.com/event/fda-bpc157-reclassification";
const kalshiBaseChart = [
  0.18, 0.22, 0.2, 0.23, 0.21, 0.24, 0.26, 0.25, 0.27, 0.3,
  0.29, 0.32, 0.28, 0.31, 0.35, 0.33, 0.37, 0.4, 0.38, 0.36,
  0.39, 0.42, 0.41, 0.43, 0.44, 0.46, 0.45, 0.48, 0.47, 0.42,
];
const polymarketBaseChart = [
  0.62, 0.58, 0.6, 0.56, 0.52, 0.55, 0.51, 0.49, 0.5, 0.48,
  0.44, 0.46, 0.43, 0.4, 0.42, 0.45, 0.47, 0.44, 0.49, 0.51,
  0.5, 0.54, 0.52, 0.55, 0.58, 0.56, 0.53, 0.55, 0.52, 0.53,
];

const embedVariants = {
  xPreview: {
    label: "X Preview",
    content: {
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
    },
    engagement: { ...basePost.engagement, score: 984, commentCount: 61 },
  },
  xOfficial: {
    label: "X Official",
    content: {
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
    },
    engagement: { ...basePost.engagement, score: 984, commentCount: 61 },
  },
  youtubePreview: {
    label: "YouTube Preview",
    title: "Tour visuals worth watching",
    content: {
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
    },
    engagement: { ...basePost.engagement, score: 412, commentCount: 38 },
  },
  youtubeOfficial: {
    label: "YouTube Official",
    title: "Official YouTube embed",
    content: {
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
    },
    engagement: { ...basePost.engagement, score: 624, commentCount: 74 },
  },
  kalshiOpen: {
    label: "Kalshi Market",
    content: {
      type: "embed",
      canonicalUrl: kalshiUrl,
      originalUrl: kalshiUrl,
      preview: {
        chart: chart(kalshiBaseChart, true),
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
    },
    engagement: { ...basePost.engagement, score: 73, commentCount: 11 },
  },
  polymarketOpen: {
    label: "Polymarket Market",
    content: {
      type: "embed",
      canonicalUrl: polymarketUrl,
      originalUrl: polymarketUrl,
      preview: {
        chart: chart(polymarketBaseChart),
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
    },
    engagement: { ...basePost.engagement, score: 116, commentCount: 24 },
  },
  polymarketArabic: {
    label: "Polymarket Market Arabic",
    content: {
      type: "embed",
      canonicalUrl: polymarketUrl,
      originalUrl: polymarketUrl,
      preview: {
        chart: chart(polymarketBaseChart),
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
    },
    engagement: { ...basePost.engagement, score: 116, commentCount: 24 },
  },
  kalshiClosed: {
    label: "Kalshi Market Closed",
    content: {
      type: "embed",
      canonicalUrl: kalshiUrl,
      originalUrl: kalshiUrl,
      preview: {
        chart: chart(kalshiBaseChart),
        closeTime: "2026-06-01T00:00:00Z",
        lastPrice: 0.42,
        question: "Will Kanye visit Israel before June?",
        status: "closed",
        yesPrice: 0.42,
      },
      provider: "kalshi",
      renderMode: "preview",
      state: "embed",
    },
    engagement: { ...basePost.engagement, score: 73, commentCount: 11 },
  },
  kalshiResolvedYes: {
    label: "Kalshi Market Resolved Yes",
    content: {
      type: "embed",
      canonicalUrl: kalshiUrl,
      originalUrl: kalshiUrl,
      preview: {
        chart: chart([
          ...kalshiBaseChart.slice(0, 22),
          0.49, 0.56, 0.68, 0.74, 0.82, 0.91, 0.97, 1,
        ]),
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
    },
    engagement: { ...basePost.engagement, score: 73, commentCount: 11 },
  },
  polymarketResolvedNo: {
    label: "Polymarket Market Resolved No",
    content: {
      type: "embed",
      canonicalUrl: polymarketUrl,
      originalUrl: polymarketUrl,
      preview: {
        chart: chart([
          ...polymarketBaseChart.slice(0, 15),
          0.39, 0.34, 0.3, 0.24, 0.19, 0.15, 0.13, 0.1, 0.08, 0.06,
          0.04, 0.03, 0.02, 0.01, 0,
        ]),
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
    },
    engagement: { ...basePost.engagement, score: 116, commentCount: 24 },
  },
  polymarketEventMultiOutcome: {
    label: "Polymarket Event Multi-Outcome",
    content: {
      type: "embed",
      canonicalUrl: polymarketEventUrl,
      originalUrl: polymarketEventUrl,
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
    },
    engagement: { ...basePost.engagement, score: 89, commentCount: 31 },
  },
  polymarketEventResolvedOutcome: {
    label: "Polymarket Event Resolved Outcome",
    content: {
      type: "embed",
      canonicalUrl: polymarketEventUrl,
      originalUrl: polymarketEventUrl,
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
    },
    engagement: { ...basePost.engagement, score: 89, commentCount: 31 },
  },
} satisfies Record<string, EmbedVariant>;

type EmbedVariantKey = keyof typeof embedVariants;
const embedVariantKeys = Object.keys(embedVariants) as EmbedVariantKey[];

export const EmbedVariants: Story = {
  name: "Embed / Variants",
  render: function EmbedVariantsStory() {
    const [variantKey, setVariantKey] = React.useState<EmbedVariantKey>("xPreview");
    const variant = embedVariants[variantKey];

    return (
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-base text-muted-foreground">
          <span>Embed variant</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
            onChange={(event) => setVariantKey(event.target.value as EmbedVariantKey)}
            value={variantKey}
          >
            {embedVariantKeys.map((key) => (
              <option key={key} value={key}>{embedVariants[key].label}</option>
            ))}
          </select>
        </label>
        <PostCard
          {...basePost}
          content={variant.content}
          engagement={variant.engagement}
          title={variant.title}
        />
      </div>
    );
  },
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

export const LongTextFeedPreview: Story = {
  name: "Layout: Long Text Feed Preview",
  render: () => (
    <PostCard
      {...basePost}
      content={{ type: "text", body: longTextPostBody }}
      engagement={{ ...basePost.engagement, score: 214, commentCount: 38 }}
      postHref="/p/post_long_text_story"
      title="Long text post should not consume the feed"
      viewContext="community"
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

export const ProcessingPost: Story = {
  name: "State: Processing Publish",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        ...basePost.byline,
        timestampLabel: "now",
      }}
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
  name: "State: Publish Failed / Retryable",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        ...basePost.byline,
        timestampLabel: "2m",
      }}
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
        action: {
          label: "Try again",
          onClick: noop,
        },
      }}
      title="Borderline rough mix"
      titleHref={undefined}
      postHref={undefined}
    />
  ),
};

export const FailedTerminalPost: Story = {
  name: "State: Publish Failed / Terminal",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        ...basePost.byline,
        timestampLabel: "4m",
      }}
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
  name: "State: Deleted",
  render: () => (
    <PostCard
      {...basePost}
      byline={{
        ...basePost.byline,
        timestampLabel: "4h",
      }}
      content={{
        type: "text",
        body: "This post was deleted by its author.",
      }}
      engagement={{ score: 0, commentCount: 12 }}
      menuItems={undefined}
      title={undefined}
    />
  ),
};

export const RemovedByModerator: Story = {
  name: "State: Removed By Moderator",
  render: () => (
    <PostCard
      {...basePost}
      authorCommunityRole="moderator"
      byline={{
        ...basePost.byline,
        timestampLabel: "1d",
      }}
      content={{
        type: "text",
        body: "This post was removed by the moderators of c/tameimpala.",
      }}
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
  name: "State: NSFW Blurred",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        type: "image",
        src: "https://picsum.photos/seed/pirate-nsfw-blur/600/400",
        alt: "Age-restricted image preview",
        ageGatePolicy: "18_plus",
        ageGateViewerState: "proof_required",
        contentSafetyState: "adult",
        onVerifyAge: () => undefined,
      }}
      engagement={{ ...basePost.engagement, score: 81, commentCount: 14 }}
      title="Age-restricted behind-the-scenes photo"
    />
  ),
};

export const FailedEmbed: Story = {
  name: "State: Failed Embed",
  render: () => (
    <PostCard
      {...basePost}
      content={{
        type: "embed",
        canonicalUrl: "https://www.youtube.com/watch?v=unavailable",
        originalUrl: "https://youtu.be/unavailable",
        preview: {
          title: "Unavailable video",
        },
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
