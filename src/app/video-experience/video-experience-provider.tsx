"use client";

import * as React from "react";
import type {
  HomeFeedItem as ApiHomeFeedItem,
  Profile as ApiProfile,
} from "@pirate/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toHomeFeedItem, toThreadPostCard } from "@/app/authenticated-helpers/post-presentation";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import {
  currentRelativePath,
  saveVideoViewerReturnState,
} from "@/app/authenticated-helpers/video-viewer-return-state";
import { VideoBookingAvailabilityCache } from "@/app/authenticated-helpers/video-booking-availability-cache";
import { useVideoViewerSongCapabilities } from "@/app/authenticated-helpers/use-video-viewer-song-capabilities";
import { navigate } from "@/app/router";
import {
  VideoExperienceContext,
  type VideoExperienceSeed,
} from "@/app/video-experience/video-experience-context";
import {
  hrefWithVideo,
  hrefWithoutVideo,
  historyStateWithoutVideo,
  isVideoExperienceHistoryState,
  VIDEO_EXPERIENCE_HISTORY_KEY,
  videoIdFromLocation,
} from "@/app/video-experience/video-experience-history";
import {
  compactCount,
  VideoFeed,
  type VideoFeedImpression,
  type VideoFeedPlaybackState,
} from "@/components/compositions/posts/video-feed/video-feed";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import {
  adjacentVideoSourcePostIds,
  toVideoViewerItem,
} from "@/components/compositions/posts/video-feed/video-viewer-item";
import { VideoSongCapabilityCache } from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import {
  FeedBookingSheetBody,
  formatFeedBookingTitle,
} from "@/components/compositions/bookings/feed-booking-sheet/feed-booking-sheet";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";
import {
  FeedPanelLayout,
  FeedSidePanel,
  type FeedPanelState,
} from "@/components/compositions/posts/feed-side-panel/feed-side-panel";
import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { Spinner } from "@/components/primitives/spinner";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { FeedCommentsPanel } from "@/app/authenticated-routes/feed-comments-panel";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import {
  createDefaultBlockedModalState,
  selectPostVoteGateData,
} from "@/hooks/use-community-interaction-gate.helpers";
import { interpolateMessage } from "@/lib/route-messages";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { feedKeys } from "@/lib/query/keys";
import {
  recordSessionSeenVideoIds,
  takeUnseenSessionVideos,
} from "@/lib/video-feed-lead-rotation";
import { toast } from "@/components/primitives/sonner";
import { videoImpressionAnalyticsProperties } from "@/lib/video-impression-analytics";

type HomeVideoFeedCache = {
  entries: ApiHomeFeedItem[];
  nextCursor: string | null;
  pausedCursor: string | null;
};

const EMPTY_HOME_VIDEO_FEED_CACHE: HomeVideoFeedCache = {
  entries: [],
  nextCursor: null,
  pausedCursor: null,
};

type OverlayPanelState =
  | FeedPanelState
  | {
    handle: string;
    hostUserId: string;
    itemId: string;
    kind: "booking";
    playback: VideoFeedPlaybackState;
    sourceCommunityId: string | null;
    startingPriceCents: number;
  };

const VIDEO_COMMENTS_HISTORY_KEY = "pirateGlobalVideoComments";

export function globalVideoCommentsHistoryState(
  state: unknown,
  itemId: string,
  postId: string,
): Record<string, unknown> {
  return {
    ...(state && typeof state === "object" ? state : {}),
    [VIDEO_COMMENTS_HISTORY_KEY]: { itemId, postId },
  };
}

export function globalVideoPanelFromHistoryState(state: unknown): FeedPanelState {
  if (!state || typeof state !== "object") return { kind: "none" };
  const value = (state as Record<string, unknown>)[VIDEO_COMMENTS_HISTORY_KEY];
  if (!value || typeof value !== "object") return { kind: "none" };
  const itemId = (value as Record<string, unknown>).itemId;
  const postId = (value as Record<string, unknown>).postId;
  return typeof itemId === "string" && typeof postId === "string"
    ? { itemId, kind: "comments", postId }
    : { kind: "none" };
}

