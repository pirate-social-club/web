"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api/base-url";
import {
  usePiratePrivyRuntime,
  usePiratePrivyWallets,
} from "@/components/auth/privy-provider";
import { logger } from "@/lib/logger";
import type { SongContentSpec } from "@/components/compositions/posts/post-card/post-card.types";
import { toast } from "@/components/primitives/sonner";

import { getErrorMessage } from "@/lib/error-utils";

let storyCdrBrowserModulePromise: Promise<typeof import("@/lib/story/cdr-browser")> | null = null;
const EMPTY_TRACK_PROGRESS = { progressMs: 0 } as const;

async function loadStoryCdrBrowser() {
  storyCdrBrowserModulePromise ??= import("@/lib/story/cdr-browser");
  return await storyCdrBrowserModulePromise;
}

export type SongPlaybackDescriptor = {
  key: string;
  title: string;
} & ({
  kind: "source";
  sourcePath: string;
  requiresAuth: boolean;
} | {
  kind: "asset";
  communityId: string;
  assetId: string;
});

export type SongPlaybackController = {
  getPlaybackState: (trackKey: string) => SongContentSpec["playbackState"];
  getPlaybackProgress: (trackKey: string) => {
    durationMs?: number;
    progressMs: number;
  };
  subscribePlaybackProgress: (trackKey: string, listener: () => void) => () => void;
  getAssetSourceState: (assetKey: string) => {
    playbackState: SongContentSpec["playbackState"];
    src?: string;
  };
  loadAssetSource: (descriptor: AssetSourceDescriptor) => Promise<string | null>;
  playTrack: (descriptor: SongPlaybackDescriptor) => Promise<void>;
  pauseTrack: (trackKey: string) => void;
  seekTrack: (descriptor: SongPlaybackDescriptor, progressMs: number) => Promise<void>;
};

export type AssetSourceDescriptor = {
  key: string;
  title: string;
  communityId: string;
  assetId: string;
};

