"use client";

import * as React from "react";
import type {
  CreateSongArtifactUploadRequest,
  Post as ApiCreatedPost,
  SongArtifactBundle as ApiSongArtifactBundle,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import type {
  AuthorMode,
  AuthorAgeGatePolicy,
  CharityContributionState,
  CommunityCharityPartner,
  ComposerAudienceState,
  DerivativeStepState,
  MonetizationState,
  AssetLicenseState,
  AssetRoyaltySplitState,
  SongComposerState,
  SongMode,
} from "@/components/compositions/posts/post-composer/post-composer.types";

import { buildAssetListingRequest, resolvedDerivativeReferences } from "@/app/authenticated-helpers/asset-submit";
import type { SubmitProgressReporter } from "@/app/authenticated-helpers/create-post-submit/progress";
import { sha256File } from "@/app/authenticated-helpers/create-post-submit/file-hash";
import { buildSongPostRequest } from "@/app/authenticated-helpers/song-submit";
import { uploadMultipartSongArtifact } from "@/app/authenticated-helpers/create-post-submit/multipart-song-artifact-upload";

// Song artifacts that upload in parallel after the primary audio (byte-progress
// for these is aggregated into a single "upload_artifacts" report).
type ExtraSongArtifactKind = "cover_art" | "canvas_video" | "instrumental_audio" | "vocal_audio";

const SONG_PREVIEW_DURATION_MS = 30_000;
const SONG_SUBMIT_SLOW_STEP_MS = 10_000;
const SONG_SUBMIT_STALLED_STEP_MS = 45_000;
const SONG_ARTIFACT_API_TIMEOUT_MS = 30_000;
const SONG_ARTIFACT_PROXY_UPLOAD_TIMEOUT_MS = 45_000;
const SONG_ARTIFACT_PART_UPLOAD_TIMEOUT_MS = 60_000;
const SONG_ARTIFACT_MULTIPART_COMPLETE_TIMEOUT_MS = 120_000;
const SONG_ARTIFACT_MULTIPART_CONCURRENCY = 3;

function isAsyncSongPublishEnabled(): boolean {
  return import.meta.env.VITE_ASYNC_SONG_PUBLISH_ENABLED !== "false";
}

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
  ageGatePolicy: AuthorAgeGatePolicy;
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
  reportProgress?: SubmitProgressReporter;
  royaltySplit?: AssetRoyaltySplitState;
  setPendingSongBundleId: (bundleId: string | null) => void;
  setSubmitError: (error: string | null) => void;
  songMode: SongMode;
  songState: SongComposerState;
  songTitle: string;
  title: string;
};

type SongArtifactSubmitKind = "primary_audio" | "cover_art" | "canvas_video" | "instrumental_audio" | "vocal_audio";

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

