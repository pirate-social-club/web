"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { VerificationSession } from "@pirate/api-contracts";
import { Plus } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { isApiAuthError, isApiNotFoundError, type ApiError } from "@/lib/api/client";
import { CommunityMembershipGatePanel } from "@/components/compositions/community-membership-gate-panel/community-membership-gate-panel";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage, getSelfVerificationCapabilities, getVerificationPromptCopy } from "@/lib/identity-gates";
import { parseSelfCallback } from "@/lib/self-verification";

import { useCommunityPageData } from "./community-data";
import { buildCommunitySidebar, getCommunityActionLabel, getNamespaceActionLabel } from "./community-sidebar-helpers";
import { clearPendingSelfJoinSession, readPendingSelfJoinSession, writePendingSelfJoinSession } from "./community-session-helpers";
import { NotFoundPage } from "./misc-routes";
import { buildCommunityModerationPath } from "./moderation-helpers";
import { toCommunityFeedItem } from "./post-presentation";
import { submitOptimisticPostVote, updateCommunityPostVote } from "./post-vote";
import { getErrorMessage, useRouteContentLocale, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteString, getRouteTitle } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "./route-shell";
import { useSongCommerceState, useSongPlayback } from "./song-commerce";

export function CommunityPage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const { copy } = useRouteMessages();
  const pageTitle = getRouteTitle("community") ?? "Community";
  const createPostLabel = getRouteString("community", "createPost", "Create Post");
  const modToolsLabel = getRouteString("community", "modTools", "Mod Tools");
  const contentLocale = useRouteContentLocale(session?.profile.preferred_locale);
  const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
  const { authorProfiles, community, preview, eligibility, error, loading, posts, refetchEligibility, setPosts } = useCommunityPageData(communityId, contentLocale, activeSort);
  const commerceEnabled = Boolean(session?.user?.user_id) && eligibility?.status === "already_joined";
  const { listingsByAssetId, purchasesByAssetId, refresh: refreshSongCommerce } = useSongCommerceState(communityId, commerceEnabled);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const [joinLoading, setJoinLoading] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinRequested, setJoinRequested] = React.useState(false);
  const [selfSession, setSelfSession] = React.useState<VerificationSession | null>(null);
  const [selfRequestedCapabilities, setSelfRequestedCapabilities] = React.useState<ApiJoinEligibility["missing_capabilities"]>([]);
  const [selfLoading, setSelfLoading] = React.useState(false);
  const [selfError, setSelfError] = React.useState<string | null>(null);
  const ownsCommunity = session?.user?.user_id === community?.created_by_user_id;
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string) => {
    const settlementWalletAttachmentId = session?.user.primary_wallet_attachment_id;
    if (!settlementWalletAttachmentId) {
      toast.error("Connect a primary wallet before buying this song.");
      return;
    }
    let quoteId: string | null = null;
    try {
      const quote = await api.communities.createPurchaseQuote(communityId, { listing_id: listing.listing_id, client_estimated_hop_count: 0, client_estimated_slippage_bps: 0 });
      quoteId = quote.quote_id;
      await api.communities.settlePurchase(communityId, {
        quote_id: quote.quote_id,
        settlement_wallet_attachment_id: settlementWalletAttachmentId,
        settlement_tx_ref: `ui:${crypto.randomUUID()}`,
      });
      await refreshSongCommerce();
      toast.success(`${titleText} unlocked.`);
    } catch (error) {
      if (quoteId) void api.communities.failPurchase(communityId, { quote_id: quoteId }).catch(() => undefined);
      toast.error(getErrorMessage(error, "Could not unlock this song."));
    }
  }, [api.communities, communityId, refreshSongCommerce, session?.user.primary_wallet_attachment_id]);

  const startSelfVerification = React.useCallback(async () => {
    const requestedCapabilities = eligibility ? getSelfVerificationCapabilities(eligibility) : [];
    if (requestedCapabilities.length === 0) {
      setSelfError("This community is missing the Self verification details needed to continue.");
      return;
    }

    setSelfLoading(true);
    setSelfError(null);
    setJoinError(null);
    try {
      const result = await api.verification.startSession({ provider: "self", requested_capabilities: requestedCapabilities, verification_intent: "community_join" });
      setSelfRequestedCapabilities(requestedCapabilities);
      setSelfSession(result);
      writePendingSelfJoinSession({ communityId, requestedCapabilities, verificationSessionId: result.verification_session_id });
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setSelfError(apiError?.message ?? "Could not start self verification");
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

  const handleJoin = React.useCallback(async () => {
    setJoinLoading(true);
    setJoinError(null);
    if (eligibility?.status === "verification_required") {
      setJoinLoading(false);
      await startSelfVerification();
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
          await startSelfVerification();
          return;
        }
        const gateFailureMessage = getGateFailureMessage(details);
        if (gateFailureMessage) setJoinError(gateFailureMessage);
        else toast.error(apiError.message);
      } else {
        toast.error(apiError?.message ?? "Join failed");
      }
    } finally {
      setJoinLoading(false);
    }
  }, [api, communityId, eligibility, refetchEligibility, startSelfVerification]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("proof") && !url.searchParams.has("error") && url.searchParams.get("expired") !== "true") return;

      const pendingSession = readPendingSelfJoinSession(communityId);
      if (!pendingSession || pendingSession.communityId !== communityId) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
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
        clearPendingSelfJoinSession(communityId);
      } else {
        setSelfError(result.reason);
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        clearPendingSelfJoinSession(communityId);
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();
    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [communityId, completeSelfAndRetryJoin]);

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    if (!session?.accessToken) return;
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
  }, [api.posts, posts, session?.accessToken, setPosts]);

  if (loading) {
    return <FullPageSpinner />;
  }
  if (error) {
    if (isApiAuthError(error)) return <AuthRequiredRouteState description={getRouteAuthDescription("community")} title={pageTitle} />;
    if (isApiNotFoundError(error)) return <NotFoundPage path={`/c/${communityId}`} />;
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("community"))} title={pageTitle} />;
  }
  if (!preview || !community) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("community")} title={pageTitle} />;
  }

  const selfPrompt = selfSession ? { ...getVerificationPromptCopy("self", selfRequestedCapabilities), href: selfSession.launch?.self_app ? `${selfSession.launch.self_app.endpoint}?session_id=${encodeURIComponent(selfSession.launch.self_app.session_id)}&scope=${encodeURIComponent(selfSession.launch.self_app.scope)}` : null } : null;
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
          onBuy: assetId && listingsByAssetId[assetId] ? () => void handleBuySong(listingsByAssetId[assetId]!, post.post.title ?? "song") : undefined,
          playback: songPlayback,
          purchase: assetId ? purchasesByAssetId[assetId] : undefined,
        }
        : undefined,
      { onVote: (direction) => void voteOnPost(post.post.post_id, direction) },
    );
  });

  const headerAction = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {ownsCommunity && !community.namespace_verification_id ? <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "namespace"))} variant="secondary">{getNamespaceActionLabel(community)}</Button> : null}
      {ownsCommunity && community.namespace_verification_id ? <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "rules"))} variant="secondary">{modToolsLabel}</Button> : null}
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
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {preview.membership_gate_summaries.length > 0 ? (
        <CommunityMembershipGatePanel
          eligibility={eligibility}
          gates={preview.membership_gate_summaries}
          joinError={joinError}
          joinLoading={joinLoading}
          joinRequested={joinRequested}
          verificationError={selfError}
          verificationLoading={selfLoading}
          verificationPrompt={selfPrompt}
          onCancelVerification={() => {
            setSelfSession(null);
            setSelfRequestedCapabilities([]);
            setSelfError(null);
            clearPendingSelfJoinSession(communityId);
          }}
          onJoin={handleJoin}
        />
      ) : null}
      <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={community.avatar_ref ?? undefined}
        availableSorts={[{ value: "best", label: copy.common.bestTab }, { value: "new", label: copy.common.newTab }, { value: "top", label: copy.common.topTab }]}
        bannerSrc={community.banner_ref ?? undefined}
        communityId={community.community_id}
        headerAction={headerAction}
        items={feedItems}
        onSortChange={setActiveSort}
        routeLabel={community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`}
        routeVerified={Boolean(community.namespace_verification_id)}
        sidebar={{
          ...buildCommunitySidebar(community),
          rulesAction: ownsCommunity ? <Button onClick={() => navigate(buildCommunityModerationPath(communityId, "rules"))} variant="ghost">Edit</Button> : undefined,
          namespacePanel: ownsCommunity ? {
            routeLabel: community.route_slug ? `c/${community.route_slug}` : `c/${community.community_id}`,
            status: community.namespace_verification_id ? "verified" : community.pending_namespace_verification_session_id ? "pending" : "available",
            onOpen: community.namespace_verification_id ? undefined : () => navigate(buildCommunityModerationPath(communityId, "namespace")),
          } : null,
        }}
        title={community.display_name}
      />
    </section>
  );
}
