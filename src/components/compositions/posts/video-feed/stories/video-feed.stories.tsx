import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import { FeedBookingSheet } from "@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { VideoFeed } from "../video-feed";
import { VideoFeedPaginationNotice } from "../video-feed-pagination-notice";
import type { VideoFeedItem } from "../video-feed.types";

const videoSrc = "https://stream.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/low.mp4";
const posterSrc = "https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=0";

const portrait: VideoFeedItem = {
  id: "video_portrait",
  publisher: { handle: "karaoke.pirate", kind: "community" },
  caption: "Working through the chorus one line at a time.",
  commentCount: 86,
  interactionGate: "open",
  karaoke: "ready",
  likeCount: 12400,
  media: { orientation: "portrait", posterSrc, src: videoSrc },
  rewards: { karaoke: { amountLabel: "$2" }, study: { amountLabel: "$1" } },
  song: { artist: "Britney Spears", songHref: "/p/pst_toxic", title: "Toxic" },
  study: "ready",
  viewerState: "allowed",
};

const landscape: VideoFeedItem = {
  ...portrait,
  id: "video_landscape",
  publisher: { handle: "performances.pirate", kind: "community" },
  caption: "Landscape performances stay eligible in a contained player with an ambient backdrop.",
  likeCount: 3800,
  media: { orientation: "landscape", posterSrc, src: videoSrc },
  song: { artist: "Daft Punk", title: "Studio Session" },
};

const gated: VideoFeedItem = {
  ...portrait,
  id: "video_gated",
  publisher: { handle: "members.pirate", kind: "community" },
  caption: "Public to watch; joining is required before interacting.",
  interactionGate: "membership_required",
  karaoke: "locked",
  likeCount: 712,
  study: "ready",
};

const ageBlocked: VideoFeedItem = {
  ...portrait,
  id: "video_age_blocked",
  caption: "The story deliberately contains no playable source in the rendered video element.",
  media: { orientation: "portrait", posterSrc, src: "https://media.example.test/must-not-render.mp4" },
  viewerState: "age_proof_required",
};

const bookableCreator: VideoFeedItem = {
  ...portrait,
  booking: { basePriceCents: 3500, currency: "USDC", hostUserId: "usr_scarlett" },
  id: "video_bookable_creator",
  publisher: { handle: "mara.english", kind: "profile" },
  caption: "Practice the chorus, then book a private pronunciation class with me.",
};

const publisherAvatarRail: VideoFeedItem = {
  ...portrait,
  id: "video_publisher_avatar_rail",
  publisher: {
    avatarSrc: "https://i.pravatar.cc/128?img=47",
    handle: "mara.english",
    kind: "profile",
  },
  caption: "Publisher identity moves to the top of the action rail; the caption keeps the handle.",
};

const longFeed = Array.from({ length: 7 }, (_, index): VideoFeedItem => ({
  ...portrait,
  id: `video_window_${index + 1}`,
  caption: `Media-window review slide ${index + 1} of 7.`,
  likeCount: 12000 + index,
  media: {
    ...portrait.media,
    src: `${videoSrc}?slide=${index + 1}`,
  },
}));

const meta = {
  title: "Compositions/Posts/VideoFeed",
  component: VideoFeed,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VideoFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

const BOOKING_SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T11:00:00.000Z", endUtc: "2026-09-21T11:30:00.000Z", priceCents: 3500, available: false },
  { startUtc: "2026-09-22T14:00:00.000Z", endUtc: "2026-09-22T14:30:00.000Z", priceCents: 5000, available: true },
] as ResolvedSlot[];

function InteractiveFeed({ items, initialItemId }: { items: VideoFeedItem[]; initialItemId?: string }) {
  // The container owns the overlay; the feed only reports intent and pauses the item behind it.
  const [bookingItem, setBookingItem] = React.useState<VideoFeedItem | undefined>(undefined);

  return (
    <>
      <VideoFeed
        bookingOpenItemId={bookingItem?.id}
        initialItemId={initialItemId}
        items={items}
        onBook={(item) => setBookingItem(item)}
        onBoost={(item) => toast.message(`Boost: ${item.song?.title}`)}
        onComment={(item) => toast.message(`Comments: ${item.id}`)}
        onGateRequired={() => toast.message("Join this community to interact")}
        onKaraoke={(item) => toast.message(`Sing: ${item.song?.title}`)}
        onLike={(item) => toast.message(`Liked: ${item.id}`)}
        onShare={(item) => toast.message(`Shared: ${item.id}`)}
        onSong={(item) => toast.message(`Open song: ${item.song?.title}`)}
        onStudy={(item) => toast.message(`Study: ${item.song?.title}`)}
      />
      <FeedBookingSheet
        basePriceCents={3500}
        handle={bookingItem?.publisher.handle ?? ""}
        onOpenChange={(open) => { if (!open) setBookingItem(undefined); }}
        onSelectSlot={(slot) => {
          setBookingItem(undefined);
          toast.message(`Checkout: ${slot.startUtc}`);
        }}
        open={bookingItem !== undefined}
        slots={BOOKING_SLOTS}
        viewerTimezone={"Europe/Vienna" as never}
      />
    </>
  );
}

function MobileChromeReview() {
  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <InteractiveFeed items={[{ ...portrait, boostEligibility: "eligible" }]} />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-black/75 pt-[env(safe-area-inset-top)] text-white backdrop-blur-md">
        <div className="grid h-16 place-items-center text-base font-semibold">Fixed mobile header</div>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/75 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-md">
        <div className="grid h-[var(--header-height)] place-items-center text-base font-semibold">Fixed mobile navigation</div>
      </div>
    </div>
  );
}

