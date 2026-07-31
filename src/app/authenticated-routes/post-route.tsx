"use client";

import * as React from "react";
import type { Asset as ApiAsset, CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import { SlidersHorizontal } from "@phosphor-icons/react";

import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { navigate } from "@/app/router";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import { PostEventStoreLink } from "@/components/compositions/posts/post-event-store-link";
import { PostThread } from "@/components/compositions/posts/post-thread/post-thread";
import { LiveRoomReplayPlayerModal } from "@/components/compositions/posts/live-room-viewer/live-room-replay-player-modal";
import { LiveRoomViewerModal } from "@/components/compositions/posts/live-room-viewer/live-room-viewer-modal";
import type { PostThreadReplyIdentity } from "@/components/compositions/posts/post-thread/post-thread.types";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { IconButton } from "@/components/primitives/icon-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildAnonymousLabel } from "@/lib/anonymous-label";
import { isPowSatisfiableGate } from "@/lib/identity-gates";
import { useApi } from "@/lib/api";
import { resolveApiBaseUrl } from "@/lib/api/base-url";
import { buildCommunityPath } from "@/lib/community-routing";
import { getFreedomBrowserDetectionSnapshot } from "@/lib/resource-links";
import { useUiLocale } from "@/lib/ui-locale";

import { buildCommunityPreviewSidebar } from "@/app/authenticated-helpers/community-sidebar-helpers";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { NotFoundPage } from "./misc-routes";
import { buildLiveRoomParticipants } from "@/app/authenticated-helpers/post-live-room-participants";
import { toThreadPostCard, shouldShowOriginalPost } from "@/app/authenticated-helpers/post-presentation";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { getProfileHandleLabel } from "@/lib/profile-routing";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";
import { buildPurchaseSuccessMessage, useSongPurchaseFlow } from "@/app/authenticated-helpers/song-purchase";
import { useSongCommerceState, useSongPlayback } from "@/app/authenticated-helpers/song-commerce";
import { loadLiveRoomReplayPlayback } from "@/app/authenticated-helpers/live-room-replay-playback";
import { takeStoryLicenseReuseNotice, type StoryLicenseReuseNotice } from "@/app/authenticated-helpers/story-license-reuse-notice";
import { usePost } from "@/app/authenticated-state/post-state";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";
import { toast } from "@/components/primitives/sonner";
import { rewardCtaAmountLabel } from "@/components/compositions/rewards/reward-surfaces";
import { BoostCampaignSheet, SongRewardPolicySheet } from "@/components/compositions/rewards/reward-booster-surfaces";
import type { ApiLiveRoomAccessResponse, ApiLiveRoomViewerAttachResponse } from "@/lib/api/client-api-types";
import { logger } from "@/lib/logger";
import { sameUserId } from "@/app/authenticated-helpers/user-id";
import { useBoostCampaignController } from "@/app/authenticated-helpers/use-boost-campaign-controller";
import { useActiveSongRewardOffer } from "@/app/authenticated-helpers/use-active-song-reward-offer";

function closeMobileThread(fallbackPath: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallbackPath);
}

