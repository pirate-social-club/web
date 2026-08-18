import { Show, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button, Type } from "../../../design-system";
import type { ResolvedSlot } from "../../bookings/view-models";
import { FeedBookingSheetBody } from "../../bookings/feed-booking-sheet/feed-booking-sheet";
import { FeedPanelLayout, FeedSidePanel } from "../feed-side-panel/feed-side-panel";
import { VideoFeedPaginationNotice } from "./video-feed-pagination-notice";
import { VideoFeed } from "./video-feed";
import type { VideoFeedItem } from "./video-feed.types";

const offlineVideo = "data:video/mp4;base64,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";
const offlinePoster = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='960'%3E%3Crect width='100%25' height='100%25' fill='%231b1b24'/%3E%3Ccircle cx='360' cy='440' r='160' fill='%236e56cf'/%3E%3C/svg%3E";

const portrait: VideoFeedItem = {
  id: "video_portrait",
  publisher: { handle: "karaoke.pirate", kind: "community" },
  caption: "Working through the chorus one line at a time.",
  commentCount: 86,
  interactionGate: "open",
  karaoke: "ready",
  likeCount: 12400,
  media: { orientation: "portrait", posterSrc: offlinePoster, src: offlineVideo },
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
  media: { orientation: "landscape", posterSrc: offlinePoster, src: offlineVideo },
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
};

const ageBlocked: VideoFeedItem = {
  ...portrait,
  id: "video_age_blocked",
  caption: "This state deliberately has no playable source.",
  media: { orientation: "portrait", posterSrc: offlinePoster },
  viewerState: "age_proof_required",
};

const bookableCreator: VideoFeedItem = {
  ...portrait,
  booking: { basePriceCents: 5000, currency: "USDC", hasAvailableSlot: true, hostUserId: "usr_scarlett", startingPriceCents: 3500 },
  id: "video_bookable_creator",
  publisher: { handle: "mara.english", kind: "profile" },
  caption: "Practice the chorus, then book a private pronunciation class with me.",
};

const publisherAvatarRail: VideoFeedItem = {
  ...portrait,
  id: "video_publisher_avatar_rail",
  publisher: { avatarSrc: offlinePoster, handle: "mara.english", kind: "profile" },
  caption: "Publisher identity moves to the top of the action rail.",
};

const longFeed = Array.from({ length: 7 }, (_, index): VideoFeedItem => ({
  ...portrait,
  id: `video_window_${index + 1}`,
  caption: `Media-window review slide ${index + 1} of 7.`,
  likeCount: 12000 + index,
}));

const bookingSlots: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T11:00:00.000Z", endUtc: "2026-09-21T11:30:00.000Z", priceCents: 3500, available: false },
  { startUtc: "2026-09-22T14:00:00.000Z", endUtc: "2026-09-22T14:30:00.000Z", priceCents: 5000, available: true },
];

const meta = {
  title: "Compositions/Posts/VideoFeed",
  component: VideoFeed,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VideoFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

function InteractiveFeed(props: { items: VideoFeedItem[]; initialItemId?: string; initialMuted?: boolean; paginationError?: string; paginationPaused?: boolean }) {
  const [bookingItem, setBookingItem] = createSignal<VideoFeedItem>();
  const [message, setMessage] = createSignal("Ready");
  const [openComments, setOpenComments] = createSignal(false);
  return (
    <FeedPanelLayout
      class="h-dvh bg-black"
      panel={
        <Show when={bookingItem() || openComments()}>
          <FeedSidePanel
            closeLabel="Close"
            description={bookingItem() ? "Choose an available time." : "86 comments"}
            onOpenChange={(open) => { if (!open) { setBookingItem(undefined); setOpenComments(false); } }}
            open
            title={bookingItem() ? `Book ${bookingItem()?.publisher.handle}` : "Comments"}
          >
            <Show when={bookingItem()} fallback={<div class="p-5"><Type variant="body">Comments remain readable. Connect when you want to reply.</Type></div>}>
              <div class="h-full overflow-y-auto p-5">
                <FeedBookingSheetBody onSelectSlot={(slot) => { setMessage(`Selected ${slot.startUtc}`); setBookingItem(undefined); }} slots={bookingSlots} startingPriceCents={3500} viewerTimezone="Europe/Vienna" />
              </div>
            </Show>
          </FeedSidePanel>
        </Show>
      }
    >
      <div class="relative h-full">
        <VideoFeed
          class="h-full"
          externallyPausedItemId={bookingItem()?.id}
          hasMore={Boolean(props.paginationError || props.paginationPaused)}
          initialItemId={props.initialItemId}
          initialMuted={props.initialMuted}
          items={props.items}
          onBook={(item) => setBookingItem(item)}
          onBoost={(item) => setMessage(`Boost: ${item.song?.title ?? item.id}`)}
          onComment={(item) => { setOpenComments(true); setMessage(`Comments: ${item.id}`); }}
          onGateRequired={(item) => setMessage(`Gate required for ${item.publisher.handle}`)}
          onKaraoke={(item) => setMessage(`Sing: ${item.song?.title ?? item.id}`)}
          onLike={(item) => setMessage(`Liked: ${item.id}`)}
          onPublisherRelationship={(item) => setMessage(`Publisher: ${item.publisher.handle}`)}
          onShare={(item) => setMessage(`Shared: ${item.id}`)}
          onSong={(item) => setMessage(`Open song: ${item.song?.title ?? "original sound"}`)}
          onStudy={(item) => setMessage(`Study: ${item.song?.title ?? item.id}`)}
          paginationError={props.paginationError}
          paginationPaused={props.paginationPaused}
        />
        <div class="pointer-events-none fixed inset-x-4 top-4 z-30 flex justify-center"><Type aria-live="polite" class="rounded-full bg-black/75 px-3 py-1 text-white" variant="caption">{message()}</Type></div>
      </div>
    </FeedPanelLayout>
  );
}

export const VerticalFeed: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[portrait, landscape, gated]} /> };

