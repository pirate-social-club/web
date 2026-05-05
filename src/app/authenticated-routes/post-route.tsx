"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import { SlidersHorizontal } from "@phosphor-icons/react";

import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { navigate } from "@/app/router";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import { PostThread } from "@/components/compositions/posts/post-thread/post-thread";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { IconButton } from "@/components/primitives/icon-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import { buildCommunityPath } from "@/lib/community-routing";
import { useUiLocale } from "@/lib/ui-locale";

import { buildCommunityPreviewSidebar } from "@/app/authenticated-helpers/community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { toThreadPostCard, shouldShowOriginalPost } from "@/app/authenticated-helpers/post-presentation";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";
import { useSongPurchaseFlow } from "@/app/authenticated-helpers/song-purchase";
import { useSongCommerceState, useSongPlayback } from "@/app/authenticated-helpers/song-commerce";
import { usePost } from "@/app/authenticated-state/post-state";
import { useSelfVerification } from "@/lib/verification/use-self-verification";

function closeMobileThread(fallbackPath: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallbackPath);
}

function sameUserId(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  return left === right || left.replace(/^usr_/, "") === right.replace(/^usr_/, "");
}

function viewerCanModerateCommunity(
  viewerUserId: string | null | undefined,
  community:
    | {
        owner?: { user?: string | null } | null;
        moderators?: Array<{ user?: string | null; role?: "owner" | "admin" | "moderator" | string | null }> | null;
      }
    | null
    | undefined,
): boolean {
  if (!viewerUserId || !community) return false;
  if (sameUserId(viewerUserId, community.owner?.user)) return true;
  return Boolean(community.moderators?.some((roleHolder) => {
    if (!sameUserId(viewerUserId, roleHolder.user)) return false;
    return roleHolder.role === "owner" || roleHolder.role === "admin" || roleHolder.role === "moderator";
  }));
}

function MobileThreadShell({
  children,
  fallbackPath,
  sortAction,
  title,
}: {
  children: React.ReactNode;
  fallbackPath: string;
  sortAction?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <MobilePageHeader
        onCloseClick={() => closeMobileThread(fallbackPath)}
        title={title}
        trailingAction={sortAction}
      />
      <section className="min-w-0 flex-1 px-0 pt-[calc(env(safe-area-inset-top)+4rem)]">
        {children}
      </section>
    </div>
  );
}

