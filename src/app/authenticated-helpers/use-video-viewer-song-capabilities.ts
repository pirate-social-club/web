"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { loadSongRoutePostWithReadMode } from "@/app/authenticated-helpers/load-song-route-post";
import type {
  VideoSongCapabilityEnrichment,
  VideoSongCapabilityEnrichmentLoader,
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
  const karaoke = capabilityStatus((post as LocalizedPostResponse & PostWithKaraokeCapability).karaoke_capability?.status);
  const study = capabilityStatus(post.study_capability?.status);
  const artworkSrc = post.song_presentation?.cover_art_ref?.trim() || undefined;
  const rewardEnrichment = rewardOffer
    ? resolveVideoSongCapabilityRewards({
        karaoke,
        learningGate: ageBlocked ? "age_proof_required" : "allowed",
        rewardOffer,
        study,
      })
    : null;
  return {
    activeRewardCampaignId: rewardEnrichment?.activeRewardCampaignId ?? null,
    artworkSrc,
    karaoke,
    karaokeHref: karaoke === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/karaoke` : undefined,
    learningGate: ageBlocked ? "age_proof_required" : "allowed",
    readMode,
    rewards: rewardEnrichment?.rewards,
    sourcePostId,
    sourceCommunityId: post.post.community ?? null,
    study,
    studyHref: study === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/study` : undefined,
    viewerIsAuthor: Boolean(post.viewer_is_author),
  };
}

export function resolveVideoSongCapabilityRewards({ karaoke, learningGate, rewardOffer, study }: {
  karaoke: VideoFeedCapability;
  learningGate: VideoSongCapabilityResolution["learningGate"];
  rewardOffer: ApiPublicRewardOffer;
  study: VideoFeedCapability;
}): VideoSongCapabilityEnrichment {
  const rewardLabel = rewardCtaAmountLabel(rewardOffer.daily_reward_cents);
  return {
    activeRewardCampaignId: rewardOffer.campaign,
    rewards: rewardLabel && learningGate === "allowed" ? {
      karaoke: karaoke === "ready" && rewardOffer.eligible_activity !== "study"
        ? { amountLabel: rewardLabel }
        : undefined,
      study: study === "ready" && rewardOffer.eligible_activity !== "karaoke"
        ? { amountLabel: rewardLabel }
        : undefined,
    } : undefined,
  };
}

export interface VideoViewerSongCapabilities {
  cacheScope: string;
  enrich: VideoSongCapabilityEnrichmentLoader;
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
    return resolveVideoSongCapabilities({
      post: loaded.post,
      readMode: loaded.readMode,
      sourcePostId,
    });
  }, [api, contentLocale, hasAccessToken]);

  const enrich = React.useCallback<VideoSongCapabilityEnrichmentLoader>(async (resolution) => {
    if (!resolution.sourceCommunityId || resolution.learningGate !== "allowed") return null;
    const rewardOffer = await api.rewards
      .getActiveCampaignForSong(resolution.sourceCommunityId, resolution.sourcePostId)
      .catch(() => null);
    return rewardOffer ? resolveVideoSongCapabilityRewards({
      karaoke: resolution.karaoke,
      learningGate: resolution.learningGate,
      rewardOffer,
      study: resolution.study,
    }) : null;
  }, [api.rewards]);

  return React.useMemo(() => ({
    cacheScope: `${viewerIdentity}:${hasAccessToken ? "authenticated" : "public"}:${contentLocale}:${verificationScope}`,
    enrich,
    load,
  }), [contentLocale, enrich, hasAccessToken, load, verificationScope, viewerIdentity]);
}
