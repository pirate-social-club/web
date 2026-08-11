"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HomeFeedItem as ApiHomeFeedItem, Profile as ApiProfile } from "@pirate/api-contracts";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import {
  submitOptimisticPostVote,
  toPostVoteValue,
  updateHomeFeedEntryPostVote,
} from "@/app/authenticated-helpers/post-vote";
import { navigate } from "@/app/router";
import { CommunitySurfaceNavigation } from "@/app/community-surface-navigation";
import { PublicRouteMessageState } from "@/app/public-route-states";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { buildPostShareActions } from "@/app/authenticated-helpers/post-share-actions";
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
import {
  VideoViewerBoostBridge,
  type FeedItem,
} from "@/components/compositions/posts/feed/feed";
import {
  adjacentVideoSourcePostIds,
  toVideoViewerItem,
} from "@/components/compositions/posts/video-feed/video-viewer-item";
import {
  compactCount,
  VideoFeed,
  type VideoFeedImpression,
  type VideoFeedPlaybackState,
} from "@/components/compositions/posts/video-feed/video-feed";
import { VideoFeedPaginationNotice } from "@/components/compositions/posts/video-feed/video-feed-pagination-notice";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { FeedCommentsPanel } from "./feed-comments-panel";
import {
  FeedPanelLayout,
  FeedSidePanel,
  type FeedPanelState,
} from "@/components/compositions/posts/feed-side-panel/feed-side-panel";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { VideoSongCapabilityCache } from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import { consumeHomeVideoFeedBootstrap } from "@/lib/api/home-video-feed-bootstrap";
import {
  countSeenSessionVideoIds,
  readRecentLeadVideoIds,
  readSessionSeenVideoIds,
  recordRecentLeadVideoId,
  recordSessionSeenVideoIds,
  rotateToUnseenLead,
  takeUnseenSessionVideos,
} from "@/lib/video-feed-lead-rotation";
import { feedKeys } from "@/lib/query/keys";
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
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { interpolateMessage } from "@/lib/route-messages";
import { seedPublicThreadQueriesFromFeed } from "@/lib/query/public-thread-cache";
import { usePublicCommunityQuery } from "@/lib/query/public-community-query";
import { videoImpressionAnalyticsProperties } from "@/lib/video-impression-analytics";
import { useUiLocale } from "@/lib/ui-locale";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { cn } from "@/lib/utils";
import { HomePage } from "./home-routes";

export type VideoHomeSurface = "loading" | "video" | "community-feed-empty" | "community-feed-error";

type CachedPageItem = {
  authorProfile: ApiProfile | null | undefined;
  contentLocale: string;
  entry: ApiHomeFeedItem;
  item: VideoFeedItem | null;
  joinedLocally: boolean;
  showOriginalLabel: string;
  showTranslationLabel: string;
  userId: string | undefined;
  videoPublisherJoin: string;
  videoPublisherJoined: string;
};

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

/**
 * Booking attribution authority for a feed-opened booking: the viewed post's owning
 * community. On the global home feed that community is the best proxy for the surface the
 * booking was discovered in. The song capability resolution's `sourceCommunityId` is the
 * wrong authority here — it names the community where the linked song was originally
 * posted, and it is null whenever no song is linked or its capability fetch failed.
 */
export function feedBookingSourceCommunityId(item: Pick<VideoFeedItem, "communityId">): string | null {
  return item.communityId ?? null;
}

