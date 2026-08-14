"use client";

import * as React from "react";
import type { Asset as ApiAsset, Community as ApiCommunity, CommunityPreview as ApiCommunityPreview, UserAgent as ApiUserAgent } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Post as ApiCreatedPost } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiLocalizedPostResponse } from "@pirate/api-contracts";
import { useQueryClient } from "@tanstack/react-query";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { resolveApiBaseUrl } from "@/lib/api/base-url";
import { buildAgentActionProof } from "@/lib/agents/browser-agent-action-proof";
import { findStoredOwnedAgentKey } from "@/lib/agents/agent-key-store";
import { useSession } from "@/lib/api/session-store";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "@/components/primitives/sonner";
import type {
  CommunityCharityPartner,
  ComposerAudienceState,
  LiveComposerState,
  RegionalPricingPreview,
  SubmitProgress,
} from "@/components/compositions/posts/post-composer/post-composer.types";
import { derivativeSourceToComposerReference, derivativeSourceToLiveComposerReference } from "@/app/authenticated-helpers/post-composer-references";
export { derivativeSourceToComposerReference, derivativeSourceToLiveComposerReference, songArtifactBundleToComposerReference } from "@/app/authenticated-helpers/post-composer-references";
import { canSubmitLiveRoomDraft, isValidHttpUrl, normalizeHttpUrl } from "@/components/compositions/posts/post-composer/post-composer-utils";
import { extractVideoPosterFrameFile } from "@/components/compositions/posts/post-composer/video-poster-frame";
import { useCreatePostDraftState, type CreatePostDraftState } from "./create-post-draft-state";
import { formatQualifierLabel } from "@/app/authenticated-helpers/post-identity-presentation";
import { parseUsdInput } from "@/lib/formatting/currency";
import { getFreedomBrowserDetectionSnapshot, prefersNativeRadicleLinks } from "@/lib/resource-links";
import { resolveComposerSubmitState } from "@/app/authenticated-helpers/asset-submit";
import { buildBasePostRequest, buildCreatePostEventRequest, resolveCreatePostIdentity } from "@/app/authenticated-helpers/create-post-submit/base";
import { buildStoryRegistrationCreationWarning } from "@/app/authenticated-helpers/story-registration-warning";
import { buildStoryLicenseReuseNotice, rememberStoryLicenseReuseNotice } from "@/app/authenticated-helpers/story-license-reuse-notice";
import { submitImagePost } from "@/app/authenticated-helpers/create-post-submit/image";
import { submitLinkPost } from "@/app/authenticated-helpers/create-post-submit/link";
import { submitLiveRoom } from "@/app/authenticated-helpers/create-post-submit/live";
import { submitTextPost } from "@/app/authenticated-helpers/create-post-submit/text";
import { submitVideoPost } from "@/app/authenticated-helpers/create-post-submit/video";
import { submitDownloadableFilePost } from "@/app/authenticated-helpers/create-post-submit/generic";
import {
  createSubmitProgressReporter,
} from "@/app/authenticated-helpers/create-post-submit/progress";
import {
  simpleSubmitProgressSteps,
  songSubmitProgressSteps,
  videoSubmitProgressSteps,
} from "@/app/authenticated-helpers/create-post-submit/progress-steps";
import { useSongSubmit } from "./use-song-submit";
import { buildAnonymousLabel } from "@/lib/anonymous-label";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  getPricingCountryAssignmentDrafts,
  getPricingTierDrafts,
} from "@/app/authenticated-helpers/moderation-helpers";
import { sameUserId } from "@/app/authenticated-helpers/user-id";
import { upsertCommunityFeedPostCache } from "@/app/authenticated-data/community-feed-data";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { canSendCreatePostRequest, requiresPostAltchaProof } from "@/app/authenticated-helpers/create-post-verification";
import { getCreatePostSubmissionOperation, type CreatePostSubmissionOperation } from "@/app/authenticated-helpers/create-post-submission-operation";

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

const MAX_VIDEO_POSTER_FRAME_WIDTH = 1920;
const DERIVATIVE_SOURCE_SEARCH_TIMEOUT_MS = 15_000;

function hasSongExtraArtifact(songState: Pick<CreatePostDraftState["songState"], "canvasVideoUpload" | "coverUpload" | "instrumentalAudioUpload" | "vocalAudioUpload">): boolean {
  return Boolean(
    songState.coverUpload
    || songState.canvasVideoUpload
    || songState.instrumentalAudioUpload
    || songState.vocalAudioUpload
  );
}

function viewerHasCommunityPostingRole(
  viewerUserId: string | null | undefined,
  community: ApiCommunityPreview | null,
  ownerUserId: string | null,
): boolean {
  if (!viewerUserId || !community) return false;
  if (sameUserId(viewerUserId, ownerUserId)) return true;
  if (sameUserId(viewerUserId, community.owner?.user)) return true;
  return community.moderators.some((roleHolder) => {
    if (!sameUserId(viewerUserId, roleHolder.user)) return false;
    return roleHolder.role === "owner" || roleHolder.role === "admin" || roleHolder.role === "moderator";
  });
}

