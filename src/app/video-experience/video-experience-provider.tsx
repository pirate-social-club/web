"use client";

import * as React from "react";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toHomeFeedItem, toThreadPostCard } from "@/app/authenticated-helpers/post-presentation";
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
  VideoFeed,
  type VideoFeedImpression,
  type VideoFeedPlaybackState,
} from "@/components/compositions/posts/video-feed/video-feed";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { toVideoViewerItem } from "@/components/compositions/posts/video-feed/video-viewer-item";
import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { Spinner } from "@/components/primitives/spinner";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
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
  const seedRef = React.useRef(seed);
  const seedRequestGenerationRef = React.useRef(0);
  const feedRequestGenerationRef = React.useRef(0);
  const feedRequestIdRef = React.useRef(`feed_${crypto.randomUUID().replaceAll("-", "")}`);
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
  }, []);

  const closeVideo = React.useCallback(() => {
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

  const rankedItems = React.useMemo(
    () => homeVideoQuery.data.entries.flatMap((entry): VideoFeedItem[] => {
      const feedItem = toHomeFeedItem(entry, {}, undefined, {
        viewerContentLocale: contentLocale,
      });
      const item = toVideoViewerItem(feedItem);
      return item ? [item] : [];
    }),
    [contentLocale, homeVideoQuery.data.entries],
  );
  const items = React.useMemo(() => {
    if (!seed) return [];
    return mergeSeededVideoItems(seed.item, rankedItems).map((item) => ({
      ...item,
      // The global viewer's share identity is the selected video URL, not the
      // source card's post-only share sheet.
      shareActions: undefined,
      ...itemOverrides[item.id],
    }));
  }, [itemOverrides, rankedItems, seed]);

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
    if (index >= items.length - 3) void loadMore();
  }, [items.length, loadMore]);

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
    const sourceAction = seed?.item.id === item.id ? seed.actions?.onComment : undefined;
    dismissForNavigation();
    if (sourceAction) sourceAction();
    else navigate(`/p/${encodeURIComponent(item.id)}`);
  }, [dismissForNavigation, seed]);

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

  const onSong = React.useCallback((item: VideoFeedItem, _playback: VideoFeedPlaybackState) => {
    if (!item.song?.songHref) return;
    dismissForNavigation();
    navigate(item.song.songHref);
  }, [dismissForNavigation]);

  const contextValue = React.useMemo(() => ({ openVideo }), [openVideo]);
  const open = Boolean(seed) || loadingSeed;

  return (
    <VideoExperienceContext.Provider value={contextValue}>
      {children}
      <Dialog onOpenChange={(nextOpen) => { if (!nextOpen) closeVideo(); }} open={open}>
        <DialogContent className="h-dvh w-screen max-w-none rounded-none border-0 p-0">
          <DialogTitle className="sr-only">Video viewer</DialogTitle>
          {seed ? (
            <VideoFeed
              className="h-full"
              feedRequestId={feedRequestIdRef.current}
              initialItemId={seed.item.id}
              items={items}
              onActiveItemChange={onActiveItemChange}
              onComment={onComment}
              onDownvote={(item) => { void applyVote(item, "down"); }}
              onLike={(item) => { void applyVote(item, "up"); }}
              onImpression={onImpression}
              onShare={onShare}
              onSong={onSong}
            />
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