function viewerCanModerateCommunity(
  viewerUserId: string | null | undefined,
  community:
    | {
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
  if (sameUserId(viewerUserId, community.owner?.user)) return true;
  return Boolean(community.moderators?.some((roleHolder) => {
    if (!sameUserId(viewerUserId, roleHolder.user)) return false;
    return roleHolder.role === "owner" || roleHolder.role === "admin" || roleHolder.role === "moderator";
  }));
}

function buildLiveRoomLaunch(input: {
  communityId?: string | null;
  liveRoomId?: string | null;
  postId?: string | null;
  seat?: "host" | "guest" | null;
}): { href: string; liveRoomId: string; shareUrl: string | null } | null {
  const liveRoomId = input.liveRoomId?.trim();
  const communityId = input.communityId?.trim();
  const postId = input.postId?.trim();
  if (!liveRoomId || !communityId) return null;
  const apiBase = resolveApiBaseUrl(typeof window === "undefined" ? null : window.location.hostname);
  const webBase = typeof window === "undefined" ? null : window.location.origin;
  const sharePath = postId ? `/p/${encodeURIComponent(postId)}` : null;
  const shareUrl = sharePath && typeof window !== "undefined"
    ? new URL(sharePath, window.location.origin).toString()
    : sharePath;
  const hrefParams = [
    `roomId=${encodeURIComponent(liveRoomId)}`,
    `communityId=${encodeURIComponent(communityId)}`,
    `apiBase=${encodeURIComponent(apiBase)}`,
  ];
  if (webBase) {
    hrefParams.push(`webBase=${encodeURIComponent(webBase)}`);
  }
  if (input.seat) {
    hrefParams.push(`seat=${encodeURIComponent(input.seat)}`);
  }
  return {
    href: `freedom://live-room?${hrefParams.join("&")}`,
    liveRoomId,
    shareUrl,
  };
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

export function PostPage({
  postId,
  telegramMiniApp = false,
}: {
  postId: string;
  telegramMiniApp?: boolean;
}) {
  const api = useApi();
  const session = useSession();
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const routeCopy = copy.post.route;
  const pageTitle = copy.routeStatus.post.title ?? copy.post.fallbackTitle;
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
  const { post, community, authorProfile, authorProfilesByUserId, setAuthorProfilesByUserId, comments, commentCount, createTopLevelComment, requestVoteAccess, cancelEvent, deletePost, removePost, error, gateModal, markAgeGateVerified, loading, threadPartial, voteOnPost, commentSort, setCommentSort } = usePost(postId, contentLocale, hasSession, translationLabels);
  const activeLiveRoomId = post?.post.anchor_live_room ?? null;
  const activeAssetId = post?.post.asset ?? null;
  const activeAssetPostType = post?.post.post_type ?? null;
  const [threadAsset, setThreadAsset] = React.useState<ApiAsset | null>(null);
  const [rewardOffer, refreshRewardOffer] = useActiveSongRewardOffer({
    communityId: post?.post.community,
    postId: post?.post.id,
    song: post?.post.post_type === "song",
  });
  const [liveRoomAccess, setLiveRoomAccess] = React.useState<ApiLiveRoomAccessResponse | null>(null);
  const [liveViewerSession, setLiveViewerSession] = React.useState<ApiLiveRoomViewerAttachResponse | null>(null);
  const [liveViewerOpen, setLiveViewerOpen] = React.useState(false);
  const [replayPlayer, setReplayPlayer] = React.useState<{
    mimeType: string | null;
    sourceUrl: string;
    title: string;
  } | null>(null);
  const [replayPlayerOpen, setReplayPlayerOpen] = React.useState(false);
  const [freedomDetection, setFreedomDetection] = React.useState(() => getFreedomBrowserDetectionSnapshot());
  const [storyLicenseReuseNotice, setStoryLicenseReuseNotice] = React.useState<StoryLicenseReuseNotice | null>(null);
  const autoWatchAttemptedRef = React.useRef(false);
  const inlineLiveViewerAttemptedRef = React.useRef<string | null>(null);
  const liveViewerAttachInFlightRef = React.useRef(false);
  const liveRoomGuestInviteAcceptInFlightRef = React.useRef(false);
  const replayObjectUrlsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    setStoryLicenseReuseNotice(takeStoryLicenseReuseNotice(postId));
  }, [postId]);
  React.useEffect(() => () => {
    for (const url of replayObjectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    replayObjectUrlsRef.current.clear();
  }, []);

  const handleReplayPlayerOpenChange = React.useCallback((open: boolean) => {
    setReplayPlayerOpen(open);
    if (open) return;

    setReplayPlayer((current) => {
      if (current) {
        URL.revokeObjectURL(current.sourceUrl);
        replayObjectUrlsRef.current.delete(current.sourceUrl);
      }
      return null;
    });
  }, []);
  const autoWatchLiveRoom = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("watch_live_room") === "1";
  }, []);
  const {
    handleModalOpenChange: handleAgeSelfModalOpenChange,
    handleSelfQrError: handleAgeSelfQrError,
    handleSelfQrSuccess: handleAgeSelfQrSuccess,
    selfError: ageSelfError,
    selfModalOpen: ageSelfModalOpen,
    selfPrompt: ageSelfPrompt,
    startVerification: startAgeSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: routeCopy.ageVerificationCompleteError,
    locale,
    onVerified: async () => {
      if (session) {
        const refreshedUser = await api.users.getMe();
        updateSessionUser(refreshedUser);
      }
      markAgeGateVerified();
    },
    startErrorMessage: routeCopy.ageVerificationStartError,
    storageKey: `pirate_pending_self_age_gate:${postId}`,
    verificationIntent: "community_join",
  });
  const authRuntime = usePiratePrivyRuntime();
  const { connectedWallets } = usePiratePrivyWallets({
    enabled: Boolean(session?.accessToken && activeLiveRoomId),
  });

  const requestAuth = React.useCallback((fallbackMessage: string) => {
    if (!isCanonicalAuthOrigin()) {
      const canonicalUrl = buildCanonicalAuthUrl(`/p/${postId}`);
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

    if (authRuntime.connect) {
      authRuntime.connect();
      return;
    }

    toast.error(authRuntime.loadError ?? fallbackMessage);
  }, [authRuntime.connect, authRuntime.loadError, postId, copy.publicProfile.openInPirate]);

  const boostController = useBoostCampaignController({
    activeCampaignId: rewardOffer?.campaign ?? null,
    authenticated: Boolean(session?.accessToken),
    communityId: community?.id ?? null,
    onCampaignActivated: refreshRewardOffer,
    postId,
    requestAuth: () => requestAuth(routeCopy.signInToBoost),
    song: post?.post.post_type === "song",
    viewerIsAuthor: Boolean(post?.viewer_is_author),
  });

  const handleReplyIntent = React.useCallback(() => {
    if (session?.accessToken) return;
    // `connect()` is also the signal that mounts Privy on deferred-auth routes.
    // Waiting for Privy to be ready here deadlocks the first auth intent.
    requestAuth(routeCopy.signInToComment);
  }, [requestAuth, routeCopy.signInToComment, session?.accessToken]);

  const handleVerifyAge = React.useCallback(() => {
    if (!session) {
      requestAuth(routeCopy.connectWalletToVerifyAge);
      return;
    }
    void startAgeSelfVerification({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: routeCopy.ageVerificationRequired,
    });
  }, [session, requestAuth, routeCopy.connectWalletToVerifyAge, routeCopy.ageVerificationRequired, startAgeSelfVerification]);

  React.useEffect(() => {
    const communityId = community?.id;
    const shouldLoadAsset = Boolean(
      session?.accessToken
        && communityId
        && activeAssetId
        && (activeAssetPostType === "song" || activeAssetPostType === "video"),
    );

    if (!shouldLoadAsset || !communityId || !activeAssetId) {
      setThreadAsset(null);
      return undefined;
    }

    let cancelled = false;
    setThreadAsset(null);

    void api.communities.getAsset(communityId, activeAssetId)
      .then((asset) => {
        if (!cancelled) {
          setThreadAsset(asset);
        }
      })
      .catch((assetError) => {
        if (cancelled) return;
        setThreadAsset(null);
        if (!isApiAuthError(assetError) && !isApiNotFoundError(assetError)) {
          logger.warn("[post-route] asset status load failed", {
            assetId: activeAssetId,
            communityId,
            error: getErrorMessage(assetError, routeCopy.assetStatusLoadFailed),
            postId,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeAssetId, activeAssetPostType, api.communities, community?.id, postId, routeCopy.assetStatusLoadFailed, session?.accessToken]);

  const refreshLiveRoomAccess = React.useCallback(async () => {
    if (!community?.id || !activeLiveRoomId) {
      setLiveRoomAccess(null);
      return null;
    }

    const loadPublicAccess = async () => api.publicCommunities.getLiveRoomAccess(community.id, activeLiveRoomId);

    try {
      const access = session?.accessToken
        ? await api.communities.getLiveRoomAccess(community.id, activeLiveRoomId)
        : await loadPublicAccess();
      setLiveRoomAccess(access);
      return access;
    } catch (accessError) {
      if (session?.accessToken) {
        try {
          const publicAccess = await loadPublicAccess();
          logger.warn("[post-route] authenticated live room access failed; using public access fallback", {
            communityId: community.id,
            error: getErrorMessage(accessError, routeCopy.liveRoomAccessLoadFailed),
            liveRoomId: activeLiveRoomId,
            postId,
          });
          setLiveRoomAccess(publicAccess);
          return publicAccess;
        } catch (publicAccessError) {
          setLiveRoomAccess(null);
          if (!isApiNotFoundError(publicAccessError)) {
            toast.error(getErrorMessage(publicAccessError, routeCopy.liveRoomAccessLoadFailed));
          }
          logger.warn("[post-route] live room access failed", {
            authenticatedError: getErrorMessage(accessError, routeCopy.liveRoomAccessLoadFailed),
            communityId: community.id,
            liveRoomId: activeLiveRoomId,
            postId,
            publicError: getErrorMessage(publicAccessError, routeCopy.liveRoomAccessLoadFailed),
          });
          return null;
        }
      }
      setLiveRoomAccess(null);
      if (!isApiNotFoundError(accessError)) {
        toast.error(getErrorMessage(accessError, routeCopy.liveRoomAccessLoadFailed));
      }
      return null;
    }
  }, [activeLiveRoomId, api.communities, api.publicCommunities, community?.id, postId, routeCopy.liveRoomAccessLoadFailed, session?.accessToken]);

  React.useEffect(() => {
    void refreshLiveRoomAccess();
  }, [refreshLiveRoomAccess]);

  React.useEffect(() => {
    autoWatchAttemptedRef.current = false;
    inlineLiveViewerAttemptedRef.current = null;
    setLiveViewerOpen(false);
    setLiveViewerSession(null);
  }, [activeLiveRoomId]);

  React.useEffect(() => {
    let attempts = 0;
    let lastLoggedKey = "";

    const readDetection = () => {
      attempts += 1;
      const next = getFreedomBrowserDetectionSnapshot();
      setFreedomDetection(next);
      const logKey = JSON.stringify({
        detected: next.detected,
        ethereumIsFreedomBrowser: next.ethereumIsFreedomBrowser,
        ethereumPresent: next.ethereumPresent,
        explicitFreedomBrowserMarker: next.explicitFreedomBrowserMarker,
        freedomApiPresent: next.freedomApiPresent,
        freedomShellBridgePresent: next.freedomShellBridgePresent,
        swarmIsFreedomBrowser: next.swarmIsFreedomBrowser,
        swarmPresent: next.swarmPresent,
      });
      if (logKey !== lastLoggedKey) {
        lastLoggedKey = logKey;
        logger.info("[post-route] Freedom Browser detection", {
          attempt: attempts,
          detection: next,
          postId,
        });
      }
      return next.detected;
    };

    const detected = readDetection();
    if (detected) return undefined;

    const intervalId = window.setInterval(() => {
      const nowDetected = readDetection();
      if (nowDetected || attempts >= 20) {
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [postId]);

  React.useEffect(() => {
    const guestUserId = liveRoomAccess?.room?.guest_user;
    if (
      !guestUserId
      || guestUserId === post?.post.author_user
      || Object.prototype.hasOwnProperty.call(authorProfilesByUserId, guestUserId)
    ) return;

    let cancelled = false;
    void loadProfilesByUserId(api, [guestUserId], authorProfilesByUserId)
      .then((profiles) => {
        if (!cancelled) {
          setAuthorProfilesByUserId((current) => ({ ...current, ...profiles }));
        }
      })
      .catch(() => {
        // Participant profile enrichment should not block the thread.
      });

    return () => { cancelled = true; };
  }, [api, authorProfilesByUserId, liveRoomAccess?.room?.guest_user, post?.post.author_user, setAuthorProfilesByUserId]);

  const commerceEnabled = Boolean(
    session?.user?.id
      && community?.id
      && (
        ((post?.post.post_type === "song" || post?.post.post_type === "video") && post.post.asset)
          || activeLiveRoomId
      ),
  );
  const {
    listingsByAssetId,
    listingsByLiveRoomId,
    listingsByReplayAssetId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    refresh: refreshSongCommerce,
  } = useSongCommerceState(community?.id ?? "", commerceEnabled);
  const refreshCommerceAndLiveAccess = React.useCallback(async () => {
    await refreshSongCommerce();
    await refreshLiveRoomAccess();
  }, [refreshLiveRoomAccess, refreshSongCommerce]);
  const { buySong, purchaseModal } = useSongPurchaseFlow({ commerceEnabled, refreshSongCommerce: refreshCommerceAndLiveAccess });
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
      successMessage: ({ settlement, titleText: nextTitle }) => buildPurchaseSuccessMessage({ kind: "unlocked", locale, priceCents: settlement.purchase_price_cents, titleText: nextTitle }),
      titleText,
    });
  }, [buySong, locale]);

  const handleBuyLiveTicket = React.useCallback(async (
    listing: ApiCommunityListing,
    titleText: string,
    nextCommunityId: string,
  ) => {
    if (!session?.accessToken) {
      requestAuth(routeCopy.connectWalletToBuyTicket);
      return;
    }
    await buySong({
      assetLabel: "ticket",
      communityId: nextCommunityId,
      listing,
      successMessage: ({ settlement, titleText: nextTitle }) => buildPurchaseSuccessMessage({ kind: "ticket", locale, priceCents: settlement.purchase_price_cents, titleText: nextTitle }),
      titleText,
    });
  }, [buySong, locale, requestAuth, routeCopy.connectWalletToBuyTicket, session?.accessToken]);
  const handleBuyReplay = React.useCallback(async (
    listing: ApiCommunityListing,
    titleText: string,
    nextCommunityId: string,
  ) => {
    if (!session?.accessToken) {
      requestAuth(routeCopy.connectWalletToBuyReplay);
      return;
    }
    await buySong({
      assetLabel: "replay",
      communityId: nextCommunityId,
      listing,
      successMessage: ({ settlement, titleText: nextTitle }) => buildPurchaseSuccessMessage({ kind: "replay", locale, priceCents: settlement.purchase_price_cents, titleText: nextTitle }),
      titleText,
    });
  }, [buySong, locale, requestAuth, routeCopy.connectWalletToBuyReplay, session?.accessToken]);
  const handlePromptLiveTicketAuth = React.useCallback(() => {
    requestAuth(routeCopy.connectWalletToBuyTicket);
  }, [requestAuth, routeCopy.connectWalletToBuyTicket]);
  const handleOpenKaraoke = React.useCallback(() => {
    if (!hasSession) {
      requestAuth(routeCopy.connectWalletToUseKaraoke);
      return;
    }
    navigate(`/p/${encodeURIComponent(postId)}/karaoke`);
  }, [hasSession, postId, requestAuth, routeCopy.connectWalletToUseKaraoke]);
  const handleOpenStudy = React.useCallback(() => {
    if (!hasSession) {
      requestAuth(routeCopy.connectWalletToStudy);
      return;
    }
    const communityId = post?.post.community;
    navigate(telegramMiniApp && communityId
      ? `/tg/c/${encodeURIComponent(communityId)}/p/${encodeURIComponent(postId)}/study`
      : `/p/${encodeURIComponent(postId)}/study`);
  }, [hasSession, post?.post.community, postId, requestAuth, routeCopy.connectWalletToStudy, telegramMiniApp]);
  const handleOpenStreaks = React.useCallback(() => {
    if (!hasSession) {
      requestAuth(routeCopy.connectWalletToSeeStreaks);
      return;
    }
    navigate(`/p/${encodeURIComponent(postId)}/streaks`);
  }, [hasSession, postId, requestAuth, routeCopy.connectWalletToSeeStreaks]);
  const openReplayBlob = React.useCallback((blob: Blob, title: string) => {
    if (typeof window === "undefined") return;
    const objectUrl = URL.createObjectURL(blob);
    replayObjectUrlsRef.current.add(objectUrl);
    setReplayPlayer((current) => {
      if (current) {
        URL.revokeObjectURL(current.sourceUrl);
        replayObjectUrlsRef.current.delete(current.sourceUrl);
      }
      return {
        mimeType: blob.type || null,
        sourceUrl: objectUrl,
        title,
      };
    });
    setReplayPlayerOpen(true);
  }, []);
  const handleWatchReplay = React.useCallback(async () => {
    if (!community?.id || !activeLiveRoomId) return;

    try {
      const playback = await loadLiveRoomReplayPlayback({
        accessToken: session?.accessToken ?? null,
        api: session?.accessToken ? api.communities : api.publicCommunities,
        communityId: community.id,
        liveRoomId: activeLiveRoomId,
        wallet: connectedWallets[0] ?? null,
      });

      if (playback.kind === "purchase_required") {
        const listing = playback.replayListing
          ?? (playback.replayAsset ? listingsByReplayAssetId[playback.replayAsset] : undefined);
        if (listing) {
          await handleBuyReplay(listing, liveRoomAccess?.room.title ?? post?.post.title ?? routeCopy.replayFallbackTitle, community.id);
        } else {
          toast.error(routeCopy.replayPurchaseSetupIncomplete);
        }
        return;
      }
      if (playback.kind === "delivery_pending") {
        toast.error(routeCopy.replayDeliveryPending);
        return;
      }
      if (playback.kind === "not_published") {
        toast.error(routeCopy.replayNotPublished);
        return;
      }
      if (playback.kind === "wallet_required") {
        authRuntime.reconnectEthereumWallet?.();
        authRuntime.connect?.();
        toast.error(routeCopy.connectWalletToUnlockReplay);
        return;
      }
      if (playback.kind !== "ready") {
        toast.error(routeCopy.replayUnavailable);
        return;
      }
      const replayTitle = liveRoomAccess?.room.title ?? post?.post.title ?? routeCopy.replayFallbackTitle;
      openReplayBlob(playback.blob, replayTitle);
    } catch (watchError) {
      toast.error(getErrorMessage(watchError, routeCopy.replayWatchFailed));
    }
  }, [
    activeLiveRoomId,
    api.communities,
    api.publicCommunities,
    authRuntime,
    community?.id,
    connectedWallets,
    handleBuyReplay,
    listingsByReplayAssetId,
    liveRoomAccess?.room.title,
    openReplayBlob,
    post?.post.title,
    requestAuth,
    routeCopy.connectWalletToUnlockReplay,
    routeCopy.replayDeliveryPending,
    routeCopy.replayFallbackTitle,
    routeCopy.replayNotPublished,
    routeCopy.replayPurchaseSetupIncomplete,
    routeCopy.replayUnavailable,
    routeCopy.replayWatchFailed,
    session?.accessToken,
  ]);

  const attachLiveRoomViewer = React.useCallback(async (options?: { openModal?: boolean }) => {
    if (!community?.id || !activeLiveRoomId) return;
    const openModal = options?.openModal ?? true;
    if (liveViewerSession?.room.id === activeLiveRoomId) {
      if (openModal) setLiveViewerOpen(true);
      return;
    }
    if (liveViewerAttachInFlightRef.current) return;
    liveViewerAttachInFlightRef.current = true;

    try {
      const access = liveRoomAccess ?? await refreshLiveRoomAccess();
      if (!access) return;

      if (!access.access.allowed) {
        if (access.access.decision_reason === "purchase_required") {
          if (!session?.accessToken) {
            requestAuth(routeCopy.connectWalletToBuyTicket);
            return;
          }
          const listing = listingsByLiveRoomId[activeLiveRoomId];
          if (listing) {
            await handleBuyLiveTicket(listing, access.room.title, community.id);
          } else {
            toast.error(routeCopy.ticketSetupIncomplete);
          }
          return;
        }
        if (access.access.decision_reason === "not_live") {
          toast.error(routeCopy.liveRoomNotLiveYet);
          return;
        }
        if (access.access.decision_reason === "membership_required") {
          requestAuth(routeCopy.connectWalletToVerifyCommunityAccess);
          return;
        }
        toast.error(routeCopy.liveRoomUnavailable);
        return;
      }

      const attach = await (async () => {
        if (!session?.accessToken) {
          return api.publicCommunities.viewerAttachLiveRoom(community.id, activeLiveRoomId);
        }
        try {
          return await api.communities.viewerAttachLiveRoom(community.id, activeLiveRoomId);
        } catch (authenticatedAttachError) {
          if (access.room.access_mode === "free" && access.room.visibility === "public") {
            logger.warn("[post-route] authenticated viewer attach failed; retrying public viewer attach", {
              communityId: community.id,
              error: getErrorMessage(authenticatedAttachError, routeCopy.liveRoomJoinFailed),
              liveRoomId: activeLiveRoomId,
              postId,
            });
            return api.publicCommunities.viewerAttachLiveRoom(community.id, activeLiveRoomId);
          }
          throw authenticatedAttachError;
        }
      })();
      setLiveViewerSession(attach);
      if (openModal) {
        setLiveViewerOpen(true);
      }
      setLiveRoomAccess({ room: attach.room, access: attach.access });
    } catch (attachError) {
      toast.error(getErrorMessage(attachError, routeCopy.liveRoomJoinFailed));
      await refreshLiveRoomAccess();
    } finally {
      liveViewerAttachInFlightRef.current = false;
    }
  }, [
    activeLiveRoomId,
    api.communities,
    api.publicCommunities,
    community?.id,
    handleBuyLiveTicket,
    listingsByLiveRoomId,
    liveRoomAccess,
    liveViewerSession?.room.id,
    postId,
    refreshLiveRoomAccess,
    requestAuth,
    routeCopy.connectWalletToBuyTicket,
    routeCopy.connectWalletToVerifyCommunityAccess,
    routeCopy.liveRoomJoinFailed,
    routeCopy.liveRoomNotLiveYet,
    routeCopy.liveRoomUnavailable,
    routeCopy.ticketSetupIncomplete,
    session?.accessToken,
  ]);

  const handleWatchLiveRoom = React.useCallback(async () => {
    const access = liveRoomAccess ?? await refreshLiveRoomAccess();
    if (access?.room.status === "ended" && access.room.replay_status === "published") {
      await handleWatchReplay();
      return;
    }
    await attachLiveRoomViewer({ openModal: true });
  }, [attachLiveRoomViewer, handleWatchReplay, liveRoomAccess, refreshLiveRoomAccess]);

  const handleAcceptLiveRoomGuestInvite = React.useCallback(async () => {
    if (!community?.id || !activeLiveRoomId) return;
    if (!session?.accessToken) {
      requestAuth(routeCopy.connectWalletToAcceptInvite);
      return;
    }
    if (liveRoomGuestInviteAcceptInFlightRef.current) return;

    liveRoomGuestInviteAcceptInFlightRef.current = true;
    try {
      await api.communities.acceptLiveRoomGuestInvite(community.id, activeLiveRoomId);
      toast.success(routeCopy.producerInviteAccepted);
      await refreshLiveRoomAccess();
    } catch (acceptError) {
      toast.error(getErrorMessage(acceptError, routeCopy.producerInviteAcceptFailed));
      await refreshLiveRoomAccess();
    } finally {
      liveRoomGuestInviteAcceptInFlightRef.current = false;
    }
  }, [
    activeLiveRoomId,
    api.communities,
    community?.id,
    refreshLiveRoomAccess,
    requestAuth,
    routeCopy.connectWalletToAcceptInvite,
    routeCopy.producerInviteAcceptFailed,
    routeCopy.producerInviteAccepted,
    session?.accessToken,
  ]);

  React.useEffect(() => {
    if (
      !autoWatchLiveRoom
      || autoWatchAttemptedRef.current
      || loading
      || !post
      || !community?.id
      || !activeLiveRoomId
    ) {
      return;
    }
    autoWatchAttemptedRef.current = true;
    void handleWatchLiveRoom();
  }, [
    activeLiveRoomId,
    autoWatchLiveRoom,
    community?.id,
    handleWatchLiveRoom,
    loading,
    post,
  ]);

  React.useEffect(() => {
    if (
      loading
      || autoWatchLiveRoom
      || !post
      || !community?.id
      || !activeLiveRoomId
      || liveViewerSession?.room.id === activeLiveRoomId
    ) {
      return;
    }

    const room = liveRoomAccess?.room;
    const access = liveRoomAccess?.access;
    if (
      room?.status !== "live"
      || room.access_mode !== "free"
      || room.visibility !== "public"
      || access?.allowed !== true
    ) {
      return;
    }

    const viewerIsProducer = sameUserId(session?.user?.id, room.host_user)
      || sameUserId(session?.user?.id, room.guest_user);
    if (viewerIsProducer) return;

    const attemptKey = `${community.id}:${activeLiveRoomId}:${session?.accessToken ? "auth" : "public"}`;
    if (inlineLiveViewerAttemptedRef.current === attemptKey) return;
    inlineLiveViewerAttemptedRef.current = attemptKey;
    void attachLiveRoomViewer({ openModal: false });
  }, [
    activeLiveRoomId,
    attachLiveRoomViewer,
    autoWatchLiveRoom,
    community?.id,
    liveRoomAccess?.access,
    liveRoomAccess?.room,
    liveViewerSession?.room.id,
    loading,
    post,
    session?.accessToken,
    session?.user?.id,
  ]);

  const handleRenewLiveRoomViewer = React.useCallback(async (uid: number) => {
    if (!community?.id || !activeLiveRoomId) return null;
    try {
      const renewed = session?.accessToken
        ? await api.communities.viewerRenewLiveRoom(community.id, activeLiveRoomId, { uid })
        : await api.publicCommunities.viewerRenewLiveRoom(community.id, activeLiveRoomId, { uid });
      setLiveRoomAccess({ room: renewed.room, access: renewed.access });
      return renewed;
    } catch (renewError) {
      toast.error(getErrorMessage(renewError, routeCopy.liveRoomRenewFailed));
      await refreshLiveRoomAccess();
      return null;
    }
  }, [activeLiveRoomId, api.communities, api.publicCommunities, community?.id, refreshLiveRoomAccess, routeCopy.liveRoomRenewFailed, session?.accessToken]);

  const diagnosticLiveRoom = liveRoomAccess?.room ?? null;
  const diagnosticGuestInviteStatus = liveRoomAccess?.access.guest_invite_status ?? null;
  const diagnosticViewerIsLiveRoomHost = sameUserId(session?.user?.id, diagnosticLiveRoom?.host_user);
  const diagnosticViewerIsLiveRoomGuest = sameUserId(session?.user?.id, diagnosticLiveRoom?.guest_user);
  const diagnosticLiveRoomLaunch = buildLiveRoomLaunch({
    communityId: community?.id,
    liveRoomId: activeLiveRoomId,
    postId,
    seat: diagnosticViewerIsLiveRoomHost
      ? "host"
      : diagnosticViewerIsLiveRoomGuest && diagnosticGuestInviteStatus === "accepted"
        ? "guest"
        : null,
  });
  const diagnosticLiveRoomFreedomHref = diagnosticLiveRoomLaunch && (
    diagnosticViewerIsLiveRoomHost
    || diagnosticViewerIsLiveRoomGuest && diagnosticGuestInviteStatus === "accepted"
  )
    ? diagnosticLiveRoomLaunch.href
    : undefined;

  React.useEffect(() => {
    if (!activeLiveRoomId) return;
    const producerRole = diagnosticViewerIsLiveRoomHost
      ? "host"
      : diagnosticViewerIsLiveRoomGuest
        ? "guest"
        : null;
    const payload = {
      freedomDetected: freedomDetection.detected,
      freedomDetection,
      guestInviteStatus: diagnosticGuestInviteStatus,
      guestUserId: diagnosticLiveRoom?.guest_user ?? null,
      hasFreedomHref: Boolean(diagnosticLiveRoomFreedomHref),
      hostUserId: diagnosticLiveRoom?.host_user ?? null,
      launchCommunityId: community?.id ?? null,
      liveRoomId: activeLiveRoomId,
      postCommunityId: post?.post.community ?? null,
      postId,
      producerRole,
      viewerUserId: session?.user?.id ?? null,
    };
    logger.info("[post-route] live room producer controls", payload);
    if (producerRole && !freedomDetection.detected) {
      logger.warn("[post-route] producer Freedom Browser detection missing; showing Download Freedom instead of broadcast launch", payload);
    }
    if (producerRole && !diagnosticLiveRoomFreedomHref) {
      logger.warn("[post-route] producer cannot open broadcast because live room launch href is missing", payload);
    }
  }, [
    activeLiveRoomId,
    diagnosticGuestInviteStatus,
    diagnosticLiveRoom?.guest_user,
    diagnosticLiveRoom?.host_user,
    diagnosticLiveRoomFreedomHref,
    diagnosticViewerIsLiveRoomGuest,
    diagnosticViewerIsLiveRoomHost,
    freedomDetection,
    community?.id,
    post?.post.community,
    postId,
    session?.user?.id,
  ]);

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

  const threadAssetId = activeAssetId;
  const threadLiveRoomId = post.post.anchor_live_room ?? null;
  const threadListing = threadAssetId ? listingsByAssetId[threadAssetId] : undefined;
  const threadPurchase = threadAssetId ? purchasesByAssetId[threadAssetId] : undefined;
  const threadLiveRoomListing = threadLiveRoomId ? listingsByLiveRoomId[threadLiveRoomId] : undefined;
  const threadLiveRoomPurchase = threadLiveRoomId ? purchasesByLiveRoomId[threadLiveRoomId] : undefined;
  const unauthenticatedLiveTicketRequired = !session?.accessToken
    && liveRoomAccess?.access.decision_reason === "purchase_required";
  const rewardLabel = rewardOffer
    ? rewardCtaAmountLabel(rewardOffer.daily_reward_cents)
    : undefined;
  const songOptions = (post.post.post_type === "song" || post.post.post_type === "video") && community && threadAssetId
    ? {
      currentUserId: session?.user?.id,
      asset: threadAsset,
      listing: threadListing,
      karaokeRewardLabel: rewardOffer?.eligible_activity !== "study" ? rewardLabel : undefined,
      onBuy: threadListing ? () => void handleBuySong(
        threadListing,
        post.post.title ?? (post.post.post_type === "video" ? "video" : "song"),
        community.id,
        post.post.post_type === "video" ? "video" : "song",
      ) : undefined,
      onKaraoke: post.post.post_type === "song" ? handleOpenKaraoke : undefined,
      onStudy: post.post.post_type === "song" ? handleOpenStudy : undefined,
      onStreaks: post.post.post_type === "song" ? handleOpenStreaks : undefined,
      playback: songPlayback,
      purchase: threadPurchase,
      storyLicenseNotice: storyLicenseReuseNotice ?? undefined,
      studyRewardLabel: rewardOffer?.eligible_activity !== "karaoke" ? rewardLabel : undefined,
    }
    : undefined;
  const liveRoom = liveRoomAccess?.room ?? null;
  const eventStore = liveRoom?.store_url
    ? {
      label: liveRoom.store_label?.trim() || copy.community.storeLabel || routeCopy.storeFallbackLabel,
      url: liveRoom.store_url,
    }
    : null;
  const viewerIsLiveRoomHost = sameUserId(session?.user?.id, liveRoom?.host_user)
    || Boolean(threadLiveRoomId && sameUserId(session?.user?.id, post.post.author_user));
  const viewerIsLiveRoomGuest = sameUserId(session?.user?.id, liveRoom?.guest_user);
  const liveRoomGuestInviteStatus = liveRoomAccess?.access.guest_invite_status ?? null;
  const liveRoomLaunch = buildLiveRoomLaunch({
    communityId: community?.id,
    liveRoomId: post.post.anchor_live_room,
    postId,
    seat: viewerIsLiveRoomHost
      ? "host"
      : viewerIsLiveRoomGuest && liveRoomGuestInviteStatus === "accepted"
        ? "guest"
        : null,
  });
  const liveRoomFreedomHref = liveRoomLaunch && (
    viewerIsLiveRoomHost
    || viewerIsLiveRoomGuest && liveRoomGuestInviteStatus === "accepted"
  )
    ? liveRoomLaunch.href
    : undefined;
  const liveRoomOptions = threadLiveRoomId && community
    ? {
      access: liveRoomAccess,
      currentUserId: session?.user?.id,
      freedomDetected: freedomDetection.detected,
      freedomHref: liveRoomFreedomHref ?? undefined,
      guestInviteStatus: liveRoomGuestInviteStatus,
      listing: threadLiveRoomListing,
      localeTag: locale,
      onAcceptGuestInvite: handleAcceptLiveRoomGuestInvite,
      onBuy: threadLiveRoomListing ? () => void handleBuyLiveTicket(
        threadLiveRoomListing,
        liveRoomAccess?.room.title ?? post.post.title ?? routeCopy.liveRoomFallbackTitle,
        community.id,
      ) : unauthenticatedLiveTicketRequired ? handlePromptLiveTicketAuth : undefined,
      onReviewReplay: viewerIsLiveRoomHost
        ? () => navigate(`/p/${encodeURIComponent(postId)}/replay`)
        : undefined,
      onWatch: () => void handleWatchLiveRoom(),
      onViewerRenew: handleRenewLiveRoomViewer,
      participants: buildLiveRoomParticipants({
        authorProfile,
        liveRoom,
        postAnonymousLabel: post.post.anonymous_label,
        postAuthorUserId: post.post.author_user,
        postIdentityMode: post.post.identity_mode,
        profilesByUserId: authorProfilesByUserId,
      }),
      producerRole: viewerIsLiveRoomHost
        ? "host" as const
        : viewerIsLiveRoomGuest
          ? "guest" as const
          : null,
      purchase: threadLiveRoomPurchase,
      viewerAttachResponse: liveViewerOpen ? null : liveViewerSession,
    }
    : undefined;
  const viewerMustJoin = Boolean(
    session
    && community?.viewer_membership_status === "not_member"
    && community.viewer_community_role == null
    // A gate a browser check alone can satisfy accepts non-member votes, so
    // show the real vote control instead of a join CTA.
    && !isPowSatisfiableGate(community.membership_gate_summaries, community.gate_match_mode),
  );
  const viewerMembershipResolving = Boolean(
    session
    && community?.viewer_community_role == null
    && community?.viewer_membership_status == null,
  );
  const localizedPostCard = toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, {
    canBoost: boostController.canBoost,
    canManageRewardSettings: boostController.canManagePolicy,
    canModeratePost: viewerCanModerateCommunity(session?.user?.id, community),
    commentCountOverride: commentCount,
    liveRoom: liveRoomOptions,
    onCancelEvent: cancelEvent,
    onBoost: boostController.openBoost,
    onDelete: deletePost,
    onRemove: removePost,
    onRewardSettings: boostController.openPolicy,
    onVerifyAge: handleVerifyAge,
    onVote: voteOnPost,
    voteBusy: viewerMembershipResolving,
    voteAccess: viewerMustJoin
      ? { label: copy.common.joinToVote, onClick: requestVoteAccess }
      : undefined,
    showOriginalLabel: copy.common.showOriginal,
    showTranslationLabel: copy.common.showTranslation,
    viewerContentLocale: contentLocale,
  });
  const originalPostCard = shouldShowOriginalPost(post)
    ? toThreadPostCard(post, community, authorProfile ?? undefined, songOptions, {
      canBoost: boostController.canBoost,
      canManageRewardSettings: boostController.canManagePolicy,
      canModeratePost: viewerCanModerateCommunity(session?.user?.id, community),
      commentCountOverride: commentCount,
      liveRoom: liveRoomOptions,
      onCancelEvent: cancelEvent,
      onBoost: boostController.openBoost,
      onDelete: deletePost,
      onRemove: removePost,
      onRewardSettings: boostController.openPolicy,
      onVerifyAge: handleVerifyAge,
      onVote: voteOnPost,
      voteBusy: viewerMembershipResolving,
      voteAccess: viewerMustJoin
        ? { label: copy.common.joinToVote, onClick: requestVoteAccess }
        : undefined,
      preferOriginalText: true,
      showOriginalLabel: copy.common.showOriginal,
      showTranslationLabel: copy.common.showTranslation,
      viewerContentLocale: contentLocale,
    })
    : undefined;
  const communityPath = community?.id
    ? telegramMiniApp
      ? `/tg/c/${encodeURIComponent(community.route_slug ?? community.id)}`
      : buildCommunityPath(community.id, community.route_slug)
    : telegramMiniApp
      ? "/tg"
      : "/";
  const threadSidebarProps = community ? buildCommunityPreviewSidebar(community, locale) : null;
  const commentSortOptions = [
    { label: copy.common.bestTab, value: "best" as const },
    { label: copy.common.newTab, value: "new" as const },
    { label: copy.common.topTab, value: "top" as const },
  ];
  const publicReplyLabel = session?.profile ? getProfileHandleLabel(session.profile) : routeCopy.publicLabel;
  const replyAnonymousScope: "community_stable" | "thread_stable" = community?.anonymous_identity_scope === "community_stable"
    ? "community_stable"
    : "thread_stable";
  const replyAnonymousLabel = session?.user?.id && community?.id
    ? buildAnonymousLabel({
        communityId: community.id,
        entityId: post.post.id,
        scope: replyAnonymousScope,
        userId: session.user.id,
      })
    : routeCopy.anonymousLabel;
  const replyIdentity: PostThreadReplyIdentity | undefined = session
    ? {
        allowAnonymousIdentity: community?.allow_anonymous_identity === true,
        anonymousLabel: replyAnonymousLabel,
        anonymousScope: replyAnonymousScope,
        publicLabel: publicReplyLabel,
      }
    : undefined;
  const mobileCommentSortAction = (
    <ResponsiveOptionSelect
      ariaLabel={routeCopy.sortComments}
      drawerTitle={copy.common.commentsHeading}
      mobileTrigger={(
        <IconButton aria-label={routeCopy.sortComments} variant="ghost">
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
      <BoostCampaignSheet {...boostController.sheetProps} />
      <SongRewardPolicySheet {...boostController.policySheetProps} />
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
      <LiveRoomReplayPlayerModal
        mimeType={replayPlayer?.mimeType}
        onOpenChange={handleReplayPlayerOpenChange}
        open={replayPlayerOpen}
        sourceUrl={replayPlayer?.sourceUrl ?? null}
        title={replayPlayer?.title ?? liveRoomAccess?.room.title ?? post.post.title ?? routeCopy.replayFallbackTitle}
      />
      <LiveRoomViewerModal
        attachResponse={liveViewerSession}
        onOpenChange={setLiveViewerOpen}
        onRenew={handleRenewLiveRoomViewer}
        open={liveViewerOpen}
        title={liveViewerSession?.room.title ?? liveRoomAccess?.room.title ?? post.post.title ?? routeCopy.liveRoomFallbackTitle}
      />
      <ContentRailShell
        rail={!isMobile && (eventStore || threadSidebarProps) ? (
          <div className="flex flex-col gap-3">
            {eventStore ? (
              <PostEventStoreLink
                communityId={community?.id}
                label={eventStore.label}
                liveRoomId={threadLiveRoomId}
                postId={postId}
                url={eventStore.url}
              />
            ) : null}
            {threadSidebarProps ? <CommunitySidebar {...threadSidebarProps} /> : null}
          </div>
        ) : undefined}
        reserveRail={!isMobile}
      >
        {isMobile && eventStore ? (
          <PostEventStoreLink
            className="mx-3 mb-3"
            communityId={community?.id}
            label={eventStore.label}
            liveRoomId={threadLiveRoomId}
            postId={postId}
            url={eventStore.url}
          />
        ) : null}
        <PostThread
          availableCommentSorts={commentSortOptions}
          commentSort={commentSort}
          commentsHeading={copy.common.commentsHeading}
          commentsHeadingDir={contentLocale === "ar" ? "rtl" : undefined}
          commentsHeadingLang={contentLocale === "ar" ? "ar" : undefined}
          emptyCommentsLabel={threadPartial ? copy.common.loadingReplies : copy.common.noComments}
          onCommentSortChange={setCommentSort}
          onReplyIntent={handleReplyIntent}
          onRootReplySubmit={createTopLevelComment}
          post={localizedPostCard}
          postOriginal={originalPostCard}
          replyIdentity={replyIdentity}
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
