"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";
import { Plus } from "@phosphor-icons/react";

import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { CommunityRouteLoadingState } from "@/app/route-loading-states";
import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";
import { logger } from "@/lib/logger";
import {
  buildCommunityPath,
  formatCommunityRouteLabel,
} from "@/lib/community-routing";
import { replaceWithCanonicalCommunityRoute } from "@/app/community-route-canonicalization"; import { CommunitySurfaceNavigation } from "@/app/community-surface-navigation";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { CommunityJoinVerificationChooserModal } from "@/components/compositions/community/join-verification-chooser-modal/community-join-verification-chooser-modal";
import { HandleClaimModal } from "@/components/compositions/community/handle-claim-modal/handle-claim-modal";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { ZkPassportVerificationModal } from "@/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal";
import { CommunityProofOfWorkModal } from "@/components/compositions/community/proof-of-work-modal/community-proof-of-work-modal";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { toast } from "@/components/primitives/sonner";
import {
  getJoinCtaLabel,
  isJoinCtaActionable,
  resolveAvailableHumanVerificationProviders,
  type HumanVerificationProvider,
} from "@/lib/identity-gates";
import { createCommunityBlockedModalStateFactory, getRequirementGroups } from "@/hooks/use-community-interaction-gate.helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";

import { loadProfilesByUserId, useCommunityPageData } from "@/app/authenticated-data/community-data";
import { buildLiveRoomFreedomHref } from "@/app/authenticated-helpers/live-room-launch";
import {
  buildCommunityPreviewSidebar,
  buildCommunitySidebar,
  buildCommunitySidebarRequirements,
} from "@/app/authenticated-helpers/community-sidebar-helpers";
import {
  buildCommunityModerationEntryPath,
  buildCommunityModerationPath,
} from "@/app/authenticated-helpers/moderation-helpers";
import { buildLiveRoomParticipants } from "@/app/authenticated-helpers/post-live-room-participants";
import { toCommunityFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { processingPostPollDelayMs, shouldContinueProcessingPostPolling } from "@/app/authenticated-helpers/processing-post-polling";
import { useCommunityMembershipActions } from "@/hooks/use-community-membership-actions";
import { useCommunityHandleNamespaces } from "@/hooks/use-community-handle-namespaces";
import { useCommunityVoteAction } from "@/hooks/use-community-vote-action";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import {
  AuthRequiredRouteState,
  RouteLoadFailureState,
} from "@/app/authenticated-helpers/route-shell";
import { useSongPurchaseFlow } from "@/app/authenticated-helpers/song-purchase";
import {
  useBoostCampaignController,
  useBoostMenuEligibility,
} from "@/app/authenticated-helpers/use-boost-campaign-controller";
import {
  useCommunityHandleClaimController,
  useHandleClaimModalActionHandlers,
} from "@/app/authenticated-helpers/community-handle-claim";
import {
  useSongCommerceState,
  useSongPlayback,
} from "@/app/authenticated-helpers/song-commerce";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useCommunityFollow } from "@/hooks/use-community-follow";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { updateSessionUser } from "@/lib/api/session-store";
import { sameUserId } from "@/app/authenticated-helpers/user-id";
import {
  communityHandleFromRouteLabel,
  useCommunityHandleClaimDismissal,
} from "@/lib/community-handle-claim-dismissal";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import { getFreedomBrowserDetectionSnapshot } from "@/lib/resource-links";
import { BoostCampaignSheet, SongRewardPolicySheet } from "@/components/compositions/rewards/reward-booster-surfaces";
import { SongBountiesSheet } from "@/components/compositions/rewards/song-bounties-sheet";

const FOLLOW_BUTTON_CLASS_NAME = "min-w-32";

function viewerCanModerateCommunity(
  viewerUserId: string | null | undefined,
  community:
    | {
        created_by_user?: string | null;
        owner?: { user?: string | null } | null;
        moderators?: Array<{ user?: string | null; role?: "owner" | "admin" | "moderator" | string | null }> | null;
        viewer_community_role?: "owner" | "admin" | "moderator" | string | null;
      }
    | null
    | undefined,
): boolean {
  if (!viewerUserId || !community) return false;
  if (
    community.viewer_community_role === "owner"
    || community.viewer_community_role === "admin"
    || community.viewer_community_role === "moderator"
  ) {
    return true;
  }
  if (sameUserId(viewerUserId, community.created_by_user)) return true;
  if (sameUserId(viewerUserId, community.owner?.user)) return true;
  return Boolean(community.moderators?.some((roleHolder) => {
    if (!sameUserId(viewerUserId, roleHolder.user)) return false;
    return roleHolder.role === "owner" || roleHolder.role === "admin" || roleHolder.role === "moderator";
  }));
}

