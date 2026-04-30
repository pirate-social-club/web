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

async function loadStoryCdrBrowser() {
  storyCdrBrowserModulePromise ??= import("@/lib/story/cdr-browser");
  return await storyCdrBrowserModulePromise;
}

export type SongCommerceState = {
  listingsByAssetId: Record<string, ApiCommunityListing | undefined>;
  purchasesByAssetId: Record<string, ApiCommunityPurchase | undefined>;
};

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
  getAssetSourceState: (assetKey: string) => {
    playbackState: SongContentSpec["playbackState"];
    src?: string;
  };
  loadAssetSource: (descriptor: AssetSourceDescriptor) => Promise<string | null>;
  playTrack: (descriptor: SongPlaybackDescriptor) => Promise<void>;
  pauseTrack: (trackKey: string) => void;
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
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setListingsByAssetId({});
      setPurchasesByAssetId({});
      return;
    }

    try {
      const [listingsResult, purchasesResult] = await Promise.all([
        api.communities.listListings(communityId),
        api.communities.listPurchases(communityId),
      ]);

      setListingsByAssetId(Object.fromEntries(
        listingsResult.items
          .filter((listing) => typeof listing.asset === "string" && listing.asset.length > 0)
          .map((listing) => [listing.asset as string, listing] as const),
      ));
      setPurchasesByAssetId(Object.fromEntries(
        purchasesResult.items
          .filter((purchase) => typeof purchase.asset === "string" && purchase.asset.length > 0)
          .map((purchase) => [purchase.asset as string, purchase] as const),
      ));
    } catch (error) {
      logger.warn("[song-commerce] failed to refresh commerce state", {
        communityId,
        message: error instanceof Error ? error.message : String(error),
      });
      setListingsByAssetId({});
      setPurchasesByAssetId({});
    }
  }, [api, communityId, enabled]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    listingsByAssetId,
    purchasesByAssetId,
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

  React.useEffect(() => {
    activeTrackKeyRef.current = activeTrackKey;
  }, [activeTrackKey]);

  React.useEffect(() => {
    const audio = new Audio();
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

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      for (const url of objectUrlsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
      audioRef.current = null;
    };
  }, []);

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
      await audio.play();
    } catch (error) {
      setBufferingTrackKey(null);
      setActiveTrackKey(null);
      toast.error(getErrorMessage(error, `Could not play ${descriptor.title}.`));
    }
  }, [loadTrackUrl]);

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

  const getAssetSourceState = React.useCallback((assetKey: string) => (
    assetSourceStates[assetKey] ?? { playbackState: "idle" as const }
  ), [assetSourceStates]);

  return {
    getAssetSourceState,
    getPlaybackState,
    loadAssetSource,
    pauseTrack,
    playTrack,
  };
}