export function useSongCommerceState(communityId: string, enabled: boolean) {
  const api = useApi();
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [listingsByLiveRoomId, setListingsByLiveRoomId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [listingsByReplayAssetId, setListingsByReplayAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [purchasesByLiveRoomId, setPurchasesByLiveRoomId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [purchasesByReplayAssetId, setPurchasesByReplayAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setListingsByAssetId({});
      setListingsByLiveRoomId({});
      setListingsByReplayAssetId({});
      setPurchasesByAssetId({});
      setPurchasesByLiveRoomId({});
      setPurchasesByReplayAssetId({});
      return;
    }

    try {
      const [listingsResult, purchasesResult] = await Promise.all([
        api.communities.listListings(communityId),
        api.communities.listPurchases(communityId),
      ]);

      setListingsByAssetId(Object.fromEntries(
        listingsResult.items.reduce<Array<readonly [string, typeof listingsResult.items[number]]>>((result, listing) => {
          if (typeof listing.asset === "string" && listing.asset.length > 0) {
            result.push([listing.asset, listing] as const);
          }
          return result;
        }, []),
      ));
      setListingsByLiveRoomId(Object.fromEntries(
        listingsResult.items.reduce<Array<readonly [string, typeof listingsResult.items[number]]>>((result, listing) => {
          if (typeof listing.live_room === "string" && listing.live_room.length > 0) {
            result.push([listing.live_room, listing] as const);
          }
          return result;
        }, []),
      ));
      setListingsByReplayAssetId(Object.fromEntries(
        listingsResult.items.reduce<Array<readonly [string, typeof listingsResult.items[number]]>>((result, listing) => {
          if (typeof listing.replay_asset === "string" && listing.replay_asset.length > 0) {
            result.push([listing.replay_asset, listing] as const);
          }
          return result;
        }, []),
      ));
      setPurchasesByAssetId(Object.fromEntries(
        purchasesResult.items.reduce<Array<readonly [string, typeof purchasesResult.items[number]]>>((result, purchase) => {
          if (typeof purchase.asset === "string" && purchase.asset.length > 0) {
            result.push([purchase.asset, purchase] as const);
          }
          return result;
        }, []),
      ));
      setPurchasesByLiveRoomId(Object.fromEntries(
        purchasesResult.items.reduce<Array<readonly [string, typeof purchasesResult.items[number]]>>((result, purchase) => {
          if (typeof purchase.live_room === "string" && purchase.live_room.length > 0) {
            result.push([purchase.live_room, purchase] as const);
          }
          return result;
        }, []),
      ));
      setPurchasesByReplayAssetId(Object.fromEntries(
        purchasesResult.items.reduce<Array<readonly [string, typeof purchasesResult.items[number]]>>((result, purchase) => {
          if (typeof purchase.replay_asset === "string" && purchase.replay_asset.length > 0) {
            result.push([purchase.replay_asset, purchase] as const);
          }
          return result;
        }, []),
      ));
    } catch (error) {
      logger.warn("[song-commerce] failed to refresh commerce state", {
        communityId,
        message: error instanceof Error ? error.message : String(error),
      });
      setListingsByAssetId({});
      setListingsByLiveRoomId({});
      setListingsByReplayAssetId({});
      setPurchasesByAssetId({});
      setPurchasesByLiveRoomId({});
      setPurchasesByReplayAssetId({});
    }
  }, [api, communityId, enabled]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    listingsByAssetId,
    listingsByLiveRoomId,
    listingsByReplayAssetId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    purchasesByReplayAssetId,
    refresh,
  };
}

export function useSongPlayback(accessToken: string | null): SongPlaybackController {
  const api = useApi();
  const { connect } = usePiratePrivyRuntime();
  const { connectedWallets } = usePiratePrivyWallets();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = React.useRef(new Map<string, string>());
  const activeTrackKeyRef = React.useRef<string | null>(null);
  const [activeTrackKey, setActiveTrackKey] = React.useState<string | null>(null);
  const [bufferingTrackKey, setBufferingTrackKey] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [assetSourceStates, setAssetSourceStates] = React.useState<Record<string, {
    playbackState: SongContentSpec["playbackState"];
    src?: string;
  }>>({});
  const trackProgressRef = React.useRef<Record<string, {
    durationMs?: number;
    progressMs: number;
  }>>({});
  const trackProgressListenersRef = React.useRef(new Map<string, Set<() => void>>());

  const publishTrackProgress = React.useCallback((trackKey: string, progress: {
    durationMs?: number;
    progressMs: number;
  }) => {
    trackProgressRef.current = {
      ...trackProgressRef.current,
      [trackKey]: progress,
    };
    for (const listener of trackProgressListenersRef.current.get(trackKey) ?? []) {
      listener();
    }
  }, []);

  React.useEffect(() => {
    activeTrackKeyRef.current = activeTrackKey;
  }, [activeTrackKey]);

  React.useEffect(() => {
    const audio = new Audio();
    const objectUrls = objectUrlsRef.current;
    audioRef.current = audio;

    const handlePlay = () => {
      setBufferingTrackKey(null);
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setActiveTrackKey(null);
    };
    const handleWaiting = () => {
      if (activeTrackKeyRef.current) {
        setBufferingTrackKey(activeTrackKeyRef.current);
      }
    };
    const handleCanPlay = () => {
      setBufferingTrackKey(null);
    };
    const updateProgress = () => {
      const activeTrackKey = activeTrackKeyRef.current;
      if (!activeTrackKey) return;
      const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.round(audio.duration * 1000)
        : undefined;
      publishTrackProgress(activeTrackKey, {
        durationMs,
        progressMs: Math.round(audio.currentTime * 1000),
      });
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("seeked", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("durationchange", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("seeked", updateProgress);
      audio.removeEventListener("timeupdate", updateProgress);
      for (const url of objectUrls.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrls.clear();
      audioRef.current = null;
    };
  }, [publishTrackProgress]);

  const fetchTrackBlob = React.useCallback(async (descriptor: SongPlaybackDescriptor): Promise<Blob> => {
    if (descriptor.kind === "source") {
      const response = await fetch(resolveApiUrl(descriptor.sourcePath), {
        headers: descriptor.requiresAuth && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error(`Could not load ${descriptor.title}`);
      }

      return await response.blob();
    }

    const access = await api.communities.resolveAssetAccess(descriptor.communityId, descriptor.assetId);
    if (!access.access_granted) {
      if (access.decision_reason === "purchase_required") {
        throw new Error(`Purchase required to play ${descriptor.title}.`);
      }
      throw new Error(`Could not access ${descriptor.title}.`);
    }

    if (access.delivery_kind === "primary_content_ref" && access.delivery_ref) {
      const response = await fetch(resolveApiUrl(access.delivery_ref), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Could not load ${descriptor.title}`);
      }
      return await response.blob();
    }

    if (access.delivery_kind === "story_cdr_ref" && access.story_cdr_access) {
      if (!connectedWallets[0]) {
        connect?.();
        throw new Error("Connect a wallet to unlock Story CDR playback.");
      }
      const { readStoryCdrAsset } = await loadStoryCdrBrowser();
      return await readStoryCdrAsset({
        access: access.story_cdr_access,
        accessToken,
        wallet: connectedWallets[0],
      });
    }

    throw new Error(`Could not load ${descriptor.title}`);
  }, [accessToken, api.communities, connect, connectedWallets]);

  const loadTrackUrl = React.useCallback(async (descriptor: SongPlaybackDescriptor): Promise<string> => {
    const existing = objectUrlsRef.current.get(descriptor.key);
    if (existing) {
      return existing;
    }

    const objectUrl = URL.createObjectURL(await fetchTrackBlob(descriptor));
    objectUrlsRef.current.set(descriptor.key, objectUrl);
    return objectUrl;
  }, [fetchTrackBlob]);

  const playTrack = React.useCallback(async (descriptor: SongPlaybackDescriptor) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      setActiveTrackKey(descriptor.key);
      setBufferingTrackKey(descriptor.key);
      const sourceUrl = await loadTrackUrl(descriptor);
      if (audio.src !== sourceUrl) {
        audio.src = sourceUrl;
      }
      if (!trackProgressRef.current[descriptor.key]) {
        publishTrackProgress(descriptor.key, { progressMs: 0 });
      }
      await audio.play();
    } catch (error) {
      setBufferingTrackKey(null);
      setActiveTrackKey(null);
      toast.error(getErrorMessage(error, `Could not play ${descriptor.title}.`));
    }
  }, [loadTrackUrl, publishTrackProgress]);

  const loadAssetSource = React.useCallback(async (descriptor: AssetSourceDescriptor): Promise<string | null> => {
    const existing = objectUrlsRef.current.get(descriptor.key);
    if (existing) {
      setAssetSourceStates((current) => ({
        ...current,
        [descriptor.key]: { playbackState: "idle", src: existing },
      }));
      return existing;
    }

    setAssetSourceStates((current) => ({
      ...current,
      [descriptor.key]: { ...current[descriptor.key], playbackState: "buffering" },
    }));

    try {
      const sourceUrl = await loadTrackUrl({
        key: descriptor.key,
        title: descriptor.title,
        kind: "asset",
        communityId: descriptor.communityId,
        assetId: descriptor.assetId,
      });
      setAssetSourceStates((current) => ({
        ...current,
        [descriptor.key]: { playbackState: "idle", src: sourceUrl },
      }));
      return sourceUrl;
    } catch (error) {
      setAssetSourceStates((current) => ({
        ...current,
        [descriptor.key]: { ...current[descriptor.key], playbackState: "idle" },
      }));
      toast.error(getErrorMessage(error, `Could not load ${descriptor.title}.`));
      return null;
    }
  }, [loadTrackUrl]);

  const pauseTrack = React.useCallback((trackKey: string) => {
    if (activeTrackKey !== trackKey) {
      return;
    }

    audioRef.current?.pause();
  }, [activeTrackKey]);

  const getPlaybackState = React.useCallback((trackKey: string): SongContentSpec["playbackState"] => {
    if (bufferingTrackKey === trackKey) {
      return "buffering";
    }

    if (activeTrackKey === trackKey) {
      return isPlaying ? "playing" : "paused";
    }

    return "idle";
  }, [activeTrackKey, bufferingTrackKey, isPlaying]);

  const getPlaybackProgress = React.useCallback((trackKey: string) => (
    trackProgressRef.current[trackKey] ?? EMPTY_TRACK_PROGRESS
  ), []);

  const subscribePlaybackProgress = React.useCallback((trackKey: string, listener: () => void) => {
    const listeners = trackProgressListenersRef.current.get(trackKey) ?? new Set<() => void>();
    listeners.add(listener);
    trackProgressListenersRef.current.set(trackKey, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        trackProgressListenersRef.current.delete(trackKey);
      }
    };
  }, []);

  const getAssetSourceState = React.useCallback((assetKey: string) => (
    assetSourceStates[assetKey] ?? { playbackState: "idle" as const }
  ), [assetSourceStates]);

  const seekTrack = React.useCallback(async (descriptor: SongPlaybackDescriptor, progressMs: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      setActiveTrackKey(descriptor.key);
      const sourceUrl = await loadTrackUrl(descriptor);
      if (audio.src !== sourceUrl) {
        audio.src = sourceUrl;
      }
      const nextSeconds = Math.max(0, progressMs / 1000);
      if (audio.readyState > HTMLMediaElement.HAVE_NOTHING) {
        audio.currentTime = nextSeconds;
      } else {
        audio.addEventListener("loadedmetadata", () => {
          audio.currentTime = nextSeconds;
        }, { once: true });
      }
      publishTrackProgress(descriptor.key, {
        durationMs: trackProgressRef.current[descriptor.key]?.durationMs,
        progressMs: Math.max(0, Math.round(progressMs)),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not seek ${descriptor.title}.`));
    }
  }, [loadTrackUrl, publishTrackProgress]);

  return React.useMemo(() => ({
    getAssetSourceState,
    getPlaybackProgress,
    getPlaybackState,
    loadAssetSource,
    pauseTrack,
    playTrack,
    seekTrack,
    subscribePlaybackProgress,
  }), [
    getAssetSourceState,
    getPlaybackProgress,
    getPlaybackState,
    loadAssetSource,
    pauseTrack,
    playTrack,
    seekTrack,
    subscribePlaybackProgress,
  ]);
}
