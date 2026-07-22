"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { loadSongRoutePostWithReadMode } from "@/app/authenticated-helpers/load-song-route-post";
import type {
  VideoSongCapabilityLoader,
  VideoSongCapabilityResolution,
} from "@/components/compositions/posts/video-feed/video-song-capability-cache";
import type { VideoFeedCapability } from "@/components/compositions/posts/video-feed/video-feed.types";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";

function capabilityStatus(value: unknown): VideoFeedCapability {
  return value === "ready" || value === "locked" ? value : "unavailable";
}

type PostWithKaraokeCapability = {
  karaoke_capability?: { status?: unknown } | null;
};

export function resolveVideoSongCapabilities({ post, readMode, sourcePostId }: {
  post: LocalizedPostResponse;
  readMode: "authenticated" | "public";
  sourcePostId: string;
}): VideoSongCapabilityResolution {
  const ageBlocked = post.age_gate_viewer_state === "proof_required";
  const karaoke = ageBlocked
    ? "unavailable"
    : capabilityStatus((post as LocalizedPostResponse & PostWithKaraokeCapability).karaoke_capability?.status);
  const study = ageBlocked ? "unavailable" : capabilityStatus(post.study_capability?.status);
  return {
    karaoke,
    karaokeHref: karaoke === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/karaoke` : undefined,
    readMode,
    sourcePostId,
    study,
    studyHref: study === "ready" ? `/p/${encodeURIComponent(sourcePostId)}/study` : undefined,
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
    return resolveVideoSongCapabilities({
      post: loaded.post,
      readMode: loaded.readMode,
      sourcePostId,
    });
  }, [api, contentLocale, hasAccessToken]);

  return React.useMemo(() => ({
    cacheScope: `${viewerIdentity}:${hasAccessToken ? "authenticated" : "public"}:${contentLocale}:${verificationScope}`,
    load,
  }), [contentLocale, hasAccessToken, load, verificationScope, viewerIdentity]);
}
