"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";
import { Plus } from "@phosphor-icons/react";

import { toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { navigate } from "@/app/router";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { useCommunityFeedPosts } from "@/app/authenticated-data/community-feed-data";
import { type FeedSort } from "@/components/compositions/posts/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { CommunityJoinVerificationChooserModal } from "@/components/compositions/community/join-verification-chooser-modal/community-join-verification-chooser-modal";
import { HandleClaimModal } from "@/components/compositions/community/handle-claim-modal/handle-claim-modal";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { ZkPassportVerificationModal } from "@/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal";
import { CommunityProofOfWorkModal } from "@/components/compositions/community/proof-of-work-modal/community-proof-of-work-modal";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";
import { loadCommunityPreviewWithRetry } from "@/lib/community-preview-retry";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { replaceWithCanonicalCommunityRoute } from "@/app/community-route-canonicalization";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import {
  getJoinCtaLabel,
  getMissingCapabilitiesFromGateEvaluation,
  getVerificationCapabilitiesForProvider,
  getVerificationRequirementsForGates,
  isJoinCtaActionable,
  resolveAvailableHumanVerificationProviders,
  type HumanVerificationProvider,
} from "@/lib/identity-gates";
import { createCommunityBlockedModalStateFactory } from "@/hooks/use-community-interaction-gate.helpers";
import { useCommunityFollow } from "@/hooks/use-community-follow";
import { useCommunityMembershipActions } from "@/hooks/use-community-membership-actions";
import { useCommunityHandleNamespaces } from "@/hooks/use-community-handle-namespaces";
import { useCommunityVoteAction } from "@/hooks/use-community-vote-action";
import { forgetKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useZkPassportVerification } from "@/lib/verification/use-zkpassport-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { PublicRouteMessageState } from "./public-route-states";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { useCommunityHandleClaimController } from "@/app/authenticated-helpers/community-handle-claim";
import { buildCommunityPreviewSidebar } from "@/lib/community-sidebar-helpers";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import { CommunityRouteLoadingState } from "./route-loading-states";
import { useCommunityJoinVerification } from "./authenticated-state/use-community-join-verification";
import { useSongPlayback } from "@/app/authenticated-helpers/song-commerce";
import {
  communityHandleFromRouteLabel,
  useCommunityHandleClaimDismissal,
} from "@/lib/community-handle-claim-dismissal";

function usePublicCommunityPageData(communityId: string, localeTag: string, activeSort: FeedSort, hasSession: boolean) {
  const api = useApi();
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [previewError, setPreviewError] = React.useState<unknown>(null);
  const [previewLoading, setPreviewLoading] = React.useState(true);

  React.useEffect(() => {
    setPreview(null);
    setAuthorProfiles({});
    setPreviewError(null);
    setPreviewLoading(true);
  }, [communityId, localeTag]);

  const loadPosts = React.useCallback(async ({ communityId: nextCommunityId, locale, sort }: {
    communityId: string;
    locale: string;
    sort: FeedSort;
  }) => api.publicCommunities.listPosts(nextCommunityId, {
    limit: "100",
    locale,
    sort,
  }), [api]);

  const {
    error: postsError,
    loading: postsLoading,
    posts,
    setPosts,
  } = useCommunityFeedPosts({
    communityId,
    locale: localeTag,
    sort: activeSort,
    loadPosts,
  });

  React.useEffect(() => {
    let cancelled = false;
    setPreviewError(null);
    setPreviewLoading(true);

    logger.debug("[community-follow] loading preview", {
      communityId,
      hasSession,
      source: hasSession ? "authenticated" : "public",
    });

    const previewRequest = loadCommunityPreviewWithRetry(() => hasSession
      ? api.communities.preview(communityId, { locale: localeTag })
        .catch((nextError: unknown) => {
          if (!isApiAuthError(nextError)) {
            throw nextError;
          }
          logger.warn("[community-follow] authenticated preview rejected; falling back to public preview", {
            communityId,
          });
          return api.publicCommunities.get(communityId, { locale: localeTag });
        })
      : api.publicCommunities.get(communityId, { locale: localeTag }));

    void previewRequest
      .then((previewResult) => {
        if (cancelled) return;
        logger.debug("[community-follow] preview loaded", {
          communityId: previewResult.id,
          followerCount: previewResult.follower_count,
          viewerFollowing: previewResult.viewer_following,
          viewerMembershipStatus: previewResult.viewer_membership_status,
        });
        setPreview(previewResult);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        logger.warn("[community-follow] preview load failed", {
          communityId,
          hasSession,
          error: nextError,
        });
        setPreviewError(nextError);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityId, hasSession, localeTag]);

  React.useEffect(() => {
    let cancelled = false;

    const authorUserIds = posts.reduce<string[]>((result, item) => {
      const userId = item.post.identity_mode === "public" ? item.post.author_user : null;
      if (userId) {
        result.push(userId);
      }
      return result;
    }, []);

    if (authorUserIds.length === 0) {
      setAuthorProfiles({});
      return () => {
        cancelled = true;
      };
    }

    void loadProfilesByUserId(api, authorUserIds)
      .then((nextProfiles) => {
        if (cancelled) return;
        setAuthorProfiles(nextProfiles);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthorProfiles({});
      });

    return () => {
      cancelled = true;
    };
  }, [api, posts]);

  return {
    authorProfiles,
    error: previewError ?? postsError,
    loading: previewLoading || postsLoading,
    postsLoading,
    posts,
    preview,
    previewLoading,
    setPosts,
  };
}

function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <PublicRouteMessageState
      description={copy.notFoundDescription.replace("{communityId}", communityId)}
      title={copy.notFoundTitle}
    />
  );
}

function PublicCommunityErrorState({ description }: { description: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return <PublicRouteMessageState description={description} title={copy.errorTitle} />;
}

const FOLLOW_BUTTON_CLASS_NAME = "min-w-32";

export function resolvePublicCommunityJoinActionLabel(
  eligibility: ApiJoinEligibility | null,
  locale: string,
): string {
  return getJoinCtaLabel(eligibility ?? ({ status: "joinable" } as ApiJoinEligibility), { locale });
}

export function PublicCommunityRoutePage({
  buildPostPath,
  communityId,
  disableCanonicalRouteReplace = false,
  isImportedRoot = false,
}: {
  buildPostPath?: (postId: string) => string;
  communityId: string;
  disableCanonicalRouteReplace?: boolean;
  isImportedRoot?: boolean;
}) {
  const api = useApi();
  const session = useSession();
  const authRuntime = usePiratePrivyRuntime();
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: locale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [locale]);
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const hasSession = Boolean(session?.accessToken);
  const { authorProfiles, error, posts, postsLoading, preview, previewLoading, setPosts } = usePublicCommunityPageData(communityId, contentLocale, activeSort, hasSession);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [memberCount, setMemberCount] = React.useState<number | null>(null);
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "public-community",
    uiLocale: locale,
  });
  const { connectedWallets } = usePiratePrivyWallets({
    enabled: Boolean(session?.user?.id),
  });
  const handleClaimCommunityId = preview?.id ?? communityId;
  const handleNamespaces = useCommunityHandleNamespaces({
    api: api.communities,
    communityId: handleClaimCommunityId,
    enabled: Boolean(session?.accessToken),
  });
  const handleClaim = useCommunityHandleClaimController({
    api: api.communities,
    communityId: preview?.id ?? communityId,
    namespaceVerificationId: handleNamespaces.selectedNamespaceVerification,
    connectedWallets,
    primaryWalletAddress: session?.profile.primary_wallet_address,
    settlementWalletAttachmentId: session?.user.primary_wallet_attachment,
  });
  const handleClaimDismissal = useCommunityHandleClaimDismissal(
    handleClaimCommunityId,
    handleNamespaces.selectedNamespaceVerification,
  );
  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: () => {
      invalidateCommunityGate(communityId);
      toast.success(copy.publicCommunity.verificationCompleted);
    },
  });
  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerificationFlow,
  } = useSelfVerification({
    completeErrorMessage: copy.publicCommunity.verificationCompletionFailed,
    locale,
    onVerified: () => {
      invalidateCommunityGate(communityId);
      setPosts((current) => current.map((post) => ({
        ...post,
        age_gate_viewer_state: "verified_allowed",
      })));
      toast.success(copy.publicCommunity.verificationCompleted);
    },
    startErrorMessage: copy.publicCommunity.verificationStartFailed,
    storageKey: `pirate_pending_self_join_session:${communityId}`,
    verificationIntent: "community_join",
  });
  const [zkPassportModalOpen, setZkPassportModalOpen] = React.useState(false);
  const {
    startVerification: startZkPassportVerificationFlow,
    checkPendingVerification: checkZkPassportPendingVerification,
    verificationError: zkPassportError,
    verificationHref: zkPassportHref,
    verificationLoading: zkPassportLoading,
  } = useZkPassportVerification({
    onVerified: () => {
      setZkPassportModalOpen(false);
      invalidateCommunityGate(communityId);
      toast.success(copy.publicCommunity.verificationCompleted);
    },
    verificationIntent: "community_join",
  });

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  React.useEffect(() => {
    if (zkPassportError) {
      toast.error(zkPassportError);
    }
  }, [zkPassportError]);

  React.useEffect(() => {
    if (isApiNotFoundError(error)) {
      forgetKnownCommunity(communityId);
    }
  }, [communityId, error]);

  React.useEffect(() => {
    if (disableCanonicalRouteReplace) return;
    if (isImportedRoot) return;
    if (!preview?.id) return;
    replaceWithCanonicalCommunityRoute(preview.id, preview.route_slug, "threads");
  }, [disableCanonicalRouteReplace, isImportedRoot, preview?.id, preview?.route_slug]);

  React.useEffect(() => {
    setMemberCount(preview?.member_count ?? null);
  }, [preview?.id, preview?.member_count]);

  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(preview?.id ?? communityId);
    setEligibility(nextEligibility);
    return nextEligibility;
  }, [api.communities, communityId, preview?.id]);

  React.useEffect(() => {
    if (!session || !preview?.id) {
      setEligibility(null);
      return;
    }

    let cancelled = false;
    void api.communities.getJoinEligibility(preview.id)
      .then((nextEligibility) => {
        if (!cancelled) setEligibility(nextEligibility);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) toast.error(getErrorMessage(nextError, "Could not load community membership."));
      });
    return () => { cancelled = true; };
  }, [api.communities, preview?.id, session]);

  const authConnect = authRuntime.connect;
  const authLoadError = authRuntime.loadError;
  const requestAuth = React.useCallback((fallbackMessage: string) => {
    if (!isCanonicalAuthOrigin()) {
      const canonicalUrl = buildCanonicalAuthUrl(
        preview ? buildCommunityPath(preview.id, preview.route_slug ?? communityId) : undefined,
      );
      toast.error(fallbackMessage, {
        action: {
          label: copy.publicProfile.openInPirate,
          onClick: () => {
            window.location.href = canonicalUrl;
          },
        },
      });
      return;
    }

    if (authConnect) {
      authConnect();
      return;
    }

    toast.error(authLoadError ?? fallbackMessage);
  }, [authConnect, authLoadError, communityId, copy.publicProfile.openInPirate, preview]);

  const {
    followerCount,
    followLoading,
    handleToggleFollow,
    markViewerJoined: markViewerFollowJoined,
    viewerFollowing,
  } = useCommunityFollow({
    communityId: preview?.id ?? communityId,
    follow: api.communities.follow,
    hasSession: Boolean(session),
    initialFollowerCount: preview?.follower_count ?? null,
    initialViewerFollowing: preview?.viewer_following,
    onAuthRequired: () => {
      requestAuth("Connect your wallet to follow communities.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Follow failed"));
    },
    unfollow: api.communities.unfollow,
  });

  const markViewerJoined = React.useCallback(() => {
    markViewerFollowJoined();
    setMemberCount((count) => typeof count === "number" ? count + 1 : count);
  }, [markViewerFollowJoined]);

  const handleVerifyAge = React.useCallback(() => {
    if (!session) {
      requestAuth("Connect your wallet to verify your age and view 18+ content.");
      return;
    }
    void startSelfVerificationFlow({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: "Age verification is required to view 18+ content.",
    });
  }, [session, requestAuth, startSelfVerificationFlow]);

  const {
    altchaAction,
    altchaPayload,
    altchaRequired,
    altchaScope,
    checkZkPassportPendingVerification: checkJoinZkPassportPendingVerification,
    handleJoin,
    handleSelfModalOpenChange: handleJoinSelfModalOpenChange,
    handleZkPassportModalOpenChange: handleJoinZkPassportModalOpenChange,
    handleSelfQrError: handleJoinSelfQrError,
    handleSelfQrSuccess: handleJoinSelfQrSuccess,
	    joinError,
	    joinLoading,
	    passportLoading,
	    selfError: joinSelfError,
    selfLoading: joinSelfLoading,
    selfModalOpen: joinSelfModalOpen,
    selfPrompt: joinSelfPrompt,
    startGateVerification,
    startVerificationProvider,
    startSelfVerification,
    setAltchaPayload,
    veryLoading: joinVeryLoading,
    zkPassportError: joinZkPassportError,
    zkPassportHref: joinZkPassportHref,
    zkPassportLoading: joinZkPassportLoading,
    zkPassportModalOpen: joinZkPassportModalOpen,
  } = useCommunityJoinVerification({
    communityId: preview?.id ?? communityId,
    eligibility,
    locale,
    onJoined: markViewerJoined,
    refetchEligibility,
  });
  const membershipProviderChoices = React.useMemo(
    () => eligibility?.status === "verification_required"
      ? resolveAvailableHumanVerificationProviders(eligibility)
      : [],
    [eligibility],
  );
  const {
    handleClaimModalOpen,
    handleClaimModalOpenChange,
    handleClaimNotNow,
    handleJoinRequestModalOpenChange,
    handleJoinRequestSubmit,
    handlePrimaryJoinAction,
    joinRequestError,
    joinRequestModalOpen,
    joinRequestSubmitting,
    proofOfWorkModalOpen,
    setVerificationChooserModalOpen,
    verificationChooserModalOpen,
    setProofOfWorkModalOpen,
  } = useCommunityMembershipActions({
    altchaPayload,
    altchaRequired,
    communityId,
    eligibility,
    handleClaim,
    handleClaimApi: api.communities,
    handleClaimCommunityId,
    handleClaimNamespaceVerificationId: handleNamespaces.selectedNamespaceVerification,
    handleClaimDismissal,
    handleJoin,
    hasVerificationChoices: membershipProviderChoices.length > 1,
    onAuthRequired: () => {
      requestAuth("Connect your wallet to join communities.");
    },
    onHandleClaimCheckError: (error) => {
      toast.error(getErrorMessage(error, "Could not check community names."));
    },
    sessionUserId: session?.user?.id,
  });
  const handleChooseVerificationProvider = React.useCallback(async (
    provider: HumanVerificationProvider,
  ) => {
    const result = await startVerificationProvider(provider, {
      missingCapabilities: eligibility
        ? getMissingCapabilitiesFromGateEvaluation(eligibility)
        : null,
      membershipGateSummaries: eligibility?.membership_gate_summaries ?? null,
      showToastOnError: true,
    });
    if (result === "started") setVerificationChooserModalOpen(false);
  }, [eligibility, setVerificationChooserModalOpen, startVerificationProvider]);

  React.useEffect(() => {
    if (joinError) toast.error(joinError);
  }, [joinError]);

  const interactionCopy = React.useMemo(
    () => ({
      ...copy.interactionGate,
      locale,
      taskVerify: copy.createCommunity.startVerification,
    }),
    [copy, locale],
  );

  const buildBlockedModalState = React.useMemo(
    () =>
      createCommunityBlockedModalStateFactory({
        interactionCopy,
        veryLoading,
        selfLoading,
        onStartVeryVerification: startVeryVerification,
        onStartSelfVerification: async (gate) => {
          const requestedCapabilities = getVerificationCapabilitiesForProvider(
            gate.eligibility,
            "self",
          );
          const verificationRequirements = getVerificationRequirementsForGates(
            gate.eligibility.membership_gate_summaries,
          );
          if (
            requestedCapabilities.length === 0 &&
            verificationRequirements.length === 0
          ) {
            const message = copy.publicCommunity.verificationMissingSelf;
            toast.error(message);
            return { started: false };
          }

          const result = await startSelfVerificationFlow({
            requestedCapabilities,
            unavailableMessage: copy.publicCommunity.verificationMissingSelf,
            verificationRequirements,
            skipModal: true,
          });
          if (!result.started && result.error) {
            toast.error(result.error);
          }
          return {
            started: result.started,
            openedModal: result.openedModal,
            href: result.href,
          };
        },
        zkPassportLoading,
        onStartZkPassportVerification: async (gate) => {
          const requestedCapabilities = getVerificationCapabilitiesForProvider(
            gate.eligibility,
            "zkpassport",
          );
          const verificationRequirements = getVerificationRequirementsForGates(
            gate.eligibility.membership_gate_summaries,
          );
          const unavailableMessage =
            "This community is missing the ZKPassport verification details needed to continue.";
          if (
            requestedCapabilities.length === 0 &&
            verificationRequirements.length === 0
          ) {
            toast.error(unavailableMessage);
            return { started: false };
          }

          const result = await startZkPassportVerificationFlow({
            deferOpen: true,
            requestedCapabilities,
            unavailableMessage,
            verificationRequirements,
          });
          if (!result.started && result.error) {
            toast.error(result.error);
          }
          if (result.started && result.href) {
            setZkPassportModalOpen(true);
          }
          return { started: result.started };
        },
        invalidateCommunityGate,
        includeVerificationCloseAction: true,
      }),
    [
      interactionCopy,
      veryLoading,
      selfLoading,
      zkPassportLoading,
      startVeryVerification,
      startSelfVerificationFlow,
      startZkPassportVerificationFlow,
      setZkPassportModalOpen,
      copy.publicCommunity.verificationMissingSelf,
      invalidateCommunityGate,
    ],
  );

  const voteOnPost = useCommunityVoteAction({
    clearVote: api.posts.clearVote,
    buildBlockedModalState: buildBlockedModalState ?? undefined,
    communityId: preview?.id ?? communityId,
    gateData: preview && eligibility
      ? {
          eligibility,
          gateMatchMode: preview.gate_match_mode ?? null,
          preview: {
            id: preview.id,
            display_name: preview.display_name,
            membership_gate_summaries: preview.membership_gate_summaries,
            viewer_community_role: preview.viewer_community_role ?? null,
          },
        }
      : null,
    locale: contentLocale,
    posts,
    runGatedCommunityAction,
    setPosts,
    vote: api.posts.vote,
  });

  const cancelEvent = React.useCallback(async (postId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Cancel this event?")) return;

    const previousPosts = posts;
    const targetPost = posts.find((postResponse) => postResponse.post.id === postId);
    try {
      const updated = await api.posts.cancelEvent(targetPost?.post.community ?? communityId, postId);
      setPosts((current) => current.map((postResponse) => (
        postResponse.post.id === postId ? updated : postResponse
      )));
    } catch (nextError) {
      setPosts(previousPosts);
      toast.error(getErrorMessage(nextError, "Could not cancel this event."));
    }
  }, [api.posts, communityId, posts, setPosts]);
  if (previewLoading && !preview) {
    return <CommunityRouteLoadingState />;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityNotFound communityId={communityId} />;
    }

    return (
      <PublicCommunityErrorState
        description={getErrorMessage(error, copy.publicCommunity.errorDescription)}
      />
    );
  }

  if (!preview) {
    return <PublicCommunityNotFound communityId={communityId} />;
  }

  const joinActionLabel = resolvePublicCommunityJoinActionLabel(eligibility, locale);
  const membershipLoading = Boolean(session) && !eligibility;
  const joinActionDisabled = Boolean(session) && (
    !eligibility
      || !isJoinCtaActionable(eligibility)
  );
  const routeLabel = formatCommunityRouteLabel(
    preview.id,
    preview.route_slug ?? communityId,
  );
  const communityHandleLabel = communityHandleFromRouteLabel(routeLabel);
  const viewerIsMember = preview.viewer_membership_status === "member" || eligibility?.status === "already_joined";
  const canCreatePost = Boolean(session?.user?.id) && viewerIsMember;
  const communityCreatePostPath = `${buildCommunityPath(preview.id, preview.route_slug ?? communityId)}/submit`;
  const headerAction = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {!viewerIsMember && !membershipLoading ? (
        <Button
          className={FOLLOW_BUTTON_CLASS_NAME}
          data-state={viewerFollowing ? "following" : "follow"}
          data-testid="community-follow-button"
          loading={followLoading || (!session && authRuntime.busy)}
          onClick={() => void handleToggleFollow()}
          variant={viewerFollowing ? "secondary" : "default"}
        >
          {viewerFollowing ? copy.community.followingLabel : copy.community.followLabel}
        </Button>
      ) : null}
      {!viewerIsMember && !membershipLoading ? (
        <Button
          disabled={joinActionDisabled}
          loading={joinLoading || joinVeryLoading || joinSelfLoading || joinZkPassportLoading || passportLoading || (!session && authRuntime.busy)}
          onClick={() => void handlePrimaryJoinAction()}
          variant="secondary"
        >
          {joinActionLabel}
        </Button>
      ) : null}
      {canCreatePost ? (
        <Button
          leadingIcon={<Plus className="size-5" />}
          onClick={() => navigate(communityCreatePostPath)}
        >
          {copy.community.createPostLabel}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {gateModal}
      <HandleClaimModal
        claimedLabel={handleClaim.claimedLabel ?? undefined}
        communityHandle={communityHandleLabel}
        communityName={preview.display_name}
        communityRouteLabel={routeLabel}
        namespaceOptions={handleNamespaces.namespaceOptions}
        onNamespaceChange={handleNamespaces.setSelectedNamespaceVerification}
        selectedNamespaceVerification={handleNamespaces.selectedNamespaceVerification}
        error={handleClaim.error}
        onClaim={handleClaim.onClaim}
        onClaimGateRecheck={handleClaim.refreshQuote}
        onNotNow={handleClaimNotNow}
        onOpenChange={handleClaimModalOpenChange}
        onSearchChange={handleClaim.onSearchChange}
        onSelfVerificationClick={() => {
          void startSelfVerification({
            membershipGateSummaries: handleClaim.claimGateSummaries,
            showToastOnError: true,
          });
        }}
        onWalletConnectionClick={() => {
          const gate = handleClaim.claimGateSummaries.find((summary) =>
            summary.gate_type === "erc721_holding"
            || summary.gate_type === "erc721_inventory_match"
            || summary.gate_type === "asset_balance"
          );
          if (gate) void startGateVerification(gate);
        }}
        open={handleClaimModalOpen}
        phase={handleClaim.phase}
        processing={handleClaim.processing}
        searchResult={handleClaim.searchResult}
        searchValue={handleClaim.searchValue}
      />
      <CommunityJoinRequestModal
        communityName={preview.display_name}
        error={joinRequestError}
        onOpenChange={handleJoinRequestModalOpenChange}
        onSubmit={handleJoinRequestSubmit}
        open={joinRequestModalOpen}
        submitting={joinRequestSubmitting || joinLoading}
      />
      <CommunityJoinVerificationChooserModal
        locale={locale}
        onChooseProvider={handleChooseVerificationProvider}
        onOpenChange={setVerificationChooserModalOpen}
        open={verificationChooserModalOpen}
        providerChoices={membershipProviderChoices}
      />
      {altchaRequired ? (
        <CommunityProofOfWorkModal
          action={altchaAction}
          continueDisabled={!altchaPayload}
          continueLoading={joinLoading}
          locale={locale}
          onContinue={async () => {
            setProofOfWorkModalOpen(false);
            await handlePrimaryJoinAction();
          }}
          onOpenChange={setProofOfWorkModalOpen}
          onPayloadChange={setAltchaPayload}
          open={proofOfWorkModalOpen}
          requirements={preview.membership_gate_summaries}
          requirementsMode={preview.gate_match_mode ?? null}
          scope={altchaScope}
        />
      ) : null}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          onOpenChange={handleSelfModalOpenChange}
          onQrError={handleSelfQrError}
          onQrSuccess={handleSelfQrSuccess}
          open={selfModalOpen}
          selfApp={selfPrompt.selfApp}
          title={selfPrompt.title}
        />
      ) : null}
      {joinSelfPrompt ? (
        <SelfVerificationModal
          actionLabel={joinSelfPrompt.actionLabel}
          description={joinSelfPrompt.description}
          error={joinSelfError}
          href={joinSelfPrompt.href}
          onOpenChange={handleJoinSelfModalOpenChange}
          onQrError={handleJoinSelfQrError}
          onQrSuccess={handleJoinSelfQrSuccess}
          open={joinSelfModalOpen}
          selfApp={joinSelfPrompt.selfApp}
          title={joinSelfPrompt.title}
        />
      ) : null}
      <ZkPassportVerificationModal
        actionLabel="Open ZKPassport"
        checkLoading={zkPassportLoading}
        description="Verify with ZKPassport to continue."
        error={zkPassportError}
        href={zkPassportHref}
        onCheckPending={checkZkPassportPendingVerification}
        onOpenChange={setZkPassportModalOpen}
        open={zkPassportModalOpen}
        title="Verify with ZKPassport"
      />
      <ZkPassportVerificationModal
        actionLabel="Open ZKPassport"
        checkLoading={joinZkPassportLoading}
        description="Verify with ZKPassport to continue."
        error={joinZkPassportError}
        href={joinZkPassportHref}
        onCheckPending={checkJoinZkPassportPendingVerification}
        onOpenChange={handleJoinZkPassportModalOpenChange}
        open={joinZkPassportModalOpen}
        title="Verify with ZKPassport"
      />
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={preview.avatar_ref ?? undefined}
        availableSorts={sortOptions}
        bannerSrc={preview.banner_ref ?? undefined}
        communityId={preview.id}
        emptyState={{
          title: copy.publicCommunity.emptyPosts,
          body: "Be the first to share something in this community.",
          illustration: (
            <div className="relative size-32 overflow-hidden rounded-full md:size-40">
              <picture>
                <source srcSet="/mascots/celebrate-ghost-512.webp 2x, /mascots/celebrate-ghost-256.webp 1x" type="image/webp" />
                <img alt="Celebrating pirate ghost" className="size-full object-cover" draggable={false} src="/mascots/celebrate-ghost-256.png" />
              </picture>
            </div>
          ),
        }}
        headerAction={headerAction}
        items={posts.map((post) => toCommunityFeedItem(
          post,
          preview,
          authorProfiles,
          post.post.post_type === "song" || post.post.post_type === "video"
            ? {
                currentUserId: session?.user?.id,
                localeTag: contentLocale,
                playback: songPlayback,
              }
            : undefined,
          {
            onComment: () => navigate(buildPostPath?.(post.post.id) ?? `/p/${post.post.id}`),
            onCancelEvent: () => void cancelEvent(post.post.id),
            onVerifyAge: handleVerifyAge,
            onVote: async (direction) => await voteOnPost(post.post.id, direction),
            postHref: buildPostPath?.(post.post.id),
            showOriginalLabel: copy.common.showOriginal,
            showTranslationLabel: copy.common.showTranslation,
            viewerContentLocale: contentLocale,
          },
        ))}
        loading={postsLoading}
        onSortChange={setActiveSort}
        routeLabel={routeLabel}
        sidebar={{
          ...buildCommunityPreviewSidebar(preview, locale),
          followerCount,
          memberCount,
        }}
        title={preview.display_name}
        />
      </section>
    </>
  );
}
