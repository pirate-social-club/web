"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { loadSongRoutePostWithReadMode } from "@/app/authenticated-helpers/load-song-route-post";
import type {
  VideoSongCapabilityLoader,
  VideoSongCapabilityResolution,
} from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import type { VideoFeedCapability } from "@/components/compositions/posts/video-feed/video-feed.types";
import { rewardCtaAmountLabel } from "@/components/compositions/rewards/reward-surfaces";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import type { ApiPublicRewardOffer } from "@/lib/api/client-api-types";

function capabilityStatus(value: unknown): VideoFeedCapability {
  return value === "ready"
    || value === "locked"
    || value === "processing"
    || value === "failed"
    ? value
    : "unavailable";
}

type PostWithKaraokeCapability = {
  karaoke_capability?: { status?: unknown } | null;
};

export function resolveVideoSongCapabilities({ post, readMode, rewardOffer, sourcePostId }: {
  post: LocalizedPostResponse;
  readMode: "authenticated" | "public";
  rewardOffer?: ApiPublicRewardOffer | null;
  sourcePostId: string;
}): VideoSongCapabilityResolution {
  const ageBlocked = post.age_gate_viewer_state === "proof_required";
  const karaoke = ageBlocked
    ? "locked"
    : capabilityStatus((post as LocalizedPostResponse & PostWithKaraokeCapability).karaoke_capability?.status);
  const study = ageBlocked ? "locked" : capabilityStatus(post.study_capability?.status);
  const rewardLabel = rewardOffer ? rewardCtaAmountLabel(rewardOffer.daily_reward_cents) : undefined;
  const artworkSrc = post.song_presentation?.cover_art_ref?.trim() || undefined;
  return {
    activeRewardOffer: Boolean(rewardOffer),
    artworkSrc,
    karaoke,
    karaokeHref: karaoke === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/karaoke` : undefined,
    readMode,
    rewards: rewardLabel && !ageBlocked ? {
      karaoke: karaoke === "ready" && rewardOffer?.eligible_activity !== "study"
        ? { amountLabel: rewardLabel }
        : undefined,
      study: study === "ready" && rewardOffer?.eligible_activity !== "karaoke"
        ? { amountLabel: rewardLabel }
        : undefined,
    } : undefined,
    sourcePostId,
    sourceCommunityId: post.post.community ?? null,
    study,
    studyHref: study === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/study` : undefined,
    viewerIsAuthor: Boolean(post.viewer_is_author),
  };
}

export interface VideoViewerSongCapabilities {
  cacheScope: string;
  load: VideoSongCapabilityLoader;
}

export function useVideoViewerSongCapabilities(contentLocale: string): VideoViewerSongCapabilities {
  const api = useApi();
  const session = useSession();
  const hasAccessToken = Boolean(session?.accessToken);
  const viewerIdentity = session?.user?.id ?? "anonymous";
  const verificationScope = JSON.stringify(session?.user?.verification_capabilities ?? null);

  const load = React.useCallback(async (sourcePostId: string): Promise<VideoSongCapabilityResolution> => {
    const loaded = await loadSongRoutePostWithReadMode({
      api,
      contentLocale,
      hasAccessToken,
      postId: sourcePostId,
    });
    const rewardOffer = loaded.post.post.community && loaded.post.age_gate_viewer_state !== "proof_required"
      ? await api.rewards.getActiveCampaignForSong(loaded.post.post.community, sourcePostId).catch(() => null)
      : null;
    return resolveVideoSongCapabilities({
      post: loaded.post,
      readMode: loaded.readMode,
      rewardOffer,
      sourcePostId,
    });
  }, [api, contentLocale, hasAccessToken]);

  return React.useMemo(() => ({
    cacheScope: `${viewerIdentity}:${hasAccessToken ? "authenticated" : "public"}:${contentLocale}:${verificationScope}`,
    load,
  }), [contentLocale, hasAccessToken, load, verificationScope, viewerIdentity]);
}
