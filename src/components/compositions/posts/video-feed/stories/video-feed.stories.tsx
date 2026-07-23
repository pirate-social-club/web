import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import { FeedBookingSheet } from "@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { VideoFeed } from "../video-feed";
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

export const VerticalFeed: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[portrait, landscape, gated]} />,
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

export const Empty: Story = {
  args: { items: [] },
};