function usesDirectMultipart(kind: SongArtifactSubmitKind): boolean {
  return kind !== "cover_art";
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

  const uploadSongArtifact = React.useCallback(async (
    artifactKind: SongArtifactSubmitKind,
    file: File | null | undefined,
    onProgress?: (fraction: number) => void,
  ) => {
    if (!file) return null;
    logger.info("[song-submit] creating artifact upload", {
      artifactKind,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const request: CreateSongArtifactUploadRequest = {
      artifact_kind: artifactKind,
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
      ...(usesDirectMultipart(artifactKind) ? { upload_mode: "direct_multipart" as const } : {}),
    };
    const contentHashPromise = usesDirectMultipart(artifactKind) ? sha256File(file) : null;
    const intent = await withSongSubmitStep("create artifact upload intent", {
      artifactKind,
      filename: file.name,
      sizeBytes: file.size,
      uploadMode: request.upload_mode ?? "proxy",
    }, () => api.communities.createArtifactUpload(communityId, request, { timeoutMs: SONG_ARTIFACT_API_TIMEOUT_MS }));
    logger.info("[song-submit] artifact upload intent created", {
      artifactKind,
      intentId: intent.id,
    });
    if (contentHashPromise) {
      const uploaded = await withSongSubmitStep("upload artifact multipart content", {
        artifactKind,
        filename: file.name,
        intentId: intent.id,
        sizeBytes: file.size,
      }, () => uploadMultipartSongArtifact({
        abortSession: (artifactUploadId, sessionId) => api.communities.abortArtifactUploadSession(
          communityId,
          artifactUploadId,
          sessionId,
          { timeoutMs: SONG_ARTIFACT_API_TIMEOUT_MS },
        ),
        artifactLabel: artifactKind,
        completeSession: (artifactUploadId, sessionId, body) => api.communities.completeArtifactUploadSession(
          communityId,
          artifactUploadId,
          sessionId,
          body,
          { timeoutMs: SONG_ARTIFACT_MULTIPART_COMPLETE_TIMEOUT_MS },
        ),
        concurrency: SONG_ARTIFACT_MULTIPART_CONCURRENCY,
        contentHashPromise,
        file,
        getPartSignedUrl: (artifactUploadId, sessionId, partNumber) => api.communities.getArtifactUploadPartSignedUrl(
          communityId,
          artifactUploadId,
          sessionId,
          partNumber,
          { timeoutMs: SONG_ARTIFACT_API_TIMEOUT_MS },
        ),
        intent,
        onAbortError: (abortError) => {
          logger.warn("[song-submit] multipart artifact abort failed", {
            abortError,
            artifactKind,
            intentId: intent.id,
          });
        },
        onProgress,
        partUploadTimeoutMs: SONG_ARTIFACT_PART_UPLOAD_TIMEOUT_MS,
      }));
      logger.info("[song-submit] artifact multipart content uploaded", {
        artifactKind,
        uploadId: uploaded.id,
        storageRef: uploaded.storage_ref,
      });
      return uploaded;
    }
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
    }, () => api.communities.uploadArtifactContent(communityId, intent.id, fileContent, {
      onProgress,
      timeoutMs: SONG_ARTIFACT_PROXY_UPLOAD_TIMEOUT_MS,
    }));
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
    ageGatePolicy,
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
    reportProgress,
    royaltySplit,
    setPendingSongBundleId,
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
    reportProgress?.("validating");
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

    const publishMode = isAsyncSongPublishEnabled() ? "async" : "sync";
    let bundleId = pendingSongBundleId;
    if (bundleId) {
      const pendingBundleIdForRetry = bundleId;
      const existingBundle = await withSongSubmitStep("load pending song artifact bundle", {
        bundleId: pendingBundleIdForRetry,
      }, () => api.communities.getSongArtifactBundle(communityId, pendingBundleIdForRetry));
      if (existingBundle.status === "failed") {
        logger.warn("[song-submit] discarding failed pending bundle", {
          bundleId: pendingBundleIdForRetry,
          status: existingBundle.status,
        });
        setPendingSongBundleId(null);
        bundleId = null;
      }
    }

    if (!bundleId) {
      logger.info("[song-submit] uploading song artifacts");
      // Seed at "0%" (start of band) before uploading so the first real byte report
      // can't snap the bar backward — see the same pattern in video.ts.
      reportProgress?.("upload_primary_audio", "0%");
      const primaryAudio = await uploadSongArtifact(
        "primary_audio",
        songState.primaryAudioUpload,
        (fraction) => reportProgress?.("upload_primary_audio", `${Math.round(fraction * 100)}%`),
      );
      if (!primaryAudio) throw new Error("Primary audio is required");

      // The extra artifacts upload in parallel, so report a single aggregate byte-%
      // across them (weighted by size) rather than four fighting reporters.
      const extraArtifactFiles: Record<ExtraSongArtifactKind, File | null | undefined> = {
        cover_art: songState.coverUpload,
        canvas_video: songState.canvasVideoUpload,
        instrumental_audio: songState.instrumentalAudioUpload,
        vocal_audio: songState.vocalAudioUpload,
      };
      const extraArtifactTotalBytes = Object.values(extraArtifactFiles)
        .reduce((sum, artifactFile) => sum + (artifactFile?.size ?? 0), 0);
      const uploadedExtraBytes: Record<ExtraSongArtifactKind, number> = {
        cover_art: 0,
        canvas_video: 0,
        instrumental_audio: 0,
        vocal_audio: 0,
      };
      const reportExtraArtifactProgress = (kind: ExtraSongArtifactKind, fraction: number) => {
        uploadedExtraBytes[kind] = fraction * (extraArtifactFiles[kind]?.size ?? 0);
        const uploaded = Object.values(uploadedExtraBytes).reduce((sum, bytes) => sum + bytes, 0);
        reportProgress?.("upload_artifacts", `${Math.round((uploaded / Math.max(extraArtifactTotalBytes, 1)) * 100)}%`);
      };
      if (extraArtifactTotalBytes > 0) {
        reportProgress?.("upload_artifacts", "0%");
      }
      const [coverArt, canvasVideo, instrumentalAudio, vocalAudio] = await Promise.all([
        uploadSongArtifact("cover_art", extraArtifactFiles.cover_art, (f) => reportExtraArtifactProgress("cover_art", f)),
        uploadSongArtifact("canvas_video", extraArtifactFiles.canvas_video, (f) => reportExtraArtifactProgress("canvas_video", f)),
        uploadSongArtifact("instrumental_audio", extraArtifactFiles.instrumental_audio, (f) => reportExtraArtifactProgress("instrumental_audio", f)),
        uploadSongArtifact("vocal_audio", extraArtifactFiles.vocal_audio, (f) => reportExtraArtifactProgress("vocal_audio", f)),
      ]);
      logger.info("[song-submit] creating song artifact bundle", {
        hasCanvasVideo: Boolean(canvasVideo),
        hasCoverArt: Boolean(coverArt),
        hasInstrumentalAudio: Boolean(instrumentalAudio),
        hasPreviewWindow: isLockedSong,
        hasVocalAudio: Boolean(vocalAudio),
      });
      reportProgress?.("create_bundle");
      const bundleRequest = {
        primary_audio: { song_artifact_upload: primaryAudio.id },
        ...(publishMode === "async" ? { analysis_mode: "deferred" as const } : {}),
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
      setPendingSongBundleId(bundle.id);
      logger.info("[song-submit] song artifact bundle created", {
        analysisState: resolveBundleAnalysisState(bundle),
        bundleId: bundle.id,
        previewStatus: bundle.preview_status,
      });

    }

    if (!bundleId) {
      throw new Error("Song artifact bundle was not created.");
    }

    const listingDraftWithPlaceholder = isLockedSong
      ? buildAssetListingRequest({
          assetId: "asset_pending",
          paidSongPriceUsd,
          pricingPolicyRegionalPricingEnabled,
          regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
          charityContributionPct: charityContribution.percentagePct,
          charityPartnerId: charityPartner?.partnerId ?? null,
          vinylReleaseUrl: monetizationState.vinylReleaseUrl,
        })
      : null;
    const listingDraft = (() => {
      if (!listingDraftWithPlaceholder) return null;
      const { asset: _asset, ...draft } = listingDraftWithPlaceholder;
      return draft;
    })();
    const songRequest = buildSongPostRequest({
      bundleId,
      caption,
      derivativeStep,
      ageGatePolicy,
      idempotencyKey: crypto.randomUUID(),
      license,
      paidSongPriceUsd,
      royaltySplit,
      songMode,
      title,
      visibility: audience.visibility,
    });
    const asyncSongRequest = {
      ...songRequest,
      ...(publishMode === "async" ? { publish_mode: "async" as const } : {}),
      ...(listingDraft ? { listing_draft: listingDraft } : {}),
    };
    logger.info("[song-submit] creating song post", {
      bundleId,
      hasDerivativeRefs: Boolean(asyncSongRequest.upstream_asset_refs?.length),
      isLockedSong,
      mode: songMode,
      publishMode,
    });
    reportProgress?.("publish_post");
    const signedSongRequest = authorMode === "agent"
      ? await withSongSubmitStep("sign agent-authored song post", {
        bundleId,
      }, () => signAgentAuthoredBody(`/communities/${communityId}/posts`, asyncSongRequest))
      : asyncSongRequest;
    const result = await withSongSubmitStep("create song post", {
      bundleId,
      isLockedSong,
      mode: songMode,
    }, () => api.communities.createPost(communityId, signedSongRequest, { altchaPayload }));
    logger.info("[song-submit] song post created", {
      assetId: result.asset,
      postId: result.id,
    });

    setPendingSongBundleId(null);
    logger.info("[song-submit] completed", { postId: result.id });
    return result;
  }, [api.communities, communityId, signAgentAuthoredBody, uploadSongArtifact]);
}