export function feedBookingStartingPriceCents(
  item: Pick<VideoFeedItem, "booking">,
): number | null {
  return item.booking?.hasAvailableSlot
    ? item.booking.startingPriceCents
    : null;
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
export const VIDEO_FEED_VIEWPORT_CLASS = "h-lvh md:h-dvh";
export const VIDEO_FEED_STAGE_CLASS = "relative h-full min-h-0";
export const MAX_CONSECUTIVE_NO_GROWTH_PAGES = 3;
/**
 * Pages the cold start may walk looking for unseen content, bounded separately
 * from MAX_CONSECUTIVE_NO_GROWTH_PAGES so that constant keeps its single
 * meaning ("stop paginating forever").
 */
export const HOME_VIDEO_FEED_COLD_START_HUNT_MAX_PAGES = 2;
const FEED_COMMENTS_HISTORY_KEY = "pirateFeedComments";
const COMMENTS_PANEL_FOLLOW_SETTLE_MS = 250;

export function videoTranslationForFeedItem(
  item: Pick<FeedItem, "postOriginal">,
  video: Pick<VideoFeedItem, "caption">,
  labels: { showOriginalLabel: string; showTranslationLabel: string },
): VideoFeedItem["translation"] {
  const originalContent = item.postOriginal?.content;
  if (originalContent?.type !== "video" || !originalContent.caption || originalContent.caption === video.caption) {
    return undefined;
  }
  return {
    originalCaption: originalContent.caption,
    originalDir: originalContent.captionDir,
    originalLang: originalContent.captionLang,
    ...labels,
  };
}

export function postIdForVideoItem(entries: ApiHomeFeedItem[], itemId: string): string | null {
  return entries.find((entry) => entry.post.post.id === itemId)?.post.post.id ?? null;
}

/**
 * The comments dock follows the video that settles at the snap point. Returns the panel
 * state to switch to, or null when the dock is already on the settled video (or the video
 * has no post to show — a feed page can be replaced mid-scroll).
 */
export function nextCommentsPanelForActiveItem(
  panel: FeedPanelState,
  activeItemId: string | null,
  entries: ApiHomeFeedItem[],
): Extract<FeedPanelState, { kind: "comments" }> | null {
  if (panel.kind !== "comments" || !activeItemId) return null;
  if (panel.itemId === activeItemId) return null;
  const postId = postIdForVideoItem(entries, activeItemId);
  if (!postId) return null;
  return { itemId: activeItemId, kind: "comments", postId };
}

/**
 * Header count for the comments dock. The feed item carries the server total; comments the
 * viewer posts from the dock are added on top so the count does not sit stale behind them.
 */
export function commentsPanelCommentCount(
  items: readonly { id: string; commentCount: number }[],
  panel: FeedPanelState,
  addedByPostId: Record<string, number>,
): number {
  if (panel.kind !== "comments") return 0;
  const base = items.find((item) => item.id === panel.itemId)?.commentCount ?? 0;
  return base + (addedByPostId[panel.postId] ?? 0);
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

/**
 * The home video feed payload, held in the query cache so leaving the route and
 * coming back restores the feed instead of remounting into a spinner and a
 * refetch.
 */
export type HomeVideoFeedPayload = {
  entries: ApiHomeFeedItem[];
  nextCursor: string | null;
  pausedCursor: string | null;
};

export const EMPTY_HOME_VIDEO_FEED_PAYLOAD: HomeVideoFeedPayload = {
  entries: [],
  nextCursor: null,
  pausedCursor: null,
};

/**
 * What a mount of the video home route should do.
 *
 * There is deliberately no "restore, but refresh page 1" third case. Page 1 of
 * a deterministic server ordering is, by construction, the part of the corpus
 * this session has already been served, so refreshing it filters down to
 * nothing in the common case and appends behind everything the viewer has yet
 * to watch in the rest. Freshness arrives through pagination, which fetches a
 * cursor the viewer has genuinely not reached.
 */
export function resolveHomeVideoMountPlan(input: { cachedEntryCount: number }): "cold" | "restore" {
  return input.cachedEntryCount > 0 ? "restore" : "cold";
}

/**
 * Whether a cold start should keep walking the cursor in the background looking
 * for unseen videos. When nothing on the first page has been served before
 * there is nothing to hunt for — which is the whole of a session's first
 * landing, the busiest path.
 */
export function shouldHuntColdStartPages(input: {
  alreadySeenCount: number;
  serverCursor: string | null;
}): boolean {
  return input.alreadySeenCount > 0 && Boolean(input.serverCursor);
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
      targetUserId: input.authorUserId,
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

export function VideoHomePage({
  communityId = null,
  importedRootHostname,
}: {
  communityId?: string | null;
  importedRootHostname?: string;
} = {}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const hydrated = useClientHydrated();
  const session = useSession();
  const { locale } = useUiLocale();
  const contentLocale = useRouteContentLocale();
  const publicCommunityQuery = usePublicCommunityQuery(communityId, contentLocale);
  const { copy, localeTag } = useRouteMessages();
  const requestAuth = useRequestAuth();
  const routeCopy = copy.post.route;
  const {
    handleModalOpenChange: handleAgeSelfModalOpenChange,
    handleSelfQrError: handleAgeSelfQrError,
    handleSelfQrSuccess: handleAgeSelfQrSuccess,
    selfError: ageSelfError,
    selfModalOpen: ageSelfModalOpen,
    selfPrompt: ageSelfPrompt,
    startVerification: startAgeSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: routeCopy.ageVerificationCompleteError,
    locale,
    onVerified: async () => {
      if (!session) return;
      updateSessionUser(await api.users.getMe());
    },
    startErrorMessage: routeCopy.ageVerificationStartError,
    storageKey: "pirate_pending_self_age_gate:video_feed",
    verificationIntent: "community_join",
  });
  const capabilityLoader = useVideoViewerSongCapabilities(contentLocale);
  const homeVideoQueryKey = React.useMemo(
    () => feedKeys.homeVideos({
      communityId,
      locale: contentLocale,
      userId: communityId ? null : (session?.user.id ?? null),
    }),
    [communityId, contentLocale, session?.user.id],
  );
  const loadFeedPage = React.useCallback((opts?: {
    cursor?: string | null;
    locale?: string | null;
    sort?: "best" | "new" | "top" | null;
    timeRange?: string | null;
  }) => communityId
    ? api.publicCommunities.listVideos(communityId, opts)
    : session?.accessToken
      ? api.feed.videos(opts)
      : api.feed.publicVideos(opts), [api, communityId, session?.accessToken]);
  const homeVideoQuery = useQuery<HomeVideoFeedPayload>({
    queryKey: homeVideoQueryKey,
    queryFn: async () => EMPTY_HOME_VIDEO_FEED_PAYLOAD,
    enabled: false,
    initialData: EMPTY_HOME_VIDEO_FEED_PAYLOAD,
  });
  const entries = homeVideoQuery.data.entries;
  const nextCursor = homeVideoQuery.data.nextCursor;
  const pausedPaginationCursor = homeVideoQuery.data.pausedCursor;
  const setHomeVideoPayload = React.useCallback((update: React.SetStateAction<HomeVideoFeedPayload>) => {
    queryClient.setQueryData<HomeVideoFeedPayload>(homeVideoQueryKey, (current = EMPTY_HOME_VIDEO_FEED_PAYLOAD) => (
      typeof update === "function"
        ? (update as (value: HomeVideoFeedPayload) => HomeVideoFeedPayload)(current)
        : update
    ));
  }, [homeVideoQueryKey, queryClient]);
  const setEntries = React.useCallback((update: React.SetStateAction<ApiHomeFeedItem[]>) => {
    setHomeVideoPayload((current) => ({
      ...current,
      entries: typeof update === "function"
        ? (update as (value: ApiHomeFeedItem[]) => ApiHomeFeedItem[])(current.entries)
        : update,
    }));
  }, [setHomeVideoPayload]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [joinedCommunityIds, setJoinedCommunityIds] = React.useState<Set<string>>(() => new Set());
  // A restored feed renders on the first frame; only a cold start shows the
  // full-viewport spinner.
  const [loading, setLoading] = React.useState(() => (
    resolveHomeVideoMountPlan({ cachedEntryCount: homeVideoQuery.data.entries.length }) === "cold"
  ));
  const [error, setError] = React.useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = React.useState<unknown>(null);
  const [capabilityRevision, setCapabilityRevision] = React.useState(0);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [boostTarget, setBoostTarget] = React.useState<{ open: () => void; sourcePostId: string } | null>(null);
  const [bookingSlots, setBookingSlots] = React.useState<ResolvedSlot[]>([]);
  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [bookingError, setBookingError] = React.useState(false);
  const [panelState, setPanelState] = React.useState<FeedPanelState>({ kind: "none" });
  const [commentsAddedByPostId, setCommentsAddedByPostId] = React.useState<Record<string, number>>({});
  const entriesRef = React.useRef(entries);
  const loadingMoreRef = React.useRef(false);
  const consecutiveNoGrowthPagesRef = React.useRef(0);
  const feedGenerationRef = React.useRef(0);
  const feedRequestIdRef = React.useRef<string | null>(null);
  const authorProfilesRef = React.useRef(authorProfiles);
  const pageItemCacheRef = React.useRef(new Map<string, CachedPageItem>());
  const bootstrapRequestRef = React.useRef<{
    key: string;
    request: ReturnType<typeof consumeHomeVideoFeedBootstrap>;
  } | null>(null);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
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
    () => new VideoSongCapabilityCache(capabilityLoader.cacheScope, capabilityLoader.load, {
      enrich: capabilityLoader.enrich,
      onEnriched: () => setCapabilityRevision((current) => current + 1),
    }),
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
      return response.slots;
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
    authorProfilesRef.current = authorProfiles;
  }, [authorProfiles]);

  React.useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const onCommentAdded = React.useCallback((postId: string) => {
    setCommentsAddedByPostId((current) => ({ ...current, [postId]: (current[postId] ?? 0) + 1 }));
  }, []);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setPanelState(panelFromHistoryState(event.state));
      if (panelFromHistoryState(event.state).kind === "none") restoreFeedFocus();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [restoreFeedFocus]);

  // While the comments dock is open, keep it pinned to the video that settles at the
  // snap point. Fast scrolls debounce down to the final item, and the switch rewrites
  // the current history entry instead of stacking one entry per scrolled video.
  // `entries` is read through a ref: it is only a post-id lookup, and depending on it
  // would re-arm the debounce every time pagination lands a page mid-scroll.
  React.useEffect(() => {
    if (panelState.kind !== "comments" || !activeItemId) return;
    if (panelState.itemId === activeItemId) return;
    const timeout = window.setTimeout(() => {
      const nextPanel = nextCommentsPanelForActiveItem(panelState, activeItemId, entriesRef.current);
      if (!nextPanel) return;
      window.history.replaceState(
        commentsHistoryState(nextPanel),
        "",
        `/p/${encodeURIComponent(nextPanel.postId)}`,
      );
      setPanelState(nextPanel);
    }, COMMENTS_PANEL_FOLLOW_SETTLE_MS);
    return () => window.clearTimeout(timeout);
  }, [activeItemId, panelState]);

  const {
    gateModal,
    prewarmCommunityGate,
    runGatedCommunityAction,
  } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: localeTag,
  });
  const voteGateDataByPostId = React.useMemo(() => {
    const next = new Map<string, NonNullable<ReturnType<typeof selectPostVoteGateData>>>();
    for (const entry of entries) {
      const gateData = selectPostVoteGateData(entry.post);
      if (gateData) {
        next.set(entry.post.post.id, gateData);
      }
    }
    return next;
  }, [entries]);

  React.useEffect(() => {
    for (const gateData of voteGateDataByPostId.values()) {
      prewarmCommunityGate(gateData.preview.id, gateData);
    }
  }, [prewarmCommunityGate, voteGateDataByPostId]);

  React.useEffect(() => {
    if (!hydrated) return;
    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;
    loadingMoreRef.current = false;
    let cancelled = false;
    setError(null);
    const request = loadFeedPage;

    // A fresh correlation id per mount: the restored entries were fetched under
    // an id this component no longer holds, and the id is client-generated with
    // no server-side request row to mismatch, so minting one keeps
    // feed_request_id non-null and correlates this viewing session's
    // impressions with each other.
    feedRequestIdRef.current = `feed_${crypto.randomUUID().replaceAll("-", "")}`;

    if (resolveHomeVideoMountPlan({
      cachedEntryCount: queryClient.getQueryData<HomeVideoFeedPayload>(homeVideoQueryKey)?.entries.length ?? 0,
    }) === "restore") {
      // The cached feed continues where it left off, and the sessionStorage
      // viewer return state (readVideoViewerReturnState, consumed as
      // `initialItemId` below) puts the viewer back on the video they left —
      // list and position restore together. Nothing is rotated or refetched:
      // rotating would move the entry point out from under that restore.
      setLoading(false);
      return () => {
        cancelled = true;
        if (feedGenerationRef.current === generation) feedGenerationRef.current += 1;
      };
    }

    setLoading(true);
    setAuthorProfiles({});
    setJoinedCommunityIds(new Set());

    // Cold start only: walk the cursor in the background for videos this
    // session has not been served. Page 1 is already painted, so this never
    // delays first frame, and it stops at the first page that yields anything —
    // ordinary pagination takes it from there.
    const huntColdStartPages = async (startCursor: string | null) => {
      let cursor = startCursor;
      for (let page = 0; page < HOME_VIDEO_FEED_COLD_START_HUNT_MAX_PAGES; page += 1) {
        if (!cursor || cancelled || generation !== feedGenerationRef.current) return;
        const response = await request({ cursor, locale: contentLocale, sort: "best" });
        if (cancelled || generation !== feedGenerationRef.current) return;
        const unseenItems = takeUnseenSessionVideos(response.items, (entry) => entry.post.post.id);
        seedPublicThreadQueriesFromFeed({
          items: unseenItems,
          locale: contentLocale,
          queryClient,
          sort: "best",
        });
        const pagination = nextVideoPaginationCursor({
          consecutiveNoGrowthPages: consecutiveNoGrowthPagesRef.current,
          didGrow: unseenItems.length > 0,
          serverCursor: response.next_cursor ?? null,
        });
        consecutiveNoGrowthPagesRef.current = pagination.consecutiveNoGrowthPages;
        setHomeVideoPayload((current) => ({
          entries: appendUniqueVideoEntries(current.entries, unseenItems),
          nextCursor: pagination.nextCursor,
          pausedCursor: pagination.nextCursor === null && response.next_cursor
            ? response.next_cursor
            : null,
        }));
        if (unseenItems.length > 0) return;
        cursor = pagination.nextCursor;
      }
    };

    const bootstrapAuthenticated = communityId ? false : Boolean(session?.accessToken);
    const bootstrapKey = `${communityId ?? "global"}:${bootstrapAuthenticated}:${contentLocale}`;
    if (bootstrapRequestRef.current?.key !== bootstrapKey) {
      bootstrapRequestRef.current = {
        key: bootstrapKey,
        request: consumeHomeVideoFeedBootstrap({
          authenticated: bootstrapAuthenticated,
          locale: contentLocale,
          scopeKey: communityId ?? "global",
        }),
      };
    }
    const bootstrappedRequest = bootstrapRequestRef.current.request;
    void (bootstrappedRequest ?? request({ locale: contentLocale, sort: "best" }))
      .then((response) => {
        if (cancelled) return;
        seedPublicThreadQueriesFromFeed({
          items: response.items,
          locale: contentLocale,
          queryClient,
          sort: "best",
        });
        // Rotate the first page so a reload does not open on the same video.
        // Membership is unchanged, so the seen set and pagination are
        // unaffected — only the entry point moves.
        //
        // Recent leads and this session's served ids are both disqualifying: a
        // cold start whose cache was evicted mid-session gets the same page 1
        // back, and opening it on a video already watched a few minutes ago is
        // the repeat this route is trying to avoid. Rotation still degrades to
        // the server order when every candidate is disqualified, so the feed is
        // never emptied.
        const items = rotateToUnseenLead(
          response.items,
          (entry) => entry.post.post.id,
          [...readRecentLeadVideoIds(), ...readSessionSeenVideoIds()],
        );
        const leadPostId = items[0]?.post.post.id;
        if (leadPostId) recordRecentLeadVideoId(leadPostId);
        const pageIds = items.map((entry) => entry.post.post.id);
        const alreadySeenCount = countSeenSessionVideoIds(pageIds);
        recordSessionSeenVideoIds(pageIds);
        consecutiveNoGrowthPagesRef.current = 0;
        setHomeVideoPayload({
          entries: items,
          nextCursor: response.next_cursor ?? null,
          pausedCursor: null,
        });
        if (!shouldHuntColdStartPages({ alreadySeenCount, serverCursor: response.next_cursor ?? null })) return;
        // Held for the duration so the viewport's own loadMore does not race the
        // hunt down the same cursor.
        loadingMoreRef.current = true;
        void huntColdStartPages(response.next_cursor ?? null)
          .catch(() => {
            // Background nicety: page 1 is on screen, and pagination will retry
            // this cursor the moment the viewer approaches the end.
          })
          .finally(() => {
            if (generation === feedGenerationRef.current) loadingMoreRef.current = false;
          });
      })
      .catch((nextError: unknown) => { if (!cancelled) setError(nextError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (feedGenerationRef.current === generation) feedGenerationRef.current += 1;
    };
  }, [communityId, contentLocale, homeVideoQueryKey, hydrated, loadFeedPage, queryClient, session?.accessToken, setHomeVideoPayload]);

  React.useEffect(() => {
    const userIds = entries.flatMap((entry) => {
      const post = entry.post.post;
      return post.identity_mode === "public" && post.author_user ? [post.author_user] : [];
    });
    const knownProfiles = authorProfilesRef.current;
    const missingUserIds = [...new Set(userIds)].filter((userId) => !(userId in knownProfiles));
    if (missingUserIds.length === 0) return;
    let cancelled = false;
    void loadProfilesByUserId(api, missingUserIds, knownProfiles).then((loaded) => {
      if (!cancelled) setAuthorProfiles((current) => {
        const next = { ...current, ...loaded };
        authorProfilesRef.current = next;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [api, entries]);

  const pageItems = React.useMemo<VideoFeedItem[]>(
    () => entries.flatMap((entry): VideoFeedItem[] => {
      const post = entry.post.post;
      const authorProfile = post.author_user ? authorProfiles[post.author_user] : null;
      const joinedLocally = joinedCommunityIds.has(entry.community.id);
      const cached = pageItemCacheRef.current.get(post.id);
      if (
        cached
        && cached.entry === entry
        && cached.authorProfile === authorProfile
        && cached.contentLocale === contentLocale
        && cached.joinedLocally === joinedLocally
        && cached.showOriginalLabel === copy.common.showOriginal
        && cached.showTranslationLabel === copy.common.showTranslation
        && cached.userId === session?.user.id
        && cached.videoPublisherJoin === copy.home.videoPublisherJoin
        && cached.videoPublisherJoined === copy.home.videoPublisherJoined
      ) return cached.item ? [cached.item] : [];
      const item = toHomeFeedItem(entry, authorProfiles, undefined, {
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
        viewerContentLocale: contentLocale,
      });
      const video = toVideoViewerItem(item);
      if (!video) {
        pageItemCacheRef.current.set(post.id, {
          authorProfile,
          contentLocale,
          entry,
          item: null,
          joinedLocally,
          showOriginalLabel: copy.common.showOriginal,
          showTranslationLabel: copy.common.showTranslation,
          userId: session?.user.id,
          videoPublisherJoin: copy.home.videoPublisherJoin,
          videoPublisherJoined: copy.home.videoPublisherJoined,
        });
        return [];
      }
      const translation = videoTranslationForFeedItem(item, video, {
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
      });
      const translatedVideo = translation
        ? {
            ...video,
            translation,
          }
        : video;
      const shareActions = buildPostShareActions(post);
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
        joinedLocally,
        joinLabel: copy.home.videoPublisherJoin,
        viewerCommunityRole: viewerCommunity.viewer_gate_state?.viewer_community_role
          ?? entry.post.community?.viewer_community_role,
        viewerMembershipStatus: communityStatus,
      });
      const pageItem = publicProfilePublisher
        ? {
          ...translatedVideo,
          communityId: entry.community.id,
          shareActions,
          publisher: {
            ...video.publisher,
            href: item.post.byline.author?.href,
            kind: "profile" as const,
            relationship,
          },
        }
        : {
          ...translatedVideo,
          communityId: entry.community.id,
          shareActions,
          publisher: {
            avatarSrc: item.post.byline.community?.avatarSrc,
            handle: item.post.byline.community?.label ?? video.publisher.handle,
            href: item.post.byline.community?.href,
            kind: "community" as const,
            relationship,
          },
        };
      pageItemCacheRef.current.set(post.id, {
        authorProfile,
        contentLocale,
        entry,
        item: pageItem,
        joinedLocally,
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
        userId: session?.user.id,
        videoPublisherJoin: copy.home.videoPublisherJoin,
        videoPublisherJoined: copy.home.videoPublisherJoined,
      });
      return [pageItem];
    }),
    [authorProfiles, contentLocale, copy.common.showOriginal, copy.common.showTranslation, copy.home.videoPublisherJoin, copy.home.videoPublisherJoined, entries, joinedCommunityIds, session?.user.id],
  );
  const items = React.useMemo(() => pageItems.map((item) => {
    // Capability cache entries mutate in place; the revision invalidates this derived view.
    void capabilityRevision;
    const sourcePostId = item.song?.sourcePostId;
    const resolution = sourcePostId ? capabilityCache.get(sourcePostId) : undefined;
    if (!resolution) return item;
    return {
      ...item,
      boostEligibility: resolution.sourcePostId === boostTarget?.sourcePostId ? "eligible" as const : "unavailable" as const,
      karaoke: resolution.karaoke,
      learningGate: resolution.learningGate,
      rewards: resolution.rewards,
      song: item.song ? {
        ...item.song,
        artworkSrc: resolution.artworkSrc,
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
      const response = await loadFeedPage({ cursor: nextCursor, locale: contentLocale, sort: "best" });
      if (generation !== feedGenerationRef.current) return;
      const unseenItems = takeUnseenSessionVideos(response.items, (entry) => entry.post.post.id);
      seedPublicThreadQueriesFromFeed({
        items: unseenItems,
        locale: contentLocale,
        queryClient,
        sort: "best",
      });
      const pagination = nextVideoPaginationCursor({
        consecutiveNoGrowthPages: consecutiveNoGrowthPagesRef.current,
        didGrow: unseenItems.length > 0,
        serverCursor: response.next_cursor ?? null,
      });
      consecutiveNoGrowthPagesRef.current = pagination.consecutiveNoGrowthPages;
      setHomeVideoPayload((current) => ({
        entries: appendUniqueVideoEntries(current.entries, unseenItems),
        nextCursor: pagination.nextCursor,
        pausedCursor: pagination.nextCursor === null && response.next_cursor
          ? response.next_cursor
          : null,
      }));
    } catch (nextError) {
      if (generation === feedGenerationRef.current) setLoadMoreError(nextError);
    } finally {
      if (generation === feedGenerationRef.current) loadingMoreRef.current = false;
    }
  }, [contentLocale, loadFeedPage, nextCursor, queryClient, setHomeVideoPayload]);

  const resumePagination = React.useCallback(() => {
    if (!pausedPaginationCursor) return;
    consecutiveNoGrowthPagesRef.current = 0;
    setHomeVideoPayload((current) => ({
      ...current,
      nextCursor: current.pausedCursor,
      pausedCursor: null,
    }));
  }, [pausedPaginationCursor, setHomeVideoPayload]);

  const onActiveItemChange = React.useCallback((_item: VideoFeedItem, index: number) => {
    setActiveItemId(_item.id);
    void capabilityCache.prefetch(adjacentVideoSourcePostIds(items, index)).then((changed) => {
      if (changed) setCapabilityRevision((current) => current + 1);
    });
    if (index >= items.length - 3) void loadMore();
  }, [capabilityCache, items, loadMore]);

  const onImpression = React.useCallback((item: VideoFeedItem, impression: VideoFeedImpression) => {
    trackAnalyticsEvent({
      eventId: impression.eventId,
      eventName: "video_impression",
      communityId: item.communityId,
      postId: item.id,
      properties: videoImpressionAnalyticsProperties(item, impression),
    });
  }, []);

  const onBoostAvailabilityChange = React.useCallback((sourcePostId: string, canBoost: boolean, open: () => void) => {
    setBoostTarget(canBoost ? { open, sourcePostId } : null);
  }, []);

  const voteOnPost = React.useCallback(async (
    item: VideoFeedItem,
    direction: "up" | "down" | null,
    authRequiredMessage: string,
  ) => {
    if (!session?.accessToken) {
      requestAuth(authRequiredMessage);
      return;
    }
    const entry = entries.find((candidate) => candidate.post.post.id === item.id);
    if (!entry) return;
    const voteValue = direction ? toPostVoteValue(direction) : "clear";
    const gateData = voteGateDataByPostId.get(item.id) ?? null;
    try {
      await runGatedCommunityAction({
        action: "vote_post",
        communityId: gateData?.preview.id ?? entry.community.id,
        ...(gateData ? { gateData } : {}),
        onAllowed: async (context) => {
          await submitOptimisticPostVote({
            altchaPayload: context?.altchaPayload,
            clearVote: api.posts.clearVote,
            direction,
            locale: contentLocale,
            onApply: (nextValue) => setEntries((current) => updateHomeFeedEntryPostVote(current, item.id, nextValue)),
            onRollback: (restoredPost) => setEntries((current) => current.map((candidate) => candidate.post.post.id === item.id ? { ...candidate, post: restoredPost } : candidate)),
            postId: item.id,
            previousPost: entry.post,
            queryClient,
            requestIdsRef: voteRequestIdsRef,
            vote: api.posts.vote,
          });
        },
        postId: item.id,
        voteValue,
      });
    } catch {
      // The shared optimistic submitter already rolled back and displayed the error.
    }
  }, [api.posts.clearVote, api.posts.vote, contentLocale, entries, queryClient, requestAuth, runGatedCommunityAction, session?.accessToken, setEntries, voteGateDataByPostId]);

  const onLike = React.useCallback((item: VideoFeedItem) => {
    const direction = entries.find((candidate) => candidate.post.post.id === item.id)?.post.viewer_vote === 1
      ? null
      : "up";
    void voteOnPost(item, direction, copy.home.videoLikeAuthRequired);
  }, [copy.home.videoLikeAuthRequired, entries, voteOnPost]);

  const onDownvote = React.useCallback((item: VideoFeedItem) => {
    const direction = entries.find((candidate) => candidate.post.post.id === item.id)?.post.viewer_vote === -1
      ? null
      : "down";
    void voteOnPost(item, direction, copy.home.videoDownvoteAuthRequired);
  }, [copy.home.videoDownvoteAuthRequired, entries, voteOnPost]);

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
    const startingPriceCents = feedBookingStartingPriceCents(item);
    if (startingPriceCents === null) return;
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
      startingPriceCents,
      handle: item.publisher.handle,
      hostUserId,
      itemId: item.id,
      kind: "booking",
      playback,
      // Attribution authority is the viewed post's owning community (a proxy for the surface
      // the booking was discovered in), captured at open time — never the song origin.
      sourceCommunityId: feedBookingSourceCommunityId(item),
    });
    setBookingError(false);
    setBookingSlots(cached ?? []);
    setBookingLoading(!cached);
    if (!cached) loadBookingAvailability(hostUserId);
  }, [bookingCache, loadBookingAvailability]);

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

  const onBoost = React.useCallback((item: VideoFeedItem) => {
    if (boostTarget && item.song?.sourcePostId === boostTarget.sourcePostId) boostTarget.open();
  }, [boostTarget]);

  const onComment = React.useCallback((item: VideoFeedItem) => {
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
  }, [entries, panelState]);

  // A linked song's age gate never labels the video itself: the rail keeps normal
  // Study/Sing actions and the verification flow opens only when one is selected.
  const verifyAgeForLinkedSong = React.useCallback(() => {
    if (!session) {
      requestAuth(routeCopy.connectWalletToVerifyAge);
      return;
    }
    void startAgeSelfVerification({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: routeCopy.linkedSongAgeVerificationRequired,
    });
  }, [requestAuth, routeCopy.linkedSongAgeVerificationRequired, routeCopy.connectWalletToVerifyAge, session, startAgeSelfVerification]);
  const onKaraoke = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => {
      if (item.learningGate === "age_proof_required") return verifyAgeForLinkedSong();
      launchSongAction(item, playback, item.song?.karaokeHref);
    },
    [launchSongAction, verifyAgeForLinkedSong],
  );
  const onSong = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => launchSongAction(item, playback, item.song?.songHref),
    [launchSongAction],
  );
  const onStudy = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => {
      if (item.learningGate === "age_proof_required") return verifyAgeForLinkedSong();
      launchSongAction(item, playback, item.song?.studyHref);
    },
    [launchSongAction, verifyAgeForLinkedSong],
  );

  const surface = resolveVideoHomeSurface({ error, itemCount: items.length, loading });
  const canonicalCommunitySurface = Boolean(communityId && !importedRootHostname);
  if (surface === "loading") return <div className="grid min-h-dvh w-full place-items-center bg-background"><Spinner className="size-6" /></div>;
  if (surface === "community-feed-error") {
    if (!communityId) return <HomePage videoFallbackReason="error" />;
    return (
      <div className="flex min-h-dvh w-full flex-col items-center bg-background pt-5">
        {!importedRootHostname ? (
          <CommunitySurfaceNavigation
            active="videos"
            className="w-full px-3 pt-[calc(env(safe-area-inset-top)+4rem)] md:px-5 md:pt-0 lg:px-8"
            communityId={communityId}
            routeSlug={publicCommunityQuery.data?.route_slug}
          />
        ) : null}
        <PublicRouteMessageState
          description="This community's video feed could not be loaded. Its threads are still available."
          title="Video feed unavailable"
        />
      </div>
    );
  }
  if (surface === "community-feed-empty") {
    if (!communityId) return <HomePage videoFallbackReason="empty" />;
    return (
      <div className="flex min-h-dvh w-full flex-col items-center bg-background pt-5">
        {!importedRootHostname ? (
          <CommunitySurfaceNavigation
            active="videos"
            className="w-full px-3 pt-[calc(env(safe-area-inset-top)+4rem)] md:px-5 md:pt-0 lg:px-8"
            communityId={communityId}
            routeSlug={publicCommunityQuery.data?.route_slug}
          />
        ) : null}
        <PublicRouteMessageState
          description="This community has not published any videos yet."
          title="No videos yet"
        />
      </div>
    );
  }

  const commentsPanelCount = commentsPanelCommentCount(items, panelState, commentsAddedByPostId);
  const commentsPanelTitle = commentsPanelCount > 0
    ? copy.common.commentsHeadingWithCount.replace("{count}", compactCount(commentsPanelCount, localeTag))
    : copy.common.commentsHeading;

  return (
    <div className={cn(
      "min-h-0 w-full flex-1 bg-background",
      canonicalCommunitySurface && "flex h-lvh flex-col md:h-dvh",
    )}>
      {gateModal}
      {ageSelfPrompt ? (
        <SelfVerificationModal
          actionLabel={ageSelfPrompt.actionLabel}
          description={`${routeCopy.linkedSongAgeVerificationRequired}\n\n${ageSelfPrompt.description}`}
          error={ageSelfError}
          href={ageSelfPrompt.href}
          onOpenChange={handleAgeSelfModalOpenChange}
          onQrError={handleAgeSelfQrError}
          onQrSuccess={handleAgeSelfQrSuccess}
          open={ageSelfModalOpen}
          selfApp={ageSelfPrompt.selfApp}
          title={ageSelfPrompt.title}
        />
      ) : null}
      {canonicalCommunitySurface && communityId ? (
        <CommunitySurfaceNavigation
          active="videos"
          className="shrink-0 px-3 pt-[calc(env(safe-area-inset-top)+4rem)] md:px-5 md:pt-0 lg:px-8"
          communityId={communityId}
          routeSlug={publicCommunityQuery.data?.route_slug}
        />
      ) : null}
      <FeedPanelLayout
        className={canonicalCommunitySurface ? "min-h-0 flex-1" : VIDEO_FEED_VIEWPORT_CLASS}
        panel={panelState.kind === "comments" ? (
          <FeedSidePanel
            closeLabel={copy.common.close}
            initialFocusRef={commentComposerRef}
            onOpenChange={(open) => {
              if (!open) closeCommentsPanel();
            }}
            open
            returnFocusRef={panelReturnFocusRef}
            title={commentsPanelTitle}
          >
            <FeedCommentsPanel
              composerRef={commentComposerRef}
              onCommentAdded={onCommentAdded}
              postId={panelState.postId}
            />
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
                startingPriceCents={panelState.startingPriceCents}
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
        feedRequestId={feedRequestIdRef.current ?? undefined}
        initialItemId={restored?.itemId}
        initialMuted={restored?.muted}
        initialPaused={restored?.paused}
        initialPlaybackSeconds={restored?.playbackSeconds}
        items={items}
        locale={localeTag}
        muteVideoLabel={copy.common.muteVideo}
        navigationHidden={panelState.kind !== "none"}
        nextVideoLabel={copy.common.nextVideo}
        onActiveItemChange={onActiveItemChange}
        onBoost={onBoost}
        onBook={openBooking}
        onComment={onComment}
        onKaraoke={onKaraoke}
        onDownvote={onDownvote}
        onLike={onLike}
        onImpression={onImpression}
        onPublisherRelationship={onPublisherRelationship}
        onSong={onSong}
        onStudy={onStudy}
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
          activeCampaignId={activeResolution.activeRewardCampaignId}
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
