"use client";

import * as React from "react";
import type { Community as ApiCommunity, CommunityPreview as ApiCommunityPreview, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { findStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useSession } from "@/lib/api/session-store";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-utils";
import type {
  CommunityCharityPartner,
  ComposerAudienceState,
  VideoComposerState,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { isValidHttpUrl, normalizeHttpUrl } from "@/components/compositions/posts/post-composer/post-composer-utils";

import { useCreatePostDraftState, type CreatePostDraftState } from "./create-post-draft-state";
import { formatQualifierLabel } from "@/app/authenticated-helpers/post-presentation";
import { parseUsdInput } from "@/lib/formatting/currency";
import { buildAssetListingRequest, resolveComposerSubmitState } from "@/app/authenticated-helpers/asset-submit";
import { useSongSubmit } from "./use-song-submit";
import { buildAnonymousLabel } from "@/lib/anonymous-label";

export function isPublicAudienceAllowed(community: ApiCommunity | ApiCommunityPreview | null): boolean {
  if (!community) {
    return true;
  }

  const gateRules = "gate_rules" in community ? community.gate_rules ?? [] : [];
  return !gateRules.some((rule) => rule.scope === "viewer" && rule.status === "active");
}

type AvailableSigningAgent = {
  agentId: string;
  displayName: string;
  privateKeyPem: string;
};

type ExtractedVideoPosterFrame = {
  file: File;
  frameMs: number;
  height: number;
  width: number;
};

const MAX_VIDEO_POSTER_FRAME_WIDTH = 1920;

function parsePosterFrameSeconds(value: string | undefined): number {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadeddata" | "loadedmetadata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Could not read the selected video frame."));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function extractVideoPosterFrame(file: File, frameSeconds: string | undefined): Promise<ExtractedVideoPosterFrame> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    video.src = objectUrl;
    await waitForVideoEvent(video, "loadedmetadata");
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, "loadeddata");
    }
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const selectedSeconds = Math.min(Math.max(0, duration), parsePosterFrameSeconds(frameSeconds));
    if (selectedSeconds > 0) {
      video.currentTime = selectedSeconds;
      await waitForVideoEvent(video, "seeked");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error("Could not read the selected video frame.");
    }
    const scale = sourceWidth > MAX_VIDEO_POSTER_FRAME_WIDTH ? MAX_VIDEO_POSTER_FRAME_WIDTH / sourceWidth : 1;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the selected video frame.");
    }
    context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      throw new Error("Could not save the selected video frame.");
    }

    const posterFile = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "video"}-cover-frame.jpg`, {
      type: "image/jpeg",
    });
    return {
      file: posterFile,
      frameMs: Math.round(selectedSeconds * 1000),
      height,
      width,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function resolveAvailableSigningAgent(agents: ApiUserAgent[]): Promise<AvailableSigningAgent | null> {
  for (const agent of agents) {
    if (agent.status !== "active" || !agent.current_ownership) {
      continue;
    }

    let storedKey = null;
    try {
      storedKey = await findStoredOwnedAgentKey(agent.id);
    } catch (error) {
      logger.warn("[create-post-route] could not read local agent key", { agentId: agent.id, error });
      continue;
    }
    if (!storedKey) {
      continue;
    }

    return {
      agentId: agent.id,
      displayName: agent.display_name,
      privateKeyPem: storedKey.privateKeyPem,
    };
  }

  return null;
}

export function useCreatePostState(communityId: string, initialDraft?: Partial<CreatePostDraftState>) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const [community, setCommunity] = React.useState<ApiCommunityPreview | null>(null);
  const [communityOwnerUserId, setCommunityOwnerUserId] = React.useState<string | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [pricingPolicy, setPricingPolicy] = React.useState<ApiCommunityPricingPolicy | null>(null);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const { actions: draftActions, state: draft } = useCreatePostDraftState(initialDraft);
  const {
    audience,
    authorMode,
    body,
    caption,
    charityContribution,
    composerMode,
    derivativeStep,
    imageUpload,
    imageUploadLabel,
    identityMode,
    linkUrl,
    linkPreview,
    license,
    lyrics,
    monetizationState,
    pendingSongBundleId,
    selectedQualifierIds,
    songMode,
    songState,
    submitError,
    title,
    videoState,
  } = draft;
  const {
    resetCharityContribution,
    setAudience,
    setAuthorMode,
    setBody,
    setCaption,
    setCharityContribution,
    setComposerMode,
    setDerivativeStep,
    setImageUpload,
    setImageUploadLabel,
    setIdentityMode,
    setLinkUrl,
    setLinkPreview,
    setLicense,
    setLyrics,
    setMonetizationState,
    setPendingSongBundleId,
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setSubmitError,
    setTitle,
    setVideoState,
  } = draftActions;
  const [availableAgent, setAvailableAgent] = React.useState<AvailableSigningAgent | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(communityId);
    setEligibility(nextEligibility);
    return nextEligibility;
  }, [api, communityId]);

  const clearPendingSongBundle = React.useCallback(() => {
    setPendingSongBundleId(null);
    setDerivativeStep((current) => current?.trigger === "analysis" ? undefined : current);
  }, []);

  const songBundleInputFingerprint = React.useMemo(() => JSON.stringify({
    lyrics,
    primary: songState.primaryAudioUpload ? { name: songState.primaryAudioUpload.name, size: songState.primaryAudioUpload.size, lastModified: songState.primaryAudioUpload.lastModified } : null,
    cover: songState.coverUpload ? { name: songState.coverUpload.name, size: songState.coverUpload.size, lastModified: songState.coverUpload.lastModified } : null,
    previewStartSeconds: songState.previewStartSeconds ?? "0",
    canvas: songState.canvasVideoUpload ? { name: songState.canvasVideoUpload.name, size: songState.canvasVideoUpload.size, lastModified: songState.canvasVideoUpload.lastModified } : null,
    instrumental: songState.instrumentalAudioUpload ? { name: songState.instrumentalAudioUpload.name, size: songState.instrumentalAudioUpload.size, lastModified: songState.instrumentalAudioUpload.lastModified } : null,
    vocal: songState.vocalAudioUpload ? { name: songState.vocalAudioUpload.name, size: songState.vocalAudioUpload.size, lastModified: songState.vocalAudioUpload.lastModified } : null,
  }), [lyrics, songState.canvasVideoUpload, songState.coverUpload, songState.instrumentalAudioUpload, songState.previewStartSeconds, songState.primaryAudioUpload, songState.vocalAudioUpload]);
  const previousSongBundleInputFingerprint = React.useRef(songBundleInputFingerprint);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);
    setCommunityOwnerUserId(null);

    const fullCommunityPromise = api.communities.get(communityId).catch((error: unknown) => {
      logger.warn("[create-post-route] could not load owner-only community metadata", {
        communityId,
        error,
      });
      return null;
    });

    void Promise.all([
      api.communities.preview(communityId),
      fullCommunityPromise,
      api.communities.getJoinEligibility(communityId),
    ])
      .then(([communityResult, fullCommunityResult, eligibilityResult]) => {
        if (cancelled) return;
        setCommunity(communityResult);
        setCommunityOwnerUserId(fullCommunityResult?.created_by_user ?? null);
        setEligibility(eligibilityResult);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, communityId, session?.accessToken]);

  React.useEffect(() => {
    let cancelled = false;
    setPricingPolicy(null);

    void api.communities.getPricingPolicy(communityId)
      .then((pricingPolicyResult) => {
        if (!cancelled) setPricingPolicy(pricingPolicyResult);
      })
      .catch(() => {
        if (!cancelled) setPricingPolicy(null);
      });

    return () => { cancelled = true; };
  }, [api, communityId]);

  React.useEffect(() => {
    let cancelled = false;
    setAvailableAgent(null);

    if (!session?.accessToken) {
      return () => { cancelled = true; };
    }

    void api.agents.list()
      .then(async (ownedAgentsResult) => {
        const nextAvailableAgent = await resolveAvailableSigningAgent(ownedAgentsResult.items);
        if (!cancelled) setAvailableAgent(nextAvailableAgent);
      })
      .catch(() => {
        if (!cancelled) setAvailableAgent(null);
      });

    return () => { cancelled = true; };
  }, [api, session?.accessToken]);

  React.useEffect(() => {
    if (previousSongBundleInputFingerprint.current !== songBundleInputFingerprint) {
      previousSongBundleInputFingerprint.current = songBundleInputFingerprint;
      clearPendingSongBundle();
      setSubmitError(null);
    }
  }, [clearPendingSongBundle, songBundleInputFingerprint]);

  React.useEffect(() => {
    if (!community) return;
    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.id,
      displayName: community.display_name,
      routeSlug: community.route_slug ?? null,
    });
  }, [community]);

  React.useEffect(() => {
    resetCharityContribution();
  }, [communityId, resetCharityContribution]);

  React.useEffect(() => {
    const publicOptionEnabled = isPublicAudienceAllowed(community);
    setAudience((current) => {
      const next: ComposerAudienceState = {
        visibility: publicOptionEnabled ? current.visibility : "members_only",
        publicOptionEnabled,
        publicOptionDisabledReason: publicOptionEnabled
          ? undefined
          : copy.audience.publicDisabledReason,
      };

      if (
        next.visibility === current.visibility
        && next.publicOptionEnabled === current.publicOptionEnabled
        && next.publicOptionDisabledReason === current.publicOptionDisabledReason
      ) {
        return current;
      }

      return next;
    });
  }, [community, copy.audience.publicDisabledReason]);

  React.useEffect(() => {
    setMonetizationState((prev) => ({
      ...prev,
      regionalPricingAvailable: pricingPolicy?.regional_pricing_enabled === true,
      regionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true ? prev.regionalPricingEnabled ?? false : false,
    }));
  }, [pricingPolicy?.regional_pricing_enabled]);

  React.useEffect(() => {
    const normalizedLinkUrl = normalizeHttpUrl(linkUrl);
    if (!normalizedLinkUrl) {
      setLinkPreview(undefined);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const result = await api.communities.getLinkPreview(communityId, normalizedLinkUrl);
        if (cancelled) return;
        setLinkPreview({
          domain: new URL(normalizedLinkUrl).hostname.replace(/^www\./, ""),
          title: result.title ?? undefined,
          imageSrc: result.image_url ?? undefined,
          provider: result.provider ?? undefined,
          canonicalUrl: result.canonical_url,
          originalUrl: result.original_url,
          state: result.state ?? undefined,
          embedPreview: result.preview
            ? {
                authorName: result.preview.author_name as string | null | undefined,
                authorUrl: result.preview.author_url as string | null | undefined,
                text: result.preview.text as string | null | undefined,
                hasMedia: result.preview.has_media as boolean | null | undefined,
                mediaUrl: result.preview.media_url as string | null | undefined,
                thumbnailUrl: result.preview.thumbnail_url as string | null | undefined,
                thumbnailWidth: result.preview.thumbnail_width as number | null | undefined,
                thumbnailHeight: result.preview.thumbnail_height as number | null | undefined,
              }
            : undefined,
          oembedHtml: result.oembed_html ?? undefined,
        });
      } catch {
        if (!cancelled) {
          setLinkPreview(undefined);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [api.communities, communityId, linkUrl, setLinkPreview]);

  const availableIdentityQualifiers = React.useMemo(
    () => (community?.allowed_disclosed_qualifiers ?? []).map((qualifierId) => ({ qualifierId, label: formatQualifierLabel(qualifierId) })),
    [community?.allowed_disclosed_qualifiers],
  );
  const charityPartner = React.useMemo<CommunityCharityPartner | null>(() => {
    if (!community?.donation_partner || community.donation_policy_mode === "none") {
      return null;
    }

    return {
      partnerId: community.donation_partner.donation_partner,
      displayName: community.donation_partner.display_name,
      imageUrl: community.donation_partner.image_url ?? null,
    };
  }, [community]);

  const communityStableAnonymousLabel = React.useMemo(() => {
    const anonymousScope = community?.anonymous_identity_scope ?? "community_stable";

    if (
      !community?.allow_anonymous_identity
      || anonymousScope !== "community_stable"
      || !session?.user.id
    ) {
      return null;
    }

    return buildAnonymousLabel({
      communityId: communityId,
      userId: session.user.id,
    });
  }, [
    community?.allow_anonymous_identity,
    community?.anonymous_identity_scope,
    communityId,
    session?.user.id,
  ]);

  React.useEffect(() => {
    if (!community?.allow_anonymous_identity) setIdentityMode("public");
  }, [community?.allow_anonymous_identity]);

  React.useEffect(() => {
    if (composerMode === "song" || (composerMode === "video" && monetizationState.visible)) setIdentityMode("public");
  }, [composerMode, monetizationState.visible]);

  React.useEffect(() => {
    if (!availableAgent && authorMode === "agent") {
      setAuthorMode("human");
    }
  }, [authorMode, availableAgent]);

  React.useEffect(() => {
    if (!availableIdentityQualifiers.length) {
      setSelectedQualifierIds([]);
      return;
    }
    const allowedQualifierIds = new Set(availableIdentityQualifiers.map((qualifier) => qualifier.qualifierId));
    setSelectedQualifierIds((current) => current.filter((qualifierId) => allowedQualifierIds.has(qualifierId)));
  }, [availableIdentityQualifiers]);

  const canSubmitText = title.trim().length > 0;
  const canSubmitSong = Boolean(songState.primaryAudioUpload && lyrics.trim());
  const canSubmitLink = isValidHttpUrl(linkUrl);
  const canSubmitImage = title.trim().length > 0 && Boolean(imageUpload);
  const canSubmitVideo = title.trim().length > 0 && Boolean(videoState.primaryVideoUpload);
  const canSubmit = composerMode === "song"
    ? canSubmitSong
    : composerMode === "link"
      ? canSubmitLink
      : composerMode === "image"
        ? canSubmitImage
        : composerMode === "video"
          ? canSubmitVideo
          : canSubmitText;
  const commercePostMode = composerMode === "song" || composerMode === "video";
  const paidAssetPriceUsd = commercePostMode && monetizationState.visible ? parseUsdInput(monetizationState.priceUsd ?? monetizationState.priceLabel) : null;
  const paidAssetPriceInvalid = commercePostMode && monetizationState.visible && paidAssetPriceUsd == null;
  const submitState = resolveComposerSubmitState({ canSubmit, composerMode, derivativeStep, license, monetizationState, paidSongPriceInvalid: paidAssetPriceInvalid, songMode, submitError });

  const signAgentAuthoredBody = React.useCallback(async <T extends Record<string, unknown>>(path: string, body: T) => {
    if (!availableAgent) {
      throw new Error("No local agent key is available for this post.");
    }

    const proof = await buildAgentActionProof({
      method: "POST",
      url: path,
      body,
      privateKeyPem: availableAgent.privateKeyPem,
    });

    return {
      ...body,
      authorship_mode: "user_agent" as const,
      agent_id: availableAgent.agentId,
      agent_action_proof: proof,
    };
  }, [availableAgent]);
  const submitSongPost = useSongSubmit({ communityId, signAgentAuthoredBody });
  const isCommunityOwner = Boolean(session?.user.id && communityOwnerUserId === session.user.id);
  const uploadVideoArtifact = React.useCallback(async (video: VideoComposerState) => {
    const file = video.primaryVideoUpload;
    if (!file) {
      throw new Error("Choose a video before creating this post.");
    }
    const intent = await api.communities.createArtifactUpload(communityId, {
      artifact_kind: "primary_video",
      mime_type: file.type,
      filename: file.name,
      size_bytes: file.size,
    });
    return await api.communities.uploadArtifactContent(communityId, intent.id, await file.arrayBuffer());
  }, [api.communities, communityId]);

  const handleSubmit = React.useCallback(async () => {
    if (!submitState.canPost || !community || (eligibility?.status !== "already_joined" && !isCommunityOwner)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      let result: ApiCreatedPost;
      const resolvedIdentityMode = authorMode === "agent"
        || composerMode === "song"
        || (composerMode === "video" && monetizationState.visible)
        || !community.allow_anonymous_identity
        ? "public"
        : identityMode;
      const anonymousScope = resolvedIdentityMode === "anonymous" ? (community.anonymous_identity_scope ?? "community_stable") : undefined;
      const disclosedQualifierIds = resolvedIdentityMode === "anonymous" && selectedQualifierIds.length > 0 ? selectedQualifierIds : undefined;

      if (composerMode === "song") {
        const songResult = await submitSongPost({
          audience,
          authorMode,
          charityContribution,
          charityPartner,
          derivativeStep,
          license,
          lyrics,
          monetizationState,
          paidSongPriceUsd: paidAssetPriceUsd,
          pendingSongBundleId,
          pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
          setDerivativeStep,
          setPendingSongBundleId,
          setSongMode,
          setSubmitError,
          songMode,
          songState,
          title,
        });
        if (!songResult) return;
        result = songResult;
      } else if (composerMode === "image") {
        if (!imageUpload) throw new Error("Choose an image before creating this post.");
        const uploadedImage = await api.communities.uploadMedia({
          kind: "post_image",
          file: imageUpload,
        });
        const imageRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "image" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim(),
          caption: caption.trim() || undefined,
          media_refs: [{
            storage_ref: uploadedImage.media_ref,
            mime_type: uploadedImage.mime_type,
            size_bytes: uploadedImage.size_bytes,
          }],
          visibility: audience.visibility,
        };
        result = await api.communities.createPost(
          communityId,
          authorMode === "agent"
            ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, imageRequest)
            : imageRequest,
        );
      } else if (composerMode === "video") {
        const uploadedVideo = await uploadVideoArtifact(videoState);
        const posterFrame = await extractVideoPosterFrame(videoState.primaryVideoUpload!, videoState.posterFrameSeconds);
        const uploadedPoster = await api.communities.uploadMedia({
          kind: "post_image",
          file: posterFrame.file,
        });
        const videoRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "video" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim(),
          caption: caption.trim() || undefined,
          access_mode: monetizationState.visible ? "locked" as const : undefined,
          commercial_rev_share_pct: monetizationState.visible && license?.presetId === "commercial-remix"
            ? license.commercialRevSharePct
            : undefined,
          license_preset: monetizationState.visible ? license?.presetId : undefined,
          media_refs: [{
            storage_ref: uploadedVideo.storage_ref,
            mime_type: uploadedVideo.mime_type,
            size_bytes: uploadedVideo.size_bytes,
            content_hash: uploadedVideo.content_hash,
            poster_ref: uploadedPoster.media_ref,
            poster_mime_type: uploadedPoster.mime_type,
            poster_size_bytes: uploadedPoster.size_bytes,
            poster_width: posterFrame.width,
            poster_height: posterFrame.height,
            poster_frame_ms: posterFrame.frameMs,
          }],
          visibility: audience.visibility,
        };
        result = await api.communities.createPost(
          communityId,
          authorMode === "agent"
            ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, videoRequest)
            : videoRequest,
        );
        if (monetizationState.visible) {
          if (!result.asset) throw new Error("The video published, but the paid asset was not created.");
          const listingRequest = buildAssetListingRequest({
            assetId: result.asset,
            paidSongPriceUsd: paidAssetPriceUsd,
            pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
            regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
            charityContributionPct: charityContribution.percentagePct,
            charityPartnerId: charityPartner?.partnerId ?? null,
          });
          if (!listingRequest) throw new Error("The video published, but the paid listing payload was not created.");
          await api.communities.createListing(communityId, listingRequest);
        }
      } else if (composerMode === "link") {
        const normalizedLinkUrl = normalizeHttpUrl(linkUrl);
        if (!normalizedLinkUrl) {
          throw new Error("Enter a valid http or https link.");
        }
        const linkRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "link" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          link_url: normalizedLinkUrl,
          visibility: audience.visibility,
        };
        result = await api.communities.createPost(
          communityId,
          authorMode === "agent"
            ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, linkRequest)
            : linkRequest,
        );
      } else {
        const textRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "text" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim(),
          body: body.trim() || undefined,
          visibility: audience.visibility,
        };
        result = await api.communities.createPost(
          communityId,
          authorMode === "agent"
            ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, textRequest)
            : textRequest,
        );
      }

      navigate(`/p/${result.id}`);
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error, "Could not create post"));
    } finally {
      setSubmitting(false);
    }
  }, [
    api, audience, authorMode, body, caption, charityContribution, charityPartner, community, communityId, composerMode, derivativeStep, eligibility?.status, isCommunityOwner,
    identityMode, imageUpload, license, linkUrl, lyrics, monetizationState, paidAssetPriceUsd, pendingSongBundleId, pricingPolicy?.regional_pricing_enabled,
    selectedQualifierIds, setDerivativeStep, setPendingSongBundleId, setSongMode, setSubmitError, signAgentAuthoredBody, songMode, songState, submitSongPost, submitState.canPost, title,
    uploadVideoArtifact, videoState,
  ]);

  const setImageUploadWithLabel = React.useCallback((file: File | null) => {
    setImageUpload(file);
    setImageUploadLabel(file?.name);
  }, [setImageUpload, setImageUploadLabel]);

  return {
    availableIdentityQualifiers,
    body,
    caption,
    charityContribution,
    charityPartner,
    community,
    composerMode,
    derivativeStep,
    eligibility,
    isCommunityOwner,
    authorMode,
    identityMode,
    imageUpload,
    imageUploadLabel,
    availableAgent,
    audience,
    communityStableAnonymousLabel,
    linkUrl,
    linkPreview,
    license,
    loadError,
    loading,
    lyrics,
    monetizationState,
    selectedQualifierIds,
    session,
    songMode,
    songState,
    videoState,
    submitState,
    submitting,
    title,
    setBody,
    setAudience,
    setCaption,
    setCharityContribution,
    setComposerMode,
    setDerivativeStep,
    setAuthorMode,
    setImageUpload: setImageUploadWithLabel,
    setIdentityMode,
    setLinkUrl,
    setLinkPreview,
    setLicense,
    setLyrics,
    setMonetizationState,
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setVideoState,
    setTitle,
    handleSubmit,
    refetchEligibility,
  };
}