function viewerTimezone(): IanaTz {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function bookingStartingPriceCents(item: Pick<VideoFeedItem, "booking">): number | null {
  return item.booking?.hasAvailableSlot ? item.booking.startingPriceCents : null;
}

function checkoutPathForSlot(
  hostUserId: string,
  slot: ResolvedSlot,
  sourceCommunityId: string | null,
): string {
  const query = new URLSearchParams({ end: slot.endUtc, start: slot.startUtc });
  const path = sourceCommunityId
    ? `/c/${encodeURIComponent(sourceCommunityId)}/book/${encodeURIComponent(hostUserId)}/checkout`
    : `/book/${encodeURIComponent(hostUserId)}/checkout`;
  return `${path}?${query.toString()}`;
}

function publisherRelationship(input: {
  authorUserId?: string | null;
  authorWalletAddress?: string | null;
  communityRole?: string | null;
  currentUserId?: string | null;
  identityMode: "anonymous" | "public";
  joinedLabel: string;
  joinLabel: string;
  membershipStatus?: "member" | "not_member" | "banned" | null;
}): VideoFeedItem["publisher"]["relationship"] {
  if (input.identityMode === "public" && input.authorUserId) {
    return input.authorWalletAddress ? {
      kind: "follow",
      ownProfile: input.authorUserId === input.currentUserId,
      targetUserId: input.authorUserId,
      targetWalletAddress: input.authorWalletAddress,
    } : undefined;
  }
  const joined = input.communityRole != null || input.membershipStatus === "member";
  return {
    active: joined,
    disabled: joined || input.membershipStatus === "banned",
    kind: "join",
    label: joined ? input.joinedLabel : input.joinLabel,
  };
}

function entryPostId(entry: ApiHomeFeedItem): string {
  return entry.post.post.id;
}

export function mergeSeededVideoItems(
  seed: VideoFeedItem,
  ranked: readonly VideoFeedItem[],
): VideoFeedItem[] {
  return [seed, ...ranked.filter((item) => item.id !== seed.id)];
}

export function GlobalVideoExperienceProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const { copy, localeTag } = useRouteMessages();
  const capabilityLoader = useVideoViewerSongCapabilities(contentLocale);
  const homeVideoQueryKey = React.useMemo(
    () => feedKeys.homeVideos({ locale: contentLocale, userId: session?.user.id ?? null }),
    [contentLocale, session?.user.id],
  );
  const homeVideoQuery = useQuery<HomeVideoFeedCache>({
    enabled: false,
    initialData: EMPTY_HOME_VIDEO_FEED_CACHE,
    queryFn: async () => EMPTY_HOME_VIDEO_FEED_CACHE,
    queryKey: homeVideoQueryKey,
  });
  const [seed, setSeed] = React.useState<VideoExperienceSeed | null>(null);
  const [loadingSeed, setLoadingSeed] = React.useState(false);
  const [loadingFeed, setLoadingFeed] = React.useState(false);
  const [itemOverrides, setItemOverrides] = React.useState<Record<string, Partial<VideoFeedItem>>>({});
  const [capabilityRevision, setCapabilityRevision] = React.useState(0);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [panelState, setPanelState] = React.useState<OverlayPanelState>({ kind: "none" });
  const [bookingSlots, setBookingSlots] = React.useState<ResolvedSlot[]>([]);
  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [bookingError, setBookingError] = React.useState(false);
  const [commentsAddedByPostId, setCommentsAddedByPostId] = React.useState<Record<string, number>>({});
  const [joinedCommunityIds, setJoinedCommunityIds] = React.useState<Set<string>>(() => new Set());
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const seedRef = React.useRef(seed);
  const seedRequestGenerationRef = React.useRef(0);
  const feedRequestGenerationRef = React.useRef(0);
  const feedRequestIdRef = React.useRef(`feed_${crypto.randomUUID().replaceAll("-", "")}`);
  const commentComposerRef = React.useRef<HTMLTextAreaElement>(null);
  const panelReturnFocusRef = React.useRef<HTMLElement | null>(null);
  const feedFocusRef = React.useRef<HTMLDivElement>(null);
  const bookingRequestHostRef = React.useRef<string | null>(null);
  const bookingTimezone = React.useMemo(viewerTimezone, []);
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
      return response.slots;
    }),
    [api.bookings, bookingTimezone],
  );
  const {
    gateModal,
    runGatedCommunityAction,
  } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: localeTag,
  });
  seedRef.current = seed;

  const setHomeVideoCache = React.useCallback((
    update: (current: HomeVideoFeedCache) => HomeVideoFeedCache,
  ) => {
    queryClient.setQueryData<HomeVideoFeedCache>(
      homeVideoQueryKey,
      (current = EMPTY_HOME_VIDEO_FEED_CACHE) => update(current),
    );
  }, [homeVideoQueryKey, queryClient]);

  const removeSeedFromRankedCache = React.useCallback((postId: string) => {
    setHomeVideoCache((current) => {
      const entries = current.entries.filter((entry) => entryPostId(entry) !== postId);
      return entries.length === current.entries.length ? current : { ...current, entries };
    });
  }, [setHomeVideoCache]);

  const installSeed = React.useCallback((nextSeed: VideoExperienceSeed) => {
    feedRequestIdRef.current = `feed_${crypto.randomUUID().replaceAll("-", "")}`;
    // Opening a video consumes it across surfaces: Home must not immediately
    // offer the same post again after the viewer closes.
    recordSessionSeenVideoIds([nextSeed.item.id]);
    removeSeedFromRankedCache(nextSeed.item.id);
    setItemOverrides({});
    setPanelState({ kind: "none" });
    setSeed(nextSeed);
  }, [removeSeedFromRankedCache]);

  const loadDeepLinkedSeed = React.useCallback(async (postId: string) => {
    const generation = seedRequestGenerationRef.current + 1;
    seedRequestGenerationRef.current = generation;
    setLoadingSeed(true);
    try {
      const response = session?.accessToken
        ? await api.posts.get(postId, { locale: contentLocale })
        : await api.publicPosts.get(postId, { locale: contentLocale });
      const post = toThreadPostCard(response, response.community ?? null, undefined, undefined, {
        viewerContentLocale: contentLocale,
      });
      const item = toVideoViewerItem({ id: postId, post });
      if (!item) throw new Error("This post does not contain a playable video.");
      if (seedRequestGenerationRef.current !== generation) return;
      installSeed({ item, source: "deep-link" });
    } catch (error) {
      if (seedRequestGenerationRef.current !== generation) return;
      toast.error(error instanceof Error ? error.message : "Could not open this video.");
      window.history.replaceState(
        historyStateWithoutVideo(window.history.state),
        "",
        hrefWithoutVideo(window.location.href),
      );
      setSeed(null);
    } finally {
      if (seedRequestGenerationRef.current === generation) setLoadingSeed(false);
    }
  }, [api.posts, api.publicPosts, contentLocale, installSeed, session?.accessToken]);

  const syncFromLocation = React.useCallback(() => {
    const postId = videoIdFromLocation(window.location);
    if (!postId) {
      seedRequestGenerationRef.current += 1;
      setLoadingSeed(false);
      setSeed(null);
      return;
    }
    if (seedRef.current?.item.id === postId) return;
    void loadDeepLinkedSeed(postId);
  }, [loadDeepLinkedSeed]);

  React.useEffect(() => {
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [syncFromLocation]);

  const openVideo = React.useCallback((nextSeed: VideoExperienceSeed) => {
    seedRequestGenerationRef.current += 1;
    setLoadingSeed(false);
    installSeed(nextSeed);
    const nextState = {
      ...(window.history.state && typeof window.history.state === "object" ? window.history.state : {}),
      [VIDEO_EXPERIENCE_HISTORY_KEY]: { postId: nextSeed.item.id },
    };
    window.history.pushState(
      nextState,
      "",
      hrefWithVideo(window.location.href, nextSeed.item.id),
    );
  }, [installSeed]);

  const dismissForNavigation = React.useCallback(() => {
    seedRequestGenerationRef.current += 1;
    setLoadingSeed(false);
    window.history.replaceState(
      historyStateWithoutVideo(window.history.state),
      "",
      hrefWithoutVideo(window.location.href),
    );
    setSeed(null);
    setPanelState({ kind: "none" });
  }, []);

  const closeVideo = React.useCallback(() => {
    if (panelState.kind !== "none") {
      if (
        panelState.kind === "comments"
        && window.history.state?.[VIDEO_COMMENTS_HISTORY_KEY]
      ) {
        window.history.back();
      } else {
        setPanelState({ kind: "none" });
      }
      return;
    }
    seedRequestGenerationRef.current += 1;
    setSeed(null);
    setLoadingSeed(false);
    if (isVideoExperienceHistoryState(window.history.state)) {
      window.history.back();
      return;
    }
    window.history.replaceState(
      historyStateWithoutVideo(window.history.state),
      "",
      hrefWithoutVideo(window.location.href),
    );
  }, [panelState.kind]);

  React.useEffect(() => {
    const syncPanel = (event: PopStateEvent) => {
      setPanelState(globalVideoPanelFromHistoryState(event.state));
    };
    window.addEventListener("popstate", syncPanel);
    return () => window.removeEventListener("popstate", syncPanel);
  }, []);

  React.useEffect(() => {
    if (!seed || homeVideoQuery.data.entries.length > 0 || loadingFeed) return;
    const generation = feedRequestGenerationRef.current + 1;
    feedRequestGenerationRef.current = generation;
    setLoadingFeed(true);
    const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
    void request({ locale: contentLocale, sort: "best" })
      .then((response) => {
        if (feedRequestGenerationRef.current !== generation) return;
        const ranked = response.items.filter((entry) => entryPostId(entry) !== seed.item.id);
        // Match VideoHomePage's cold-start accounting. The shared cache and
        // shared seen-set must advance together even when this overlay fetched
        // the page, otherwise a later Home cold start can repeat the page.
        recordSessionSeenVideoIds(ranked.map(entryPostId));
        setHomeVideoCache(() => ({
          entries: ranked,
          nextCursor: response.next_cursor ?? null,
          pausedCursor: null,
        }));
      })
      .catch(() => {
        // The seed is already playable. Ranked continuation can retry on the next open.
      })
      .finally(() => {
        if (feedRequestGenerationRef.current === generation) setLoadingFeed(false);
      });
  }, [
    api.feed.publicVideos,
    api.feed.videos,
    contentLocale,
    homeVideoQuery.data.entries.length,
    loadingFeed,
    seed,
    session?.accessToken,
    setHomeVideoCache,
  ]);

  React.useEffect(() => {
    const userIds = homeVideoQuery.data.entries.flatMap((entry) => {
      const post = entry.post.post;
      return post.identity_mode === "public" && post.author_user ? [post.author_user] : [];
    });
    const missing = [...new Set(userIds)].filter((userId) => !(userId in authorProfiles));
    if (missing.length === 0) return;
    let cancelled = false;
    void loadProfilesByUserId(api, missing, authorProfiles).then((loaded) => {
      if (!cancelled) setAuthorProfiles((current) => ({ ...current, ...loaded }));
    });
    return () => { cancelled = true; };
  }, [api, authorProfiles, homeVideoQuery.data.entries]);

  React.useEffect(() => {
    if (!seed) return;
    let cancelled = false;
    const request = session?.accessToken ? api.posts.get : api.publicPosts.get;
    void request(seed.item.id, { locale: contentLocale }).then(async (response) => {
      const post = response.post;
      const authorProfilesForSeed = post.identity_mode === "public" && post.author_user
        ? await loadProfilesByUserId(api, [post.author_user], authorProfiles)
        : {};
      if (cancelled) return;
      const responseWithGate = response as typeof response & {
        viewer_gate_state?: {
          viewer_community_role?: string | null;
          viewer_membership_status?: "member" | "not_member" | "banned" | null;
        } | null;
      };
      setItemOverrides((current) => ({
        ...current,
        [seed.item.id]: {
          ...current[seed.item.id],
          communityId: post.community ?? response.community?.id,
          publisher: {
            ...seed.item.publisher,
            relationship: publisherRelationship({
              authorUserId: post.author_user,
              authorWalletAddress: post.author_user
                ? authorProfilesForSeed[post.author_user]?.primary_wallet_address
                : undefined,
              communityRole: responseWithGate.viewer_gate_state?.viewer_community_role
                ?? response.community?.viewer_community_role,
              currentUserId: session?.user.id,
              identityMode: post.identity_mode,
              joinedLabel: copy.home.videoPublisherJoined,
              joinLabel: copy.home.videoPublisherJoin,
              membershipStatus: responseWithGate.viewer_gate_state?.viewer_membership_status
                ?? response.community?.viewer_membership_status,
            }),
          },
        },
      }));
    }).catch(() => {
      // The video is already playable; relationship controls fail closed when
      // their authority cannot be resolved.
    });
    return () => { cancelled = true; };
  }, [
    api,
    authorProfiles,
    contentLocale,
    copy.home.videoPublisherJoin,
    copy.home.videoPublisherJoined,
    seed,
    session?.accessToken,
    session?.user.id,
  ]);

  const rankedItems = React.useMemo(
    () => homeVideoQuery.data.entries.flatMap((entry): VideoFeedItem[] => {
      const feedItem = toHomeFeedItem(entry, {}, undefined, {
        viewerContentLocale: contentLocale,
      });
      const item = toVideoViewerItem(feedItem);
      if (!item) return [];
      const post = entry.post.post;
      const viewerCommunity = entry.post as typeof entry.post & {
        viewer_gate_state?: {
          viewer_community_role?: string | null;
          viewer_membership_status?: "member" | "not_member" | "banned" | null;
        } | null;
      };
      const authorProfile = post.author_user ? authorProfiles[post.author_user] : null;
      return [{
        ...item,
        communityId: entry.community.id,
        publisher: {
          ...item.publisher,
          relationship: publisherRelationship({
            authorUserId: post.author_user,
            authorWalletAddress: authorProfile?.primary_wallet_address,
            communityRole: viewerCommunity.viewer_gate_state?.viewer_community_role
              ?? entry.post.community?.viewer_community_role,
            currentUserId: session?.user.id,
            identityMode: post.identity_mode,
            joinedLabel: copy.home.videoPublisherJoined,
            joinLabel: copy.home.videoPublisherJoin,
            membershipStatus: viewerCommunity.viewer_gate_state?.viewer_membership_status
              ?? entry.post.community?.viewer_membership_status,
          }),
        },
      }];
    }),
    [
      authorProfiles,
      contentLocale,
      copy.home.videoPublisherJoin,
      copy.home.videoPublisherJoined,
      homeVideoQuery.data.entries,
      session?.user.id,
    ],
  );
  const baseItems = React.useMemo(() => {
    if (!seed) return [];
    return mergeSeededVideoItems(seed.item, rankedItems).map((item) => ({
      ...item,
      // The global viewer's share identity is the selected video URL, not the
      // source card's post-only share sheet.
      shareActions: undefined,
      ...itemOverrides[item.id],
    }));
  }, [itemOverrides, rankedItems, seed]);
  const items = React.useMemo(() => baseItems.map((item) => {
    const sourcePostId = item.song?.sourcePostId;
    const resolution = sourcePostId ? capabilityCache.get(sourcePostId) : undefined;
    const resolvedItem = resolution ? {
      ...item,
      karaoke: resolution.karaoke,
      rewards: resolution.rewards,
      song: item.song ? {
        ...item.song,
        artworkSrc: resolution.artworkSrc,
        karaokeHref: resolution.karaokeHref,
        studyHref: resolution.studyHref,
      } : undefined,
      study: resolution.study,
    } : item;
    if (
      !resolvedItem.communityId
      || resolvedItem.publisher.relationship?.kind !== "join"
      || !joinedCommunityIds.has(resolvedItem.communityId)
    ) return resolvedItem;
    return {
      ...resolvedItem,
      publisher: {
        ...resolvedItem.publisher,
        relationship: {
          ...resolvedItem.publisher.relationship,
          active: true,
          disabled: true,
          label: copy.home.videoPublisherJoined,
        },
      },
    };
  }), [
    baseItems,
    capabilityCache,
    capabilityRevision,
    copy.home.videoPublisherJoined,
    joinedCommunityIds,
  ]);

  const loadMore = React.useCallback(async () => {
    const cursor = homeVideoQuery.data.nextCursor;
    if (!cursor || loadingFeed || !seed) return;
    setLoadingFeed(true);
    const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
    try {
      const response = await request({ cursor, locale: contentLocale, sort: "best" });
      const nextEntries = takeUnseenSessionVideos(
        response.items.filter((entry) => entryPostId(entry) !== seed.item.id),
        entryPostId,
      );
      setHomeVideoCache((current) => {
        const existing = new Set(current.entries.map(entryPostId));
        return {
          entries: [...current.entries, ...nextEntries.filter((entry) => !existing.has(entryPostId(entry)))],
          nextCursor: response.next_cursor ?? null,
          pausedCursor: null,
        };
      });
    } catch {
      toast.error("Could not load more videos.");
    } finally {
      setLoadingFeed(false);
    }
  }, [
    api.feed.publicVideos,
    api.feed.videos,
    contentLocale,
    homeVideoQuery.data.nextCursor,
    loadingFeed,
    seed,
    session?.accessToken,
    setHomeVideoCache,
  ]);

  const onActiveItemChange = React.useCallback((_item: VideoFeedItem, index: number) => {
    setActiveItemId(_item.id);
    void capabilityCache.prefetch(adjacentVideoSourcePostIds(items, index)).then((changed) => {
      if (changed) setCapabilityRevision((current) => current + 1);
    });
    if (panelState.kind === "comments" && panelState.itemId !== _item.id) {
      const next = { itemId: _item.id, kind: "comments" as const, postId: _item.id };
      window.history.replaceState(
        globalVideoCommentsHistoryState(window.history.state, next.itemId, next.postId),
        "",
        window.location.href,
      );
      setPanelState(next);
    }
    if (index >= items.length - 3) void loadMore();
  }, [capabilityCache, items, loadMore, panelState]);

  const applyVote = React.useCallback(async (item: VideoFeedItem, direction: "up" | "down") => {
    const seedActions = seed?.item.id === item.id ? seed.actions : undefined;
    if (!seedActions?.onVote && seedActions?.onVoteAccess) {
      seedActions.onVoteAccess();
      return;
    }
    const previous = itemOverrides[item.id] ?? {};
    const active = direction === "up" ? item.liked : item.downvoted;
    const nextLiked = direction === "up" ? !active : false;
    const nextDownvoted = direction === "down" ? !active : false;
    setItemOverrides((current) => ({
      ...current,
      [item.id]: {
        ...current[item.id],
        downvoted: nextDownvoted,
        liked: nextLiked,
        likeCount: Math.max(0, item.likeCount + (direction === "up" ? (active ? -1 : 1) : 0)),
      },
    }));
    try {
      if (seedActions?.onVote) {
        await seedActions.onVote(active ? null : direction);
        return;
      }
      if (!session?.accessToken) throw new Error("Connect to vote on videos.");
      if (active) await api.posts.clearVote(item.id);
      else await api.posts.vote(item.id, direction === "up" ? 1 : -1);
    } catch (error) {
      setItemOverrides((current) => ({ ...current, [item.id]: previous }));
      toast.error(error instanceof Error ? error.message : "Could not update your vote.");
    }
  }, [api.posts, itemOverrides, seed, session?.accessToken]);

  const onComment = React.useCallback((item: VideoFeedItem) => {
    panelReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : feedFocusRef.current;
    const next = { itemId: item.id, kind: "comments" as const, postId: item.id };
    window.history.pushState(
      globalVideoCommentsHistoryState(window.history.state, next.itemId, next.postId),
      "",
      window.location.href,
    );
    setPanelState(next);
  }, []);

  const onShare = React.useCallback((item: VideoFeedItem) => {
    const url = `${window.location.origin}/?video=${encodeURIComponent(item.id)}`;
    if (navigator.share) {
      void navigator.share({ url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard?.writeText(url).then(
      () => toast.success("Video link copied."),
      () => toast.error("Could not copy the video link."),
    );
  }, []);

  const onImpression = React.useCallback((item: VideoFeedItem, impression: VideoFeedImpression) => {
    trackAnalyticsEvent({
      communityId: item.communityId,
      eventId: impression.eventId,
      eventName: "video_impression",
      postId: item.id,
      properties: {
        ...videoImpressionAnalyticsProperties(item, impression),
        source_surface: seedRef.current?.source ?? "deep-link",
      },
    });
  }, []);

  const launchSongAction = React.useCallback((
    item: VideoFeedItem,
    playback: VideoFeedPlaybackState,
    href?: string,
  ) => {
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
    dismissForNavigation();
    navigate(`${destination.pathname}${destination.search}`);
  }, [dismissForNavigation]);
  const onSong = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => launchSongAction(item, playback, item.song?.songHref),
    [launchSongAction],
  );
  const onStudy = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => launchSongAction(item, playback, item.song?.studyHref),
    [launchSongAction],
  );
  const onKaraoke = React.useCallback(
    (item: VideoFeedItem, playback: VideoFeedPlaybackState) => launchSongAction(item, playback, item.song?.karaokeHref),
    [launchSongAction],
  );

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

  const onBook = React.useCallback((item: VideoFeedItem, playback: VideoFeedPlaybackState) => {
    if (!item.booking) return;
    const startingPriceCents = bookingStartingPriceCents(item);
    if (startingPriceCents === null) return;
    const hostUserId = item.booking.hostUserId;
    const cached = bookingCache.get(hostUserId);
    bookingRequestHostRef.current = hostUserId;
    panelReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : feedFocusRef.current;
    setPanelState({
      handle: item.publisher.handle,
      hostUserId,
      itemId: item.id,
      kind: "booking",
      playback,
      sourceCommunityId: item.communityId ?? null,
      startingPriceCents,
    });
    setBookingSlots(cached ?? []);
    setBookingLoading(!cached);
    setBookingError(false);
    if (!cached) loadBookingAvailability(hostUserId);
  }, [bookingCache, loadBookingAvailability]);

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
    dismissForNavigation();
    navigate(checkoutPathForSlot(
      panelState.hostUserId,
      slot,
      panelState.sourceCommunityId,
    ));
  }, [dismissForNavigation, panelState]);

  const onPublisherRelationship = React.useCallback((item: VideoFeedItem) => {
    if (
      item.publisher.relationship?.kind !== "join"
      || item.publisher.relationship.active
      || !item.communityId
    ) return;
    const entry = homeVideoQuery.data.entries.find((candidate) => entryPostId(candidate) === item.id);
    const gateData = entry ? selectPostVoteGateData(entry.post) : null;
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
      communityId: item.communityId,
      ...(gateData ? { gateData } : {}),
      onAllowed: () => {
        setJoinedCommunityIds((current) => new Set(current).add(item.communityId!));
      },
      postId: item.id,
      requireMembership: true,
      resumeActionAfterJoin: false,
    });
  }, [
    copy.home.videoPublisherJoin,
    copy.home.videoPublisherJoinDescription,
    homeVideoQuery.data.entries,
    runGatedCommunityAction,
  ]);

  const contextValue = React.useMemo(() => ({ openVideo }), [openVideo]);
  const open = Boolean(seed) || loadingSeed;
  const commentsPanelCount = panelState.kind === "comments"
    ? (items.find((item) => item.id === panelState.itemId)?.commentCount ?? 0)
      + (commentsAddedByPostId[panelState.postId] ?? 0)
    : 0;
  const commentsPanelTitle = commentsPanelCount > 0
    ? copy.common.commentsHeadingWithCount.replace(
      "{count}",
      compactCount(commentsPanelCount, localeTag),
    )
    : copy.common.commentsHeading;

  return (
    <VideoExperienceContext.Provider value={contextValue}>
      {children}
      {gateModal}
      <Dialog onOpenChange={(nextOpen) => { if (!nextOpen) closeVideo(); }} open={open}>
        <DialogContent className="h-dvh w-screen max-w-none rounded-none border-0 p-0">
          <DialogTitle className="sr-only">Video viewer</DialogTitle>
          {seed ? (
            <FeedPanelLayout
              className="h-full"
              panel={panelState.kind === "comments" ? (
                <FeedSidePanel
                  closeLabel={copy.common.close}
                  initialFocusRef={commentComposerRef}
                  onOpenChange={(nextOpen) => { if (!nextOpen) closeVideo(); }}
                  open
                  returnFocusRef={panelReturnFocusRef}
                  title={commentsPanelTitle}
                >
                  <FeedCommentsPanel
                    composerRef={commentComposerRef}
                    onCommentAdded={(postId) => setCommentsAddedByPostId((current) => ({
                      ...current,
                      [postId]: (current[postId] ?? 0) + 1,
                    }))}
                    postId={panelState.postId}
                  />
                </FeedSidePanel>
              ) : panelState.kind === "booking" ? (
                <FeedSidePanel
                  closeLabel={copy.common.close}
                  description={copy.profile.bookSheetDescription}
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                      bookingRequestHostRef.current = null;
                      setPanelState({ kind: "none" });
                    }
                  }}
                  open
                  returnFocusRef={panelReturnFocusRef}
                  title={formatFeedBookingTitle(copy.profile.bookSheetTitle, panelState.handle)}
                >
                  <div className="h-full overflow-y-auto p-5">
                    <FeedBookingSheetBody
                      error={bookingError}
                      getSlotHref={(slot) => checkoutPathForSlot(
                        panelState.hostUserId,
                        slot,
                        panelState.sourceCommunityId,
                      )}
                      loading={bookingLoading}
                      onRetry={() => loadBookingAvailability(panelState.hostUserId)}
                      onSelectSlot={selectBookingSlot}
                      slots={bookingSlots}
                      startingPriceCents={panelState.startingPriceCents}
                      viewerTimezone={bookingTimezone}
                    />
                  </div>
                </FeedSidePanel>
              ) : undefined}
            >
              <div className="relative h-full min-h-0" ref={feedFocusRef} tabIndex={-1}>
                <VideoFeed
                  className="h-full"
                  externallyPausedItemId={panelState.kind === "booking" ? panelState.itemId : undefined}
                  feedRequestId={feedRequestIdRef.current}
                  initialItemId={seed.item.id}
                  items={items.map((item) => item.id === activeItemId && commentsAddedByPostId[item.id]
                    ? { ...item, commentCount: item.commentCount + commentsAddedByPostId[item.id] }
                    : item)}
                  locale={localeTag}
                  navigationHidden={panelState.kind !== "none"}
                  onActiveItemChange={onActiveItemChange}
                  onBook={onBook}
                  onComment={onComment}
                  onDownvote={(item) => { void applyVote(item, "down"); }}
                  onKaraoke={onKaraoke}
                  onLike={(item) => { void applyVote(item, "up"); }}
                  onImpression={onImpression}
                  onPublisherRelationship={onPublisherRelationship}
                  onShare={onShare}
                  onSong={onSong}
                  onStudy={onStudy}
                />
              </div>
            </FeedPanelLayout>
          ) : (
            <div className="grid size-full place-items-center bg-black">
              <Spinner className="size-6 text-white" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VideoExperienceContext.Provider>
  );
}
