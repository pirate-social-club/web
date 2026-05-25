"use client";

import * as React from "react";
import type { Post as ApiCreatedPost, SongArtifactBundle as ApiSongArtifactBundle } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import type {
  AuthorMode,
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  DerivativeStepState,
  MonetizationState,
  AssetLicenseState,
  SongComposerState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";

import { buildAssetListingRequest, resolvedDerivativeReferences } from "@/app/authenticated-helpers/asset-submit";
import { buildSongPostRequest } from "@/app/authenticated-helpers/song-submit";

const SONG_PREVIEW_DURATION_MS = 30_000;
const SONG_PREVIEW_POLL_INTERVAL_MS = 2_000;
const SONG_PREVIEW_POLL_ATTEMPTS = 30;
const SONG_SUBMIT_SLOW_STEP_MS = 10_000;
const SONG_SUBMIT_STALLED_STEP_MS = 45_000;

type RawAcrCustomFile = {
  acrid?: unknown;
  title?: unknown;
  community_id?: unknown;
  score?: unknown;
  user_defined?: unknown;
};

type SignAgentAuthoredBody = <T extends Record<string, unknown>>(
  path: string,
  body: T,
) => Promise<T & Record<string, unknown>>;

type UseSongSubmitInput = {
  communityId: string;
  signAgentAuthoredBody: SignAgentAuthoredBody;
};

type SongSubmitInput = {
  altchaPayload?: string | null;
  audience: ComposerAudienceState;
  authorMode: AuthorMode;
  caption?: string;
  charityContribution: CharityContributionState;
  charityPartner: CommunityCharityPartner | null;
  derivativeStep: DerivativeStepState | undefined;
  license: AssetLicenseState;
  lyrics: string;
  monetizationState: MonetizationState;
  paidSongPriceUsd: number | null;
  pendingSongBundleId: string | null;
  pricingPolicyRegionalPricingEnabled: boolean;
  setSubmitError: (error: string | null) => void;
  songMode: SongMode;
  songState: SongComposerState;
  songTitle: string;
  title: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withSongSubmitStep<T>(
  step: string,
  details: Record<string, unknown>,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  logger.info("[song-submit] step started", { ...details, step });
  const slowTimer = window.setTimeout(() => {
    logger.warn("[song-submit] step still pending", {
      ...details,
      elapsedMs: Date.now() - startedAt,
      step,
    });
  }, SONG_SUBMIT_SLOW_STEP_MS);
  const stalledTimer = window.setTimeout(() => {
    logger.warn("[song-submit] step appears stalled", {
      ...details,
      elapsedMs: Date.now() - startedAt,
      step,
    });
  }, SONG_SUBMIT_STALLED_STEP_MS);

  try {
    const result = await operation();
    logger.info("[song-submit] step completed", {
      ...details,
      elapsedMs: Date.now() - startedAt,
      step,
    });
    return result;
  } catch (error) {
    logger.error("[song-submit] step failed", {
      ...details,
      elapsedMs: Date.now() - startedAt,
      error,
      message: error instanceof Error ? error.message : String(error),
      step,
    });
    throw error;
  } finally {
    window.clearTimeout(slowTimer);
    window.clearTimeout(stalledTimer);
  }
}

function parsePreviewStartMs(value: string | undefined): number | null {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed * 1000;
}

function parseAcrUserDefined(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function rawAcrMatchKey(input: {
  customFile: RawAcrCustomFile;
  index: number;
  matchedBundleId: string | null;
}): string {
  if (input.matchedBundleId) return `bundle:${input.matchedBundleId}`;
  const acrid = typeof input.customFile.acrid === "string" ? input.customFile.acrid : null;
  if (acrid) return `acr:${acrid}`;
  return `index:${input.index}`;
}

export function countUniqueRawAcrMatches(bundle: ApiSongArtifactBundle): number {
  const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
    ? bundle.moderation_result as { audio_identification?: { provider_result?: { metadata?: { custom_files?: unknown[] } } } }
    : null;
  const customFiles = moderationResult?.audio_identification?.provider_result?.metadata?.custom_files;
  if (!Array.isArray(customFiles)) return 0;

  const seen = new Set<string>();
  for (const [index, entry] of customFiles.entries()) {
    if (!entry || typeof entry !== "object") continue;
    const customFile = entry as RawAcrCustomFile;
    const userDefined = parseAcrUserDefined(customFile.user_defined);
    const matchedBundleId = typeof userDefined?.song_artifact_bundle_id === "string"
      ? userDefined.song_artifact_bundle_id
      : null;
    seen.add(rawAcrMatchKey({ customFile, index, matchedBundleId }));
  }
  return seen.size;
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
      logger.info("[song-submit] preview poll", {
        attempt,
        bundleId: current.id,
        previewStatus: current.preview_status,
        hasPreviewStorageRef: Boolean(current.preview_audio?.storage_ref),
      });
      if (current.preview_status === "completed" && current.preview_audio?.storage_ref) {
        logger.info("[song-submit] preview ready", { bundleId: current.id, attempt });
        return current;
      }
      if (current.preview_status === "failed") {
        logger.warn("[song-submit] preview failed", {
          bundleId: current.id,
          previewError: current.preview_error,
        });
        throw new Error(current.preview_error || "Song preview generation failed.");
      }
      if (attempt === SONG_PREVIEW_POLL_ATTEMPTS) {
        break;
      }
      await sleep(SONG_PREVIEW_POLL_INTERVAL_MS);
      logger.info("[song-submit] refreshing preview status", {
        bundleId: current.id,
        nextAttempt: attempt + 1,
      });
      current = await withSongSubmitStep("refresh preview status", {
        attempt: attempt + 1,
        bundleId: current.id,
      }, () => api.communities.getSongArtifactBundle(communityId, current.id));
    }
    logger.warn("[song-submit] preview polling timed out", {
      attempts: SONG_PREVIEW_POLL_ATTEMPTS,
      bundleId: current.id,
      previewStatus: current.preview_status,
    });
    throw new Error("Song preview is still processing. Try again in a moment.");
  }, [api.communities, communityId]);

  const uploadSongArtifact = React.useCallback(async (
    artifactKind: "primary_audio" | "cover_art" | "canvas_video" | "instrumental_audio" | "vocal_audio",
    file: File | null | undefined,
  ) => {
    if (!file) return null;
    logger.info("[song-submit] creating artifact upload", {
      artifactKind,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const intent = await withSongSubmitStep("create artifact upload intent", {
      artifactKind,
      filename: file.name,
      sizeBytes: file.size,
    }, () => api.communities.createArtifactUpload(communityId, {
      artifact_kind: artifactKind,
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
    }));
    logger.info("[song-submit] artifact upload intent created", {
      artifactKind,
      intentId: intent.id,
    });
    const fileContent = await withSongSubmitStep("read artifact file", {
      artifactKind,
      filename: file.name,
      sizeBytes: file.size,
    }, () => file.arrayBuffer());
    const uploaded = await withSongSubmitStep("upload artifact content", {
      artifactKind,
      filename: file.name,
      intentId: intent.id,
      sizeBytes: file.size,
    }, () => api.communities.uploadArtifactContent(communityId, intent.id, fileContent));
    logger.info("[song-submit] artifact content uploaded", {
      artifactKind,
      uploadId: uploaded.id,
      storageRef: uploaded.storage_ref,
    });
    return uploaded;
  }, [api, communityId]);

  return React.useCallback(async ({
    altchaPayload,
    audience,
    authorMode,
    caption,
    charityContribution,
    charityPartner,
    derivativeStep,
    license,
    lyrics,
    monetizationState,
    paidSongPriceUsd,
    pendingSongBundleId,
    pricingPolicyRegionalPricingEnabled,
    setSubmitError,
    songMode,
    songState,
    songTitle,
    title,
  }: SongSubmitInput): Promise<ApiCreatedPost | null> => {
    const isLockedSong = paidSongPriceUsd != null;
    logger.info("[song-submit] started", {
      authorMode,
      hasPendingBundle: Boolean(pendingSongBundleId),
      isLockedSong,
      mode: songMode,
      primaryAudioName: songState.primaryAudioUpload?.name ?? songState.primaryAudioLabel,
      songTitle: songTitle.trim(),
      title: title.trim(),
      visibility: audience.visibility,
    });
    if (!songTitle.trim()) throw new Error("Enter a song title before publishing this song.");
    if (monetizationState.visible && paidSongPriceUsd == null) throw new Error("Enter a valid unlock price before publishing this song.");
    const previewStartMs = isLockedSong ? parsePreviewStartMs(songState.previewStartSeconds) : null;
    if (isLockedSong && previewStartMs == null) throw new Error("Choose where the 30 second preview starts.");
    const selectedSourceRefs = resolvedDerivativeReferences(derivativeStep).map((reference) => reference.id);
    if (derivativeStep?.required && selectedSourceRefs.length === 0) throw new Error("Attach a source track before publishing this remix");
    if (derivativeStep?.required && derivativeStep.sourceTermsAccepted !== true) throw new Error("Accept the source license terms before publishing this remix.");
    if (!license) throw new Error("Choose license terms before publishing this song.");
    if (license.presetId === "commercial-remix") {
      const revSharePct = license.commercialRevSharePct;
      if (revSharePct == null || !Number.isInteger(revSharePct) || revSharePct < 0 || revSharePct > 100) {
        throw new Error("Choose a valid remix revenue share before publishing this song.");
      }
    }
    if (license.presetId !== "commercial-remix" && license.commercialRevSharePct != null) {
      throw new Error("Revenue share is only available for commercial remix licenses.");
    }

    let bundleId = pendingSongBundleId;
    let bundleForPublish: ApiSongArtifactBundle | null = null;
    if (!bundleId) {
      logger.info("[song-submit] uploading song artifacts");
      const primaryAudio = await uploadSongArtifact("primary_audio", songState.primaryAudioUpload);
      if (!primaryAudio) throw new Error("Primary audio is required");
      const [coverArt, canvasVideo, instrumentalAudio, vocalAudio] = await Promise.all([
        uploadSongArtifact("cover_art", songState.coverUpload),
        uploadSongArtifact("canvas_video", songState.canvasVideoUpload),
        uploadSongArtifact("instrumental_audio", songState.instrumentalAudioUpload),
        uploadSongArtifact("vocal_audio", songState.vocalAudioUpload),
      ]);
      logger.info("[song-submit] creating song artifact bundle", {
        hasCanvasVideo: Boolean(canvasVideo),
        hasCoverArt: Boolean(coverArt),
        hasInstrumentalAudio: Boolean(instrumentalAudio),
        hasPreviewWindow: isLockedSong,
        hasVocalAudio: Boolean(vocalAudio),
      });
      const bundleRequest = {
        primary_audio: { song_artifact_upload: primaryAudio.id },
        title: songTitle.trim(),
        lyrics: lyrics.trim(),
        genius_annotations_url: songState.geniusAnnotationsUrl?.trim() || null,
        cover_art: coverArt ? { song_artifact_upload: coverArt.id } : null,
        preview_window: isLockedSong ? { start_ms: previewStartMs ?? 0, duration_ms: SONG_PREVIEW_DURATION_MS } : null,
        canvas_video: canvasVideo ? { song_artifact_upload: canvasVideo.id } : null,
        instrumental_audio: instrumentalAudio ? { song_artifact_upload: instrumentalAudio.id } : null,
        vocal_audio: vocalAudio ? { song_artifact_upload: vocalAudio.id } : null,
      };
      const bundle = await withSongSubmitStep("create song artifact bundle", {
        hasCanvasVideo: Boolean(canvasVideo),
        hasCoverArt: Boolean(coverArt),
        hasInstrumentalAudio: Boolean(instrumentalAudio),
        hasPreviewWindow: isLockedSong,
        hasVocalAudio: Boolean(vocalAudio),
        primaryAudioUploadId: primaryAudio.id,
        songTitle: songTitle.trim(),
      }, () => api.communities.createSongArtifactBundle(communityId, bundleRequest));
      bundleId = bundle.id;
      bundleForPublish = bundle;
      logger.info("[song-submit] song artifact bundle created", {
        analysisState: resolveBundleAnalysisState(bundle),
        bundleId: bundle.id,
        previewStatus: bundle.preview_status,
      });

      if (resolveBundleAnalysisState(bundle) === "allow_with_required_reference") {
        logger.info("[song-submit] source reference required; blocking original upload", {
          bundleId: bundle.id,
          rawMatchCount: countUniqueRawAcrMatches(bundle),
        });
        setSubmitError("Your uploaded song is too similar to an existing song.");
        return null;
      }
    }

    if (!bundleId) {
      throw new Error("Song artifact bundle was not created.");
    }

    if (isLockedSong) {
      const previewBundleId = bundleId;
      logger.info("[song-submit] waiting for locked song preview", { bundleId });
      bundleForPublish = await waitForSongPreview(
        bundleForPublish ?? await withSongSubmitStep("load song artifact bundle before preview wait", {
          bundleId: previewBundleId,
        }, () => api.communities.getSongArtifactBundle(communityId, previewBundleId)),
      );
      bundleId = bundleForPublish.id;
    }

    const songRequest = buildSongPostRequest({
      bundleId,
      caption,
      derivativeStep,
      idempotencyKey: crypto.randomUUID(),
      license,
      paidSongPriceUsd,
      songMode,
      title,
      visibility: audience.visibility,
    });
    logger.info("[song-submit] creating song post", {
      bundleId,
      hasDerivativeRefs: Boolean(songRequest.upstream_asset_refs?.length),
      isLockedSong,
      mode: songMode,
    });
    const signedSongRequest = authorMode === "agent"
      ? await withSongSubmitStep("sign agent-authored song post", {
        bundleId,
      }, () => signAgentAuthoredBody(`/communities/${communityId}/posts`, songRequest))
      : songRequest;
    const result = await withSongSubmitStep("create song post", {
      bundleId,
      isLockedSong,
      mode: songMode,
    }, () => api.communities.createPost(communityId, signedSongRequest, { altchaPayload }));
    logger.info("[song-submit] song post created", {
      assetId: result.asset,
      postId: result.id,
    });

    if (isLockedSong) {
      if (!result.asset) throw new Error("The song published, but the paid asset was not created.");
      const listingRequest = buildAssetListingRequest({
        assetId: result.asset,
        paidSongPriceUsd,
        pricingPolicyRegionalPricingEnabled,
        regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
        charityContributionPct: charityContribution.percentagePct,
        charityPartnerId: charityPartner?.partnerId ?? null,
        vinylReleaseUrl: monetizationState.vinylReleaseUrl,
      });
      if (!listingRequest) throw new Error("The song published, but the paid listing payload was not created.");
      logger.info("[song-submit] creating paid song listing", {
        assetId: result.asset,
        regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
      });
      await withSongSubmitStep("create paid song listing", {
        assetId: result.asset,
      }, () => api.communities.createListing(communityId, listingRequest));
      logger.info("[song-submit] paid song listing created", { assetId: result.asset });
    }

    logger.info("[song-submit] completed", { postId: result.id });
    return result;
  }, [api.communities, communityId, signAgentAuthoredBody, uploadSongArtifact, waitForSongPreview]);
}
