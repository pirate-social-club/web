"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";
import { Plus } from "@phosphor-icons/react";

import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { CommunityRouteLoadingState } from "@/app/route-loading-states";
import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildCommunityPath,
  formatCommunityRouteLabel,
} from "@/lib/community-routing";
import { replaceWithCanonicalCommunityRoute } from "@/app/community-route-canonicalization";
import { CommunityMembershipGatePanel } from "@/components/compositions/community/membership-gate-panel/community-membership-gate-panel";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { HandleClaimModal } from "@/components/compositions/community/handle-claim-modal/handle-claim-modal";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { CommunityProofOfWorkModal } from "@/components/compositions/community/proof-of-work-modal/community-proof-of-work-modal";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage, getJoinCtaLabel, getMissingCapabilitiesFromGateEvaluation, isJoinCtaActionable } from "@/lib/identity-gates";
import { createCommunityBlockedModalStateFactory } from "@/hooks/use-community-interaction-gate.helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";

import { loadProfilesByUserId, useCommunityPageData } from "@/app/authenticated-data/community-data";
import { buildLiveRoomFreedomHref } from "@/app/authenticated-helpers/live-room-launch";
import {
  buildCommunityPreviewSidebar,
  buildCommunitySidebar,
  buildCommunitySidebarRequirements,
  getNamespaceActionLabel,
} from "@/app/authenticated-helpers/community-sidebar-helpers";
import {
  buildCommunityModerationEntryPath,
  buildCommunityModerationPath,
} from "@/app/authenticated-helpers/moderation-helpers";
import { buildLiveRoomParticipants } from "@/app/authenticated-helpers/post-live-room-participants";
import { getActiveCommunityLabels, PostLabelDialog } from "@/app/authenticated-helpers/post-label-dialog";
import { toCommunityFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { useCommunityMembershipActions } from "@/hooks/use-community-membership-actions";
import { useCommunityVoteAction } from "@/hooks/use-community-vote-action";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import { getPirateNetworkConfig } from "@/lib/network-config";
import {
  AuthRequiredRouteState,
  RouteLoadFailureState,
} from "@/app/authenticated-helpers/route-shell";
import { useSongPurchaseFlow } from "@/app/authenticated-helpers/song-purchase";
import { useCommunityHandleClaimController } from "@/app/authenticated-helpers/community-handle-claim";
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

function readActiveFlairId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("flair")?.trim() || null;
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
  const storyNetwork = React.useMemo(() => getPirateNetworkConfig().story.network, []);
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
  const [activeFlairId, setActiveFlairId] = React.useState<string | null>(() => readActiveFlairId());
  React.useEffect(() => {
    const handleLocationChange = () => setActiveFlairId(readActiveFlairId());
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);
  const {
    authorProfiles,
    community,
    preview,
    eligibility,
    error,
    loading,
    posts,
    refetchEligibility,
    setPosts,
  } = useCommunityPageData(communityId, contentLocale, activeSort, activeFlairId);
  const ownsCommunity =
    session?.user?.id === community?.created_by_user;
  const canModerateCommunity = viewerCanModerateCommunity(session?.user?.id, preview);
  const viewerIsMember =
    eligibility?.status === "already_joined"
    || preview?.viewer_membership_status === "member";
  const previewCommunityId = preview?.id ?? null;
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
    recordPurchaseSettlement,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(communityId, commerceEnabled);
  const { buySong, purchaseModal } = useSongPurchaseFlow({
    commerceEnabled,
    onSettledPurchase: recordPurchaseSettlement,
    refreshSongCommerce,
  });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [liveRoomAccessById, setLiveRoomAccessById] = React.useState<Record<string, ApiLiveRoomAccessResponse | undefined>>({});
  const [liveRoomParticipantProfiles, setLiveRoomParticipantProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [freedomDetection, setFreedomDetection] = React.useState(() => getFreedomBrowserDetectionSnapshot());
  const [labelTargetPost, setLabelTargetPost] = React.useState<typeof posts[number] | null>(null);
  const [labelSaving, setLabelSaving] = React.useState(false);
  const liveRoomProfilesByUserId = React.useMemo(
    () => ({ ...authorProfiles, ...liveRoomParticipantProfiles }),
    [authorProfiles, liveRoomParticipantProfiles],
  );

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
    handleJoin,
    handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    joinError,
    joinLoading,
    joinRequested,
    passportLoading,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startSelfVerification,
    startVeryVerification,
    setAltchaPayload,
    veryLoading,
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
  const handleClaim = useCommunityHandleClaimController({
    api: api.communities,
    communityId: previewCommunityId ?? communityId,
    connectedWallets,
    primaryWalletAddress: session?.profile.primary_wallet_address,
    settlementWalletAttachmentId: session?.user.primary_wallet_attachment,
  });
  const handleClaimCommunityId = previewCommunityId ?? community?.id ?? communityId;
  const handleClaimDismissal = useCommunityHandleClaimDismissal(handleClaimCommunityId);
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
    setProofOfWorkModalOpen,
  } = useCommunityMembershipActions({
    altchaPayload,
    altchaRequired,
    communityId,
    eligibility,
    handleClaim,
    handleClaimApi: api.communities,
    handleClaimCommunityId,
    handleClaimDismissal,
    handleJoin,
    invalidateCommunityGate,
    onHandleClaimCheckError: (error) => {
      toast.error(getErrorMessage(error, "Could not check community names."));
    },
    sessionUserId: session?.user?.id,
  });

  React.useEffect(() => {
    if (isImportedRoot) return;
    const canonicalCommunityId = community?.id ?? preview?.id;
    if (!canonicalCommunityId) return;
    replaceWithCanonicalCommunityRoute(
      canonicalCommunityId,
      community?.route_slug ?? preview?.route_slug,
    );
  }, [community?.id, community?.route_slug, isImportedRoot, preview?.id, preview?.route_slug]);

  const handleBuySong = React.useCallback(
    async (
      listing: ApiCommunityListing,
      titleText: string,
      assetLabel: "song" | "video" | "ticket" = "song",
    ) => {
      await buySong({
        assetLabel,
        communityId,
        listing,
        successMessage: ({ titleText: nextTitle }) => `${nextTitle} unlocked.`,
        titleText,
        vinylReleaseAvailable: assetLabel === "song" && listing.vinyl_release_available === true,
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
      setLiveRoomAccessById({});
      setLiveRoomParticipantProfiles({});
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
        onJoin: async () => {
          await handleJoin();
        },
        onStartVeryVerification: startVeryVerification,
        onStartSelfVerification: async (gate) => {
          const result = await startSelfVerification({
            showToastOnError: true,
            missingCapabilities: getMissingCapabilitiesFromGateEvaluation(gate.eligibility),
            membershipGateSummaries:
              gate.eligibility.membership_gate_summaries,
            skipModal: true,
          });
          return {
            started: result.started,
            openedModal: result.openedModal,
            href: result.href,
          };
        },
        onRequestable: () => handleJoinRequestModalOpenChange(true),
        invalidateCommunityGate,
      }),
    [
      interactionCopy,
      joinLoading,
      veryLoading,
      selfLoading,
      handleJoin,
      startVeryVerification,
      startSelfVerification,
      handleJoinRequestModalOpenChange,
      invalidateCommunityGate,
    ],
  );

  const voteGateData = React.useMemo(
    () => preview && eligibility
      ? {
          eligibility,
          preview: {
            id: preview.id,
            display_name: preview.display_name,
            membership_gate_summaries: preview.membership_gate_summaries,
          },
        }
      : null,
    [
      eligibility,
      preview,
    ],
  );
  const voteOnPost = useCommunityVoteAction({
    buildBlockedModalState,
    communityId,
    gateData: voteGateData,
    posts,
    runGatedCommunityAction,
    setPosts,
    vote: api.posts.vote,
  });

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

  const activeLabels = React.useMemo(() => getActiveCommunityLabels(community ?? preview), [community, preview]);

  const setPostLabel = React.useCallback(async (labelId: string | null) => {
    if (!labelTargetPost) return;
    setLabelSaving(true);
    try {
      const updated = await api.posts.setLabel(
        labelTargetPost.post.community ?? communityId,
        labelTargetPost.post.id,
        labelId,
      );
      setPosts((current) => current.map((postResponse) =>
        postResponse.post.id === updated.post.id ? updated : postResponse
      ));
      setLabelTargetPost(null);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, "Could not update tag."));
    } finally {
      setLabelSaving(false);
    }
  }, [api.posts, communityId, labelTargetPost, setPosts]);

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
    const canSetPostLabel = activeLabels.length > 0;
    const assetId = post.post.asset ?? undefined;
    const liveRoomId = post.post.anchor_live_room ?? undefined;
    const liveRoomAccess = liveRoomId ? liveRoomAccessById[liveRoomId] : undefined;
    const liveRoomListing = liveRoomId ? listingsByLiveRoomId[liveRoomId] : undefined;
    const liveRoomParticipants = buildLiveRoomParticipants({
      liveRoom: liveRoomAccess?.room,
      postAuthorUserId: post.post.author_user,
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
    const handleVerifyAge = () => {
      void startAgeSelfVerification({
        requestedCapabilities: ["age_over_18"],
        unavailableMessage: "Age verification is required to view 18+ content.",
      });
    };
    return toCommunityFeedItem(
      post,
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
            storyNetwork,
          }
      : undefined,
      {
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
        onDelete: () => void deletePost(post.post.id),
        onRemove: () => void removePost(post.post.id),
        onSetLabel: canSetPostLabel ? () => setLabelTargetPost(post) : undefined,
        canModeratePost: canModeratePosts,
        onVote: (direction) => void voteOnPost(post.post.id, direction),
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
          loading={joinLoading || veryLoading || selfLoading || passportLoading}
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
    <>
      <IconButton
        aria-label={createPostLabel}
        onClick={() => navigate(communityCreatePostPath)}
        variant="ghost"
      >
        <Plus className="size-6" weight="bold" />
      </IconButton>
    </>
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
      <HandleClaimModal
        claimedLabel={handleClaim.claimedLabel ?? undefined}
        communityHandle={communityHandleLabel}
        communityName={communityTitle}
        communityRouteLabel={routeLabel}
        error={handleClaim.error}
        forceMobile={isMobileWeb}
        onClaim={handleClaim.onClaim}
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
      {altchaRequired ? (
        <CommunityProofOfWorkModal
          action={altchaAction}
          continueLoading={joinLoading}
          description="This usually takes a few seconds and runs only on this device."
          locale={locale}
          onOpenChange={setProofOfWorkModalOpen}
          onPayloadChange={setAltchaPayload}
          onVerified={async (payload) => {
            await handleJoin({ altchaPayload: payload });
            setProofOfWorkModalOpen(false);
          }}
          open={proofOfWorkModalOpen}
          requirements={preview?.membership_gate_summaries}
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
        {preview.membership_gate_summaries.length > 0 && !canCreatePost ? (
          <CommunityMembershipGatePanel
            eligibility={eligibility}
            gates={preview.membership_gate_summaries}
            joinError={
              joinError ??
              (eligibility?.status === "gate_failed" &&
              eligibility.failure_reason
                ? getGateFailureMessage(eligibility, { locale })
                : null)
            }
            joinLoading={joinLoading}
            joinRequested={joinRequested}
            locale={locale}
            verificationError={selfError}
            verificationLoading={selfLoading}
            onJoin={handlePrimaryJoinAction}
          />
        ) : null}
        <CommunityPageShell
          activeSort={activeSort}
          avatarSrc={communityAvatarRef ?? undefined}
          availableSorts={sortOptions}
          bannerSrc={communityBannerRef ?? undefined}
          communityId={community?.id ?? preview.id}
          headerAction={headerAction}
          items={feedItems}
          mobileHeaderAction={mobileHeaderAction}
          onSortChange={setActiveSort}
          routeLabel={routeLabel}
          routeVerified={Boolean(community?.namespace_verification)}
          sidebar={{
            ...(community ? buildCommunitySidebar(community, locale) : buildCommunityPreviewSidebar(preview, locale)),
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
      <PostLabelDialog
        busy={labelSaving}
        labels={activeLabels}
        onOpenChange={(open) => {
          if (!open && !labelSaving) setLabelTargetPost(null);
        }}
        onSubmit={(labelId) => void setPostLabel(labelId)}
        open={Boolean(labelTargetPost)}
        post={labelTargetPost}
      />
    </>
  );
}
