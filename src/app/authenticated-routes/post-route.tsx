"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";

import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyWallets } from "@/lib/auth/privy-provider";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import { toast } from "@/components/primitives/sonner";
import { DEFAULT_STORY_CHECKOUT_ROUTE, executeRoutedStoryCheckout, findConnectedFundingWallet } from "@/lib/commerce/routed-checkout";
import { useUiLocale } from "@/lib/ui-locale";

import { buildCommunitySidebar } from "./community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { toThreadPostCard, shouldShowOriginalPost } from "./post-presentation";
import { getErrorMessage, useRouteContentLocale, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteTitle } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "./route-shell";
import { useSongCommerceState, useSongPlayback } from "./song-commerce";
import { usePost } from "./post-state";

export function PostPage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const pageTitle = getRouteTitle("post") ?? "Post";
  const contentLocale = useRouteContentLocale();
  const translationLabels = React.useMemo(() => ({
    cancelReplyLabel: copy.common.cancelReply,
    loadMoreRepliesLabel: copy.common.loadMoreReplies,
    loadRepliesLabel: copy.common.loadReplies,
    loadingRepliesLabel: copy.common.loadingReplies,
    replyActionLabel: copy.common.replyAction,
    replyPlaceholder: copy.common.replyPlaceholder,
    showOriginalLabel: copy.common.showOriginal,
    submitReplyLabel: copy.common.submitReply,
    showTranslationLabel: copy.common.showTranslation,
  }), [copy.common]);
  const hasSession = Boolean(session?.accessToken);
  const { post, community, authorProfile, comments, createTopLevelComment, error, gateModal, loading, voteOnPost } = usePost(postId, contentLocale, hasSession, translationLabels);
  const commerceEnabled = Boolean(session?.user?.user_id && community?.community_id);
  const { connectedWallets } = usePiratePrivyWallets({ enabled: commerceEnabled });
  const { listingsByAssetId, purchasesByAssetId, refresh: refreshSongCommerce } = useSongCommerceState(community?.community_id ?? "", commerceEnabled);
  const songPlayback = useSongPlayback(session?.accessToken ?? null);

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string, nextCommunityId: string) => {
    const settlementWalletAttachmentId = session?.user.primary_wallet_attachment_id;
    if (!settlementWalletAttachmentId) {
      toast.error("Connect a primary wallet before buying this song.");
      return;
    }

    let quoteId: string | null = null;
    let fundingTxRef: string | null = null;
    try {
      const fundingWallet = findConnectedFundingWallet({
        connectedWallets,
        primaryWalletAddress: session.profile.primary_wallet_address,
      });
      if (!fundingWallet) {
        toast.error("Connect your primary wallet before buying this song.");
        return;
      }

      const quote = await api.communities.createPurchaseQuote(nextCommunityId, {
        listing_id: listing.listing_id,
        ...DEFAULT_STORY_CHECKOUT_ROUTE,
      });
      quoteId = quote.quote_id;
      fundingTxRef = await executeRoutedStoryCheckout({
        quote,
        wallet: fundingWallet,
      });
      const settlement = await api.communities.settlePurchase(nextCommunityId, {
        quote_id: quote.quote_id,
        settlement_wallet_attachment_id: settlementWalletAttachmentId,
        funding_tx_ref: fundingTxRef,
        settlement_tx_ref: fundingTxRef,
      });
      await refreshSongCommerce();
      toast.success(`${titleText} unlocked for ${settlement.purchase_price_usd}.`);
    } catch (purchaseError) {
      if (quoteId && !fundingTxRef) {
        void api.communities.failPurchase(nextCommunityId, { quote_id: quoteId }).catch(() => undefined);
      }
      toast.error(getErrorMessage(purchaseError, "Could not unlock this song."));
    }
  }, [api.communities, connectedWallets, refreshSongCommerce, session?.profile.primary_wallet_address, session?.user.primary_wallet_attachment_id]);

  if (loading) {
    return <FullPageSpinner />;
  }

  if (error) {
    if (isApiAuthError(error)) return <AuthRequiredRouteState description={getRouteAuthDescription("post")} title={pageTitle} />;
    if (isApiNotFoundError(error)) return <NotFoundPage path={`/p/${postId}`} />;
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("post"))} title={pageTitle} />;
  }

  if (!post) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("post")} title={pageTitle} />;
  }

  const threadAssetId = post.post.asset_id ?? null;
  const threadListing = threadAssetId ? listingsByAssetId[threadAssetId] : undefined;
  const threadPurchase = threadAssetId ? purchasesByAssetId[threadAssetId] : undefined;
  const songOptions = post.post.post_type === "song" && community && threadAssetId
    ? {
      currentUserId: session?.user?.user_id,
      listing: threadListing,
      onBuy: threadListing ? () => void handleBuySong(threadListing, post.post.title ?? "song", community.community_id) : undefined,
      playback: songPlayback,
      purchase: threadPurchase,
    }
    : undefined;
  const localizedPostCard = toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, { onVote: voteOnPost });
  const originalPostCard = shouldShowOriginalPost(post)
    ? toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, { onVote: voteOnPost, preferOriginalText: true })
    : undefined;

  return (
    <>
      {gateModal}
      <ContentRailShell rail={community ? <CommunitySidebar {...buildCommunitySidebar(community, locale)} /> : undefined}>
        <PostThread
          commentsHeading={copy.common.commentsHeading}
          commentsHeadingDir={contentLocale === "ar" ? "rtl" : undefined}
          commentsHeadingLang={contentLocale === "ar" ? "ar" : undefined}
          emptyCommentsLabel={copy.common.noComments}
          onRootReplySubmit={createTopLevelComment}
          post={localizedPostCard}
          postOriginal={originalPostCard}
          postShowOriginalLabel={originalPostCard ? copy.common.showOriginal : undefined}
          postShowTranslationLabel={originalPostCard ? copy.common.showTranslation : undefined}
          comments={comments}
          rootReplyActionLabel={copy.common.replyAction}
          rootReplyCancelLabel={copy.common.cancelReply}
          rootReplyPlaceholder={copy.common.replyPlaceholder}
          rootReplySubmitLabel={copy.common.submitReply}
        />
      </ContentRailShell>
    </>
  );
}
