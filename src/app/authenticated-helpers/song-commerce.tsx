"use client";

import * as React from "react";
import type {
  CommunityListing as ApiCommunityListing,
  CommunityPurchase as ApiCommunityPurchase,
  CommunityPurchaseSettlement as ApiCommunityPurchaseSettlement,
} from "@pirate/api-contracts";

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
  listingsByLiveRoomId: Record<string, ApiCommunityListing | undefined>;
  purchasesByAssetId: Record<string, ApiCommunityPurchase | undefined>;
  purchasesByLiveRoomId: Record<string, ApiCommunityPurchase | undefined>;
};

export function purchaseFromSettlement(settlement: ApiCommunityPurchaseSettlement): ApiCommunityPurchase {
  return {
    id: settlement.id,
    object: "community_purchase",
    community: settlement.community,
    listing: settlement.listing,
    asset: settlement.asset,
    live_room: settlement.live_room,
    buyer_user: settlement.buyer_user,
    settlement_wallet_attachment: settlement.settlement_wallet_attachment,
    purchase_price_cents: settlement.purchase_price_cents,
    pricing_tier: settlement.pricing_tier,
    settlement_mode: settlement.settlement_mode,
    settlement_chain: settlement.settlement_chain,
    settlement_token: settlement.settlement_token,
    settlement_tx_ref: settlement.settlement_tx_ref,
    allocations: settlement.allocations,
    donation_partner: settlement.donation_partner,
    donation_share_bps: settlement.donation_share_bps,
    donation_amount_cents: settlement.donation_amount_cents,
    vinyl_release_provider: settlement.vinyl_release_provider,
    vinyl_release_url: settlement.vinyl_release_url,
    purchase_entitlement: settlement.purchase_entitlement,
    entitlement_kind: settlement.entitlement_kind,
    entitlement_target_ref: settlement.entitlement_target_ref,
    created: settlement.settled_at,
  };
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
  getProgress: (trackKey: string) => number | undefined;
  getDuration: (trackKey: string) => number | undefined;
  getAssetSourceState: (assetKey: string) => {
    playbackState: SongContentSpec["playbackState"];
    src?: string;
  };
  loadAssetSource: (descriptor: AssetSourceDescriptor) => Promise<string | null>;
  playTrack: (descriptor: SongPlaybackDescriptor) => Promise<void>;
  pauseTrack: (trackKey: string) => void;
  seekTrack: (trackKey: string, positionMs: number) => void;
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
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [purchasesByLiveRoomId, setPurchasesByLiveRoomId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});

  const recordPurchaseSettlement = React.useCallback((settlement: ApiCommunityPurchaseSettlement) => {
    const purchase = purchaseFromSettlement(settlement);
    if (purchase.asset) {
      setPurchasesByAssetId((current) => ({
        ...current,
        [purchase.asset!]: purchase,
      }));
    }
    if (purchase.live_room) {
      setPurchasesByLiveRoomId((current) => ({
        ...current,
        [purchase.live_room!]: purchase,
      }));
    }
  }, []);

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setListingsByAssetId({});
      setListingsByLiveRoomId({});
      setPurchasesByAssetId({});
      setPurchasesByLiveRoomId({});
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
    } catch (error) {
      logger.warn("[song-commerce] failed to refresh commerce state", {
        communityId,
        message: error instanceof Error ? error.message : String(error),
      });
      setListingsByAssetId({});
      setListingsByLiveRoomId({});
      setPurchasesByAssetId({});
      setPurchasesByLiveRoomId({});
    }
  }, [api, communityId, enabled]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    listingsByAssetId,
    listingsByLiveRoomId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    recordPurchaseSettlement,
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
  const [progressByTrackKey, setProgressByTrackKey] = React.useState<Record<string, {
    currentTimeMs?: number;
    durationMs?: number;
  }>>({});

  React.useEffect(() => {
    activeTrackKeyRef.current = activeTrackKey;
  }, [activeTrackKey]);

  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const recordActiveProgress = () => {
      const trackKey = activeTrackKeyRef.current;
      if (!trackKey) return;

      const currentTimeMs = Number.isFinite(audio.currentTime)
        ? Math.max(0, Math.round(audio.currentTime * 1000))
        : undefined;
      const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.round(audio.duration * 1000)
        : undefined;

      setProgressByTrackKey((current) => {
        const previous = current[trackKey];
        if (
          previous?.currentTimeMs === currentTimeMs
          && previous?.durationMs === durationMs
        ) {
          return current;
        }

        return {
          ...current,
          [trackKey]: {
            currentTimeMs,
            durationMs,
          },
        };
      });
    };

    const handlePlay = () => {
      setBufferingTrackKey(null);
      setIsPlaying(true);
      recordActiveProgress();
    };
    const handlePause = () => {
      setIsPlaying(false);
      recordActiveProgress();
    };
    const handleEnded = () => {
      recordActiveProgress();
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
      recordActiveProgress();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("durationchange", recordActiveProgress);
    audio.addEventListener("loadedmetadata", recordActiveProgress);
    audio.addEventListener("timeupdate", recordActiveProgress);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("durationchange", recordActiveProgress);
      audio.removeEventListener("loadedmetadata", recordActiveProgress);
      audio.removeEventListener("timeupdate", recordActiveProgress);
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

  const seekTrack = React.useCallback((trackKey: string, positionMs: number) => {
    const audio = audioRef.current;
    if (!audio || activeTrackKeyRef.current !== trackKey) {
      return;
    }

    const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration * 1000
      : undefined;
    const clampedPositionMs = Math.max(0, durationMs == null ? positionMs : Math.min(positionMs, durationMs));
    audio.currentTime = clampedPositionMs / 1000;

    setProgressByTrackKey((current) => ({
      ...current,
      [trackKey]: {
        ...current[trackKey],
        currentTimeMs: Math.round(clampedPositionMs),
        durationMs: durationMs == null ? current[trackKey]?.durationMs : Math.round(durationMs),
      },
    }));
  }, []);

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

  const getProgress = React.useCallback((trackKey: string) => (
    progressByTrackKey[trackKey]?.currentTimeMs
  ), [progressByTrackKey]);

  const getDuration = React.useCallback((trackKey: string) => (
    progressByTrackKey[trackKey]?.durationMs
  ), [progressByTrackKey]);

  return {
    getDuration,
    getProgress,
    getAssetSourceState,
    getPlaybackState,
    loadAssetSource,
    pauseTrack,
    playTrack,
    seekTrack,
  };
}