function createdPostToLocalizedFeedItem(input: {
  post: ApiCreatedPost;
  community: ApiCommunityPreview | null;
  contentLocale: string;
  currentUserId?: string | null;
}): ApiLocalizedPostResponse {
  return {
    post: input.post,
    community: input.community,
    thread_snapshot: null,
    upvote_count: 0,
    downvote_count: 0,
    like_count: 0,
    comment_count: 0,
    viewer_vote: null,
    viewer_is_author: sameUserId(input.post.author_user, input.currentUserId),
    viewer_reaction_kinds: [],
    resolved_locale: input.contentLocale,
    translation_state: "same_language",
    machine_translated: false,
    source_hash: input.post.source_language_source_hash ?? input.post.id,
  };
}

export function buildDerivativeSourceSearchOptions(query: string | null | undefined): {
  kind: "song";
  scope: "global";
  q: string | null;
  limit: 25;
} {
  return {
    kind: "song",
    scope: "global",
    q: query?.trim() || null,
    limit: 25,
  };
}

export function shouldSearchDerivativeSongSources(input: {
  composerMode: CreatePostDraftState["composerMode"];
  derivativeStep: CreatePostDraftState["derivativeStep"];
  songMode: CreatePostDraftState["songMode"];
}): boolean {
  if (input.composerMode === "song" && input.songMode === "remix") {
    return true;
  }

  return input.composerMode === "video"
    && input.derivativeStep?.visible === true
    && input.derivativeStep.trigger === "uses_song";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

export function buildLiveDerivativeSourceSearchOptions(): {
  kind: "live";
  scope: "global";
  limit: 25;
} {
  return {
    kind: "live",
    scope: "global",
    limit: 25,
  };
}

export { buildLiveRoomRequest } from "@/app/authenticated-helpers/create-post-submit/live";

export function buildLiveRoomFreedomLaunchHref(input: {
  communityId: string;
  hostname?: string | null;
  liveRoomId: string;
  seat?: "host" | "guest" | null;
  webBaseUrl?: string | null;
}): string {
  const apiBase = resolveApiBaseUrl(input.hostname ?? null);
  const params = [
    `roomId=${encodeURIComponent(input.liveRoomId)}`,
    `communityId=${encodeURIComponent(input.communityId)}`,
    `apiBase=${encodeURIComponent(apiBase)}`,
  ];
  const webBaseUrl = input.webBaseUrl?.trim();
  if (webBaseUrl) {
    params.push(`webBase=${encodeURIComponent(webBaseUrl)}`);
  }
  if (input.seat) {
    params.push(`seat=${encodeURIComponent(input.seat)}`);
  }
  return `freedom://live-room?${params.join("&")}`;
}

export function shouldAutoLaunchLiveRoom(liveState: Pick<LiveComposerState, "scheduleAt" | "scheduleForLater">): boolean {
  return liveState.scheduleForLater !== true;
}

export function openLiveRoomFreedomLaunch(href: string): boolean {
  if (typeof window === "undefined") return false;

  if (typeof document !== "undefined" && document.body) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return true;
  }

  window.open(href, "_blank", "noreferrer");
  return true;
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
  const queryClient = useQueryClient();
  const session = useSession();
  const { locale } = useUiLocale();
  const contentLocale = useRouteContentLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  const [pageState, setPageState] = React.useState({
    community: null as ApiCommunityPreview | null,
    communityOwnerUserId: null as string | null,
    eligibility: null as ApiJoinEligibility | null,
    pricingPolicy: null as ApiCommunityPricingPolicy | null,
    loadError: null as unknown,
    availableAgent: null as AvailableSigningAgent | null,
    submitting: false,
    postAltchaPayload: null as string | null,
    postAltchaResetKey: 0,
    submitFailure: null as string | null,
    submitProgress: null as SubmitProgress | null,
    loading: true,
  });
  const submissionOperationRef = React.useRef<CreatePostSubmissionOperation | null>(null);
  const { actions: draftActions, state: draft } = useCreatePostDraftState(initialDraft);
  const {
    audience,
    ageGatePolicy,
    authorMode,
    body,
    caption,
    charityContribution,
    composerMode,
    derivativeStep,
    event,
    fileState,
    imageUpload,
    imageUploadLabel,
    identityMode,
    linkUrl,
    linkPreview,
    liveState,
    license,
    lyrics,
    monetizationState,
    pendingSongBundleId,
    royaltySplit,
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
    setAgeGatePolicy,
    setAuthorMode,
    setBody,
    setCaption,
    setCharityContribution,
    setComposerMode,
    setDerivativeStep,
    setEvent,
    setFileState,
    setImageUpload,
    setImageUploadLabel,
    setIdentityMode,
    setLinkUrl,
    setLinkPreview,
    setLiveState,
    setLicense,
    setLyrics,
    setMonetizationState,
    setPendingSongBundleId,
    setRoyaltySplit,
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setSubmitError,
    setTitle,
    setVideoState,
  } = draftActions;
  const { community, communityOwnerUserId, eligibility, pricingPolicy, loadError, availableAgent, submitting, postAltchaPayload, postAltchaResetKey, submitFailure, submitProgress, loading } = pageState;
  React.useEffect(() => {
    const currentUserWalletAddress = session?.profile?.primary_wallet_address ?? undefined;
    setRoyaltySplit((current) => {
      if (current.allocations.length !== 1) return current;
      const [creator] = current.allocations;
      if (creator.recipientKind !== "creator") return current;
      if ((creator.walletAddress ?? "") === (currentUserWalletAddress ?? "")) return current;
      return { allocations: [{ ...creator, walletAddress: currentUserWalletAddress }] };
    });
  }, [session?.profile?.primary_wallet_address, setRoyaltySplit]);

  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(communityId);
    setPageState((current) => ({ ...current, eligibility: nextEligibility }));
    return nextEligibility;
  }, [api, communityId]);

  const clearPendingSongBundle = React.useCallback(() => {
    setPendingSongBundleId(null);
  }, [setPendingSongBundleId]);

  const songBundleInputFingerprint = React.useMemo(() => JSON.stringify({
    title: songState.title?.trim() ?? "",
    lyrics,
    primary: songState.primaryAudioUpload ? { name: songState.primaryAudioUpload.name, size: songState.primaryAudioUpload.size, lastModified: songState.primaryAudioUpload.lastModified } : null,
    cover: songState.coverUpload ? { name: songState.coverUpload.name, size: songState.coverUpload.size, lastModified: songState.coverUpload.lastModified } : null,
    previewStartSeconds: songState.previewStartSeconds ?? "0",
    canvas: songState.canvasVideoUpload ? { name: songState.canvasVideoUpload.name, size: songState.canvasVideoUpload.size, lastModified: songState.canvasVideoUpload.lastModified } : null,
    instrumental: songState.instrumentalAudioUpload ? { name: songState.instrumentalAudioUpload.name, size: songState.instrumentalAudioUpload.size, lastModified: songState.instrumentalAudioUpload.lastModified } : null,
    vocal: songState.vocalAudioUpload ? { name: songState.vocalAudioUpload.name, size: songState.vocalAudioUpload.size, lastModified: songState.vocalAudioUpload.lastModified } : null,
  }), [lyrics, songState.canvasVideoUpload, songState.coverUpload, songState.instrumentalAudioUpload, songState.previewStartSeconds, songState.primaryAudioUpload, songState.title, songState.vocalAudioUpload]);
  const previousSongBundleInputFingerprint = React.useRef(songBundleInputFingerprint);

  React.useEffect(() => {
    let cancelled = false;
    setPageState((current) => ({ ...current, loading: true, loadError: null }));
    setSubmitError(null);

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
        setPageState((current) => ({
          ...current,
          community: communityResult,
          communityOwnerUserId: fullCommunityResult?.created_by_user ?? null,
          eligibility: eligibilityResult,
        }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPageState((current) => ({ ...current, loadError: error }));
      })
      .finally(() => {
        if (!cancelled) setPageState((current) => ({ ...current, loading: false }));
      });

    return () => { cancelled = true; };
  }, [api, communityId, session?.accessToken, setSubmitError]);

  React.useEffect(() => {
    let cancelled = false;
    setPageState((current) => ({ ...current, pricingPolicy: null }));

    void api.communities.getPricingPolicy(communityId)
      .then((pricingPolicyResult) => {
        if (!cancelled) setPageState((current) => ({ ...current, pricingPolicy: pricingPolicyResult }));
      })
      .catch(() => {
        if (!cancelled) setPageState((current) => ({ ...current, pricingPolicy: null }));
      });

    return () => { cancelled = true; };
  }, [api, communityId]);

  React.useEffect(() => {
    let cancelled = false;
    setPageState((current) => ({ ...current, availableAgent: null }));

    if (!session?.accessToken) {
      return () => { cancelled = true; };
    }

    void api.agents.list()
      .then(async (ownedAgentsResult) => {
        const nextAvailableAgent = await resolveAvailableSigningAgent(ownedAgentsResult.items);
        if (!cancelled) setPageState((current) => ({ ...current, availableAgent: nextAvailableAgent }));
      })
      .catch(() => {
        if (!cancelled) setPageState((current) => ({ ...current, availableAgent: null }));
      });

    return () => { cancelled = true; };
  }, [api, session?.accessToken]);

  React.useEffect(() => {
    if (previousSongBundleInputFingerprint.current !== songBundleInputFingerprint) {
      previousSongBundleInputFingerprint.current = songBundleInputFingerprint;
      clearPendingSongBundle();
      setSubmitError(null);
    }
  }, [clearPendingSongBundle, setSubmitError, songBundleInputFingerprint]);

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
    let cancelled = false;

    if (composerMode !== "live") {
      return () => { cancelled = true; };
    }

    void api.communities.listDerivativeSources(communityId, buildLiveDerivativeSourceSearchOptions())
      .then((result) => {
        if (cancelled) return;
        const trackOptions = result.items.map((source) => derivativeSourceToLiveComposerReference(source));
        setLiveState((current) => ({ ...current, trackOptions }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLiveState((current) => ({ ...current, trackOptions: [] }));
        logger.warn("[create-post] could not load live setlist derivative sources", {
          communityId,
          error,
        });
      });

    return () => { cancelled = true; };
  }, [api, communityId, composerMode, setLiveState]);

  React.useEffect(() => {
    let cancelled = false;

    if (!shouldSearchDerivativeSongSources({ composerMode, derivativeStep, songMode })) {
      return () => { cancelled = true; };
    }

    const query = derivativeStep?.query?.trim() || null;
    const searchOptions = buildDerivativeSourceSearchOptions(query);
    const fallbackTrigger = composerMode === "video" ? "uses_song" : "remix";
    const required = composerMode === "song";
    setDerivativeStep((current) => current
      ? { ...current, searchError: undefined, searchLoading: true }
      : current);
    const timeout = setTimeout(() => {
      void withTimeout(
        api.communities.listDerivativeSources(communityId, searchOptions),
        DERIVATIVE_SOURCE_SEARCH_TIMEOUT_MS,
        "Derivative source search timed out.",
      )
        .then((result) => {
          if (cancelled) return;
          const searchResults = result.items.map((source) => derivativeSourceToComposerReference(source));
          setDerivativeStep((current) => {
            return {
              visible: true,
              required: current?.required ?? required,
              trigger: current?.trigger ?? fallbackTrigger,
              query: current?.query,
              requirementLabel: current?.requirementLabel,
              searchResults,
              searchError: undefined,
              searchLoading: false,
              references: current?.references ?? [],
              licenseSummary: current?.licenseSummary,
              sourceTermsAccepted: current?.sourceTermsAccepted === true,
            };
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setDerivativeStep((current) => current
            ? {
                ...current,
                searchError: composerMode === "video"
                  ? "Couldn’t load songs. Try again."
                  : "Couldn’t load source tracks. Try again.",
                searchLoading: false,
                searchResults: current.searchResults ?? [],
              }
            : current);
          logger.warn("[create-post] could not load derivative song sources", {
            communityId,
            error,
            kind: searchOptions.kind,
            query,
            scope: searchOptions.scope,
          });
        });
    }, query ? 200 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Results update derivativeStep; only search identity fields restart the request.
  }, [api, communityId, composerMode, derivativeStep?.query, derivativeStep?.trigger, derivativeStep?.visible, setDerivativeStep, songMode]);
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
  }, [community, copy.audience.publicDisabledReason, setAudience]);

  React.useEffect(() => {
    setMonetizationState((prev) => ({
      ...prev,
      regionalPricingAvailable: pricingPolicy?.regional_pricing_enabled === true,
      regionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true ? prev.regionalPricingEnabled ?? false : false,
    }));
  }, [pricingPolicy?.regional_pricing_enabled, setMonetizationState]);

  const regionalPricingPreview = React.useMemo<RegionalPricingPreview | null>(() => {
    if (pricingPolicy?.regional_pricing_enabled !== true) return null;
    const assignments = getPricingCountryAssignmentDrafts(pricingPolicy);
    const countriesByTier = new Map<string, string[]>();
    for (const assignment of assignments) {
      const tierKey = assignment.tier_key.trim();
      const countryCode = assignment.country_code.trim().toUpperCase();
      if (!tierKey || !countryCode) continue;
      const countries = countriesByTier.get(tierKey) ?? [];
      countries.push(countryCode);
      countriesByTier.set(tierKey, countries);
    }

    return {
      defaultTierKey: pricingPolicy.default_tier_key,
      tiers: getPricingTierDrafts(pricingPolicy).map((tier) => ({
        adjustmentType: tier.adjustment_type,
        adjustmentValue: tier.adjustment_value,
        countryCodes: countriesByTier.get(tier.tier_key) ?? [],
        displayName: tier.display_name,
        tierKey: tier.tier_key,
      })),
    };
  }, [pricingPolicy]);

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
  }, [community?.allow_anonymous_identity, setIdentityMode]);

  React.useEffect(() => {
    if (!availableAgent && authorMode === "agent") {
      setAuthorMode("human");
    }
  }, [authorMode, availableAgent, setAuthorMode]);

  React.useEffect(() => {
    if (!availableIdentityQualifiers.length) {
      setSelectedQualifierIds([]);
      return;
    }
    const allowedQualifierIds = new Set(availableIdentityQualifiers.map((qualifier) => qualifier.qualifierId));
    setSelectedQualifierIds((current) => current.filter((qualifierId) => allowedQualifierIds.has(qualifierId)));
  }, [availableIdentityQualifiers, setSelectedQualifierIds]);

  const canSubmitText = title.trim().length > 0;
  const canSubmitSong = Boolean(songState.primaryAudioUpload && songState.title?.trim());
  const canSubmitLink = isValidHttpUrl(linkUrl);
  const canSubmitImage = title.trim().length > 0 && Boolean(imageUpload);
  const canSubmitVideo = title.trim().length > 0 && Boolean(videoState.primaryVideoUpload);
  const canSubmitLive = canSubmitLiveRoomDraft(liveState, title);
  const canSubmitFile = title.trim().length > 0 && Boolean(fileState.upload);
  const canSubmit = composerMode === "song"
    ? canSubmitSong
    : composerMode === "link"
      ? canSubmitLink
      : composerMode === "image"
        ? canSubmitImage
        : composerMode === "video"
          ? canSubmitVideo
          : composerMode === "live"
            ? canSubmitLive
            : composerMode === "file"
              ? canSubmitFile
            : canSubmitText;
  const paidLiveRoomMode = composerMode === "live" && liveState.accessMode === "paid";
  const paidCommerceMode = ((composerMode === "song" || composerMode === "video") && monetizationState.visible) || paidLiveRoomMode;
  const paidAssetPriceUsd = paidCommerceMode ? parseUsdInput(monetizationState.priceUsd ?? monetizationState.priceLabel) : null;
  const paidAssetPriceInvalid = paidCommerceMode && paidAssetPriceUsd == null;
  const submitState = resolveComposerSubmitState({ canSubmit, composerMode, derivativeStep, license, monetizationState, paidSongPriceInvalid: paidAssetPriceInvalid, songMode, submitError });
  const warnIfStoryRegistrationIncomplete = React.useCallback(async (
    post: ApiCreatedPost | null,
    postType: "song" | "video",
  ): Promise<ApiAsset | null> => {
    if (!post?.asset) return null;
    try {
      const asset = await api.communities.getAsset(communityId, post.asset);
      const warning = buildStoryRegistrationCreationWarning(asset, postType);
      if (warning) {
        toast.warning(warning.title, { description: warning.description });
      }
      return asset;
    } catch (error) {
      logger.warn("[create-post] could not load created asset Story registration status", {
        assetId: post.asset,
        communityId,
        error,
        postId: post.id,
      });
      return null;
    }
  }, [api.communities, communityId]);

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
  const hasCommunityPostingRole = viewerHasCommunityPostingRole(session?.user.id, community, communityOwnerUserId);
  const postAltchaRequired = requiresPostAltchaProof({ eligibility, gateMatchMode: community?.gate_match_mode, hasCommunityPostingRole, requirements: community?.membership_gate_summaries ?? [] });
  const hasOpenPowPostingAccess = postAltchaRequired && Boolean(postAltchaPayload);
  const handleSubmit = React.useCallback(async () => {
    const postAltchaRequestOptions = postAltchaPayload ? { altchaPayload: postAltchaPayload } : undefined;
    logger.info("[create-post] publish clicked", {
      canPost: submitState.canPost,
      communityId,
      composerMode,
      eligibilityStatus: eligibility?.status,
      hasCommunity: Boolean(community),
      hasCommunityPostingRole,
      monetized: monetizationState.visible,
      title: title.trim(),
    });

    if (!community || !canSendCreatePostRequest({ canPost: submitState.canPost, hasCommunityPostingRole, hasOpenPowPostingAccess, isAlreadyJoined: eligibility?.status === "already_joined" })) {
      logger.warn("[create-post] submit blocked before request", {
        canPost: submitState.canPost,
        communityId,
        composerMode,
        eligibilityStatus: eligibility?.status,
        hasCommunity: Boolean(community),
        hasCommunityPostingRole,
      });
      return;
    }

    setPageState((current) => ({
      ...current,
      submitFailure: null,
      submitProgress: null,
    }));
    setSubmitError(null);

    if (postAltchaRequired && !postAltchaPayload) {
      setSubmitError("Complete the browser anti-bot check first.");
      return;
    }

    const progressSteps = composerMode === "song"
      ? songSubmitProgressSteps({
          hasExtraArtifacts: hasSongExtraArtifact(songState),
          hasPendingBundle: Boolean(pendingSongBundleId),
          isLocked: paidAssetPriceUsd != null,
        })
      : composerMode === "video"
        ? videoSubmitProgressSteps({ monetized: monetizationState.visible })
        : composerMode === "live"
          ? simpleSubmitProgressSteps({
              hasMedia: Boolean(liveState.coverUpload),
              mode: "live",
              monetized: paidLiveRoomMode,
            })
          : composerMode === "image"
            ? simpleSubmitProgressSteps({ hasMedia: Boolean(imageUpload), mode: "image" })
          : composerMode === "link"
              ? simpleSubmitProgressSteps({ mode: "link" })
              : composerMode === "file"
                ? simpleSubmitProgressSteps({ mode: "file", hasMedia: true })
              : simpleSubmitProgressSteps({ mode: "text" });
    const reportProgress = createSubmitProgressReporter(progressSteps, (progress) => {
      setPageState((current) => ({ ...current, submitProgress: progress }));
    });
    reportProgress("validating");

    setPageState((current) => ({
      ...current,
      submitting: true,
      submitFailure: null,
    }));
    logger.info("[create-post] submit started", {
      authorMode,
      communityId,
      composerMode,
      identityMode,
      visibility: audience.visibility,
    });
    try {
      let result: ApiCreatedPost | null = null;
      let publishedPostId: string | null = null;
      let publishedPostType = composerMode;
      let liveRoomFreedomHref: string | null = null;
      const {
        anonymousScope,
        disclosedQualifierIds,
        identityMode: resolvedIdentityMode,
      } = resolveCreatePostIdentity({
        allowAnonymousIdentity: community.allow_anonymous_identity === true,
        anonymousIdentityScope: community.anonymous_identity_scope,
        authorMode,
        composerMode,
        requestedIdentityMode: identityMode,
        selectedQualifierIds,
      });
      const eventRequest = composerMode === "song" || composerMode === "live"
        ? undefined
        : buildCreatePostEventRequest(event);
      const submissionOperation = getCreatePostSubmissionOperation(submissionOperationRef.current, communityId, draft);
      submissionOperationRef.current = submissionOperation;

      if (composerMode === "song") {
        logger.info("[create-post] delegating to song submit", {
          hasPendingSongBundle: Boolean(pendingSongBundleId),
          paidAssetPriceUsd,
          songMode,
        });
        const songResult = await submitSongPost({
          altchaPayload: postAltchaPayload,
          audience,
          ageGatePolicy,
          authorMode,
          caption: body,
          charityContribution,
          charityPartner,
          derivativeStep,
          license,
          lyrics,
          monetizationState,
          anonymousScope,
          disclosedQualifierIds,
          identityMode: resolvedIdentityMode,
          idempotencyKey: submissionOperation.idempotencyKey,
          paidSongPriceUsd: paidAssetPriceUsd,
          pendingSongBundleId,
          pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
          reportProgress,
          royaltySplit,
          setPendingSongBundleId,
          setSubmitError,
          songMode,
          songState,
          songTitle: songState.title ?? "",
          title,
        });
        if (!songResult) {
          logger.info("[create-post] song submit returned without publishing");
          return;
        }
        result = songResult;
      } else if (composerMode === "live") {
        const preSubmitFreedomDetection = getFreedomBrowserDetectionSnapshot();
        logger.info("[create-post] creating live room", {
          accessMode: liveState.accessMode,
          freedomDetection: preSubmitFreedomDetection,
          roomKind: liveState.roomKind,
          scheduleForLater: liveState.scheduleForLater === true,
          setlistItems: liveState.setlistItems.length,
        });
        const liveRoom = await submitLiveRoom({
          communityId,
          createLiveRoom: api.communities.createLiveRoom,
          description: body,
          hostUserId: session?.user.id,
          anonymousScope,
          disclosedQualifierIds,
          identityMode: resolvedIdentityMode,
          idempotencyKey: submissionOperation.idempotencyKey,
          liveState,
          onCoverUploaded: (uploadedCover) => {
            submissionOperation.liveCoverUpload = uploadedCover;
          },
          paidLiveRoomPriceUsd: paidAssetPriceUsd,
          pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
          publishLiveRoom: api.communities.publishLiveRoom,
          regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
          reportProgress,
          resolveProfileByHandle: api.publicProfiles.getByHandle,
          title,
          uploadedCover: submissionOperation.liveCoverUpload,
          uploadMedia: api.communities.uploadMedia,
        });
        logger.info("[create-post] live room created", {
          anchorPostId: liveRoom.anchor_post,
          liveRoomId: liveRoom.id,
        });
        publishedPostId = liveRoom.anchor_post;
        publishedPostType = "live";
        const shouldAutoLaunch = shouldAutoLaunchLiveRoom(liveState);
        const postSubmitFreedomDetection = getFreedomBrowserDetectionSnapshot();
        logger.info("[create-post] live room auto-launch decision", {
          anchorPostId: liveRoom.anchor_post,
          freedomDetection: postSubmitFreedomDetection,
          liveRoomId: liveRoom.id,
          shouldAutoLaunch,
        });
        if (shouldAutoLaunch && !postSubmitFreedomDetection.detected) {
          logger.warn("[create-post] live room did not auto-launch because Freedom Browser was not detected", {
            anchorPostId: liveRoom.anchor_post,
            freedomDetection: postSubmitFreedomDetection,
            liveRoomId: liveRoom.id,
          });
        }
        if (
          shouldAutoLaunch
          && typeof window !== "undefined"
          && prefersNativeRadicleLinks()
        ) {
          liveRoomFreedomHref = buildLiveRoomFreedomLaunchHref({
            communityId,
            hostname: window.location.hostname,
            liveRoomId: liveRoom.id,
            seat: "host",
            webBaseUrl: window.location.origin,
          });
          logger.info("[create-post] live room auto-launch href built", {
            href: liveRoomFreedomHref,
            liveRoomId: liveRoom.id,
          });
        }
      } else if (composerMode === "image") {
        logger.info("[create-post] creating image post", {
          filename: imageUpload?.name,
          sizeBytes: imageUpload?.size,
        });
        result = await submitImagePost({
          altchaOptions: postAltchaRequestOptions,
          authorMode,
          baseRequest: buildBasePostRequest({
            anonymousScope,
            disclosedQualifierIds,
            ageGatePolicy,
            idempotencyKey: submissionOperation.idempotencyKey,
            identityMode: resolvedIdentityMode,
            visibility: audience.visibility,
          }),
          caption,
          communityId,
          createPost: api.communities.createPost,
          event: eventRequest,
          file: imageUpload,
          onImageUploaded: (uploadedImage) => {
            submissionOperation.imageUpload = uploadedImage;
          },
          reportProgress,
          signAgentAuthoredBody,
          title,
          uploadedImage: submissionOperation.imageUpload,
          uploadMedia: api.communities.uploadMedia,
        });
        reportProgress("publish_post");
      } else if (composerMode === "video") {
        logger.info("[create-post] creating video post", {
          filename: videoState.primaryVideoUpload?.name,
          monetized: monetizationState.visible,
          sizeBytes: videoState.primaryVideoUpload?.size,
        });
        result = await submitVideoPost({
          altchaOptions: postAltchaRequestOptions,
          authorMode,
          baseRequest: buildBasePostRequest({
            anonymousScope,
            disclosedQualifierIds,
            ageGatePolicy,
            idempotencyKey: submissionOperation.idempotencyKey,
            identityMode: resolvedIdentityMode,
            visibility: audience.visibility,
          }),
          caption,
          charityContributionPct: charityContribution.percentagePct,
          charityPartnerId: charityPartner?.partnerId ?? null,
          communityId,
          abortArtifactUploadSession: api.communities.abortArtifactUploadSession,
          completeArtifactUploadSession: api.communities.completeArtifactUploadSession,
          createArtifactUpload: api.communities.createArtifactUpload,
          createPost: api.communities.createPost,
          derivativeStep,
          event: eventRequest,
          extractPosterFrameFile: extractVideoPosterFrameFile,
          getArtifactUploadPartSignedUrl: api.communities.getArtifactUploadPartSignedUrl,
          license,
          monetized: monetizationState.visible,
          onPosterUploaded: (preparedPoster) => {
            submissionOperation.videoPosterUpload = preparedPoster;
          },
          onVideoUploaded: (uploadedVideo) => {
            submissionOperation.videoUpload = uploadedVideo;
          },
          paidAssetPriceUsd,
          posterFrameMaxWidth: MAX_VIDEO_POSTER_FRAME_WIDTH,
          pricingPolicyRegionalPricingEnabled: pricingPolicy?.regional_pricing_enabled === true,
          reportProgress,
          regionalPricingEnabled: monetizationState.regionalPricingEnabled === true,
          royaltySplit,
          signAgentAuthoredBody,
          title,
          preparedPoster: submissionOperation.videoPosterUpload,
          uploadedVideo: submissionOperation.videoUpload,
          uploadArtifactContent: api.communities.uploadArtifactContent,
          uploadMedia: api.communities.uploadMedia,
          videoState,
        });
        logger.info("[create-post] video post created", {
          assetId: result.asset,
          postId: result.id,
        });
      } else if (composerMode === "link") {
        reportProgress("publish_post");
        logger.info("[create-post] creating link post", { linkUrl });
        result = await submitLinkPost({
          altchaOptions: postAltchaRequestOptions,
          authorMode,
          baseRequest: buildBasePostRequest({
            anonymousScope,
            disclosedQualifierIds,
            ageGatePolicy,
            idempotencyKey: submissionOperation.idempotencyKey,
            identityMode: resolvedIdentityMode,
            visibility: audience.visibility,
          }),
          body,
          communityId,
          createPost: api.communities.createPost,
          event: eventRequest,
          linkUrl,
          signAgentAuthoredBody,
          title,
        });
      } else if (composerMode === "file") {
        result = await submitDownloadableFilePost({
          altchaPayload: postAltchaPayload,
          authorMode,
          baseRequest: buildBasePostRequest({
            anonymousScope,
            disclosedQualifierIds,
            ageGatePolicy,
            idempotencyKey: submissionOperation.idempotencyKey,
            identityMode: resolvedIdentityMode,
            visibility: audience.visibility,
          }),
          communityId,
          contentBlobId: submissionOperation.contentBlobId,
          createContentBlob: api.communities.createContentBlob,
          createPost: api.communities.createPost,
          file: fileState,
          getContentBlob: api.communities.getContentBlob,
          onContentBlobCreated: (blob) => {
            submissionOperation.contentBlobId = blob.id;
          },
          reportProgress: (key) => {
            if (key === "validating") reportProgress("validating");
            else if (key === "uploading_media") reportProgress("prepare_media");
            else reportProgress("publish_post");
          },
          signAgentAuthoredBody,
          title,
          uploadContentBlob: api.communities.uploadContentBlob,
        }) as ApiCreatedPost;
      } else {
        reportProgress("publish_post");
        logger.info("[create-post] creating text post");
        result = await submitTextPost({
          altchaOptions: postAltchaRequestOptions,
          authorMode,
          baseRequest: buildBasePostRequest({
            anonymousScope,
            disclosedQualifierIds,
            ageGatePolicy,
            idempotencyKey: submissionOperation.idempotencyKey,
            identityMode: resolvedIdentityMode,
            visibility: audience.visibility,
          }),
          body,
          communityId,
          createPost: api.communities.createPost,
          event: eventRequest,
          signAgentAuthoredBody,
          title,
        });
      }

      setPageState((current) => ({ ...current, postAltchaPayload: null }));
      submissionOperationRef.current = null;
      logger.info("[create-post] publish completed", {
        postId: publishedPostId ?? result?.id,
        postType: publishedPostType,
      });
      const destinationPostId = publishedPostId ?? result?.id;
      if (publishedPostType === "song" && result?.status === "processing") {
        upsertCommunityFeedPostCache({
          queryClient,
          communityId: community.id,
          locale: contentLocale,
          post: createdPostToLocalizedFeedItem({
            post: result,
            community,
            contentLocale,
            currentUserId: session?.user.id,
          }),
        });
        reportProgress("done");
        navigate(`${buildCommunityPath(community.id, community.route_slug)}/threads`);
        return;
      }
      if ((publishedPostType === "song" || publishedPostType === "video") && result?.status === "published") {
        reportProgress("check_registration");
        if (publishedPostType === "video") {
          // Story status is advisory for an already-published video. A slow
          // status read must not leave the composer stuck after POST /posts
          // has succeeded.
          void warnIfStoryRegistrationIncomplete(result, publishedPostType);
        } else {
          const asset = await warnIfStoryRegistrationIncomplete(result, publishedPostType);
          if (result.id) {
            rememberStoryLicenseReuseNotice(
              result.id,
              buildStoryLicenseReuseNotice({
                asset,
                submittedLicense: license,
              }),
            );
          }
        }
      }
      if (result?.status && result.status !== "published") {
        setSubmitError("Post is pending moderator review and is not visible yet.");
        return;
      }
      if (!destinationPostId) {
        throw new Error("The post was created, but no destination post was returned.");
      }
      reportProgress("done");
      if (liveRoomFreedomHref) {
        logger.info("[create-post] opening immediate live room in Freedom", {
          postId: destinationPostId,
        });
        const opened = openLiveRoomFreedomLaunch(liveRoomFreedomHref);
        logger.info("[create-post] immediate live room launch requested", {
          opened,
          postId: destinationPostId,
        });
      }
      navigate(`/p/${destinationPostId}`);
    } catch (error: unknown) {
      logger.error("[create-post] publish failed", {
        error,
        message: getErrorMessage(error, "Could not create post"),
      });
      if (postAltchaRequired) {
        setPageState((current) => ({
          ...current,
          postAltchaPayload: null,
          postAltchaResetKey: current.postAltchaResetKey + 1,
        }));
      }
      setPageState((current) => ({
        ...current,
        submitFailure: getErrorMessage(error, "Could not create post"),
      }));
    } finally {
      logger.info("[create-post] submit finished", {
        communityId,
        composerMode,
      });
      setPageState((current) => ({ ...current, submitting: false }));
    }
  }, [
    api, audience, ageGatePolicy, authorMode, body, caption, charityContribution, charityPartner, community, communityId, composerMode, contentLocale, derivativeStep, draft, eligibility?.status, event, hasCommunityPostingRole, hasOpenPowPostingAccess,
    identityMode, imageUpload, license, linkUrl, liveState, lyrics, monetizationState, paidAssetPriceUsd, paidLiveRoomMode, pendingSongBundleId, postAltchaPayload, postAltchaRequired, pricingPolicy?.regional_pricing_enabled, royaltySplit,
    queryClient, selectedQualifierIds, session?.user.id, setPendingSongBundleId, setSubmitError, signAgentAuthoredBody, songMode, songState, submitSongPost, submitState.canPost, title,
    videoState, fileState,
    warnIfStoryRegistrationIncomplete,
  ]);

  const setImageUploadWithLabel = React.useCallback((file: File | null) => {
    setImageUpload(file);
    setImageUploadLabel(file?.name);
  }, [setImageUpload, setImageUploadLabel]);

  return {
    fileState,
    availableIdentityQualifiers,
    ageGatePolicy,
    body,
    caption,
    charityContribution,
    charityPartner,
    community,
    composerMode,
    derivativeStep,
    eligibility,
    event,
    isCommunityOwner: hasCommunityPostingRole,
    authorMode,
    identityMode,
    imageUpload,
    imageUploadLabel,
    availableAgent,
    audience,
    communityStableAnonymousLabel,
    linkUrl,
    linkPreview,
    liveState,
    license,
    loadError,
    loading,
    lyrics,
    monetizationState,
    royaltySplit,
    regionalPricingPreview,
    postAltchaAction: `community:${eligibility?.community ?? community?.id ?? communityId}`,
    postAltchaPayload,
    postAltchaRequired,
    postAltchaResetKey,
    postAltchaScope: "post_create" as const,
    selectedQualifierIds,
    session,
    songMode,
    songState,
    videoState,
    submitFailure,
    submitProgress,
    submitState,
    submitting,
    title,
    setBody,
    setAgeGatePolicy,
    setAudience,
    setCaption,
    setCharityContribution,
    setComposerMode,
    setDerivativeStep,
    setEvent,
    setFileState,
    setAuthorMode,
    setImageUpload: setImageUploadWithLabel,
    setIdentityMode,
    setLinkUrl,
    setLinkPreview,
    setLiveState,
    setLicense,
    setLyrics,
    setMonetizationState,
    setRoyaltySplit,
    setPostAltchaPayload: (payload: string | null) => setPageState((current) =>
      current.postAltchaPayload === payload
        ? current
        : { ...current, postAltchaPayload: payload }
    ),
    setSelectedQualifierIds,
    setSongMode,
    setSongState,
    setVideoState,
    setTitle,
    handleSubmit,
    refetchEligibility,
  };
}
