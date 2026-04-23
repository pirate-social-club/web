"use client";

import * as React from "react";
import type { Post as ApiCreatedPost, SongArtifactBundle as ApiSongArtifactBundle } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import type {
  AuthorMode,
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  ComposerReference,
  DerivativeStepState,
  MonetizationState,
  SongComposerState,
  SongMode,
} from "@/components/compositions/post-composer/post-composer.types";

import { buildSongListingRequest, buildSongPostRequest } from "./song-submit";

const SONG_PREVIEW_DURATION_MS = 30_000;
const SONG_PREVIEW_POLL_INTERVAL_MS = 2_000;
const SONG_PREVIEW_POLL_ATTEMPTS = 30;

type SignAgentAuthoredBody = <T extends Record<string, unknown>>(
  path: string,
  body: T,
) => Promise<T & Record<string, unknown>>;

type UseSongSubmitInput = {
  communityId: string;
  signAgentAuthoredBody: SignAgentAuthoredBody;
};

type SongSubmitInput = {
  audience: ComposerAudienceState;
  authorMode: AuthorMode;
  charityContribution: CharityContributionState;
  charityPartner: CommunityCharityPartner | null;
  derivativeStep: DerivativeStepState | undefined;
  lyrics: string;
  monetizationState: MonetizationState;
  paidSongPriceUsd: number | null;
  pendingSongBundleId: string | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  setDerivativeStep: (updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined) => void;
  setPendingSongBundleId: (bundleId: string | null) => void;
  setSongMode: (mode: SongMode) => void;
  setSubmitError: (error: string | null) => void;
  songMode: SongMode;
  songState: SongComposerState;
  title: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function parsePreviewStartMs(value: string | undefined): number | null {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed * 1000;
}

function buildMatchedSourceReferences(bundle: ApiSongArtifactBundle): ComposerReference[] {
  const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
    ? bundle.moderation_result as { audio_identification?: { provider_result?: { metadata?: { custom_files?: unknown[] } } } }
    : null;
  const customFiles = moderationResult?.audio_identification?.provider_result?.metadata?.custom_files;
  if (!Array.isArray(customFiles)) return [];

  const seen = new Set<string>();
  return customFiles.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const acrid = "acrid" in entry && typeof entry.acrid === "string" ? entry.acrid : null;
    const titleText = "title" in entry && typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : `Matched source ${index + 1}`;
    const subtitleParts = [
      "community_id" in entry && typeof entry.community_id === "string" ? entry.community_id : null,
      "score" in entry && typeof entry.score === "number" ? `score ${entry.score}` : null,
    ].filter(Boolean);
    const id = acrid ? `acr:custom-file:${acrid}` : `acr:custom-file:match:${index}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, title: titleText, subtitle: subtitleParts.length ? subtitleParts.join(" - ") : undefined }];
  });
}

function resolveBundleAnalysisState(bundle: ApiSongArtifactBundle): string | null {
  const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
    ? bundle.moderation_result as { analysis_state?: string }
    : null;
  return moderationResult?.analysis_state ?? null;
}

export function useSongSubmit({
  communityId,
  signAgentAuthoredBody,
}: UseSongSubmitInput) {
  const api = useApi();

  const waitForSongPreview = React.useCallback(async (bundle: ApiSongArtifactBundle): Promise<ApiSongArtifactBundle> => {
    let current = bundle;
    for (let attempt = 0; attempt <= SONG_PREVIEW_POLL_ATTEMPTS; attempt += 1) {
      if (current.preview_status === "completed" && current.preview_audio?.storage_ref) {
        return current;
      }
      if (current.preview_status === "failed") {
        throw new Error(current.preview_error || "Song preview generation failed.");
      }
      if (attempt === SONG_PREVIEW_POLL_ATTEMPTS) {
        break;
      }
      await sleep(SONG_PREVIEW_POLL_INTERVAL_MS);
      current = await api.communities.getSongArtifactBundle(communityId, current.song_artifact_bundle_id);
    }
    throw new Error("Song preview is still processing. Try again in a moment.");
  }, [api.communities, communityId]);

  const uploadSongArtifact = React.useCallback(async (
    artifactKind: "primary_audio" | "cover_art" | "canvas_video" | "instrumental_audio" | "vocal_audio",
    file: File | null | undefined,
  ) => {
    if (!file) return null;
    const intent = await api.communities.createSongArtifactUpload(communityId, {
      artifact_kind: artifactKind,
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
    });
    return await api.communities.uploadSongArtifactContent(communityId, intent.song_artifact_upload_id, await file.arrayBuffer());
  }, [api, communityId]);

  return React.useCallback(async ({
    audience,
    authorMode,
    charityContribution,
    charityPartner,
    derivativeStep,
    lyrics,
    monetizationState,
    paidSongPriceUsd,
    pendingSongBundleId,
    pricingPolicyRegionalPricingEnabled,
    setDerivativeStep,
    setPendingSongBundleId,
    setSongMode,
    setSubmitError,
    songMode,
    songState,
    title,
  }: SongSubmitInput): Promise<ApiCreatedPost | null> => {
    const isLockedSong = paidSongPriceUsd != null;
    if (monetizationState.visible && paidSongPriceUsd == null) throw new Error("Enter a valid unlock price before publishing this song.");
    if (isLockedSong && !monetizationState.rightsAttested) throw new Error("Confirm you have the rights to sell this song before publishing it.");
    const previewStartMs = isLockedSong ? parsePreviewStartMs(songState.previewStartSeconds) : null;
    if (isLockedSong && previewStartMs == null) throw new Error("Choose where the 30 second preview starts.");
    const selectedSourceRefs = derivativeStep?.references?.map((reference) => reference.id) ?? [];
    if (derivativeStep?.required && selectedSourceRefs.length === 0) throw new Error("Attach a source track before publishing this remix");

    let bundleId = pendingSongBundleId;
    let bundleForPublish: ApiSongArtifactBundle | null = null;
    if (!bundleId) {
      const primaryAudio = await uploadSongArtifact("primary_audio", songState.primaryAudioUpload);
      if (!primaryAudio) throw new Error("Primary audio is required");
      const coverArt = await uploadSongArtifact("cover_art", songState.coverUpload);
      const canvasVideo = await uploadSongArtifact("canvas_video", songState.canvasVideoUpload);
      const instrumentalAudio = await uploadSongArtifact("instrumental_audio", songState.instrumentalAudioUpload);
      const vocalAudio = await uploadSongArtifact("vocal_audio", songState.vocalAudioUpload);
      const bundle = await api.communities.createSongArtifactBundle(communityId, {
        primary_audio: { song_artifact_upload_id: primaryAudio.song_artifact_upload_id },
        lyrics: lyrics.trim(),
        cover_art: coverArt ? { song_artifact_upload_id: coverArt.song_artifact_upload_id } : null,
        preview_window: isLockedSong ? { start_ms: previewStartMs ?? 0, duration_ms: SONG_PREVIEW_DURATION_MS } : null,
        canvas_video: canvasVideo ? { song_artifact_upload_id: canvasVideo.song_artifact_upload_id } : null,
        instrumental_audio: instrumentalAudio ? { song_artifact_upload_id: instrumentalAudio.song_artifact_upload_id } : null,
        vocal_audio: vocalAudio ? { song_artifact_upload_id: vocalAudio.song_artifact_upload_id } : null,
      });
      bundleId = bundle.song_artifact_bundle_id;
      bundleForPublish = bundle;

      if (resolveBundleAnalysisState(bundle) === "allow_with_required_reference") {
        const matchedReferences = buildMatchedSourceReferences(bundle);
        setPendingSongBundleId(bundle.song_artifact_bundle_id);
        setSongMode("remix");
        setDerivativeStep((current) => ({
          visible: true,
          required: true,
          trigger: "analysis",
          requirementLabel: "This audio matches an existing song. Publish it as a remix and keep the source track attached.",
          searchResults: matchedReferences,
          references: matchedReferences.length ? matchedReferences : current?.references,
        }));
        setSubmitError(matchedReferences.length
          ? "Review the matched source track, then submit again as a remix."
          : "This audio matches an existing song. Attach a source track, then submit again as a remix.");
        return null;
      }
    }

    if (isLockedSong) {
      bundleForPublish = await waitForSongPreview(
        bundleForPublish ?? await api.communities.getSongArtifactBundle(communityId, bundleId),
      );
      bundleId = bundleForPublish.song_artifact_bundle_id;
    }

    const songRequest = buildSongPostRequest({
      bundleId,
      derivativeStep,
      idempotencyKey: crypto.randomUUID(),
      paidSongPriceUsd,
      songMode,
      title,
      visibility: audience.visibility,
    });
    const result = await api.communities.createPost(
      communityId,
      authorMode === "agent"
        ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, songRequest)
        : songRequest,
    );

    if (isLockedSong) {
      if (!result.asset_id) throw new Error("The song published, but the paid asset was not created.");
      const listingRequest = buildSongListingRequest({
        assetId: result.asset_id,
        paidSongPriceUsd,
        pricingPolicyRegionalPricingEnabled,
        regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
        charityContributionPct: charityContribution.percentagePct,
        charityPartnerId: charityPartner?.partnerId ?? null,
      });
      if (!listingRequest) throw new Error("The song published, but the paid listing payload was not created.");
      await api.communities.createListing(communityId, listingRequest);
    }

    return result;
  }, [api.communities, communityId, signAgentAuthoredBody, uploadSongArtifact, waitForSongPreview]);
}