export const PublisherAvatarRail: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[publisherAvatarRail]} /> };

export const SocialAndEarningActions: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

export const DesktopBottomAlignedRail: Story = {
  args: { items: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <InteractiveFeed items={[{ ...bookableCreator, boostEligibility: "eligible" }]} />,
};

export const DesktopHoverCornerControls: Story = {
  args: { items: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <InteractiveFeed items={[{ ...portrait, boostEligibility: "eligible" }]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const more = canvas.getByRole("button", { name: "More" });
    more.focus();
    await expect(more).toHaveFocus();
    await userEvent.click(more);
    const menu = await body.findByRole("menu");
    await expect(menu).toBeVisible();
    await expect(body.getByRole("menuitem", { name: "Downvote video" })).toBeVisible();
    await waitFor(() => expect(menu).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(more).toHaveFocus());
  },
};

export const DesktopProgressScrubber: Story = {
  args: { items: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <InteractiveFeed items={[{ ...portrait, caption: "Focus the native playback controls to review scrubbing." }]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("slider", { name: "Video progress" }) as HTMLInputElement;
    const video = canvasElement.querySelector<HTMLVideoElement>("video");
    if (!video) throw new Error("Expected the active video fixture to mount");
    Object.defineProperty(video, "currentTime", { configurable: true, value: 12.5, writable: true });
    Object.defineProperty(video, "duration", { configurable: true, value: 40, writable: true });
    video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
    await waitFor(() => expect(slider).toHaveValue("12.5"));
    slider.value = "30";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    await expect(video.currentTime).toBe(30);
    await waitFor(() => expect(slider).toHaveValue("30"));
  },
};

export const DesktopPreviousNextNavigation: Story = {
  args: { items: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <InteractiveFeed initialItemId={longFeed[3]?.id} items={longFeed} />,
};

export const MobileProgressBar: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <InteractiveFeed items={[portrait]} />,
};

export const MobileSocialAndEarningActions: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
};

export const MobileFixedChrome: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <div class="relative h-dvh overflow-hidden bg-background">
      <InteractiveFeed items={[portrait]} />
      <div class="pointer-events-none fixed inset-x-0 top-0 z-40 border-b border-border-soft bg-card/90 pt-[env(safe-area-inset-top)]"><div class="grid h-16 place-items-center"><Type variant="label">Fixed mobile header</Type></div></div>
      <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-card/90 pb-[env(safe-area-inset-bottom)]"><div class="grid h-[var(--header-height)] place-items-center"><Type variant="label">Fixed mobile navigation</Type></div></div>
    </div>
  ),
};

export const DesktopInFlowHeader: Story = {
  args: { items: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => <div class="h-dvh overflow-hidden bg-background"><div class="grid h-[var(--header-height)] place-items-center border-b border-border-soft"><Type variant="label">In-flow desktop header</Type></div><InteractiveFeed items={[portrait]} /></div>,
};

export const NarrowDesktopStage: Story = {
  args: { items: [] },
  render: () => <div class="h-dvh w-96 overflow-hidden bg-background"><InteractiveFeed items={[publisherAvatarRail]} /></div>,
};

export const NarrowDesktopLandscapeStage: Story = {
  args: { items: [] },
  render: () => <div class="h-dvh w-96 overflow-hidden bg-background"><InteractiveFeed items={[landscape]} /></div>,
};

export const LongFeedMediaWindow: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={longFeed} />,
};

export const PaginationFailure: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <div class="relative h-dvh overflow-hidden"><InteractiveFeed items={[portrait]} paginationError="Couldn't load more videos." /><VideoFeedPaginationNotice actionLabel="Retry" message="Couldn't load more videos." onAction={() => undefined} /></div>,
};

export const PaginationPaused: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <div class="relative h-dvh overflow-hidden"><InteractiveFeed items={[portrait]} paginationPaused /><VideoFeedPaginationNotice actionLabel="Keep loading" message="More videos may be available." onAction={() => undefined} /></div>,
};