function DesktopChromeReview() {
  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="grid h-[var(--header-height)] place-items-center border-b border-border-soft bg-background text-base font-semibold">
        In-flow desktop header
      </div>
      <VideoFeed
        className="h-[calc(100dvh-var(--header-height))]"
        items={[{ ...portrait, boostEligibility: "eligible" }]}
        onBoost={(item) => toast.message(`Boost: ${item.song?.title}`)}
        onComment={(item) => toast.message(`Comments: ${item.id}`)}
        onKaraoke={(item) => toast.message(`Sing: ${item.song?.title}`)}
        onLike={(item) => toast.message(`Liked: ${item.id}`)}
        onShare={(item) => toast.message(`Shared: ${item.id}`)}
        onStudy={(item) => toast.message(`Study: ${item.song?.title}`)}
      />
    </div>
  );
}

export const VerticalFeed: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[portrait, landscape, gated]} />,
};

export const PublisherAvatarRail: Story = {
  name: "Rail / Publisher avatar",
  args: { items: [] },
  render: () => <InteractiveFeed items={[publisherAvatarRail]} />,
};

export const SocialAndEarningActions: Story = {
  name: "Rail / Social and earning actions",
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story: "Like, comments, and share use lightweight white glyphs; Book, Study, and Sing remain surfaced actions with labels and reward badges.",
      },
    },
  },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

export const MobileSocialAndEarningActions: Story = {
  name: "Rail / Social and earning actions / Mobile",
  args: { items: [] },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

export const MobileFixedChrome: Story = {
  name: "Viewport / Mobile fixed chrome",
  args: { items: [] },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <MobileChromeReview />,
};

export const DesktopInFlowHeader: Story = {
  name: "Viewport / Desktop in-flow header",
  args: { items: [] },
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <DesktopChromeReview />,
};

export const NarrowDesktopStage: Story = {
  name: "Viewport / Narrow desktop dock stage",
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story: "Simulates the remaining feed column when the app sidebar and 26rem comments dock are both present. The media frame shrinks within the stage instead of overflowing beneath the action rail.",
      },
    },
    viewport: { defaultViewport: "desktop" },
  },
  render: () => (
    <div className="h-dvh w-96 overflow-hidden bg-background">
      <InteractiveFeed items={[publisherAvatarRail]} />
    </div>
  ),
};

export const LongFeedMediaWindow: Story = {
  name: "Loading / Near-slide media window",
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story: "All seven snap shells remain mounted while video elements are limited to the active slide plus two neighbors on each side.",
      },
    },
  },
  render: () => <InteractiveFeed items={longFeed} />,
};

export const PaginationFailure: Story = {
  name: "Loading / Pagination failure",
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story: "A non-modal retry notice stays above fixed mobile navigation without changing the snap-scroll geometry or pausing playback.",
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="relative h-dvh overflow-hidden">
      <InteractiveFeed items={[portrait]} />
      <VideoFeedPaginationNotice
        actionLabel="Retry"
        message="Couldn't load more videos."
        onAction={() => toast.message("Retry pagination")}
      />
    </div>
  ),
};

export const PaginationPaused: Story = {
  name: "Loading / Pagination paused",
  args: { items: [] },
  parameters: {
    docs: {
      description: {
        story: "After three pages add no unseen posts, automatic loading pauses and the viewer can explicitly resume from the preserved server cursor.",
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="relative h-dvh overflow-hidden">
      <InteractiveFeed items={[portrait]} />
      <VideoFeedPaginationNotice
        actionLabel="Keep loading"
        message="More videos may be available."
        onAction={() => toast.message("Resume pagination")}
      />
    </div>
  ),
};

export const LandscapeTreatment: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[landscape]} />,
};

export const MembershipGatedActions: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[gated]} />,
};

export const AgeProofRequired: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[ageBlocked]} />,
};

export const NoLinkedSong: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[{ ...portrait, id: "video_unlinked", karaoke: "unavailable", song: undefined, study: "unavailable" }]} />,
};

export const RewardedActionsAndBoost: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[{ ...portrait, boostEligibility: "eligible" }]} />,
};

export const BookableCreator: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

export const MobileBookableCreator: Story = {
  args: { items: [] },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

/**
 * Widest rail the surface can produce: publisher, upvote, comments, book, study, sing, share and
 * overflow. Reviewed on mobile because that is where the rail competes with the caption.
 */
export const MobileFullRail: Story = {
  name: "Rail / Mobile full rail",
  args: { items: [] },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <InteractiveFeed
      items={[{
        ...bookableCreator,
        boostEligibility: "eligible",
        karaoke: "ready",
        rewards: { karaoke: { amountLabel: "$2" }, study: { amountLabel: "$1" } },
        study: "ready",
      }]}
    />
  ),
};

/** Overflow still renders with no boost offer, so the rail keeps its height between videos. */
export const MobileRailWithoutBoost: Story = {
  name: "Rail / Mobile without boost",
  args: { items: [] },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <InteractiveFeed
      items={[{
        ...portrait,
        boostEligibility: "unavailable",
        downvoted: true,
        publisher: { handle: "songs.pirate", kind: "community" },
      }]}
    />
  ),
};

export const Empty: Story = {
  args: { items: [] },
};
