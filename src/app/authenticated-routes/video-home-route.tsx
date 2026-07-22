"use client";

import * as React from "react";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { useVideoViewerSongCapabilities } from "@/app/authenticated-helpers/use-video-viewer-song-capabilities";
import {
  currentRelativePath,
  readVideoViewerReturnState,
  saveVideoViewerReturnState,
} from "@/app/authenticated-helpers/video-viewer-return-state";
import { toPageVideoItem, adjacentVideoSourcePostIds, VideoViewerBoostBridge } from "@/components/compositions/posts/feed/feed";
import { VideoFeed, type VideoFeedPlaybackState } from "@/components/compositions/posts/video-feed/video-feed";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { VideoSongCapabilityCache } from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";

export function VideoHomePage() {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const contentLocale = useRouteContentLocale();
  const capabilityLoader = useVideoViewerSongCapabilities(contentLocale);
  const [entries, setEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [capabilityRevision, setCapabilityRevision] = React.useState(0);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [boostTarget, setBoostTarget] = React.useState<{ open: () => void; sourcePostId: string } | null>(null);
  const loadingMoreRef = React.useRef(false);
  const restored = React.useMemo(() => readVideoViewerReturnState(currentRelativePath()), []);
  const capabilityCache = React.useMemo(
    () => new VideoSongCapabilityCache(capabilityLoader.cacheScope, capabilityLoader.load),
    [capabilityLoader],
  );

  React.useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
    void request({ locale: contentLocale, sort: "best" })
      .then((response) => {
        if (cancelled) return;
        setEntries(response.items);
        setNextCursor(response.next_cursor ?? null);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
    try {
      const request = session?.accessToken ? api.feed.videos : api.feed.publicVideos;
      const response = await request({ cursor: nextCursor, locale: contentLocale, sort: "best" });
      setEntries((current) => [...current, ...response.items]);
      setNextCursor(response.next_cursor ?? null);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [api, contentLocale, nextCursor, session?.accessToken]);

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
    if (!session?.accessToken) return;
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
  }, [api.posts, entries, session?.accessToken]);

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

  if (loading) return <div className="grid min-h-dvh w-full place-items-center bg-background"><Spinner className="size-6" /></div>;
  if (error) return <div className="grid min-h-dvh w-full place-items-center bg-background"><Type variant="h3">Could not load videos</Type></div>;

  return (
    <div className="min-h-0 w-full flex-1 bg-background">
      <VideoFeed
        className="h-[calc(100dvh-var(--header-height))] md:h-dvh"
        initialItemId={restored?.itemId}
        initialMuted={restored?.muted}
        initialPaused={restored?.paused}
        initialPlaybackSeconds={restored?.playbackSeconds}
        items={items}
        onActiveItemChange={onActiveItemChange}
        onBoost={(item) => {
          if (boostTarget && item.song?.sourcePostId === boostTarget.sourcePostId) boostTarget.open();
        }}
        onComment={(item) => navigate(`/p/${encodeURIComponent(item.id)}`)}
        onKaraoke={(item, playback) => launchSongAction(item, playback, item.song?.karaokeHref)}
        onLike={onLike}
        onShare={(item) => void navigator.share?.({ url: `${window.location.origin}/p/${encodeURIComponent(item.id)}` })}
        onStudy={(item, playback) => launchSongAction(item, playback, item.song?.studyHref)}
      />
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
