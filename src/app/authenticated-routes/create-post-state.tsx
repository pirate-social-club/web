"use client";

import * as React from "react";
import type { Community as ApiCommunity, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
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
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  CommunityCharityPartner,
  ComposerAudienceState,
} from "@/components/compositions/post-composer/post-composer.types";

import { useCreatePostDraftState } from "./create-post-draft-state";
import { formatQualifierLabel } from "./post-presentation";
import { parseUsdInput } from "./route-core";
import { resolveComposerSubmitState } from "./song-submit";
import { useSongSubmit } from "./use-song-submit";

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
    imageUpload,
    imageUploadLabel,
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
    setImageUpload,
    setImageUploadLabel,
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
  const canSubmitImage = title.trim().length > 0 && Boolean(imageUpload);
  const canSubmit = composerMode === "song"
    ? canSubmitSong
    : composerMode === "link"
      ? canSubmitLink
      : composerMode === "image"
        ? canSubmitImage
        : canSubmitText;
  const paidSongPriceUsd = composerMode === "song" && monetizationState.visible ? parseUsdInput(monetizationState.priceUsd ?? monetizationState.priceLabel) : null;
  const paidSongPriceInvalid = composerMode === "song" && monetizationState.visible && paidSongPriceUsd == null;
  const submitState = resolveComposerSubmitState({ canSubmit, composerMode, derivativeStep, monetizationState, paidSongPriceInvalid, submitError });

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

  const handleSubmit = React.useCallback(async () => {
    if (submitState.disabled || !community || eligibility?.status !== "already_joined") return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      let result: ApiCreatedPost;
      const resolvedIdentityMode = authorMode === "agent" || composerMode === "song" || !community.allow_anonymous_identity ? "public" : identityMode;
      const anonymousScope = resolvedIdentityMode === "anonymous" ? (community.anonymous_identity_scope ?? "community_stable") : undefined;
      const disclosedQualifierIds = resolvedIdentityMode === "anonymous" && selectedQualifierIds.length > 0 ? selectedQualifierIds : undefined;

      if (composerMode === "song") {
        const songResult = await submitSongPost({
          audience,
          authorMode,
          charityContribution,
          charityPartner,
          derivativeStep,
          lyrics,
          monetizationState,
          paidSongPriceUsd,
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
      } else if (composerMode === "link") {
        const linkRequest: CreatePostRequest = {
          idempotency_key: crypto.randomUUID(),
          post_type: "link" as const,
          identity_mode: resolvedIdentityMode,
          anonymous_scope: anonymousScope,
          disclosed_qualifier_ids: disclosedQualifierIds,
          translation_policy: "machine_allowed",
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          link_url: linkUrl.trim(),
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
      setSubmitError(getApiErrorMessage(error, "Could not create post"));
    } finally {
      setSubmitting(false);
    }
  }, [
    api, audience, authorMode, body, caption, charityContribution, charityPartner, community, communityId, composerMode, derivativeStep, eligibility?.status,
    identityMode, imageUpload, linkUrl, lyrics, monetizationState, paidSongPriceUsd, pendingSongBundleId, pricingPolicy?.regional_pricing_enabled,
    selectedQualifierIds, setDerivativeStep, setPendingSongBundleId, setSongMode, setSubmitError, signAgentAuthoredBody, songMode, songState, submitSongPost, submitState.disabled, title,
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
    authorMode,
    identityMode,
    imageUpload,
    imageUploadLabel,
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
    setImageUpload: setImageUploadWithLabel,
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