export const LandscapeTreatment: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[landscape]} /> };
export const MembershipGatedActions: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[gated]} /> };
export const AgeProofRequired: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[ageBlocked]} /> };
export const NoLinkedSong: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[{ ...portrait, id: "video_unlinked", karaoke: "unavailable", song: undefined, study: "unavailable" }]} /> };
export const PublisherLinksWithOriginalSound: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[{ ...portrait, publisher: { ...portrait.publisher, href: "/c/karaoke" }, song: undefined }]} /> };
export const PublisherGhostFallback: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[{ ...portrait, publisher: { handle: "ghost.pirate", href: "/c/ghost", kind: "community" } }]} /> };
export const TranslatedCaption: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[{ ...portrait, caption: "تعليق عربي مترجم يظهر باتجاه صحيح", captionDir: "rtl", captionLang: "ar", translation: { originalCaption: "The authored English caption.", originalDir: "ltr", originalLang: "en", showOriginalLabel: "Show original", showTranslationLabel: "Show translation" } }]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("تعليق عربي مترجم يظهر باتجاه صحيح")).toHaveAttribute("dir", "rtl");
    await expect(canvas.getByText("تعليق عربي مترجم يظهر باتجاه صحيح")).toHaveAttribute("lang", "ar");
    await userEvent.click(canvas.getByRole("button", { name: "Show original" }));
    await expect(canvas.getByText("The authored English caption.")).toHaveAttribute("dir", "ltr");
    await expect(canvas.getByText("The authored English caption.")).toHaveAttribute("lang", "en");
  },
};
export const RewardedActionsAndBoost: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[{ ...portrait, boostEligibility: "eligible" }]} /> };
export const BookableCreator: Story = {
  args: { items: [] },
  render: () => <InteractiveFeed items={[bookableCreator]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const video = canvasElement.querySelector<HTMLVideoElement>("video");
    if (!video) throw new Error("Expected the bookable video fixture to mount");
    await waitFor(() => expect(video.readyState).toBe(4));
    await userEvent.click(canvas.getAllByRole("button", { name: "Play video" })[0]!);
    await waitFor(() => expect(canvas.getAllByRole("button", { name: "Pause video" })[0]).toBeInTheDocument());
    await userEvent.click(canvas.getByRole("button", { name: "Book" }));
    await expect(canvasElement.querySelector("[data-feed-side-panel]") ?? document.querySelector("[role=dialog]" )).toBeInTheDocument();
    await expect(canvasElement.querySelector("[data-video-active-overlay]" )?.textContent).toContain("Playback paused for panel");
    await expect(canvasElement.querySelector("video")?.paused).toBe(true);
  },
};
export const MobileBookableCreator: Story = { args: { items: [] }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: () => <InteractiveFeed items={[bookableCreator]} /> };
export const MobileFullRail: Story = { args: { items: [] }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: () => <InteractiveFeed items={[{ ...bookableCreator, boostEligibility: "eligible", rewards: { karaoke: { amountLabel: "$2" }, study: { amountLabel: "$1" } } }]} /> };
export const MobileRailWithoutBoost: Story = { args: { items: [] }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: () => <InteractiveFeed items={[{ ...portrait, boostEligibility: "unavailable", downvoted: true, publisher: { handle: "songs.pirate", kind: "community" } }]} /> };
export const DesktopPublisherJoin: Story = { args: { items: [] }, globals: { viewport: { value: "desktop", isRotated: false } }, render: () => <InteractiveFeed items={[{ ...portrait, publisher: { ...portrait.publisher, relationship: { active: false, kind: "join", label: "Join community" } } }]} /> };
export const MobilePublisherJoined: Story = { args: { items: [] }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: () => <InteractiveFeed items={[{ ...portrait, publisher: { ...portrait.publisher, relationship: { active: true, disabled: true, kind: "join", label: "Joined community" } } }]} /> };
export const MobilePublisherFollow: Story = { args: { items: [] }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: () => <InteractiveFeed items={[{ ...bookableCreator, publisher: { ...bookableCreator.publisher, relationship: { kind: "follow", ownProfile: false, targetUserId: "usr_publisher", targetWalletAddress: "0x0000000000000000000000000000000000000001" } } }]} /> };
export const MobileTapForSound: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <InteractiveFeed initialMuted={false} items={[portrait]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector("video")?.muted).toBe(true);
    await expect(canvasElement.querySelector("[data-video-audio-prompt]")).toBeInTheDocument();
    await expect(canvasElement.querySelector("[data-video-audio-state]")).not.toBeInTheDocument();
    await userEvent.click(canvas.getAllByRole("button", { name: "Tap for sound" })[0]!);
    await waitFor(() => expect(canvasElement.querySelector("video")?.muted).toBe(false));
    await expect(canvasElement.querySelector("[data-video-audio-state]")).toBeInTheDocument();
  },
};
export const MobilePersistedMuted: Story = {
  args: { items: [] },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <InteractiveFeed initialMuted items={[portrait]} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("video")?.muted).toBe(true);
    await expect(canvasElement.querySelector("[data-video-audio-prompt]")).not.toBeInTheDocument();
    await expect(canvasElement.querySelector("[data-video-audio-state]")).not.toBeInTheDocument();
  },
};
export const Empty: Story = { args: { items: [] }, render: () => <InteractiveFeed items={[]} /> };
