"use client";

import * as React from "react";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useVideoHomeChrome } from "@/app/shell/video-home-chrome-context";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { useVideoViewerSongCapabilities } from "@/app/authenticated-helpers/use-video-viewer-song-capabilities";
import {
  currentRelativePath,
  readVideoViewerReturnState,
  saveVideoViewerReturnState,
} from "@/app/authenticated-helpers/video-viewer-return-state";
import { VideoBookingAvailabilityCache } from "@/app/authenticated-helpers/video-booking-availability-cache";
import { FeedBookingSheet } from "@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { toPageVideoItem, adjacentVideoSourcePostIds, VideoViewerBoostBridge } from "@/components/compositions/posts/feed/feed";
import { VideoFeed, type VideoFeedPlaybackState } from "@/components/compositions/posts/video-feed/video-feed";
import { VideoFeedPaginationNotice } from "@/components/compositions/posts/video-feed/video-feed-pagination-notice";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { VideoSongCapabilityCache } from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import { Spinner } from "@/components/primitives/spinner";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { HomePage } from "./home-routes";

export type VideoHomeSurface = "loading" | "video" | "community-feed-empty" | "community-feed-error";

export function checkoutPathForFeedSlot(hostUserId: string, slot: ResolvedSlot): string {
  const query = new URLSearchParams({
    end: slot.endUtc,
    start: slot.startUtc,
  });
  return `/book/${encodeURIComponent(hostUserId)}/checkout?${query.toString()}`;
}

