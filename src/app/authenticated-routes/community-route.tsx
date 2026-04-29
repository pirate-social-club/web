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
import { CommunityMembershipGatePanel } from "@/components/compositions/community/membership-gate-panel/community-membership-gate-panel";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage } from "@/lib/identity-gates";
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
import {
  submitOptimisticPostVote,
  updateCommunityPostVote,
} from "@/app/authenticated-helpers/post-vote";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import {
  AuthRequiredRouteState,
  RouteLoadFailureState,
} from "@/app/authenticated-helpers/route-shell";
import { useSongPurchaseFlow } from "@/app/authenticated-helpers/song-purchase";
import {
  useSongCommerceState,
  useSongPlayback,
} from "@/app/authenticated-helpers/song-commerce";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";

const FOLLOW_BUTTON_CLASS_NAME = "min-w-32";

export function CommunityPage({ communityId }: { communityId: string }) {
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
    session?.user?.user_id === community?.created_by_user_id;
  const canCreatePost =
    ownsCommunity || eligibility?.status === "already_joined";
  const commerceEnabled = Boolean(session?.user?.user_id) && canCreatePost;
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
  const [followLoading, setFollowLoading] = React.useState(false);
  const [followState, setFollowState] = React.useState<{
    communityId: string;
    followerCount: number | null;
    viewerFollowing: boolean;
  } | null>(null);
  const previewCommunityId = preview?.community_id ?? null;
  const viewerFollowing =
    followState?.communityId === previewCommunityId
      ? followState.viewerFollowing
      : Boolean(preview?.viewer_following);
  const followerCount =
    followState?.communityId === previewCommunityId
      ? followState.followerCount
      : (preview?.follower_count ?? null);
  const markViewerJoined = React.useCallback(() => {
    setFollowState((current) => ({
      communityId: previewCommunityId ?? communityId,
      followerCount:
        current?.communityId === (previewCommunityId ?? communityId)
          ? current.followerCount
          : (preview?.follower_count ?? null),
      viewerFollowing: true,
    }));
  }, [communityId, preview?.follower_count, previewCommunityId]);
  const {
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
    veryLoading,
  } = useCommunityJoinVerification({
    communityId,
    eligibility,
    locale,
    onJoined: markViewerJoined,
    refetchEligibility,
  });
  const [joinRequestModalOpen, setJoinRequestModalOpen] = React.useState(false);
  const [joinRequestSubmitting, setJoinRequestSubmitting] =
    React.useState(false);
  const [joinRequestError, setJoinRequestError] = React.useState<string | null>(
    null,
  );
  const communityCreatePostPath = React.useMemo(
    () =>
      community
        ? `${buildCommunityPath(community.community_id, community.route_slug ?? preview?.route_slug)}/submit`
        : `${buildCommunityPath(communityId)}/submit`,
    [community, communityId, preview?.route_slug],
  );
  const moderationEntryPath = React.useMemo(
    () => buildCommunityModerationEntryPath(communityId, isMobileWeb),
    [communityId, isMobileWeb],
  );
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } =
    useCommunityInteractionGate({
      previewLocale: contentLocale,
      routeKind: "community",
      uiLocale: locale,
    });

  React.useEffect(() => {
    if (!preview) return;
    setFollowState({
      communityId: preview.community_id,
      followerCount: preview.follower_count ?? null,
      viewerFollowing: Boolean(preview.viewer_following),
    });
  }, [
    preview?.community_id,
    preview?.follower_count,
    preview?.viewer_following,
  ]);

  const handleJoinRequestModalOpenChange = React.useCallback(
    (open: boolean) => {
      setJoinRequestModalOpen(open);
      if (open) {
        setJoinRequestError(null);
      }
    },
    [],
  );

  const openJoinRequestModal = React.useCallback(() => {
    setJoinRequestError(null);
    setJoinRequestModalOpen(true);
  }, []);

  const handlePrimaryJoinAction = React.useCallback(async () => {
    if (eligibility?.status === "requestable") {
      openJoinRequestModal();
      return;
    }
    await handleJoin();
  }, [eligibility?.status, handleJoin, openJoinRequestModal]);

  const handleJoinRequestSubmit = React.useCallback(
    async (note: string) => {
      setJoinRequestSubmitting(true);
      setJoinRequestError(null);
      try {
        const result = await handleJoin({ note });
        if (result === "requested" || result === "joined") {
          invalidateCommunityGate(communityId);
          setJoinRequestModalOpen(false);
        } else if (result === "failed") {
          setJoinRequestError("Could not submit your request. Try again.");
        }
      } finally {
        setJoinRequestSubmitting(false);
      }
    },
    [communityId, handleJoin, invalidateCommunityGate],
  );

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

  const handleToggleFollow = React.useCallback(async () => {
    setFollowLoading(true);
    try {
      const result = viewerFollowing
        ? await api.communities.unfollow(communityId)
        : await api.communities.follow(communityId);
      setFollowState({
        communityId: result.community_id,
        followerCount: result.follower_count ?? null,
        viewerFollowing: result.following,
      });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Follow failed"));
    } finally {
      setFollowLoading(false);
    }
  }, [api, communityId, viewerFollowing]);

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
            missingCapabilities: gate.eligibility.missing_capabilities,
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
        onRequestable: () => openJoinRequestModal(),
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
      openJoinRequestModal,
      invalidateCommunityGate,
    ],
  );

  const voteOnPost = React.useCallback(
    async (postId: string, direction: "up" | "down" | null) => {
      if (!preview || !eligibility) return;
      await runGatedCommunityAction({
        action: "vote_post",
        buildBlockedModalState,
        communityId,
        gateData: {
          eligibility,
          preview: {
            community_id: preview.community_id,
            display_name: preview.display_name,
            membership_gate_summaries: preview.membership_gate_summaries,
          },
        },
        onAllowed: async () => {
          const previousPost = posts.find(
            (postResponse) => postResponse.post.post_id === postId,
          );
          await submitOptimisticPostVote({
            direction,
            onApply: (nextValue) =>
              setPosts((current) =>
                updateCommunityPostVote(current, postId, nextValue),
              ),
            onRollback: (restoredPost) =>
              setPosts((current) =>
                current.map((postResponse) =>
                  postResponse.post.post_id === postId
                    ? restoredPost
                    : postResponse,
                ),
              ),
            postId,
            previousPost: previousPost ?? null,
            requestIdsRef: voteRequestIdsRef,
            vote: api.posts.vote,
          });
        },
        postId,
      });
    },
    [
      api.posts.vote,
      buildBlockedModalState,
      communityId,
      eligibility,
      posts,
      preview,
      runGatedCommunityAction,
      setPosts,
    ],
  );

  if (loading) {
    return <CommunityRouteLoadingState />;
  }
  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityRoutePage communityId={communityId} />;
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
  if (!preview || !community) {
    return (
      <RouteLoadFailureState
        description={copy.routeStatus.community.incomplete}
        title={pageTitle}
      />
    );
  }

  const joinActionLabel =
    eligibility?.status === "already_joined"
      ? "Joined"
      : eligibility?.status === "pending_request"
        ? "Request pending"
        : eligibility?.status === "requestable"
          ? "Request to Join"
          : "Join";
  const joinActionDisabled =
    !eligibility ||
    eligibility.status === "already_joined" ||
    eligibility.status === "pending_request" ||
    eligibility.status === "gate_failed" ||
    eligibility.status === "banned";
  const feedItems = posts.map((post) => {
    const assetId = post.post.asset_id ?? undefined;
    return toCommunityFeedItem(
      post,
      authorProfiles,
      post.post.post_type === "song" || post.post.post_type === "video"
        ? {
            currentUserId: session?.user?.user_id,
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
        onComment: () => navigate(`/p/${post.post.post_id}`),
        onVote: (direction) => void voteOnPost(post.post.post_id, direction),
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
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
      {!ownsCommunity ? (
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
    community.community_id,
    community.route_slug ?? preview.route_slug,
  );
  const previewSidebar = buildCommunityPreviewSidebar(preview, locale);

  return (
    <>
      {gateModal}
      {purchaseModal}
      <CommunityJoinRequestModal
        communityName={community.display_name}
        error={joinRequestError}
        onOpenChange={handleJoinRequestModalOpenChange}
        onSubmit={handleJoinRequestSubmit}
        open={joinRequestModalOpen}
        submitting={joinRequestSubmitting || joinLoading}
      />
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
            verificationError={selfError}
            verificationLoading={selfLoading}
            onJoin={handlePrimaryJoinAction}
          />
        ) : null}
        <CommunityPageShell
          activeSort={activeSort}
          avatarSrc={community.avatar_ref ?? undefined}
          availableSorts={sortOptions}
          bannerSrc={community.banner_ref ?? undefined}
          communityId={community.community_id}
          headerAction={headerAction}
          items={feedItems}
          onSortChange={setActiveSort}
          routeLabel={routeLabel}
          routeVerified={Boolean(community.namespace_verification_id)}
          sidebar={{
            ...buildCommunitySidebar(community, locale),
            followerCount,
            memberCount: preview.member_count ?? null,
            owner: previewSidebar.owner,
            moderators: previewSidebar.moderators,
            requirements: buildCommunitySidebarRequirements({
              defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
              gateSummaries: preview.membership_gate_summaries,
              locale,
            }),
            namespacePanel: ownsCommunity
              ? {
                  routeLabel,
                  status: community.namespace_verification_id
                    ? "verified"
                    : community.pending_namespace_verification_session_id
                      ? "pending"
                      : "available",
                  onOpen: community.namespace_verification_id
                    ? undefined
                    : () =>
                        navigate(
                          buildCommunityModerationPath(
                            communityId,
                            "namespace",
                          ),
                        ),
                }
              : null,
          }}
          title={community.display_name}
        />
      </section>
    </>
  );
}