export function PostPage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const pageTitle = copy.routeStatus.post.title ?? "Post";
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
  const { post, community, authorProfile, comments, commentCount, createTopLevelComment, deletePost, removePost, error, gateModal, markAgeGateVerified, loading, threadPartial, voteOnPost, commentSort, setCommentSort } = usePost(postId, contentLocale, hasSession, translationLabels);
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
      markAgeGateVerified();
    },
    startErrorMessage: "Could not start age verification.",
    storageKey: `pirate_pending_self_age_gate:${postId}`,
    verificationIntent: "community_join",
  });
  const handleVerifyAge = React.useCallback(() => {
    void startAgeSelfVerification({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: "Age verification is required to view 18+ content.",
    });
  }, [startAgeSelfVerification]);
  const commerceEnabled = Boolean(
    session?.user?.id
      && community?.id
      && (post?.post.post_type === "song" || post?.post.post_type === "video")
      && post.post.asset,
  );
  const { listingsByAssetId, purchasesByAssetId, refresh: refreshSongCommerce } = useSongCommerceState(community?.id ?? "", commerceEnabled);
  const { buySong, purchaseModal } = useSongPurchaseFlow({ commerceEnabled, refreshSongCommerce });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);

  const handleBuySong = React.useCallback(async (
    listing: ApiCommunityListing,
    titleText: string,
    nextCommunityId: string,
    assetLabel: "song" | "video" = "song",
  ) => {
    await buySong({
      assetLabel,
      communityId: nextCommunityId,
      listing,
      successMessage: ({ settlement, titleText: nextTitle }) => `${nextTitle} unlocked for $${(settlement.purchase_price_cents / 100).toFixed(2)}.`,
      titleText,
    });
  }, [buySong]);

  if (loading) {
    if (isMobile) {
      return (
        <MobileThreadShell fallbackPath="/" title={pageTitle}>
          <FullPageSpinner />
        </MobileThreadShell>
      );
    }
    return <FullPageSpinner />;
  }

  if (error) {
    const errorBody = isApiAuthError(error)
      ? <AuthRequiredRouteState description={copy.routeStatus.post.auth} title={isMobile ? "" : pageTitle} />
      : isApiNotFoundError(error)
        ? (
          <NotFoundPage
            description={copy.routeStatus.post.notFoundDescription}
            path={`/p/${postId}`}
            title={copy.routeStatus.post.notFoundTitle}
          />
        )
        : <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.post.failure)} title={isMobile ? "" : pageTitle} />;

    if (isMobile) {
      return (
        <MobileThreadShell fallbackPath="/" title={pageTitle}>
          {errorBody}
        </MobileThreadShell>
      );
    }

    return errorBody;
  }

  if (!post) {
    if (isMobile) {
      return (
        <MobileThreadShell fallbackPath="/" title={pageTitle}>
          <RouteLoadFailureState description={copy.routeStatus.post.incomplete} title="" />
        </MobileThreadShell>
      );
    }
    return <RouteLoadFailureState description={copy.routeStatus.post.incomplete} title={pageTitle} />;
  }

  const threadAssetId = post.post.asset ?? null;
  const threadListing = threadAssetId ? listingsByAssetId[threadAssetId] : undefined;
  const threadPurchase = threadAssetId ? purchasesByAssetId[threadAssetId] : undefined;
  const songOptions = (post.post.post_type === "song" || post.post.post_type === "video") && community && threadAssetId
    ? {
      currentUserId: session?.user?.id,
      listing: threadListing,
      onBuy: threadListing ? () => void handleBuySong(
        threadListing,
        post.post.title ?? (post.post.post_type === "video" ? "video" : "song"),
        community.id,
        post.post.post_type === "video" ? "video" : "song",
      ) : undefined,
      playback: songPlayback,
      purchase: threadPurchase,
    }
    : undefined;
  const localizedPostCard = toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, {
    canModeratePost: viewerCanModerateCommunity(session?.user?.id, community),
    commentCountOverride: commentCount,
    onDelete: deletePost,
    onRemove: removePost,
    onVerifyAge: handleVerifyAge,
    onVote: voteOnPost,
    showOriginalLabel: copy.common.showOriginal,
    showTranslationLabel: copy.common.showTranslation,
    viewerContentLocale: contentLocale,
  });
  const originalPostCard = shouldShowOriginalPost(post)
    ? toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, {
      canModeratePost: viewerCanModerateCommunity(session?.user?.id, community),
      commentCountOverride: commentCount,
      onDelete: deletePost,
      onRemove: removePost,
      onVerifyAge: handleVerifyAge,
      onVote: voteOnPost,
      preferOriginalText: true,
      showOriginalLabel: copy.common.showOriginal,
      showTranslationLabel: copy.common.showTranslation,
      viewerContentLocale: contentLocale,
    })
    : undefined;
  const communityPath = community?.id ? buildCommunityPath(community.id, community.route_slug) : "/";
  const threadSidebarProps = community ? buildCommunityPreviewSidebar(community, locale) : null;
  const commentSortOptions = [
    { label: copy.common.bestTab, value: "best" as const },
    { label: copy.common.newTab, value: "new" as const },
    { label: copy.common.topTab, value: "top" as const },
  ];
  const mobileCommentSortAction = (
    <ResponsiveOptionSelect
      ariaLabel="Sort comments"
      drawerTitle={copy.common.commentsHeading}
      mobileTrigger={(
        <IconButton aria-label="Sort comments" variant="ghost">
          <SlidersHorizontal className="size-6" weight="bold" />
        </IconButton>
      )}
      onValueChange={setCommentSort}
      options={commentSortOptions}
      value={commentSort}
    />
  );
  const threadBody = (
    <>
      {gateModal}
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
      {purchaseModal}
      <ContentRailShell rail={!isMobile && threadSidebarProps ? <CommunitySidebar {...threadSidebarProps} /> : undefined} reserveRail={!isMobile}>
        <PostThread
          availableCommentSorts={commentSortOptions}
          commentSort={commentSort}
          commentsHeading={copy.common.commentsHeading}
          commentsHeadingDir={contentLocale === "ar" ? "rtl" : undefined}
          commentsHeadingLang={contentLocale === "ar" ? "ar" : undefined}
          emptyCommentsLabel={threadPartial ? copy.common.loadingReplies : copy.common.noComments}
          onCommentSortChange={setCommentSort}
          onRootReplySubmit={createTopLevelComment}
          post={localizedPostCard}
          postOriginal={originalPostCard}
          comments={comments}
          rootReplyActionLabel={copy.common.replyAction}
          rootReplyCancelLabel={copy.common.cancelReply}
          rootReplyPlaceholder={copy.common.replyPlaceholder}
          rootReplySubmitLabel={copy.common.submitReply}
        />
      </ContentRailShell>
    </>
  );

  if (isMobile) {
    return (
      <MobileThreadShell fallbackPath={communityPath} sortAction={mobileCommentSortAction} title={pageTitle}>
        {threadBody}
      </MobileThreadShell>
    );
  }

  return (
    threadBody
  );
}