function viewerTimezone(): IanaTz {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Viewport box for the feed. Mobile chrome is fixed, so the feed owns the whole viewport and the
 * slide insets its controls clear of it. The md+ header is sticky and therefore in flow, so its
 * height has to come out of the box, or the document itself scrolls and slides centre against the
 * wrong height. Exported so the geometry stays under test.
 */
export const VIDEO_FEED_VIEWPORT_CLASS = "h-dvh md:h-[calc(100dvh-var(--header-height))]";
export const MAX_CONSECUTIVE_NO_GROWTH_PAGES = 3;

export function resolveVideoHomeSurface(input: {
  error: unknown;
  itemCount: number;
  loading: boolean;
}): VideoHomeSurface {
  if (input.loading) return "loading";
  if (input.error) return "community-feed-error";
  if (input.itemCount === 0) return "community-feed-empty";
  return "video";
}

export function appendUniqueVideoEntries(
  current: ApiHomeFeedItem[],
  incoming: ApiHomeFeedItem[],
): ApiHomeFeedItem[] {
  const seenPostIds = new Set(current.map((entry) => entry.post.post.id));
  const uniqueIncoming = incoming.filter((entry) => {
    const postId = entry.post.post.id;
    if (seenPostIds.has(postId)) return false;
    seenPostIds.add(postId);
    return true;
  });
  return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current;
}

export function nextVideoPaginationCursor(input: {
  consecutiveNoGrowthPages: number;
  didGrow: boolean;
  serverCursor: string | null;
}): { consecutiveNoGrowthPages: number; nextCursor: string | null } {
  const consecutiveNoGrowthPages = input.didGrow ? 0 : input.consecutiveNoGrowthPages + 1;
  return {
    consecutiveNoGrowthPages,
    nextCursor: consecutiveNoGrowthPages >= MAX_CONSECUTIVE_NO_GROWTH_PAGES
      ? null
      : input.serverCursor,
  };
}

export function VideoHomePage() {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const { copy } = useRouteMessages();
  const requestAuth = useRequestAuth();
  const capabilityLoader = useVideoViewerSongCapabilities(contentLocale);
  const [entries, setEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = React.useState<unknown>(null);
  const [pausedPaginationCursor, setPausedPaginationCursor] = React.useState<string | null>(null);
  const [capabilityRevision, setCapabilityRevision] = React.useState(0);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [boostTarget, setBoostTarget] = React.useState<{ open: () => void; sourcePostId: string } | null>(null);
  const [bookingTarget, setBookingTarget] = React.useState<{
    item: VideoFeedItem;
    playback: VideoFeedPlaybackState;
  } | null>(null);
  const [bookingSlots, setBookingSlots] = React.useState<ResolvedSlot[]>([]);
  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [bookingError, setBookingError] = React.useState(false);
  const loadingMoreRef = React.useRef(false);
  const consecutiveNoGrowthPagesRef = React.useRef(0);
  const feedGenerationRef = React.useRef(0);
  const seenPostIdsRef = React.useRef(new Set<string>());
  const bookingRequestHostRef = React.useRef<string | null>(null);
  const bookingTimezone = React.useMemo(viewerTimezone, []);
  // Session storage only exists on the client, and the restored state is consumed
  // no earlier than the first post-hydration render, so defer the read.
  const restored = React.useMemo(
    () => (hydrated ? readVideoViewerReturnState(currentRelativePath()) : null),
    [hydrated],
  );
  const capabilityCache = React.useMemo(
    () => new VideoSongCapabilityCache(capabilityLoader.cacheScope, capabilityLoader.load),
    [capabilityLoader],
  );
  const bookingCache = React.useMemo(
    () => new VideoBookingAvailabilityCache(async (hostUserId) => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 14 * 86_400_000).toISOString();
      const response = await api.bookings.listBookingSlots(hostUserId, {
        from,
        to,
        tz: bookingTimezone,
      });
      return response.slots as ResolvedSlot[];
    }),
    [api.bookings, bookingTimezone],
  );

  React.useEffect(() => {
    if (!hydrated) return;
    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;
    loadingMoreRef.current = false;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
    void request({ locale: contentLocale, sort: "best" })
      .then((response) => {
        if (cancelled) return;
        seenPostIdsRef.current = new Set(response.items.map((entry) => entry.post.post.id));
        consecutiveNoGrowthPagesRef.current = 0;
        setPausedPaginationCursor(null);
        setEntries(response.items);
        setNextCursor(response.next_cursor ?? null);
      })
      .catch((nextError: unknown) => { if (!cancelled) setError(nextError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (feedGenerationRef.current === generation) feedGenerationRef.current += 1;
    };
  }, [api, contentLocale, hydrated, session?.accessToken]);

  const pageItems = React.useMemo(
    () => entries.map((entry) => toHomeFeedItem(entry, {})).flatMap((item) => {
      const video = toPageVideoItem(item);
      return video ? [video] : [];
    }),
    [entries],
  );
  const items = React.useMemo(() => pageItems.map((item) => {
    const sourcePostId = item.song?.sourcePostId;
    const resolution = sourcePostId ? capabilityCache.get(sourcePostId) : undefined;
    if (!resolution) return item;
    return {
      ...item,
      boostEligibility: resolution.sourcePostId === boostTarget?.sourcePostId ? "eligible" as const : "unavailable" as const,
      karaoke: resolution.karaoke,
      rewards: resolution.rewards,
      song: item.song ? {
        ...item.song,
        karaokeHref: resolution.karaokeHref,
        studyHref: resolution.studyHref,
      } : undefined,
      study: resolution.study,
    };
  }), [boostTarget?.sourcePostId, capabilityCache, capabilityRevision, pageItems]);

  const activeResolution = React.useMemo(() => {
    const sourcePostId = items.find((item) => item.id === activeItemId)?.song?.sourcePostId;
    return sourcePostId ? capabilityCache.get(sourcePostId) ?? null : null;
  }, [activeItemId, capabilityCache, items]);

  const loadMore = React.useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadMoreError(null);
    const generation = feedGenerationRef.current;
    try {
      const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
      const response = await request({ cursor: nextCursor, locale: contentLocale, sort: "best" });
      if (generation !== feedGenerationRef.current) return;
      const unseenItems = response.items.filter((entry) => {
        const postId = entry.post.post.id;
        if (seenPostIdsRef.current.has(postId)) return false;
        seenPostIdsRef.current.add(postId);
        return true;
      });
      setEntries((current) => appendUniqueVideoEntries(current, unseenItems));
      const pagination = nextVideoPaginationCursor({
        consecutiveNoGrowthPages: consecutiveNoGrowthPagesRef.current,
        didGrow: unseenItems.length > 0,
        serverCursor: response.next_cursor ?? null,
      });
      consecutiveNoGrowthPagesRef.current = pagination.consecutiveNoGrowthPages;
      setNextCursor(pagination.nextCursor);
      setPausedPaginationCursor(
        pagination.nextCursor === null && response.next_cursor
          ? response.next_cursor
          : null,
      );
    } catch (nextError) {
      if (generation === feedGenerationRef.current) setLoadMoreError(nextError);
    } finally {
      if (generation === feedGenerationRef.current) loadingMoreRef.current = false;
    }
  }, [api, contentLocale, nextCursor, session?.accessToken]);

  const resumePagination = React.useCallback(() => {
    if (!pausedPaginationCursor) return;
    consecutiveNoGrowthPagesRef.current = 0;
    setPausedPaginationCursor(null);
    setNextCursor(pausedPaginationCursor);
  }, [pausedPaginationCursor]);

  const onActiveItemChange = React.useCallback((_item: VideoFeedItem, index: number) => {
    setActiveItemId(_item.id);
    void capabilityCache.prefetch(adjacentVideoSourcePostIds(items, index)).then((changed) => {
      if (changed) setCapabilityRevision((current) => current + 1);
    });
    if (index >= items.length - 3) void loadMore();
  }, [capabilityCache, items, loadMore]);

  const onBoostAvailabilityChange = React.useCallback((sourcePostId: string, canBoost: boolean, open: () => void) => {
    setBoostTarget(canBoost ? { open, sourcePostId } : null);
  }, []);

  const onLike = React.useCallback((item: VideoFeedItem) => {
    if (!session?.accessToken) {
      requestAuth(copy.home.videoLikeAuthRequired);
      return;
    }
    const entry = entries.find((candidate) => candidate.post.post.id === item.id);
    if (!entry) return;
    const wasLiked = entry.post.viewer_vote === 1;
    setEntries((current) => current.map((candidate) => candidate.post.post.id === item.id ? {
      ...candidate,
      post: {
        ...candidate.post,
        upvote_count: Math.max(0, candidate.post.upvote_count + (wasLiked ? -1 : 1)),
        viewer_vote: wasLiked ? null : 1,
      },
    } : candidate));
    const request = wasLiked ? api.posts.clearVote(item.id) : api.posts.vote(item.id, 1);
    void request.catch(() => {
      setEntries((current) => current.map((candidate) => candidate.post.post.id === item.id ? entry : candidate));
    });
  }, [api.posts, copy.home.videoLikeAuthRequired, entries, requestAuth, session?.accessToken]);

  const launchSongAction = React.useCallback((item: VideoFeedItem, playback: VideoFeedPlaybackState, href?: string) => {
    if (!href) return;
    const returnPath = currentRelativePath();
    saveVideoViewerReturnState({
      createdAt: Date.now(),
      itemId: item.id,
      muted: playback.muted,
      paused: playback.paused,
      playbackSeconds: playback.playbackSeconds,
      returnPath,
      scrollY: 0,
    });
    const destination = new URL(href, window.location.origin);
    destination.searchParams.set("return_to", returnPath);
    navigate(`${destination.pathname}${destination.search}`);
  }, []);

  const loadBookingAvailability = React.useCallback((hostUserId: string) => {
    setBookingError(false);
    setBookingLoading(true);
    void bookingCache.ensure(hostUserId)
      .then((slots) => {
        if (bookingRequestHostRef.current === hostUserId) setBookingSlots(slots);
      })
      .catch(() => {
        if (bookingRequestHostRef.current === hostUserId) {
          setBookingSlots([]);
          setBookingError(true);
        }
      })
      .finally(() => {
        if (bookingRequestHostRef.current === hostUserId) setBookingLoading(false);
      });
  }, [bookingCache]);

  const openBooking = React.useCallback((item: VideoFeedItem, playback: VideoFeedPlaybackState) => {
    if (!item.booking) return;
    const hostUserId = item.booking.hostUserId;
    const cached = bookingCache.get(hostUserId);
    bookingRequestHostRef.current = hostUserId;
    setBookingTarget({ item, playback });
    setBookingError(false);
    setBookingSlots(cached ?? []);
    setBookingLoading(!cached);
    if (!cached) loadBookingAvailability(hostUserId);
  }, [bookingCache, loadBookingAvailability]);

  const retryBookingAvailability = React.useCallback(() => {
    const hostUserId = bookingTarget?.item.booking?.hostUserId;
    if (!hostUserId) return;
    bookingRequestHostRef.current = hostUserId;
    loadBookingAvailability(hostUserId);
  }, [bookingTarget, loadBookingAvailability]);

  const setBookingOpen = React.useCallback((open: boolean) => {
    if (open) return;
    bookingRequestHostRef.current = null;
    setBookingTarget(null);
    setBookingError(false);
    setBookingLoading(false);
    setBookingSlots([]);
  }, []);

  const selectBookingSlot = React.useCallback((slot: ResolvedSlot, event?: React.MouseEvent) => {
    const booking = bookingTarget?.item.booking;
    if (!bookingTarget || !booking) return;
    event?.preventDefault();
    saveVideoViewerReturnState({
      createdAt: Date.now(),
      itemId: bookingTarget.item.id,
      muted: bookingTarget.playback.muted,
      paused: bookingTarget.playback.paused,
      playbackSeconds: bookingTarget.playback.playbackSeconds,
      returnPath: currentRelativePath(),
      scrollY: 0,
    });
    navigate(checkoutPathForFeedSlot(booking.hostUserId, slot));
  }, [bookingTarget]);

  const surface = resolveVideoHomeSurface({ error, itemCount: items.length, loading });
  useVideoHomeChrome(surface === "video");
  if (surface === "loading") return <div className="grid min-h-dvh w-full place-items-center bg-background"><Spinner className="size-6" /></div>;
  if (surface === "community-feed-error") return <HomePage videoFallbackReason="error" />;
  if (surface === "community-feed-empty") return <HomePage videoFallbackReason="empty" />;

  return (
    <div className="min-h-0 w-full flex-1 bg-background">
      <VideoFeed
        bookingOpenItemId={bookingTarget?.item.id}
        className={VIDEO_FEED_VIEWPORT_CLASS}
        initialItemId={restored?.itemId}
        initialMuted={restored?.muted}
        initialPaused={restored?.paused}
        initialPlaybackSeconds={restored?.playbackSeconds}
        items={items}
        onActiveItemChange={onActiveItemChange}
        onBoost={(item) => {
          if (boostTarget && item.song?.sourcePostId === boostTarget.sourcePostId) boostTarget.open();
        }}
        onBook={openBooking}
        onComment={(item) => {
          if (!session?.accessToken) {
            requestAuth(copy.home.videoCommentAuthRequired);
            return;
          }
          navigate(`/p/${encodeURIComponent(item.id)}`);
        }}
        onKaraoke={(item, playback) => launchSongAction(item, playback, item.song?.karaokeHref)}
        onLike={onLike}
        onShare={(item) => void navigator.share?.({ url: `${window.location.origin}/p/${encodeURIComponent(item.id)}` })}
        onSong={(item, playback) => launchSongAction(item, playback, item.song?.songHref)}
        onStudy={(item, playback) => launchSongAction(item, playback, item.song?.studyHref)}
      />
      {loadMoreError ? (
        <VideoFeedPaginationNotice
          actionLabel={copy.home.videoPaginationRetry}
          message={copy.home.videoPaginationError}
          onAction={() => { void loadMore(); }}
        />
      ) : pausedPaginationCursor ? (
        <VideoFeedPaginationNotice
          actionLabel={copy.home.videoPaginationKeepLoading}
          message={copy.home.videoPaginationPaused}
          onAction={resumePagination}
        />
      ) : null}
      {bookingTarget?.item.booking ? (
        <FeedBookingSheet
          basePriceCents={bookingTarget.item.booking.basePriceCents}
          error={bookingError}
          getSlotHref={(slot) => checkoutPathForFeedSlot(bookingTarget.item.booking!.hostUserId, slot)}
          handle={bookingTarget.item.publisher.handle}
          loading={bookingLoading}
          onOpenChange={setBookingOpen}
          onRetry={retryBookingAvailability}
          onSelectSlot={selectBookingSlot}
          open
          slots={bookingSlots}
          viewerTimezone={bookingTimezone}
        />
      ) : null}
      {activeResolution?.sourceCommunityId ? (
        <VideoViewerBoostBridge
          activePublicOffer={activeResolution.activeRewardOffer}
          communityId={activeResolution.sourceCommunityId}
          key={activeResolution.sourcePostId}
          onAvailabilityChange={onBoostAvailabilityChange}
          postId={activeResolution.sourcePostId}
          viewerIsAuthor={activeResolution.viewerIsAuthor}
        />
      ) : null}
    </div>
  );
}
