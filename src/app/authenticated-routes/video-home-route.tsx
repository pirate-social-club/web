"use client";

import * as React from "react";
import type { HomeFeedItem as ApiHomeFeedItem, Profile as ApiProfile } from "@pirate/api-contracts";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { navigate } from "@/app/router";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { useVideoViewerSongCapabilities } from "@/app/authenticated-helpers/use-video-viewer-song-capabilities";
import {
  currentRelativePath,
  readVideoViewerReturnState,
  saveVideoViewerReturnState,
} from "@/app/authenticated-helpers/video-viewer-return-state";
import { VideoBookingAvailabilityCache } from "@/app/authenticated-helpers/video-booking-availability-cache";
import {
  FeedBookingSheetBody,
  formatFeedBookingTitle,
} from "@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { toPageVideoItem, adjacentVideoSourcePostIds, VideoViewerBoostBridge } from "@/components/compositions/posts/feed/feed";
import {
  VideoFeed,
  type VideoFeedImpression,
  type VideoFeedPlaybackState,
} from "@/components/compositions/posts/video-feed/video-feed";
import { VideoFeedPaginationNotice } from "@/components/compositions/posts/video-feed/video-feed-pagination-notice";
import { FeedCommentsPanel } from "./feed-comments-panel";
import {
  FeedPanelLayout,
  FeedSidePanel,
  type FeedPanelState,
} from "@/components/compositions/posts/feed-side-panel/feed-side-panel";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { VideoSongCapabilityCache } from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import { Spinner } from "@/components/primitives/spinner";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import {
  createDefaultBlockedModalState,
  selectPostVoteGateData,
} from "@/hooks/use-community-interaction-gate.helpers";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { interpolateMessage } from "@/lib/route-messages";
import { HomePage } from "./home-routes";

export type VideoHomeSurface = "loading" | "video" | "community-feed-empty" | "community-feed-error";

