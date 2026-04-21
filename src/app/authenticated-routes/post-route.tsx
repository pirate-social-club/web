"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";

import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import { useUiLocale } from "@/lib/ui-locale";

import { buildCommunitySidebar } from "./community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { toThreadPostCard, shouldShowOriginalPost } from "./post-presentation";
import { getErrorMessage, useRouteContentLocale, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteTitle } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "./route-shell";
import { useSongPurchase } from "./song-purchase";
import { useSongCommerceState, useSongPlayback } from "./song-commerce";
import { usePost } from "./post-state";

export function PostPage({ postId }: { postId: string }) {
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
  const { listingsByAssetId, purchasesByAssetId, refresh: refreshSongCommerce } = useSongCommerceState(community?.community_id ?? "", commerceEnabled);
  const buySong = useSongPurchase({ commerceEnabled, refreshSongCommerce });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);

  const handleBuySong = React.useCallback(async (listing: ApiCommunityListing, titleText: string, nextCommunityId: string) => {
    await buySong({
      communityId: nextCommunityId,
      listing,
      successMessage: ({ settlement, titleText: nextTitle }) => `${nextTitle} unlocked for ${settlement.purchase_price_usd}.`,
      titleText,
    });
  }, [buySong]);

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
