"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { VerificationSession } from "@pirate/api-contracts";
import { Plus } from "@phosphor-icons/react";

import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { isApiAuthError, isApiNotFoundError, type ApiError } from "@/lib/api/client";
import { CommunityMembershipGatePanel } from "@/components/compositions/community-membership-gate-panel/community-membership-gate-panel";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage, getJoinCtaLabel, getVerificationCapabilitiesForProvider, getVerificationPromptCopy, resolveSuggestedVerificationProvider } from "@/lib/identity-gates";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getSelfVerificationLaunchHref, parseSelfCallback } from "@/lib/self-verification";
import { useUiLocale } from "@/lib/ui-locale";

import { useCommunityPageData } from "./community-data";
import {
  buildCommunitySidebar,
  buildCommunitySidebarRequirements,
  getCommunityActionLabel,
  getNamespaceActionLabel,
} from "./community-sidebar-helpers";
import { clearPendingSelfJoinSession, readPendingSelfJoinSession, writePendingSelfJoinSession } from "./community-session-helpers";
import {
  buildCommunityModerationPath,
  buildDefaultCommunityModerationPath,
} from "./moderation-helpers";
import { toCommunityFeedItem } from "./post-presentation";
import { submitOptimisticPostVote, updateCommunityPostVote } from "./post-vote";
import { buildFeedSortOptions, getErrorMessage, useRouteContentLocale, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "./route-shell";
import { useSongPurchase } from "./song-purchase";
import { useSongCommerceState, useSongPlayback } from "./song-commerce";
import { useCommunityInteractionGate } from "./community-interaction-gate";

export function CommunityPage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const { copy, localeTag } = useRouteMessages();
  const pageTitle = copy.community.title;
  const createPostLabel = copy.community.createPostLabel;
  const modToolsLabel = copy.community.modToolsLabel;
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const contentLocale = useRouteContentLocale();
  const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
  const { authorProfiles, community, preview, eligibility, error, loading, posts, refetchEligibility, setPosts } = useCommunityPageData(communityId, contentLocale, activeSort);
  const commerceEnabled = Boolean(session?.user?.user_id) && eligibility?.status === "already_joined";
  const { listingsByAssetId, purchasesByAssetId, refresh: refreshSongCommerce } = useSongCommerceState(communityId, commerceEnabled);
  const buySong = useSongPurchase({ commerceEnabled, refreshSongCommerce });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [joinLoading, setJoinLoading] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinRequested, setJoinRequested] = React.useState(false);
  const [selfSession, setSelfSession] = React.useState<VerificationSession | null>(null);
  const [selfRequestedCapabilities, setSelfRequestedCapabilities] = React.useState<ApiJoinEligibility["missing_capabilities"]>([]);
  const [selfLoading, setSelfLoading] = React.useState(false);
  const [selfError, setSelfError] = React.useState<string | null>(null);
  const [selfModalOpen, setSelfModalOpen] = React.useState(false);
  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      if (updatedEligibility.status === "joinable" || updatedEligibility.status === "requestable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") setJoinRequested(true);
        await refetchEligibility();
      }
    },
  });
  const ownsCommunity = session?.user?.user_id === community?.created_by_user_id;
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "community",
    uiLocale: locale,
  });

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string) => {
    await buySong({
      communityId,
      listing,
      successMessage: ({ titleText: nextTitle }) => `${nextTitle} unlocked.`,
      titleText,
    });
  }, [buySong, communityId]);

  const startSelfVerification = React.useCallback(async ({ showToastOnError = false, missingCapabilities }: {
    showToastOnError?: boolean;
    missingCapabilities?: string[] | null;
  } = {}) => {
    const rawCapabilities = missingCapabilities ?? eligibility?.missing_capabilities ?? [];
    const requestedCapabilities = getVerificationCapabilitiesForProvider(
      { missing_capabilities: rawCapabilities.filter((c): c is ApiJoinEligibility["missing_capabilities"][number] => ["unique_human", "age_over_18", "nationality", "gender"].includes(c as string)) },
      "self",
    );
    if (requestedCapabilities.length === 0) {
      const message = "This community is missing the Self verification details needed to continue.";
      setSelfError(message);
      if (showToastOnError) {
        toast.error(message);
      }
      return { launched: false, started: false };
    }

    setSelfLoading(true);
    setSelfError(null);
    setJoinError(null);
    try {
      const result = await api.verification.startSession({ provider: "self", requested_capabilities: requestedCapabilities, verification_intent: "community_join" });
      setSelfRequestedCapabilities(requestedCapabilities);
      setSelfSession(result);
      setSelfModalOpen(true);
      writePendingSelfJoinSession({ communityId, requestedCapabilities, verificationSessionId: result.verification_session_id });
      return { started: true };
    } catch (e: unknown) {
      const apiError = e as ApiError;
      const message = apiError?.message ?? "Could not start self verification";
      setSelfError(message);
      if (showToastOnError) {
        toast.error(message);
      }
      return { started: false };
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, eligibility]);

  const completeSelfAndRetryJoin = React.useCallback(async ({ proof, verificationSessionId }: { proof: string; verificationSessionId: string }) => {
    setSelfLoading(true);
    setSelfError(null);
    try {
      await api.verification.completeSession(verificationSessionId, { proof });
      setSelfSession(null);
      setSelfRequestedCapabilities([]);
      setSelfModalOpen(false);
      clearPendingSelfJoinSession(communityId);
      const updatedEligibility = await refetchEligibility();

      if (updatedEligibility.status === "joinable" || updatedEligibility.status === "requestable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") setJoinRequested(true);
        await refetchEligibility();
      } else if (updatedEligibility.status === "gate_failed") {
        setJoinError("Verification succeeded but you still do not meet this community's requirements.");
      }
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setSelfError(apiError?.message ?? "Verification completion failed");
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, refetchEligibility]);

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  const handleJoin = React.useCallback(async () => {
    setJoinLoading(true);
    setJoinError(null);
    if (eligibility?.status === "verification_required") {
      setJoinLoading(false);
      const provider = resolveSuggestedVerificationProvider(eligibility);
      if (provider === "very") {
        await startVeryVerification();
      } else {
        await startSelfVerification();
      }
      return;
    }

    try {
      const result = await api.communities.join(communityId);
      if (result.status === "requested") setJoinRequested(true);
      await refetchEligibility();
    } catch (e: unknown) {
      const apiError = e as ApiError;
      if (apiError?.code === "gate_failed" && apiError.details) {
        const details = apiError.details as ApiGateFailureDetails;
        if (details.failure_reason === "missing_verification") {
          setJoinLoading(false);
          const provider = resolveSuggestedVerificationProvider(details);
          if (provider === "very") {
            await startVeryVerification();
          } else {
            await startSelfVerification({ missingCapabilities: details.missing_capabilities });
          }
          return;
        }
        const gateFailureMessage = getGateFailureMessage(details, { locale });
        if (gateFailureMessage) setJoinError(gateFailureMessage);
        else toast.error(apiError.message);
      } else {
        toast.error(apiError?.message ?? "Join failed");
      }
    } finally {
      setJoinLoading(false);
    }
  }, [api, communityId, eligibility, refetchEligibility, startSelfVerification, startVeryVerification]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("proof") && !url.searchParams.has("error") && url.searchParams.get("expired") !== "true") return;

      const pendingSession = readPendingSelfJoinSession(communityId);
      if (!pendingSession || pendingSession.communityId !== communityId) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      setSelfRequestedCapabilities(pendingSession.requestedCapabilities);
      const result = parseSelfCallback(url);
      if (result.status === "completed") {
        void completeSelfAndRetryJoin({ proof: result.proof, verificationSessionId: pendingSession.verificationSessionId });
      } else if (result.status === "expired") {
        setSelfError("Verification session expired. Please try again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
      } else {
        setSelfError(result.reason);
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();
    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [communityId, completeSelfAndRetryJoin]);

  const buildCommunityBlockedModalState = React.useCallback(({ action, closeModal, gate }: {
    action: "reply_comment" | "reply_post" | "vote_comment" | "vote_post";
    closeModal: () => void;
    gate: {
      eligibility: ApiJoinEligibility;
      preview: {
        community_id: string;
        display_name: string;
        membership_gate_summaries: NonNullable<typeof preview>["membership_gate_summaries"];
      };
    };
  }) => {
    if (gate.eligibility.status === "verification_required") {
      const provider = resolveSuggestedVerificationProvider(gate.eligibility);
      return {
        description: action === "vote_post" || action === "vote_comment"
          ? copy.interactionGate.verifyToVoteDescription
          : copy.interactionGate.verifyToReplyDescription,
        primaryAction: {
          label: copy.createCommunity.startVerification,
          loading: provider === "very" ? veryLoading : selfLoading,
          onClick: async () => {
            if (provider === "very") {
              const result = await startVeryVerification();
              if (result.started) {
                closeModal();
              }
            } else {
              const result = await startSelfVerification({ showToastOnError: true, missingCapabilities: gate.eligibility.missing_capabilities });
              if (result.started) {
                closeModal();
              }
            }
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: copy.interactionGate.close,
          onClick: closeModal,
        },
        title: action === "vote_post" || action === "vote_comment"
          ? copy.interactionGate.verifyToVoteTitle
          : copy.interactionGate.verifyToReplyTitle,
      };
    }

    if (gate.eligibility.status === "joinable" || gate.eligibility.status === "requestable") {
      const ctaLabel = getJoinCtaLabel(gate.eligibility, { locale });
      return {
        description: (
          action === "vote_post" || action === "vote_comment"
            ? copy.interactionGate.joinToVoteDescription
            : copy.interactionGate.joinToReplyDescription
        )
          .replace("{joinLabel}", ctaLabel)
          .replace("{communityName}", gate.preview.display_name),
        primaryAction: {
          label: ctaLabel,
          loading: joinLoading,
          onClick: async () => {
            await handleJoin();
            invalidateCommunityGate(gate.preview.community_id);
            closeModal();
          },
        },
        requirements: gate.preview.membership_gate_summaries,
        secondaryAction: {
          label: copy.interactionGate.close,
          onClick: closeModal,
        },
        title: (
          action === "vote_post" || action === "vote_comment"
            ? copy.interactionGate.joinToVoteTitle
            : copy.interactionGate.joinToReplyTitle
        ).replace("{joinLabel}", ctaLabel),
      };
    }

    return {
      description: gate.eligibility.status === "banned"
        ? copy.interactionGate.bannedDescription
        : action === "vote_post" || action === "vote_comment"
          ? copy.interactionGate.blockedVoteDescription
          : copy.interactionGate.blockedReplyDescription,
      requirements: gate.preview.membership_gate_summaries,
      secondaryAction: {
        label: copy.interactionGate.close,
        onClick: closeModal,
      },
      title: action === "vote_post" || action === "vote_comment"
        ? copy.interactionGate.cantVoteHereTitle
        : copy.interactionGate.cantReplyHereTitle,
    };
  }, [copy.interactionGate, handleJoin, invalidateCommunityGate, joinLoading, locale, selfLoading, startSelfVerification, startVeryVerification, veryLoading]);

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    if (!preview || !eligibility) return;
    await runGatedCommunityAction({
      action: "vote_post",
      buildBlockedModalState: buildCommunityBlockedModalState,
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
        const previousPost = posts.find((postResponse) => postResponse.post.post_id === postId);
        await submitOptimisticPostVote({
          direction,
          onApply: (nextValue) => setPosts((current) => updateCommunityPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setPosts((current) => current.map((postResponse) => postResponse.post.post_id === postId ? restoredPost : postResponse)),
          postId,
          previousPost: previousPost ?? null,
          requestIdsRef: voteRequestIdsRef,
          vote: api.posts.vote,
        });
      },
      postId,
    });
  }, [api.posts.vote, buildCommunityBlockedModalState, communityId, eligibility, posts, preview, runGatedCommunityAction, setPosts]);

  if (loading) {
    return <FullPageSpinner />;
  }
  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityRoutePage communityId={communityId} />;
    }
    if (isApiAuthError(error)) return <AuthRequiredRouteState description={getRouteAuthDescription("community")} title={pageTitle} />;
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("community"))} title={pageTitle} />;
  }
  if (!preview || !community) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("community")} title={pageTitle} />;
  }

  const selfPrompt = selfSession ? {
    ...getVerificationPromptCopy("self", selfRequestedCapabilities, { locale }),
    href: getSelfVerificationLaunchHref(selfSession.launch?.self_app),
    qrValue: getSelfVerificationLaunchHref(selfSession.launch?.self_app),
  } : null;
  const canCreatePost = eligibility?.status === "already_joined";
  const feedItems = posts.map((post) => {
    const assetId = post.post.asset_id ?? undefined;
    return toCommunityFeedItem(
      post,
      authorProfiles,
      post.post.post_type === "song"
        ? {
          currentUserId: session?.user?.user_id,
          listing: assetId ? listingsByAssetId[assetId] : undefined,
          localeTag,
          onBuy: assetId && listingsByAssetId[assetId] ? () => void handleBuySong(listingsByAssetId[assetId]!, post.post.title ?? "song") : undefined,
          playback: songPlayback,
          purchase: assetId ? purchasesByAssetId[assetId] : undefined,
        }
        : undefined,
      {
        onComment: () => navigate(`/p/${post.post.post_id}`),
        onVote: (direction) => void voteOnPost(post.post.post_id, direction),
      },
    );
  });

  const headerAction = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {ownsCommunity ? <Button onClick={() => navigate(buildDefaultCommunityModerationPath(communityId))} variant="secondary">{modToolsLabel}</Button> : null}
      {canCreatePost ? (
        <Button leadingIcon={<Plus className="size-5" />} onClick={() => navigate(`/c/${communityId}/submit`)}>{createPostLabel}</Button>
      ) : eligibility && preview.membership_gate_summaries.length === 0 ? (
        <Button disabled={eligibility.status !== "joinable" && eligibility.status !== "requestable" && eligibility.status !== "verification_required"} loading={joinLoading} onClick={handleJoin}>
          {getCommunityActionLabel(eligibility.status)}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {gateModal}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          loading={selfLoading}
          onOpenChange={(open) => {
            setSelfModalOpen(open);
            if (!open) {
              setSelfSession(null);
              setSelfRequestedCapabilities([]);
              setSelfError(null);
              clearPendingSelfJoinSession(communityId);
            }
          }}
          open={selfModalOpen}
          qrValue={selfPrompt.qrValue}
          title={selfPrompt.title}
        />
      ) : null}
      <section className="flex min-w-0 flex-1 flex-col gap-6">
      {preview.membership_gate_summaries.length > 0 && !canCreatePost ? (
        <CommunityMembershipGatePanel
          eligibility={eligibility}
          gates={preview.membership_gate_summaries}
          joinError={joinError ?? (eligibility?.status === "gate_failed" && eligibility.failure_reason
            ? getGateFailureMessage(eligibility, { locale })
            : null)}
          joinLoading={joinLoading}
          joinRequested={joinRequested}
          verificationError={selfError}
          verificationLoading={selfLoading}
          onJoin={handleJoin}
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
        routeLabel={community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`}
        routeVerified={Boolean(community.namespace_verification_id)}
        sidebar={{
          ...buildCommunitySidebar(community, locale),
          requirements: buildCommunitySidebarRequirements({
            defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
            gateSummaries: preview.membership_gate_summaries,
            locale,
          }),
          namespacePanel: ownsCommunity ? {
            routeLabel: community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`,
            status: community.namespace_verification_id ? "verified" : community.pending_namespace_verification_session_id ? "pending" : "available",
            onOpen: community.namespace_verification_id ? undefined : () => navigate(buildCommunityModerationPath(communityId, "namespace")),
          } : null,
        }}
        title={community.display_name}
        />
      </section>
    </>
  );
}