export function checkoutPathForFeedSlot(
  hostUserId: string,
  slot: ResolvedSlot,
  sourceCommunityId: string | null = null,
): string {
  const query = new URLSearchParams({
    end: slot.endUtc,
    start: slot.startUtc,
  });
  const checkoutPath = sourceCommunityId
    ? `/c/${encodeURIComponent(sourceCommunityId)}/book/${encodeURIComponent(hostUserId)}/checkout`
    : `/book/${encodeURIComponent(hostUserId)}/checkout`;
  return `${checkoutPath}?${query.toString()}`;
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
 * slide insets its controls clear of it. On the active video surface the desktop header is removed
 * and navigation moves into the full-height media sidebar, so the feed owns the viewport at every
 * breakpoint. Exported so that ownership stays under test.
 */
export const VIDEO_FEED_VIEWPORT_CLASS = "h-dvh";
export const VIDEO_FEED_STAGE_CLASS = "relative h-full min-h-0";
export const MAX_CONSECUTIVE_NO_GROWTH_PAGES = 3;
const FEED_COMMENTS_HISTORY_KEY = "pirateFeedComments";

export function postIdForVideoItem(entries: ApiHomeFeedItem[], itemId: string): string | null {
  return entries.find((entry) => entry.post.post.id === itemId)?.post.post.id ?? null;
}

function commentsHistoryState(panel: Extract<FeedPanelState, { kind: "comments" }>) {
  return {
    [FEED_COMMENTS_HISTORY_KEY]: {
      itemId: panel.itemId,
      postId: panel.postId,
    },
  };
}

export function panelFromHistoryState(state: unknown): FeedPanelState {
  if (!state || typeof state !== "object") return { kind: "none" };
  const value = (state as Record<string, unknown>)[FEED_COMMENTS_HISTORY_KEY];
  if (!value || typeof value !== "object") return { kind: "none" };
  const itemId = (value as Record<string, unknown>).itemId;
  const postId = (value as Record<string, unknown>).postId;
  return typeof itemId === "string" && typeof postId === "string"
    ? { kind: "comments", itemId, postId }
    : { kind: "none" };
}

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

export function resolveVideoPublisherRelationship(input: {
  authorUserId?: string | null;
  authorWalletAddress?: string | null;
  currentUserId?: string | null;
  identityMode: "anonymous" | "public";
  joinedLabel: string;
  joinedLocally?: boolean;
  joinLabel: string;
  viewerCommunityRole?: string | null;
  viewerMembershipStatus?: "member" | "not_member" | "banned" | null;
}): VideoFeedItem["publisher"]["relationship"] {
  if (input.identityMode === "public" && input.authorUserId) {
    return input.authorWalletAddress ? {
      kind: "follow",
      ownProfile: input.authorUserId === input.currentUserId,
      targetWalletAddress: input.authorWalletAddress,
    } : undefined;
  }
  const joined = input.joinedLocally
    || input.viewerCommunityRole != null
    || input.viewerMembershipStatus === "member";
  return {
    active: Boolean(joined),
    disabled: Boolean(joined) || input.viewerMembershipStatus === "banned",
    kind: "join",
    label: joined ? input.joinedLabel : input.joinLabel,
  };
}

export function videoImpressionAnalyticsProperties(
  item: VideoFeedItem,
  impression: VideoFeedImpression,
): Record<string, string | number | boolean> {
  return {
    completion_ratio: Number(impression.completionRatio.toFixed(4)),
    duration_seconds: Number(impression.durationSeconds.toFixed(3)),
    dwell_ms: impression.dwellMs,
    muted: impression.muted,
    orientation: item.media.orientation,
    playback_seconds: Number(impression.playbackSeconds.toFixed(3)),
    position: impression.position,
    publisher_kind: item.publisher.kind,
    replay_count: impression.replayCount,
    sound_on: impression.soundOnAtAnyPoint,
  };
}

export function VideoHomePage() {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const { copy, localeTag } = useRouteMessages();
  const requestAuth = useRequestAuth();
  const capabilityLoader = useVideoViewerSongCapabilities(contentLocale);
  const [entries, setEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [joinedCommunityIds, setJoinedCommunityIds] = React.useState<Set<string>>(() => new Set());
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = React.useState<unknown>(null);
  const [pausedPaginationCursor, setPausedPaginationCursor] = React.useState<string | null>(null);
  const [capabilityRevision, setCapabilityRevision] = React.useState(0);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [boostTarget, setBoostTarget] = React.useState<{ open: () => void; sourcePostId: string } | null>(null);
  const [bookingSlots, setBookingSlots] = React.useState<ResolvedSlot[]>([]);
  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [bookingError, setBookingError] = React.useState(false);
  const [panelState, setPanelState] = React.useState<FeedPanelState>({ kind: "none" });
  const loadingMoreRef = React.useRef(false);
  const consecutiveNoGrowthPagesRef = React.useRef(0);
  const feedGenerationRef = React.useRef(0);
  const seenPostIdsRef = React.useRef(new Set<string>());
  const bookingRequestHostRef = React.useRef<string | null>(null);
  const commentComposerRef = React.useRef<HTMLTextAreaElement>(null);
  const feedFocusRef = React.useRef<HTMLDivElement>(null);
  const panelReturnFocusRef = React.useRef<HTMLElement | null>(null);
  const feedPathRef = React.useRef(currentRelativePath());
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

  const restoreFeedFocus = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      (panelReturnFocusRef.current ?? feedFocusRef.current)?.focus();
      panelReturnFocusRef.current = null;
    });
  }, []);

  const closeCommentsPanel = React.useCallback(() => {
    if (panelFromHistoryState(window.history.state).kind === "comments") {
      window.history.back();
      return;
    }
    setPanelState({ kind: "none" });
    restoreFeedFocus();
  }, [restoreFeedFocus]);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setPanelState(panelFromHistoryState(event.state));
      if (panelFromHistoryState(event.state).kind === "none") restoreFeedFocus();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [restoreFeedFocus]);

  const {
    gateModal,
    prewarmCommunityGate,
    runGatedCommunityAction,
  } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: localeTag,
  });

  React.useEffect(() => {
    if (!hydrated) return;
    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;
    loadingMoreRef.current = false;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthorProfiles({});
    setJoinedCommunityIds(new Set());
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

  React.useEffect(() => {
    const userIds = entries.flatMap((entry) => {
      const post = entry.post.post;
      return post.identity_mode === "public" && post.author_user ? [post.author_user] : [];
    });
    const missingUserIds = [...new Set(userIds)].filter((userId) => !(userId in authorProfiles));
    if (missingUserIds.length === 0) return;
    let cancelled = false;
    void loadProfilesByUserId(api, missingUserIds, authorProfiles).then((loaded) => {
      if (!cancelled) setAuthorProfiles((current) => ({ ...current, ...loaded }));
    });
    return () => { cancelled = true; };
  }, [api, authorProfiles, entries]);

  const pageItems = React.useMemo<VideoFeedItem[]>(
    () => entries.flatMap((entry): VideoFeedItem[] => {
      const item = toHomeFeedItem(entry, authorProfiles);
      const video = toPageVideoItem(item);
      if (!video) return [];
      const post = entry.post.post;
      const authorProfile = post.author_user ? authorProfiles[post.author_user] : null;
      const publicProfilePublisher = post.identity_mode === "public" && Boolean(post.author_user);
      const viewerCommunity = entry.post as typeof entry.post & {
        viewer_gate_state?: {
          viewer_community_role?: string | null;
          viewer_membership_status?: "member" | "not_member" | "banned" | null;
        } | null;
      };
      const communityStatus = viewerCommunity.viewer_gate_state?.viewer_membership_status
        ?? entry.post.community?.viewer_membership_status
        ?? null;
      const relationship = resolveVideoPublisherRelationship({
        authorUserId: post.author_user,
        authorWalletAddress: authorProfile?.primary_wallet_address,
        currentUserId: session?.user.id,
        identityMode: post.identity_mode,
        joinedLabel: copy.home.videoPublisherJoined,
        joinedLocally: joinedCommunityIds.has(entry.community.id),
        joinLabel: copy.home.videoPublisherJoin,
        viewerCommunityRole: viewerCommunity.viewer_gate_state?.viewer_community_role
          ?? entry.post.community?.viewer_community_role,
        viewerMembershipStatus: communityStatus,
      });
      if (publicProfilePublisher) {
        return [{
          ...video,
          communityId: entry.community.id,
          publisher: {
            ...video.publisher,
            kind: "profile" as const,
            relationship,
          },
        }];
      }
      return [{
        ...video,
        communityId: entry.community.id,
        publisher: {
          avatarSrc: item.post.byline.community?.avatarSrc,
          handle: item.post.byline.community?.label ?? video.publisher.handle,
          kind: "community" as const,
          relationship,
        },
      }];
    }),
    [authorProfiles, copy.home.videoPublisherJoin, copy.home.videoPublisherJoined, entries, joinedCommunityIds, session?.user.id],
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

  const onImpression = React.useCallback((item: VideoFeedItem, impression: VideoFeedImpression) => {
    trackAnalyticsEvent({
      eventName: "video_impression",
      communityId: item.communityId,
      postId: item.id,
      properties: videoImpressionAnalyticsProperties(item, impression),
    });
  }, []);

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

  // Downvote mirrors onLike, with one extra case: switching from up to down has to take the
  // upvote back off the count, because the rail renders upvote_count rather than a net score.
  const onDownvote = React.useCallback((item: VideoFeedItem) => {
    if (!session?.accessToken) {
      requestAuth(copy.home.videoDownvoteAuthRequired);
      return;
    }
    const entry = entries.find((candidate) => candidate.post.post.id === item.id);
    if (!entry) return;
    const wasDownvoted = entry.post.viewer_vote === -1;
    const wasUpvoted = entry.post.viewer_vote === 1;
    setEntries((current) => current.map((candidate) => candidate.post.post.id === item.id ? {
      ...candidate,
      post: {
        ...candidate.post,
        downvote_count: Math.max(0, candidate.post.downvote_count + (wasDownvoted ? -1 : 1)),
        upvote_count: Math.max(0, candidate.post.upvote_count - (wasUpvoted ? 1 : 0)),
        viewer_vote: wasDownvoted ? null : -1,
      },
    } : candidate));
    const request = wasDownvoted ? api.posts.clearVote(item.id) : api.posts.vote(item.id, -1);
    void request.catch(() => {
      setEntries((current) => current.map((candidate) => candidate.post.post.id === item.id ? entry : candidate));
    });
  }, [api.posts, copy.home.videoDownvoteAuthRequired, entries, requestAuth, session?.accessToken]);

  const onPublisherRelationship = React.useCallback((item: VideoFeedItem) => {
    if (item.publisher.relationship?.kind !== "join" || item.publisher.relationship.active) return;
    const entry = entries.find((candidate) => candidate.post.post.id === item.id);
    if (!entry) return;
    const gateData = selectPostVoteGateData(entry.post);
    if (gateData) prewarmCommunityGate(gateData.preview.id, gateData);
    // The shared gate runner currently models membership as a prerequisite to a post action.
    // Reuse its vote lane to obtain the complete join/verification flow, but never resume the
    // action after joining: this avatar control changes membership and must not cast a vote.
    void runGatedCommunityAction({
      action: "vote_post",
      buildBlockedModalState: (args) => {
        const defaultState = createDefaultBlockedModalState(args);
        if (args.gate.eligibility.status !== "joinable" && args.gate.eligibility.status !== "requestable") {
          return defaultState;
        }
        return {
          ...defaultState,
          description: interpolateMessage(copy.home.videoPublisherJoinDescription, {
            communityName: args.gate.preview.display_name,
          }),
          title: copy.home.videoPublisherJoin,
        };
      },
      communityId: gateData?.preview.id ?? entry.community.id,
      ...(gateData ? { gateData } : {}),
      onAllowed: () => {
        setJoinedCommunityIds((current) => new Set(current).add(entry.community.id));
      },
      postId: item.id,
      requireMembership: true,
      resumeActionAfterJoin: false,
    });
  }, [copy.home.videoPublisherJoin, copy.home.videoPublisherJoinDescription, entries, prewarmCommunityGate, runGatedCommunityAction]);

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
    panelReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : feedFocusRef.current;
    if (panelFromHistoryState(window.history.state).kind === "comments") {
      window.history.replaceState({}, "", feedPathRef.current);
    }
    setPanelState({
      basePriceCents: item.booking.basePriceCents,
      handle: item.publisher.handle,
      hostUserId,
      itemId: item.id,
      kind: "booking",
      playback,
      sourceCommunityId: activeResolution?.sourceCommunityId ?? null,
    });
    setBookingError(false);
    setBookingSlots(cached ?? []);
    setBookingLoading(!cached);
    if (!cached) loadBookingAvailability(hostUserId);
  }, [activeResolution?.sourceCommunityId, bookingCache, loadBookingAvailability]);

  const retryBookingAvailability = React.useCallback(() => {
    if (panelState.kind !== "booking") return;
    bookingRequestHostRef.current = panelState.hostUserId;
    loadBookingAvailability(panelState.hostUserId);
  }, [loadBookingAvailability, panelState]);

  const setBookingOpen = React.useCallback((open: boolean) => {
    if (open) return;
    bookingRequestHostRef.current = null;
    setBookingError(false);
    setBookingLoading(false);
    setBookingSlots([]);
    setPanelState({ kind: "none" });
    restoreFeedFocus();
  }, [restoreFeedFocus]);

  const selectBookingSlot = React.useCallback((slot: ResolvedSlot, event?: React.MouseEvent) => {
    if (panelState.kind !== "booking") return;
    event?.preventDefault();
    saveVideoViewerReturnState({
      createdAt: Date.now(),
      itemId: panelState.itemId,
      muted: panelState.playback.muted,
      paused: panelState.playback.paused,
      playbackSeconds: panelState.playback.playbackSeconds,
      returnPath: currentRelativePath(),
      scrollY: 0,
    });
    navigate(checkoutPathForFeedSlot(
      panelState.hostUserId,
      slot,
      panelState.sourceCommunityId,
    ));
  }, [panelState]);

  const surface = resolveVideoHomeSurface({ error, itemCount: items.length, loading });
  if (surface === "loading") return <div className="grid min-h-dvh w-full place-items-center bg-background"><Spinner className="size-6" /></div>;
  if (surface === "community-feed-error") return <HomePage videoFallbackReason="error" />;
  if (surface === "community-feed-empty") return <HomePage videoFallbackReason="empty" />;

  return (
    <div className="min-h-0 w-full flex-1 bg-background">
      {gateModal}
      <FeedPanelLayout
        className={VIDEO_FEED_VIEWPORT_CLASS}
        panel={panelState.kind === "comments" ? (
          <FeedSidePanel
            closeLabel={copy.common.close}
            initialFocusRef={commentComposerRef}
            onOpenChange={(open) => {
              if (!open) closeCommentsPanel();
            }}
            open
            returnFocusRef={panelReturnFocusRef}
            title={copy.common.commentsHeading}
          >
            <FeedCommentsPanel composerRef={commentComposerRef} postId={panelState.postId} />
          </FeedSidePanel>
        ) : panelState.kind === "booking" ? (
          <FeedSidePanel
            closeLabel={copy.common.close}
            description={copy.profile.bookSheetDescription}
            onOpenChange={setBookingOpen}
            open
            returnFocusRef={panelReturnFocusRef}
            title={formatFeedBookingTitle(copy.profile.bookSheetTitle, panelState.handle)}
          >
            <div className="h-full overflow-y-auto p-5">
              <FeedBookingSheetBody
                basePriceCents={panelState.basePriceCents}
                error={bookingError}
                getSlotHref={(slot) => checkoutPathForFeedSlot(
                  panelState.hostUserId,
                  slot,
                  panelState.sourceCommunityId,
                )}
                loading={bookingLoading}
                onRetry={retryBookingAvailability}
                onSelectSlot={selectBookingSlot}
                slots={bookingSlots}
                viewerTimezone={bookingTimezone}
              />
            </div>
          </FeedSidePanel>
        ) : undefined}
      >
        <div className={VIDEO_FEED_STAGE_CLASS} ref={feedFocusRef} tabIndex={-1}>
      <VideoFeed
        externallyPausedItemId={panelState.kind === "booking" ? panelState.itemId : undefined}
        className="h-full"
        downvoteLabel={copy.common.downvote}
        followLabel={copy.home.videoPublisherFollow}
        followingLabel={copy.home.videoPublisherFollowing}
        initialItemId={restored?.itemId}
        initialMuted={restored?.muted}
        initialPaused={restored?.paused}
        initialPlaybackSeconds={restored?.playbackSeconds}
        items={items}
        muteVideoLabel={copy.common.muteVideo}
        nextVideoLabel={copy.common.nextVideo}
        onActiveItemChange={onActiveItemChange}
        onBoost={(item) => {
          if (boostTarget && item.song?.sourcePostId === boostTarget.sourcePostId) boostTarget.open();
        }}
        onBook={openBooking}
        onComment={(item) => {
          const postId = postIdForVideoItem(entries, item.id);
          if (!postId) return;
          if (panelState.kind === "booking") {
            bookingRequestHostRef.current = null;
            setBookingError(false);
            setBookingLoading(false);
            setBookingSlots([]);
          }
          const nextPanel: Extract<FeedPanelState, { kind: "comments" }> = {
            itemId: item.id,
            kind: "comments",
            postId,
          };
          panelReturnFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : feedFocusRef.current;
          const nextUrl = `/p/${encodeURIComponent(postId)}`;
          if (panelState.kind === "comments") {
            window.history.replaceState(commentsHistoryState(nextPanel), "", nextUrl);
          } else {
            window.history.pushState(commentsHistoryState(nextPanel), "", nextUrl);
          }
          setPanelState(nextPanel);
        }}
        onKaraoke={(item, playback) => launchSongAction(item, playback, item.song?.karaokeHref)}
        onDownvote={onDownvote}
        onLike={onLike}
        onImpression={onImpression}
        onPublisherRelationship={onPublisherRelationship}
        onShare={(item) => void navigator.share?.({ url: `${window.location.origin}/p/${encodeURIComponent(item.id)}` })}
        onSong={(item, playback) => launchSongAction(item, playback, item.song?.songHref)}
        onStudy={(item, playback) => launchSongAction(item, playback, item.song?.studyHref)}
        removeDownvoteLabel={copy.common.removeDownvote}
        previousVideoLabel={copy.common.previousVideo}
        soundOnLabel={copy.common.soundOn}
        tapForSoundLabel={copy.common.tapForSound}
        videoProgressLabel={copy.common.videoProgress}
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
        </div>
      </FeedPanelLayout>
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