export function CommunityPage({
  communityId,
  isImportedRoot = false,
}: {
  communityId: string;
  isImportedRoot?: boolean;
}) {
  const api = useApi();
  const session = useSession();
  const isMobileWeb = useIsMobile();
  const { locale } = useUiLocale();
  const { copy, localeTag } = useRouteMessages();
  const pageTitle = copy.community.title;
  const createPostLabel = copy.community.createPostLabel;
  const modToolsLabel = copy.community.modToolsLabel;
  const sortOptions = React.useMemo(
    () => buildFeedSortOptions(copy.common),
    [copy.common],
  );
  const contentLocale = useRouteContentLocale();
  const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">(
    "best",
  );
  const {
    authorProfiles,
    community,
    preview,
    eligibility,
    error,
    hasMore,
    loadMore,
    loadMoreError,
    loading,
    loadingMore,
    posts,
    refetchEligibility,
    refetchPosts,
    setPosts,
  } = useCommunityPageData(communityId, contentLocale, activeSort);
  const boostEligiblePostIds = useBoostMenuEligibility({
    authenticated: Boolean(session?.accessToken),
    postIds: React.useMemo(
      () => posts
        .filter((post) => post.post.status === "published" && post.post.post_type === "song")
        .map((post) => post.post.id),
      [posts],
    ),
  });
  const ownsCommunity = sameUserId(session?.user?.id, community?.created_by_user);
  const canModerateCommunity = viewerCanModerateCommunity(session?.user?.id, preview);
  const viewerIsMember =
    eligibility?.status === "already_joined"
    || preview?.viewer_membership_status === "member";
  const canCreatePost =
    ownsCommunity
    || canModerateCommunity
    || viewerIsMember;
  const commerceEnabled = Boolean(session?.user?.id) && canCreatePost;
  const {
    listingsByAssetId,
    listingsByLiveRoomId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(communityId, commerceEnabled);
  const { buySong, purchaseModal } = useSongPurchaseFlow({
    commerceEnabled,
    refreshSongCommerce,
  });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [boostTarget, setBoostTarget] = React.useState<{
    postId: string;
    viewerIsAuthor: boolean;
  } | null>(null);
  const [pendingBoostAction, setPendingBoostAction] = React.useState<"boost" | "policy" | null>(null);
  const boostController = useBoostCampaignController({
    activeCampaignId: null,
    authenticated: Boolean(session?.accessToken),
    communityId: community?.id ?? communityId,
    postId: boostTarget?.postId ?? "",
    requestAuth: () => toast.error("Sign in to boost this song."),
    song: Boolean(boostTarget),
    viewerIsAuthor: Boolean(boostTarget?.viewerIsAuthor),
  });
  React.useEffect(() => {
    if (pendingBoostAction === "boost" && boostController.canBoost) {
      boostController.openBounties();
      setPendingBoostAction(null);
    }
    if (pendingBoostAction === "policy" && boostController.canManagePolicy) {
      boostController.openPolicy();
      setPendingBoostAction(null);
    }
  // The controller object is recreated; only the listed capabilities and actions drive this handoff.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    boostController.canBoost,
    boostController.canManagePolicy,
    boostController.openBounties,
    boostController.openPolicy,
    pendingBoostAction,
  ]);
  const [liveRoomAccessById, setLiveRoomAccessById] = React.useState<Record<string, ApiLiveRoomAccessResponse | undefined>>({});
  const [liveRoomParticipantProfiles, setLiveRoomParticipantProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [freedomDetection, setFreedomDetection] = React.useState(() => getFreedomBrowserDetectionSnapshot());
  const liveRoomProfilesByUserId = React.useMemo(
    () => ({ ...authorProfiles, ...liveRoomParticipantProfiles }),
    [authorProfiles, liveRoomParticipantProfiles],
  );
  const processingPostIds = React.useMemo(
    () => posts
      .filter((postResponse) => postResponse.post.status === "processing")
      .map((postResponse) => postResponse.post.id),
    [posts],
  );
  const processingPostIdsKey = React.useMemo(() => processingPostIds.join("\n"), [processingPostIds]);
  const [timedOutProcessingPostIds, setTimedOutProcessingPostIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const refreshProcessingPosts = React.useCallback(async (postIds: string[]) => {
    const refreshed = await Promise.all(postIds.map(async (postId) => {
      try {
        return await api.posts.get(postId, { locale: contentLocale });
      } catch (error) {
        logger.warn("[community-route] processing post refresh failed", {
          error,
          postId,
        });
        return null;
      }
    }));
    const byId = new Map(refreshed.filter((item) => item != null).map((item) => [item.post.id, item]));
    if (byId.size === 0) return;
    setPosts((current) => current.map((postResponse) => byId.get(postResponse.post.id) ?? postResponse));
  }, [api.posts, contentLocale, setPosts]);

  React.useEffect(() => {
    const activeProcessingPostIds = new Set(processingPostIdsKey ? processingPostIdsKey.split("\n") : []);
    setTimedOutProcessingPostIds((current) => {
      const retained = new Set(Array.from(current).filter((postId) => activeProcessingPostIds.has(postId)));
      return retained.size === current.size ? current : retained;
    });
    if (!processingPostIdsKey) return undefined;
    const postIds = processingPostIdsKey.split("\n");
    const startedAt = Date.now();
    let cancelled = false;
    let timeoutId: number | null = null;
    const scheduleNext = () => {
      if (cancelled) return;
      const elapsedMs = Date.now() - startedAt;
      if (!shouldContinueProcessingPostPolling(elapsedMs)) {
        logger.warn("[community-route] stopped processing post polling after timeout", {
          elapsedMs,
          postIds,
        });
        setTimedOutProcessingPostIds((current) => new Set([...current, ...postIds]));
        return;
      }
      timeoutId = window.setTimeout(() => {
        void tick();
      }, processingPostPollDelayMs(elapsedMs));
    };
    const tick = async () => {
      await refreshProcessingPosts(postIds);
      if (cancelled) return;
      scheduleNext();
    };
    void tick();
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [processingPostIdsKey, refreshProcessingPosts]);

  React.useEffect(() => {
    let attempts = 0;
    const readDetection = () => {
      attempts += 1;
      const next = getFreedomBrowserDetectionSnapshot();
      setFreedomDetection(next);
      return next.detected;
    };
    if (readDetection()) return undefined;
    const intervalId = window.setInterval(() => {
      if (readDetection() || attempts >= 20) {
        window.clearInterval(intervalId);
      }
    }, 250);
    return () => window.clearInterval(intervalId);
  }, []);
  const previewCommunityId = preview?.id ?? null;
  const {
    followerCount,
    followLoading,
    handleToggleFollow,
    markViewerJoined,
    viewerFollowing,
  } = useCommunityFollow({
    communityId: previewCommunityId ?? communityId,
    follow: api.communities.follow,
    initialFollowerCount: preview?.follower_count ?? null,
    initialViewerFollowing: preview?.viewer_following,
    onError: (error) => {
      toast.error(getErrorMessage(error, "Follow failed"));
    },
    unfollow: api.communities.unfollow,
  });
  const {
    altchaAction,
    altchaPayload,
    altchaRequired,
    altchaScope,
    checkZkPassportPendingVerification,
    handleJoin,
    handleSelfModalOpenChange,
    handleZkPassportModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    joinError,
    joinLoading,
    passportLoading,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startSelfVerification,
    startGateVerification,
    startVerificationProvider,
    startVeryVerification,
    startZkPassportVerification,
    setAltchaPayload,
    veryLoading,
    zkPassportError,
    zkPassportHref,
    zkPassportLoading,
    zkPassportModalOpen,
  } = useCommunityJoinVerification({
    communityId,
    eligibility,
    locale,
    onJoined: markViewerJoined,
    refetchEligibility,
  });
  const {
    handleModalOpenChange: handleAgeSelfModalOpenChange,
    handleSelfQrError: handleAgeSelfQrError,
    handleSelfQrSuccess: handleAgeSelfQrSuccess,
    selfError: ageSelfError,
    selfModalOpen: ageSelfModalOpen,
    selfPrompt: ageSelfPrompt,
    startVerification: startAgeSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: "Could not complete age verification.",
    locale,
    onVerified: async () => {
      if (session) {
        const refreshedUser = await api.users.getMe();
        updateSessionUser(refreshedUser);
      }
      setPosts((current) => current.map((post) => ({
        ...post,
        age_gate_viewer_state: "verified_allowed",
      })));
    },
    startErrorMessage: "Could not start age verification.",
    storageKey: `pirate_pending_self_age_gate:${communityId}`,
    verificationIntent: "community_join",
  });
  const communityCreatePostPath = preview
    ? `${buildCommunityPath(preview.id, community?.route_slug ?? preview.route_slug)}/submit`
    : `${buildCommunityPath(communityId)}/submit`;
  const moderationEntryPath = React.useMemo(
    () => buildCommunityModerationEntryPath(
      communityId,
      isMobileWeb,
      community?.route_slug ?? preview?.route_slug,
    ),
    [community?.route_slug, communityId, isMobileWeb, preview?.route_slug],
  );
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } =
    useCommunityInteractionGate({
      previewLocale: contentLocale,
      routeKind: "community",
      uiLocale: locale,
    });
  const { connectedWallets } = usePiratePrivyWallets({
    enabled: Boolean(session?.user?.id),
  });
  const handleClaimCommunityId = previewCommunityId ?? community?.id ?? communityId;
  const handleNamespaces = useCommunityHandleNamespaces({
    api: api.communities,
    communityId: handleClaimCommunityId,
    enabled: Boolean(session?.accessToken),
  });
  const handleClaim = useCommunityHandleClaimController({
    api: api.communities,
    createAltchaChallenge: api.verification.createAltchaChallenge,
    communityId: previewCommunityId ?? communityId,
    namespaceVerificationId: handleNamespaces.selectedNamespaceVerification,
    connectedWallets,
    primaryWalletAddress: session?.profile.primary_wallet_address,
    settlementWalletAttachmentId: session?.user.primary_wallet_attachment,
  });
  const handleClaimModalActions = useHandleClaimModalActionHandlers({
    claimGateSummaries: handleClaim.claimGateSummaries,
    completeProofOfWorkGate: handleClaim.completeProofOfWorkGate,
    startGateVerification,
    startSelfVerification,
    startVerificationProvider,
  });
  const handleClaimDismissal = useCommunityHandleClaimDismissal(
    handleClaimCommunityId,
    handleNamespaces.selectedNamespaceVerification,
  );
  const voteGateData = React.useMemo(
    () => preview && eligibility
      ? {
          eligibility,
          gateMatchMode: preview.gate_match_mode ?? null,
          preview: {
            id: preview.id,
            display_name: preview.display_name,
            membership_gate_summaries: preview.membership_gate_summaries,
            viewer_community_role: preview.viewer_community_role ?? null,
            viewer_following: preview.viewer_following ?? false,
          },
        }
      : null,
    [eligibility, preview],
  );
  const membershipRequirementGroups = React.useMemo(
    () => voteGateData ? getRequirementGroups(voteGateData) : undefined,
    [voteGateData],
  );
  const membershipRequirementChoices = React.useMemo(
    () => membershipRequirementGroups
      ?.find((group) => group.mode === "any" && group.requirements.length > 1)
      ?.requirements ?? [],
    [membershipRequirementGroups],
  );
  const membershipProviderChoices = React.useMemo(
    () => eligibility?.status === "verification_required" && membershipRequirementChoices.length <= 1
      ? resolveAvailableHumanVerificationProviders(eligibility)
      : [],
    [eligibility, membershipRequirementChoices.length],
  );
  const {
    handleClaimModalOpen,
    handleClaimModalOpenChange,
    handleClaimNotNow,
    handleJoinRequestModalOpenChange,
    handleJoinRequestSubmit,
    handleProofOfWorkVerified,
    handlePrimaryJoinAction,
    joinRequestError,
    joinRequestModalOpen,
    joinRequestSubmitting,
    proofOfWorkModalOpen,
    proofOfWorkRetryKey,
    setProofOfWorkModalOpen,
    setVerificationChooserModalOpen,
    verificationChooserModalOpen,
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
    hasVerificationChoices:
      membershipRequirementChoices.length > 1 || membershipProviderChoices.length > 1,
    invalidateCommunityGate,
    onHandleClaimCheckError: (error) => {
      toast.error(getErrorMessage(error, "Could not check community names."));
    },
    sessionUserId: session?.user?.id,
  });
  const handleChooseJoinRequirement = React.useCallback(async (gate: MembershipGateSummary) => {
    // Keep the chooser open (with the chosen row loading) until the selected
    // flow has actually launched, and keep it open when the attempt could not
    // start or did not qualify so the remaining options stay reachable.
    const result = await startGateVerification(gate);
    if (result === "blocked") {
      return;
    }
    setVerificationChooserModalOpen(false);
    if (result === "altcha") {
      setProofOfWorkModalOpen(true);
    }
  }, [setProofOfWorkModalOpen, setVerificationChooserModalOpen, startGateVerification]);
  const handleChooseVerificationProvider = React.useCallback(async (
    provider: HumanVerificationProvider,
  ) => {
    const result = await startVerificationProvider(provider, {
      showToastOnError: true,
    });
    if (result === "started") setVerificationChooserModalOpen(false);
  }, [setVerificationChooserModalOpen, startVerificationProvider]);

  React.useEffect(() => {
    if (isImportedRoot) return;
    const canonicalCommunityId = community?.id ?? preview?.id;
    if (!canonicalCommunityId) return;
    replaceWithCanonicalCommunityRoute(
      canonicalCommunityId,
      community?.route_slug ?? preview?.route_slug,
      "threads",
    );
  }, [community?.id, community?.route_slug, isImportedRoot, preview?.id, preview?.route_slug]);

  const handleBuySong = React.useCallback(
    async (
      listing: ApiCommunityListing,
      titleText: string,
      assetLabel: "song" | "video" | "file" | "ticket" = "song",
    ) => {
      await buySong({
        assetLabel,
        communityId,
        listing,
        successMessage: ({ titleText: nextTitle }) => `${nextTitle} unlocked.`,
        titleText,
      });
    },
    [buySong, communityId],
  );

  React.useEffect(() => {
    let cancelled = false;
    const liveRoomRefs = posts.reduce<string[]>((result, post) => {
      const liveRoomId = post.post.anchor_live_room;
      if (liveRoomId) result.push(liveRoomId);
      return result;
    }, []);

    if (liveRoomRefs.length === 0) {
      setLiveRoomAccessById((current) => Object.keys(current).length === 0 ? current : {});
      setLiveRoomParticipantProfiles((current) => Object.keys(current).length === 0 ? current : {});
      return () => { cancelled = true; };
    }

    void Promise.all([...new Set(liveRoomRefs)].map(async (liveRoomId) => {
      const access = await (async () => {
        if (!session?.accessToken) {
          return api.publicCommunities.getLiveRoomAccess(communityId, liveRoomId);
        }
        try {
          return await api.communities.getLiveRoomAccess(communityId, liveRoomId);
        } catch {
          return api.publicCommunities.getLiveRoomAccess(communityId, liveRoomId);
        }
      })().catch(() => null);
      return access ? [liveRoomId, access] as const : null;
    }))
      .then((entries) => {
        if (cancelled) return;
        const accessById = Object.fromEntries(entries.filter((entry): entry is [string, ApiLiveRoomAccessResponse] => entry !== null));
        setLiveRoomAccessById(accessById);

        const participantIds = [...new Set(
          Object.values(accessById).flatMap((access) => [
            access.room.host_user,
            access.room.guest_user,
          ]).filter((userId): userId is string => Boolean(userId)),
        )];
        if (participantIds.length === 0) {
          setLiveRoomParticipantProfiles({});
          return;
        }

        void loadProfilesByUserId(api, participantIds, authorProfiles)
          .then((profiles) => {
            if (!cancelled) setLiveRoomParticipantProfiles(profiles);
          })
          .catch(() => {
            if (!cancelled) setLiveRoomParticipantProfiles({});
          });
      })
      .catch(() => {
        if (!cancelled) {
          setLiveRoomAccessById({});
          setLiveRoomParticipantProfiles({});
        }
      });

    return () => { cancelled = true; };
  }, [api, authorProfiles, communityId, posts, session?.accessToken]);

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
        joinLoading,
        veryLoading,
        selfLoading,
        zkPassportLoading,
        onJoin: async () => {
          await handleJoin();
        },
        onStartVeryVerification: startVeryVerification,
        onStartSelfVerification: async (gate) => {
          const result = await startSelfVerification({
            showToastOnError: true,
            verificationPlanningInput: gate.eligibility,
            skipModal: true,
          });
          return {
            started: result.started,
            openedModal: result.openedModal,
            href: result.href,
          };
        },
        onStartZkPassportVerification: async (gate) => {
          const result = await startZkPassportVerification({
            showToastOnError: true,
            verificationPlanningInput: gate.eligibility,
          });
          return { started: result.started };
        },
        onRequestable: () => handleJoinRequestModalOpenChange(true),
        invalidateCommunityGate,
      }),
    [
      interactionCopy,
      joinLoading,
      veryLoading,
      selfLoading,
      zkPassportLoading,
      handleJoin,
      startVeryVerification,
      startSelfVerification,
      startZkPassportVerification,
      handleJoinRequestModalOpenChange,
      invalidateCommunityGate,
    ],
  );

  const voteOnPost = useCommunityVoteAction({
    buildBlockedModalState,
    clearVote: api.posts.clearVote,
    communityId,
    gateData: voteGateData,
    locale: contentLocale,
    posts,
    runGatedCommunityAction,
    setPosts,
    vote: api.posts.vote,
  });

  const deletePost = React.useCallback(async (postId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;

    const previousPosts = posts;
    const targetPost = posts.find((postResponse) => postResponse.post.id === postId);
    setPosts((current) => current.filter((postResponse) => postResponse.post.id !== postId));
    try {
      await api.posts.delete(targetPost?.post.community ?? communityId, postId);
    } catch (nextError) {
      setPosts(previousPosts);
      toast.error(getErrorMessage(nextError, "Could not delete this post."));
    }
  }, [api.posts, communityId, posts, setPosts]);

  const removePost = React.useCallback(async (postId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Remove this post?")) return;

    const previousPosts = posts;
    const targetPost = posts.find((postResponse) => postResponse.post.id === postId);
    setPosts((current) => current.filter((postResponse) => postResponse.post.id !== postId));
    try {
      await api.posts.remove(targetPost?.post.community ?? communityId, postId);
    } catch (nextError) {
      setPosts(previousPosts);
      toast.error(getErrorMessage(nextError, "Could not remove this post."));
    }
  }, [api.posts, communityId, posts, setPosts]);

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
  const retryPublish = React.useCallback(async (postId: string) => {
    const previousPosts = posts;
    const targetPost = posts.find((postResponse) => postResponse.post.id === postId);
    setPosts((current) => current.map((postResponse) => (
      postResponse.post.id === postId
        ? {
            ...postResponse,
            post: {
              ...postResponse.post,
              status: "processing",
              publish_failure_code: null,
              publish_failure_message: null,
              publish_failure_retryable: null,
              publish_failed_at: null,
            },
          }
        : postResponse
    )));
    try {
      const updated = await api.communities.retryPostPublish(targetPost?.post.community ?? communityId, postId);
      setPosts((current) => current.map((postResponse) => (
        postResponse.post.id === postId ? { ...postResponse, post: updated } : postResponse
      )));
      void refetchPosts();
    } catch (nextError) {
      setPosts(previousPosts);
      toast.error(getErrorMessage(nextError, "Could not retry publish."));
    }
  }, [api.communities, communityId, posts, refetchPosts, setPosts]);
  const rememberedCommunityId = community?.id ?? preview?.id;
  const rememberedCommunityRouteSlug = community?.route_slug ?? preview?.route_slug;
  const rememberedCommunityTitle = community?.display_name ?? preview?.display_name;
  const rememberedCommunityAvatarRef = community?.avatar_ref ?? preview?.avatar_ref;

  React.useEffect(() => {
    if (!rememberedCommunityId || !rememberedCommunityTitle) return;
    rememberKnownCommunity({
      avatarSrc: rememberedCommunityAvatarRef ?? null,
      communityId: rememberedCommunityId,
      displayName: rememberedCommunityTitle,
      routeSlug: rememberedCommunityRouteSlug,
    });
  }, [
    rememberedCommunityAvatarRef,
    rememberedCommunityId,
    rememberedCommunityRouteSlug,
    rememberedCommunityTitle,
  ]);

  if (loading) {
    return <CommunityRouteLoadingState />;
  }
  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityRoutePage communityId={communityId} isImportedRoot={isImportedRoot} />;
    }
    if (isApiAuthError(error))
      return (
        <AuthRequiredRouteState
          description={copy.routeStatus.community.auth}
          title={pageTitle}
        />
      );
    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, copy.routeStatus.community.failure)}
        title={pageTitle}
      />
    );
  }
  if (!preview) {
    return (
      <RouteLoadFailureState
        description={copy.routeStatus.community.incomplete}
        title={pageTitle}
      />
    );
  }

  const joinActionLabel = eligibility ? getJoinCtaLabel(eligibility, { locale }) : copy.community.followLabel;
  const joinedActionLabel = getJoinCtaLabel({ status: "already_joined" } as ApiJoinEligibility, { locale });
  const joinActionDisabled =
    !eligibility ||
    !isJoinCtaActionable(eligibility);
  const canModeratePosts = canModerateCommunity;
  const feedItems = posts.map((post) => {
    const assetId = post.post.asset ?? undefined;
    const liveRoomId = post.post.anchor_live_room ?? undefined;
    const liveRoomAccess = liveRoomId ? liveRoomAccessById[liveRoomId] : undefined;
    const liveRoomListing = liveRoomId ? listingsByLiveRoomId[liveRoomId] : undefined;
    const liveRoomParticipants = buildLiveRoomParticipants({
      liveRoom: liveRoomAccess?.room,
      postAnonymousLabel: post.post.anonymous_label,
      postAuthorUserId: post.post.author_user,
      postIdentityMode: post.post.identity_mode,
      profilesByUserId: liveRoomProfilesByUserId,
    });
    const liveRoomGuestInviteStatus = liveRoomAccess?.access.guest_invite_status ?? null;
    const viewerIsLiveRoomHost = sameUserId(session?.user?.id, liveRoomAccess?.room.host_user)
      || Boolean(liveRoomId && sameUserId(session?.user?.id, post.post.author_user));
    const viewerIsLiveRoomGuest = sameUserId(session?.user?.id, liveRoomAccess?.room.guest_user);
    const liveRoomSeat = viewerIsLiveRoomHost
      ? "host" as const
      : viewerIsLiveRoomGuest && liveRoomGuestInviteStatus === "accepted"
        ? "guest" as const
        : null;
    const liveRoomFreedomHref = liveRoomSeat && liveRoomId
      ? buildLiveRoomFreedomHref({
        communityId,
        liveRoomId,
        postId: post.post.id,
        seat: liveRoomSeat,
      })
      : undefined;
    const genericListing = post.post.post_type === "file"
      ? (assetId ? listingsByAssetId[assetId] : undefined)
      : undefined;
    const genericListingStatus = genericListing?.status === "active"
      ? "active" as const
      : genericListing?.status === "paused"
        ? "paused" as const
        : undefined;
    const genericAssetOptions = post.post.post_type === "file"
      ? {
          accessState: genericListing
            ? (purchasesByAssetId[assetId ?? ""] || post.viewer_is_author) ? "available" as const : "unknown" as const
            : "purchase_required" as const,
          hasEntitlement: Boolean((assetId && purchasesByAssetId[assetId]) || post.viewer_is_author),
          listingMode: genericListing ? "listed" as const : "not_listed" as const,
          listingStatus: genericListingStatus,
          onBuy: genericListing
            ? () => void handleBuySong(
                genericListing,
                post.post.title ?? "Downloadable file",
                "file",
              )
            : undefined,
          onDownload: () => navigate(`/p/${encodeURIComponent(post.post.id)}`),
          priceLabel: genericListing?.price_cents === 100 ? "1 WIP" : genericListing?.price_cents != null ? `${genericListing.price_cents}¢ WIP` : undefined,
        }
      : undefined;
    const handleVerifyAge = () => {
      void startAgeSelfVerification({
        requestedCapabilities: ["age_over_18"],
        unavailableMessage: "Age verification is required to view 18+ content.",
      });
    };
    return toCommunityFeedItem(
      post,
      community ?? preview,
      liveRoomProfilesByUserId,
      post.post.post_type === "song" || post.post.post_type === "video"
        ? {
            currentUserId: session?.user?.id,
            listing: assetId ? listingsByAssetId[assetId] : undefined,
            localeTag,
            onBuy:
              assetId && listingsByAssetId[assetId]
                ? () =>
                    void handleBuySong(
                      listingsByAssetId[assetId]!,
                      post.post.title ??
                        (post.post.post_type === "video" ? "video" : "song"),
                      post.post.post_type === "video" ? "video" : "song",
                    )
                : undefined,
            playback: songPlayback,
            purchase: assetId ? purchasesByAssetId[assetId] : undefined,
          }
      : undefined,
      {
        genericAsset: genericAssetOptions,
        liveRoom: liveRoomId ? {
          access: liveRoomAccess,
          currentUserId: session?.user?.id,
          freedomDetected: freedomDetection.detected,
          freedomHref: liveRoomFreedomHref,
          guestInviteStatus: liveRoomGuestInviteStatus,
          listing: liveRoomListing,
          localeTag,
          onBuy: liveRoomListing ? () => void handleBuySong(
            liveRoomListing,
            liveRoomAccess?.room.title ?? post.post.title ?? "Live room",
            "ticket",
          ) : undefined,
          onWatch: () => navigate(`/p/${post.post.id}`),
          participants: liveRoomParticipants,
          producerRole: viewerIsLiveRoomHost
            ? "host"
            : viewerIsLiveRoomGuest
              ? "guest"
              : null,
          purchase: liveRoomId ? purchasesByLiveRoomId[liveRoomId] : undefined,
        } : undefined,
        onVerifyAge: handleVerifyAge,
        onComment: () => navigate(`/p/${post.post.id}`),
        onCancelEvent: () => void cancelEvent(post.post.id),
        canBoost: boostEligiblePostIds.has(post.post.id),
        canManageRewardSettings: Boolean(post.viewer_is_author && boostEligiblePostIds.has(post.post.id)),
        onBoost: () => {
          setBoostTarget({
            postId: post.post.id,
            viewerIsAuthor: Boolean(post.viewer_is_author),
          });
          setPendingBoostAction("boost");
        },
        onDelete: () => void deletePost(post.post.id),
        onRemove: () => void removePost(post.post.id),
        onRewardSettings: () => {
          setBoostTarget({
            postId: post.post.id,
            viewerIsAuthor: Boolean(post.viewer_is_author),
          });
          setPendingBoostAction("policy");
        },
        onRetryPublish: () => void retryPublish(post.post.id),
        onRefreshProcessing: () => void refreshProcessingPosts([post.post.id]),
        processingTimedOut: timedOutProcessingPostIds.has(post.post.id),
        canModeratePost: canModeratePosts,
        onVote: async (direction) => await voteOnPost(post.post.id, direction),
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
        viewerContentLocale: contentLocale,
      },
    );
  });

  const headerAction = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {ownsCommunity ? (
        <Button
          onClick={() => navigate(moderationEntryPath)}
          variant="secondary"
        >
          {modToolsLabel}
        </Button>
      ) : null}
      {!ownsCommunity && !viewerIsMember ? (
        <Button
          className={FOLLOW_BUTTON_CLASS_NAME}
          data-state={viewerFollowing ? "following" : "follow"}
          data-testid="community-follow-button"
          loading={followLoading}
          onClick={handleToggleFollow}
          variant={viewerFollowing ? "secondary" : "default"}
        >
          {viewerFollowing
            ? copy.community.followingLabel
            : copy.community.followLabel}
        </Button>
      ) : null}
      {!ownsCommunity && !canModerateCommunity && viewerIsMember ? (
        <Button disabled variant="secondary">
          {joinedActionLabel}
        </Button>
      ) : null}
      {!ownsCommunity && !canModerateCommunity && !viewerIsMember ? (
        <Button
          disabled={joinActionDisabled}
          loading={joinLoading || veryLoading || selfLoading || zkPassportLoading || passportLoading}
          onClick={handlePrimaryJoinAction}
          variant="secondary"
        >
          {joinActionLabel}
        </Button>
      ) : null}
      {!isMobileWeb && canCreatePost ? (
        <Button
          leadingIcon={<Plus className="size-5" />}
          onClick={() => navigate(communityCreatePostPath)}
        >
          {createPostLabel}
        </Button>
      ) : null}
    </div>
  );
  const mobileHeaderAction = canCreatePost ? (
    <IconButton
      aria-label={createPostLabel}
      onClick={() => navigate(communityCreatePostPath)}
      variant="ghost"
    >
      <Plus className="size-6" weight="bold" />
    </IconButton>
  ) : null;
  const routeLabel = formatCommunityRouteLabel(
    community?.id ?? preview.id,
    community?.route_slug ?? preview.route_slug,
  );
  const communityHandleLabel = communityHandleFromRouteLabel(routeLabel);
  const previewSidebar = buildCommunityPreviewSidebar(preview, locale);
  const communityTitle = community?.display_name ?? preview.display_name;
  const communityAvatarRef = community?.avatar_ref ?? preview.avatar_ref;
  const communityBannerRef = community?.banner_ref ?? preview.banner_ref;
  return (
    <>
      {gateModal}
      {purchaseModal}
      <SongBountiesSheet {...boostController.bountiesSheetProps} />
      <BoostCampaignSheet {...boostController.sheetProps} />
      <SongRewardPolicySheet {...boostController.policySheetProps} />
      <HandleClaimModal
        claimedLabel={handleClaim.claimedLabel ?? undefined}
        communityHandle={communityHandleLabel}
        communityName={communityTitle}
        communityRouteLabel={routeLabel}
        namespaceOptions={handleNamespaces.namespaceOptions}
        onNamespaceChange={handleNamespaces.setSelectedNamespaceVerification}
        selectedNamespaceVerification={handleNamespaces.selectedNamespaceVerification}
        error={handleClaim.error}
        forceMobile={isMobileWeb}
        onClaim={handleClaim.onClaim}
        onClaimGateRecheck={handleClaim.refreshQuote}
        {...handleClaimModalActions}
        onNotNow={handleClaimNotNow}
        onOpenChange={handleClaimModalOpenChange}
        onSearchChange={handleClaim.onSearchChange}
        open={handleClaimModalOpen}
        phase={handleClaim.phase}
        processing={handleClaim.processing}
        searchResult={handleClaim.searchResult}
        searchValue={handleClaim.searchValue}
      />
      <CommunityJoinRequestModal
        communityName={communityTitle}
        error={joinRequestError}
        onOpenChange={handleJoinRequestModalOpenChange}
        onSubmit={handleJoinRequestSubmit}
        open={joinRequestModalOpen}
        submitting={joinRequestSubmitting || joinLoading}
      />
      <CommunityJoinVerificationChooserModal
        choices={membershipProviderChoices.length > 1 ? [] : membershipRequirementChoices}
        locale={locale}
        onChoose={handleChooseJoinRequirement}
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
          error={joinError}
          locale={locale}
          onContinue={async () => {
            await handlePrimaryJoinAction();
          }}
          onOpenChange={setProofOfWorkModalOpen}
          onPayloadChange={setAltchaPayload}
          onVerified={handleProofOfWorkVerified}
          open={proofOfWorkModalOpen}
          retryKey={proofOfWorkRetryKey}
          requirements={preview?.membership_gate_summaries}
          requirementsMode={preview?.gate_match_mode ?? null}
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
      <ZkPassportVerificationModal
        actionLabel="Open ZKPassport"
        checkLoading={zkPassportLoading}
        description="Verify with ZKPassport to continue."
        error={zkPassportError}
        href={zkPassportHref}
        onCheckPending={checkZkPassportPendingVerification}
        onOpenChange={handleZkPassportModalOpenChange}
        open={zkPassportModalOpen}
        title="Verify with ZKPassport"
      />
      {ageSelfPrompt ? (
        <SelfVerificationModal
          actionLabel={ageSelfPrompt.actionLabel}
          description={ageSelfPrompt.description}
          error={ageSelfError}
          href={ageSelfPrompt.href}
          onOpenChange={handleAgeSelfModalOpenChange}
          onQrError={handleAgeSelfQrError}
          onQrSuccess={handleAgeSelfQrSuccess}
          open={ageSelfModalOpen}
          selfApp={ageSelfPrompt.selfApp}
          title={ageSelfPrompt.title}
        />
      ) : null}
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <CommunityPageShell
          activeSort={activeSort}
          avatarSrc={communityAvatarRef ?? undefined}
          availableSorts={sortOptions}
          bannerSrc={communityBannerRef ?? undefined}
          communityId={community?.id ?? preview.id}
          headerAction={headerAction}
          hasMore={hasMore}
          items={feedItems}
          loadingMore={loadingMore}
          loadMoreError={loadMoreError ? getErrorMessage(loadMoreError, "Could not load more posts.") : null}
          loadMoreLabel={copy.common.loadMore}
          mobileHeaderAction={mobileHeaderAction} navigation={<CommunitySurfaceNavigation active="threads" communityId={community?.id ?? preview.id} routeSlug={community?.route_slug ?? preview.route_slug} />}
          onLoadMore={() => void loadMore()}
          onSortChange={setActiveSort}
          routeLabel={routeLabel}
          routeVerified={Boolean(community?.namespace_verification)}
          sidebar={{
            ...(community ? buildCommunitySidebar(community, locale, eligibility) : buildCommunityPreviewSidebar(preview, locale, eligibility)),
            followerCount,
            memberCount: preview.member_count ?? null,
            owner: previewSidebar.owner,
            moderators: previewSidebar.moderators,
            requirements: buildCommunitySidebarRequirements({
              defaultAgeGatePolicy: community?.default_age_gate_policy ?? "none",
              gateSummaries: preview.membership_gate_summaries,
              locale,
            }),
            namespacePanel: ownsCommunity
              ? {
                  routeLabel,
                  status: community?.namespace_verification
                    ? "verified"
                    : community?.pending_namespace_verification_session
                      ? "pending"
                      : "available",
                  onOpen: community?.namespace_verification
                    ? undefined
                    : () =>
                        navigate(
                          buildCommunityModerationPath(
                            communityId,
                            "namespace",
                            community?.route_slug ?? preview.route_slug,
                          ),
                        ),
                }
              : null,
          }}
          title={communityTitle}
        />
      </section>
    </>
  );
}
