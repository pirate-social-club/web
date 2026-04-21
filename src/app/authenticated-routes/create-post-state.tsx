"use client";

import * as React from "react";
import type { Community as ApiCommunity, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";
import type { SongArtifactBundle as ApiSongArtifactBundle } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { findStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useSession } from "@/lib/api/session-store";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import type { ApiError } from "@/lib/api/client";
import type {
  CommunityCharityPartner,
  ComposerAudienceState,
  ComposerReference,
} from "@/components/compositions/post-composer/post-composer.types";

import { useCreatePostDraftState } from "./create-post-draft-state";
import { formatQualifierLabel } from "./post-presentation";
import { parseUsdInput } from "./route-core";
import { buildSongListingRequest, buildSongPostRequest, resolveComposerSubmitState } from "./song-submit";

export function isPublicAudienceAllowed(community: ApiCommunity | null): boolean {
  if (!community) {
    return true;
  }

  const hasActiveViewerGates = community.gate_rules?.some((rule) =>
    rule.status === "active" && rule.scope === "viewer"
  ) ?? false;

  return !hasActiveViewerGates;
}

type AvailableSigningAgent = {
  agentId: string;
  displayName: string;
  privateKeyPem: string;
};

async function resolveAvailableSigningAgent(agents: ApiUserAgent[]): Promise<AvailableSigningAgent | null> {
  for (const agent of agents) {
    if (agent.status !== "active" || !agent.current_ownership) {
      continue;
    }

    let storedKey = null;
    try {
      storedKey = await findStoredOwnedAgentKey(agent.agent_id);
    } catch (error) {
      logger.warn("[create-post-route] could not read local agent key", { agentId: agent.agent_id, error });
      continue;
    }
    if (!storedKey) {
      continue;
    }

    return {
      agentId: agent.agent_id,
      displayName: agent.display_name,
      privateKeyPem: storedKey.privateKeyPem,
    };
  }

  return null;
}

export function useCreatePostState(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [pricingPolicy, setPricingPolicy] = React.useState<ApiCommunityPricingPolicy | null>(null);
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const { actions: draftActions, state: draft } = useCreatePostDraftState();
  const {
    audience,
    authorMode,
    body,
    caption,
    charityContribution,
    composerMode,
    derivativeStep,
    identityMode,
    linkUrl,
    lyrics,
    monetizationState,
    pendingSongBundleId,
    selectedQualifierIds,
    songMode,
    songState,
    submitError,
    title,
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
    setIdentityMode,
    setLinkUrl,
    setLyrics,
    setMonetizationState,
    setPendingSongBundleId,
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setSubmitError,
    setTitle,
  } = draftActions;
  const [availableAgent, setAvailableAgent] = React.useState<AvailableSigningAgent | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const clearPendingSongBundle = React.useCallback(() => {
    setPendingSongBundleId(null);
    setDerivativeStep((current) => current?.trigger === "analysis" ? undefined : current);
  }, []);

  const songBundleInputFingerprint = React.useMemo(() => JSON.stringify({
    lyrics,
    primary: songState.primaryAudioUpload ? { name: songState.primaryAudioUpload.name, size: songState.primaryAudioUpload.size, lastModified: songState.primaryAudioUpload.lastModified } : null,
    cover: songState.coverUpload ? { name: songState.coverUpload.name, size: songState.coverUpload.size, lastModified: songState.coverUpload.lastModified } : null,
    preview: songState.previewAudioUpload ? { name: songState.previewAudioUpload.name, size: songState.previewAudioUpload.size, lastModified: songState.previewAudioUpload.lastModified } : null,
    canvas: songState.canvasVideoUpload ? { name: songState.canvasVideoUpload.name, size: songState.canvasVideoUpload.size, lastModified: songState.canvasVideoUpload.lastModified } : null,
    instrumental: songState.instrumentalAudioUpload ? { name: songState.instrumentalAudioUpload.name, size: songState.instrumentalAudioUpload.size, lastModified: songState.instrumentalAudioUpload.lastModified } : null,
    vocal: songState.vocalAudioUpload ? { name: songState.vocalAudioUpload.name, size: songState.vocalAudioUpload.size, lastModified: songState.vocalAudioUpload.lastModified } : null,
  }), [lyrics, songState.canvasVideoUpload, songState.coverUpload, songState.instrumentalAudioUpload, songState.previewAudioUpload, songState.primaryAudioUpload, songState.vocalAudioUpload]);
  const previousSongBundleInputFingerprint = React.useRef(songBundleInputFingerprint);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);

    void Promise.all([
      api.communities.get(communityId),
      api.communities.getJoinEligibility(communityId),
      api.communities.getPricingPolicy(communityId).catch(() => null),
      session?.accessToken ? api.agents.list().catch(() => null) : Promise.resolve(null),
    ])
      .then(async ([communityResult, eligibilityResult, pricingPolicyResult, ownedAgentsResult]) => {
        if (cancelled) return;
        setCommunity(communityResult);
        setEligibility(eligibilityResult);
        setPricingPolicy(pricingPolicyResult);
        setAvailableAgent(ownedAgentsResult ? await resolveAvailableSigningAgent(ownedAgentsResult.items) : null);
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
    if (previousSongBundleInputFingerprint.current !== songBundleInputFingerprint) {
      previousSongBundleInputFingerprint.current = songBundleInputFingerprint;
      clearPendingSongBundle();
      setSubmitError(null);
    }
  }, [clearPendingSongBundle, songBundleInputFingerprint]);

  React.useEffect(() => {
    if (!community) return;
    rememberKnownCommunity({ avatarSrc: community.avatar_ref ?? undefined, communityId: community.community_id, displayName: community.display_name });
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

  const availableIdentityQualifiers = React.useMemo(
    () => (community?.allowed_disclosed_qualifiers ?? []).map((qualifierId) => ({ qualifierId, label: formatQualifierLabel(qualifierId) })),
    [community?.allowed_disclosed_qualifiers],
  );
  const charityPartner = React.useMemo<CommunityCharityPartner | null>(() => {
    if (!community?.donation_partner || community.donation_policy_mode === "none") {
      return null;
    }

    return {
      partnerId: community.donation_partner_id ?? community.donation_partner.donation_partner_id,
      displayName: community.donation_partner.display_name,
      imageUrl: community.donation_partner.image_url ?? null,
    };
  }, [community]);

  React.useEffect(() => {
    if (!community?.allow_anonymous_identity) setIdentityMode("public");
  }, [community?.allow_anonymous_identity]);

  React.useEffect(() => {
    if (composerMode === "song") setIdentityMode("public");
  }, [composerMode]);

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

  const canSubmitText = title.trim().length > 0 && body.trim().length > 0;
  const canSubmitSong = Boolean(songState.primaryAudioUpload && lyrics.trim());
  const canSubmitLink = linkUrl.trim().length > 0;
  const canSubmit = composerMode === "song" ? canSubmitSong : composerMode === "link" ? canSubmitLink : canSubmitText;
  const paidSongPriceUsd = composerMode === "song" && monetizationState.visible ? parseUsdInput(monetizationState.priceUsd ?? monetizationState.priceLabel) : null;
  const paidSongPriceInvalid = composerMode === "song" && monetizationState.visible && paidSongPriceUsd == null;
  const submitState = resolveComposerSubmitState({ canSubmit, composerMode, derivativeStep, monetizationState, paidSongPriceInvalid, submitError });

  const buildMatchedSourceReferences = React.useCallback((bundle: ApiSongArtifactBundle): ComposerReference[] => {
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
      return [{ id, title: titleText, subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined }];
    });
  }, []);

  const resolveBundleAnalysisState = React.useCallback((bundle: ApiSongArtifactBundle): string | null => {
    const moderationResult = bundle.moderation_result && typeof bundle.moderation_result === "object"
      ? bundle.moderation_result as { analysis_state?: string }
      : null;
    return moderationResult?.analysis_state ?? null;
  }, []);

  const uploadSongArtifact = React.useCallback(async (
    artifactKind: "primary_audio" | "cover_art" | "preview_audio" | "canvas_video" | "instrumental_audio" | "vocal_audio",
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

  const handleSubmit = React.useCallback(async () => {
    if (submitState.disabled || !community || eligibility?.status !== "already_joined") return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      let result: ApiCreatedPost;
      const resolvedIdentityMode = authorMode === "agent" || composerMode === "song" || !community.allow_anonymous_identity ? "public" : identityMode;
      const anonymousScope = resolvedIdentityMode === "anonymous" ? (community.anonymous_identity_scope ?? "community_stable") : undefined;
      const disclosedQualifierIds = resolvedIdentityMode === "anonymous" && selectedQualifierIds.length > 0 ? selectedQualifierIds : undefined;
      const isLockedSong = composerMode === "song" && paidSongPriceUsd != null;

      if (composerMode === "song") {
        if (monetizationState.visible && paidSongPriceUsd == null) throw new Error("Enter a valid unlock price before publishing this song.");
        if (isLockedSong && !monetizationState.rightsAttested) throw new Error("Confirm you have the rights to sell this song before publishing it.");
        const selectedSourceRefs = derivativeStep?.references?.map((reference) => reference.id) ?? [];
        if (derivativeStep?.required && selectedSourceRefs.length === 0) throw new Error("Attach a source track before publishing this remix");

        let bundleId = pendingSongBundleId;
        if (!bundleId) {
          const primaryAudio = await uploadSongArtifact("primary_audio", songState.primaryAudioUpload);
          if (!primaryAudio) throw new Error("Primary audio is required");
          const coverArt = await uploadSongArtifact("cover_art", songState.coverUpload);
          const previewAudio = await uploadSongArtifact("preview_audio", songState.previewAudioUpload);
          const canvasVideo = await uploadSongArtifact("canvas_video", songState.canvasVideoUpload);
          const instrumentalAudio = await uploadSongArtifact("instrumental_audio", songState.instrumentalAudioUpload);
          const vocalAudio = await uploadSongArtifact("vocal_audio", songState.vocalAudioUpload);
          const bundle = await api.communities.createSongArtifactBundle(communityId, {
            primary_audio: { song_artifact_upload_id: primaryAudio.song_artifact_upload_id },
            lyrics: lyrics.trim(),
            cover_art: coverArt ? { song_artifact_upload_id: coverArt.song_artifact_upload_id } : null,
            preview_audio: previewAudio ? { song_artifact_upload_id: previewAudio.song_artifact_upload_id } : null,
            canvas_video: canvasVideo ? { song_artifact_upload_id: canvasVideo.song_artifact_upload_id } : null,
            instrumental_audio: instrumentalAudio ? { song_artifact_upload_id: instrumentalAudio.song_artifact_upload_id } : null,
            vocal_audio: vocalAudio ? { song_artifact_upload_id: vocalAudio.song_artifact_upload_id } : null,
          });
          bundleId = bundle.song_artifact_bundle_id;

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
            return;
          }
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
        result = await api.communities.createPost(
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
            pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
            regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
            charityContributionPct: charityContribution.percentagePct,
            charityPartnerId: charityPartner?.partnerId ?? null,
          });
          if (!listingRequest) throw new Error("The song published, but the paid listing payload was not created.");
          await api.communities.createListing(communityId, listingRequest);
        }
      } else if (composerMode === "link") {
        const linkRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "link" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          link_url: linkUrl.trim(),
          caption: caption.trim() || undefined,
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
          body: body.trim(),
          visibility: audience.visibility,
        };
        result = await api.communities.createPost(
          communityId,
          authorMode === "agent"
            ? await signAgentAuthoredBody(`/communities/${communityId}/posts`, textRequest)
            : textRequest,
        );
      }

      navigate(`/p/${result.post_id}`);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setSubmitError(apiError?.message ?? "Could not create post");
    } finally {
      setSubmitting(false);
    }
  }, [
    api, audience.visibility, authorMode, body, buildMatchedSourceReferences, caption, community, communityId, composerMode, derivativeStep, eligibility?.status,
    identityMode, linkUrl, lyrics, monetizationState, paidSongPriceUsd, pendingSongBundleId, pricingPolicy?.regional_pricing_enabled,
    charityContribution.percentagePct, charityPartner?.partnerId,
    resolveBundleAnalysisState, selectedQualifierIds, signAgentAuthoredBody, songMode, songState, submitState.disabled, title, uploadSongArtifact,
  ]);

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
    authorMode,
    identityMode,
    availableAgent,
    audience,
    linkUrl,
    loadError,
    loading,
    lyrics,
    monetizationState,
    selectedQualifierIds,
    session,
    songMode,
    songState,
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
    setIdentityMode,
    setLinkUrl,
    setLyrics,
    setMonetizationState,
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setTitle,
    handleSubmit,
  };
}
