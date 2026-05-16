"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
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
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage, getJoinCtaLabel, getMissingCapabilitiesFromGateEvaluation, isJoinCtaActionable } from "@/lib/identity-gates";
import { createCommunityBlockedModalStateFactory } from "@/hooks/use-community-interaction-gate.helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";

import { useCommunityPageData } from "@/app/authenticated-data/community-data";
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
import { toCommunityFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { useCommunityMembershipActions } from "@/hooks/use-community-membership-actions";
import { useCommunityVoteAction } from "@/hooks/use-community-vote-action";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
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
import {
  communityHandleFromRouteLabel,
  useCommunityHandleClaimDismissal,
} from "@/lib/community-handle-claim-dismissal";

const FOLLOW_BUTTON_CLASS_NAME = "min-w-32";

function sameUserId(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  return left === right || left.replace(/^(usr_)+/, "") === right.replace(/^(usr_)+/, "");
}

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
    loading,
    posts,
    refetchEligibility,
    setPosts,
  } = useCommunityPageData(communityId, contentLocale, activeSort);
  const ownsCommunity =
    session?.user?.id === community?.created_by_user;
  const canModerateCommunity = viewerCanModerateCommunity(session?.user?.id, preview);
  const canCreatePost =
    ownsCommunity
    || canModerateCommunity
    || eligibility?.status === "already_joined"
    || preview?.viewer_membership_status === "member";
  const commerceEnabled = Boolean(session?.user?.id) && canCreatePost;
  const {
    listingsByAssetId,
    purchasesByAssetId,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(communityId, commerceEnabled);
  const { buySong, purchaseModal } = useSongPurchaseFlow({
    commerceEnabled,
    refreshSongCommerce,
  });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
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
      assetLabel: "song" | "video" = "song",
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
  const joinActionDisabled =
    !eligibility ||
    !isJoinCtaActionable(eligibility);
  const canModeratePosts = canModerateCommunity;
  const feedItems = posts.map((post) => {
    const assetId = post.post.asset ?? undefined;
    const handleVerifyAge = () => {
      void startAgeSelfVerification({
        requestedCapabilities: ["age_over_18"],
        unavailableMessage: "Age verification is required to view 18+ content.",
      });
    };
    return toCommunityFeedItem(
      post,
      authorProfiles,
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
        onVerifyAge: handleVerifyAge,
        onComment: () => navigate(`/p/${post.post.id}`),
        onRemove: () => void removePost(post.post.id),
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
      {!ownsCommunity ? (
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
      {!ownsCommunity && !canModerateCommunity ? (
        <Button
          disabled={joinActionDisabled}
          loading={joinLoading || veryLoading || selfLoading || passportLoading}
          onClick={handlePrimaryJoinAction}
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
          {createPostLabel}
        </Button>
      ) : null}
    </div>
  );
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
          continueDisabled={!altchaPayload}
          continueLoading={joinLoading}
          description="This usually takes a few seconds and runs only on this device."
          locale={locale}
          onContinue={async () => {
            setProofOfWorkModalOpen(false);
            await handlePrimaryJoinAction();
          }}
          onOpenChange={setProofOfWorkModalOpen}
          onPayloadChange={setAltchaPayload}
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
    </>
  );
}
