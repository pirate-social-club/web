"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { HomeFeedCommunitySummary as ApiHomeFeedCommunitySummary } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { clearSession, updateSessionUser, useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import { getCurrentHomeFeedSort, HOME_FEED_SORT_CHANGE_EVENT, setCurrentHomeFeedSort, type HomeFeedSort } from "@/lib/home-feed-sort";
import { useSidebarCommunities } from "@/lib/owned-communities";
import { useUiLocale } from "@/lib/ui-locale";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { YourCommunitiesPageView } from "@/components/compositions/community/your-communities-page/your-communities-page";
import { Feed, type FeedSort, TopTimeRangeControl } from "@/components/compositions/posts/feed/feed";
import { PopularCommunitiesRail, type PopularCommunityItem } from "@/components/compositions/community/popular-communities-rail/popular-communities-rail";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Type } from "@/components/primitives/type";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { buildLiveRoomFreedomHref } from "@/app/authenticated-helpers/live-room-launch";
import { resolveHomeFeedCommunityId } from "@/app/authenticated-helpers/home-feed-presentation";
import { buildLiveRoomParticipants } from "@/app/authenticated-helpers/post-live-room-participants";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { submitOptimisticPostVote, toPostVoteValue, updateHomeFeedEntryPostVote } from "@/app/authenticated-helpers/post-vote";
import { sameUserId } from "@/app/authenticated-helpers/user-id";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { buildFeedSortOptions, buildTopTimeRangeOptions } from "@/lib/feed-sort-options";
import { EmptyFeedState, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";
import { useSongPlayback } from "@/app/authenticated-helpers/song-commerce";
import { seedPublicThreadQueriesFromFeed } from "@/lib/query/public-thread-cache";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { selectPostVoteGateData } from "@/hooks/use-community-interaction-gate.helpers";
import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import { getFreedomBrowserDetectionSnapshot } from "@/lib/resource-links";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";
import { useSelfVerification } from "@/lib/verification/use-self-verification";

function unixOrIsoMs(value: string | number): number {
  return typeof value === "number" ? value * 1000 : Date.parse(value);
}

type UseHomeFeedInput = {
  activeSort: FeedSort;
  contentLocale: string;
  hydrated: boolean;
  session: ReturnType<typeof useSession>;
  topTimeRange: string;
};

type HomeFeedResultSource = "authenticated" | "public";

function hasOwnProperty(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function mergeViewerSpecificPostFields(
  incomingEntry: ApiHomeFeedItem,
  currentEntry: ApiHomeFeedItem,
): ApiHomeFeedItem {
  const currentPost = currentEntry.post;
  const nextPost: ApiHomeFeedItem["post"] = {
    ...incomingEntry.post,
    viewer_reaction_kinds: currentPost.viewer_reaction_kinds,
    viewer_vote: currentPost.viewer_vote,
  };

  if (hasOwnProperty(currentPost, "viewer_gate_state")) {
    nextPost.viewer_gate_state = currentPost.viewer_gate_state;
  }
  if (hasOwnProperty(currentPost, "viewer_is_author")) {
    nextPost.viewer_is_author = currentPost.viewer_is_author;
  }
  if (hasOwnProperty(currentPost, "age_gate_viewer_state")) {
    nextPost.age_gate_viewer_state = currentPost.age_gate_viewer_state;
  }
  if (hasOwnProperty(currentPost, "community")) {
    if (currentPost.community && incomingEntry.post.community) {
      const nextCommunity = { ...incomingEntry.post.community };
      if (hasOwnProperty(currentPost.community, "viewer_membership_status")) {
        nextCommunity.viewer_membership_status = currentPost.community.viewer_membership_status;
      }
      if (hasOwnProperty(currentPost.community, "viewer_community_role")) {
        nextCommunity.viewer_community_role = currentPost.community.viewer_community_role;
      }
      if (hasOwnProperty(currentPost.community, "viewer_following")) {
        nextCommunity.viewer_following = currentPost.community.viewer_following;
      }
      nextPost.community = nextCommunity;
    } else {
      nextPost.community = currentPost.community;
    }
  }

  return {
    ...incomingEntry,
    post: nextPost,
  };
}

export function mergeHomeFeedEntriesForSource(input: {
  current: ApiHomeFeedItem[];
  hasSessionUser: boolean;
  incoming: ApiHomeFeedItem[];
  source: HomeFeedResultSource;
}): ApiHomeFeedItem[] {
  if (input.source === "authenticated" || !input.hasSessionUser) {
    return input.incoming;
  }

  // Public feed responses are allowed to refresh post content, but they must not
  // erase viewer-specific fields already learned from auth or optimistic actions.
  const currentByPostId = new Map(input.current.map((entry) => [entry.post.post.id, entry]));
  return input.incoming.map((entry) => {
    const currentEntry = currentByPostId.get(entry.post.post.id);
    return currentEntry ? mergeViewerSpecificPostFields(entry, currentEntry) : entry;
  });
}

export function useHomeFeed({ activeSort, contentLocale, hydrated, session, topTimeRange }: UseHomeFeedInput) {
  const api = useApi();
  const queryClient = useQueryClient();
  const sessionProfile = session?.profile;
  const sessionAccessToken = session?.accessToken;
  const sessionUserId = session?.user.id;
  const [feedEntries, setFeedEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [topCommunities, setTopCommunities] = React.useState<ApiHomeFeedCommunitySummary[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [listingsByLiveRoomId, setListingsByLiveRoomId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [purchasesByLiveRoomId, setPurchasesByLiveRoomId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [liveRoomAccessById, setLiveRoomAccessById] = React.useState<Record<string, ApiLiveRoomAccessResponse | undefined>>({});
  const [freedomDetection, setFreedomDetection] = React.useState(() => getFreedomBrowserDetectionSnapshot());
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!hydrated) return undefined;
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
  }, [hydrated]);

  React.useEffect(() => {
    let cancelled = false;

    if (!hydrated) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    setTopCommunities([]);
    setAuthorProfiles({});
    setListingsByAssetId({});
    setListingsByLiveRoomId({});
    setPurchasesByAssetId({});
    setPurchasesByLiveRoomId({});
    setLiveRoomAccessById({});

    const feedRequest = {
      locale: contentLocale,
      sort: activeSort,
      timeRange: activeSort === "top" ? topTimeRange : null,
    };

    const applyFeedResult = (
      result: Awaited<ReturnType<typeof api.feed.home>>,
      options: { source: HomeFeedResultSource },
    ) => {
        if (cancelled) return;

        const nextFeedEntries = result.items;
        seedPublicThreadQueriesFromFeed({
          items: nextFeedEntries,
          locale: contentLocale,
          queryClient,
          sort: "best",
        });
        setFeedEntries((current) => mergeHomeFeedEntriesForSource({
          current,
          hasSessionUser: Boolean(sessionUserId),
          incoming: nextFeedEntries,
          source: options.source,
        }));
        setTopCommunities(result.top_communities);
        setLoading(false);

        void loadProfilesByUserId(
          api,
          nextFeedEntries.reduce<string[]>((result, entry) => {
            const userId = entry.post.post.identity_mode === "public" ? entry.post.post.author_user : null;
            if (userId) {
              result.push(userId);
            }
            return result;
          }, []),
          sessionProfile && sessionUserId ? { [sessionUserId]: sessionProfile } : {},
        )
          .then((profiles) => {
            if (!cancelled) setAuthorProfiles(profiles);
          })
          .catch(() => {
            if (!cancelled) setAuthorProfiles({});
          });

        const commerceCommunityIds = sessionUserId
          ? [...new Set(nextFeedEntries.reduce<string[]>((result, entry) => {
            if (entry.post.post.post_type === "song" || entry.post.post.post_type === "video" || entry.post.post.anchor_live_room) {
              result.push(entry.community.id);
            }
            return result;
          }, []))]
          : [];
        const liveRoomRefs = nextFeedEntries.reduce<Array<{ communityId: string; liveRoomId: string }>>((result, entry) => {
          const liveRoomId = entry.post.post.anchor_live_room;
          if (liveRoomId) {
            result.push({ communityId: entry.community.id, liveRoomId });
          }
          return result;
        }, []);

        if (commerceCommunityIds.length > 0) {
          void Promise.all(commerceCommunityIds.map(async (communityId) => {
            const [listings, purchases] = await Promise.all([
              api.communities.listListings(communityId).then((response) => response.items).catch(() => []),
              api.communities.listPurchases(communityId).then((response) => response.items).catch(() => []),
            ]);
            return { communityId, listings, purchases };
          }))
            .then((commerceByCommunity) => {
              if (cancelled) return;
              setListingsByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.listings.flatMap((listing) => (
                typeof listing.asset === "string" && listing.asset.length > 0 ? [[listing.asset, listing] as const] : []
              )))));
              setListingsByLiveRoomId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.listings.flatMap((listing) => (
                typeof listing.live_room === "string" && listing.live_room.length > 0 ? [[listing.live_room, listing] as const] : []
              )))));
              setPurchasesByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.purchases.flatMap((purchase) => (
                typeof purchase.asset === "string" && purchase.asset.length > 0 ? [[purchase.asset, purchase] as const] : []
              )))));
              setPurchasesByLiveRoomId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.purchases.flatMap((purchase) => (
                typeof purchase.live_room === "string" && purchase.live_room.length > 0 ? [[purchase.live_room, purchase] as const] : []
              )))));
            })
            .catch(() => {
              // ignore commerce enrichment errors
            });
        }

        if (liveRoomRefs.length > 0) {
          void Promise.all(liveRoomRefs.map(async ({ communityId, liveRoomId }) => {
            const access = await (async () => {
              if (!sessionAccessToken) {
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
              if (participantIds.length > 0) {
                void loadProfilesByUserId(api, participantIds, authorProfiles)
                  .then((profiles) => {
                    if (!cancelled) setAuthorProfiles((current) => ({ ...current, ...profiles }));
                  })
                  .catch(() => {
                    // Participant profiles are enrichment only.
                  });
              }
            })
            .catch(() => {
              // ignore live-room enrichment errors
            });
        }
    };

    const loadAuthenticatedFeed = () => api.feed.homeAuthenticated(feedRequest)
      .then((result) => applyFeedResult(result, { source: "authenticated" }))
      .catch((nextError: unknown) => {
        if (cancelled) return;
        if ((nextError as { status?: number; code?: string }).status === 401 || (nextError as { code?: string }).code === "auth_error") {
          clearSession();
          return;
        }
        setError(nextError);
        setLoading(false);
      });

    if (sessionUserId) {
      void loadAuthenticatedFeed();
    }

    void api.feed.publicHome(feedRequest)
      .then((result) => {
        applyFeedResult(result, { source: "public" });
      })
      .catch((nextError: unknown) => {
        if (sessionUserId) {
          return;
        }
        if (cancelled) return;
        setError(nextError);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSort, api, contentLocale, hydrated, queryClient, sessionAccessToken, sessionProfile, sessionUserId, topTimeRange]);

  return {
    feedEntries,
    setFeedEntries,
    topCommunities,
    authorProfiles,
    listingsByAssetId,
    listingsByLiveRoomId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    liveRoomAccessById,
    freedomDetected: freedomDetection.detected,
    error,
    loading,
  };
}

export function HomePage({ initialSort }: { initialSort?: FeedSort } = {}) {
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const { locale } = useUiLocale();
  const { copy, localeTag } = useRouteMessages();
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const topTimeRangeOptions = React.useMemo(() => buildTopTimeRangeOptions(copy.common), [copy.common]);
  const contentLocale = useRouteContentLocale();
  const createCommunityLabel = copy.home.createCommunityLabel;
  const emptyHomeBody = copy.home.emptyHomeBody;
  const emptyHomeTitle = copy.home.emptyHomeTitle;
  const emptyHomeVerifyBody = copy.home.emptyHomeVerifyBody;
  const [activeSort, setActiveSort] = React.useState<FeedSort>(() => initialSort ?? getCurrentHomeFeedSort());
  const [topTimeRange, setTopTimeRange] = React.useState("all");
  const {
    feedEntries,
    setFeedEntries,
    topCommunities,
    authorProfiles,
    listingsByAssetId,
    listingsByLiveRoomId,
    purchasesByAssetId,
    purchasesByLiveRoomId,
    liveRoomAccessById,
    freedomDetected,
    error,
    loading,
  } = useHomeFeed({ activeSort, contentLocale, hydrated, session, topTimeRange });
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const authRuntime = usePiratePrivyRuntime();
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
      setFeedEntries((current) => current.map((entry) => ({
        ...entry,
        post: {
          ...entry.post,
          age_gate_viewer_state: "verified_allowed",
        },
      })));
    },
    startErrorMessage: "Could not start age verification.",
    storageKey: "pirate_pending_self_age_gate:home",
    verificationIntent: "community_join",
  });
  const { gateModal, prewarmCommunityGate, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: locale,
  });
  const voteGateDataByPostId = React.useMemo(() => {
    const next = new Map<string, NonNullable<ReturnType<typeof selectPostVoteGateData>>>();
    for (const entry of feedEntries) {
      const gateData = selectPostVoteGateData(entry.post);
      if (gateData) {
        next.set(entry.post.post.id, gateData);
      }
    }
    return next;
  }, [feedEntries]);

  React.useEffect(() => {
    for (const gateData of voteGateDataByPostId.values()) {
      prewarmCommunityGate(gateData.preview.id, gateData);
    }
  }, [prewarmCommunityGate, voteGateDataByPostId]);

  React.useEffect(() => {
    setCurrentHomeFeedSort(activeSort);
  }, [activeSort]);

  const requestAuth = React.useCallback((fallbackMessage: string) => {
    if (!isCanonicalAuthOrigin()) {
      const canonicalUrl = buildCanonicalAuthUrl("/");
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
  }, [authRuntime.connect, authRuntime.loadError, copy.publicProfile.openInPirate]);

  const handleVerifyAge = React.useCallback(() => {
    if (!session) {
      requestAuth("Connect your wallet to verify your age and view 18+ content.");
      return;
    }
    void startAgeSelfVerification({
      requestedCapabilities: ["age_over_18"],
      unavailableMessage: "Age verification is required to view 18+ content.",
    });
  }, [session, requestAuth, startAgeSelfVerification]);

  React.useEffect(() => {
    const handleSortChange = (event: Event) => {
      const sort = (event as CustomEvent<HomeFeedSort>).detail;
      if (sort === "best" || sort === "new" || sort === "top") {
        setActiveSort(sort);
      }
    };

    window.addEventListener(HOME_FEED_SORT_CHANGE_EVENT, handleSortChange);
    return () => window.removeEventListener(HOME_FEED_SORT_CHANGE_EVENT, handleSortChange);
  }, []);

  const needsPostingVerification = !!session && session.onboarding.unique_human_verification_status !== "verified";

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    const entry = feedEntries.find((candidate) => candidate.post.post.id === postId);
    if (!entry) return;
    if (!direction) return;
    const voteValue = toPostVoteValue(direction);
    const voteGateData = voteGateDataByPostId.get(postId) ?? null;
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: voteGateData?.preview.id ?? entry.community.id,
      ...(voteGateData ? { gateData: voteGateData } : {}),
      onAllowed: async (context) => {
        const previousPost = entry.post;
        await submitOptimisticPostVote({
          altchaPayload: context?.altchaPayload,
          direction,
          onApply: (nextValue) => setFeedEntries((current) => updateHomeFeedEntryPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setFeedEntries((current) => current.map((currentEntry) => currentEntry.post.post.id === postId ? { ...currentEntry, post: restoredPost } : currentEntry)),
          postId,
          previousPost: previousPost ?? null,
          requestIdsRef: voteRequestIdsRef,
          vote: api.posts.vote,
        });
      },
      postId,
      voteValue,
    });
  }, [api.posts.vote, feedEntries, runGatedCommunityAction, voteGateDataByPostId]);

  const cancelEvent = React.useCallback(async (postId: string) => {
    const entry = feedEntries.find((candidate) => candidate.post.post.id === postId);
    if (!entry) return;
    if (typeof window !== "undefined" && !window.confirm("Cancel this event?")) return;

    const previousEntries = feedEntries;
    try {
      const updated = await api.posts.cancelEvent(entry.post.post.community, postId);
      setFeedEntries((current) => current.map((candidate) => (
        candidate.post.post.id === postId ? { ...candidate, post: updated } : candidate
      )));
    } catch (nextError) {
      setFeedEntries(previousEntries);
      toast.error(getErrorMessage(nextError, "Could not cancel this event."));
    }
  }, [api.posts, feedEntries, setFeedEntries]);
  const feedItems = feedEntries.map((entry) => {
    const assetId = entry.post.post.asset ?? undefined;
    const liveRoomId = entry.post.post.anchor_live_room ?? undefined;
    const liveRoomAccess = liveRoomId ? liveRoomAccessById[liveRoomId] : undefined;
    const liveRoomParticipants = buildLiveRoomParticipants({
      liveRoom: liveRoomAccess?.room,
      postAuthorUserId: entry.post.post.author_user,
      profilesByUserId: authorProfiles,
    });
    const liveRoomGuestInviteStatus = liveRoomAccess?.access.guest_invite_status ?? null;
    const viewerIsLiveRoomHost = sameUserId(session?.user?.id, liveRoomAccess?.room.host_user)
      || Boolean(liveRoomId && sameUserId(session?.user?.id, entry.post.post.author_user));
    const viewerIsLiveRoomGuest = sameUserId(session?.user?.id, liveRoomAccess?.room.guest_user);
    const liveRoomSeat = viewerIsLiveRoomHost
      ? "host" as const
      : viewerIsLiveRoomGuest && liveRoomGuestInviteStatus === "accepted"
        ? "guest" as const
        : null;
    const liveRoomFreedomHref = liveRoomSeat && liveRoomId
      ? buildLiveRoomFreedomHref({
        communityId: entry.community.id,
        liveRoomId,
        postId: entry.post.post.id,
        seat: liveRoomSeat,
      })
      : undefined;
    return toHomeFeedItem(
      entry,
      authorProfiles,
      entry.post.post.post_type === "song" || entry.post.post.post_type === "video"
        ? {
          currentUserId: session?.user?.id,
          listing: assetId ? listingsByAssetId[assetId] : undefined,
          localeTag,
          playback: songPlayback,
          purchase: assetId ? purchasesByAssetId[assetId] : undefined,
        }
        : undefined,
      {
        liveRoom: liveRoomId ? {
          access: liveRoomAccess,
          currentUserId: session?.user?.id,
          freedomDetected,
          freedomHref: liveRoomFreedomHref,
          guestInviteStatus: liveRoomGuestInviteStatus,
          listing: listingsByLiveRoomId[liveRoomId],
          localeTag,
          onBuy: listingsByLiveRoomId[liveRoomId] ? () => navigate(`/p/${entry.post.post.id}`) : undefined,
          onWatch: () => navigate(`/p/${entry.post.post.id}`),
          participants: liveRoomParticipants,
          producerRole: viewerIsLiveRoomHost
            ? "host"
            : viewerIsLiveRoomGuest
              ? "guest"
              : null,
          purchase: purchasesByLiveRoomId[liveRoomId],
        } : undefined,
        onCancelEvent: () => void cancelEvent(entry.post.post.id),
        onComment: () => navigate(`/p/${entry.post.post.id}`),
        onVerifyAge: handleVerifyAge,
        onVote: (direction) => void voteOnPost(entry.post.post.id, direction),
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
        viewerContentLocale: contentLocale,
      },
    );
  });
  const popularCommunities = React.useMemo((): PopularCommunityItem[] => {
    return topCommunities
      .map((community) => {
        const communityId = resolveHomeFeedCommunityId(community);
        return {
          communityId,
          communityLabel: community.display_name,
          communityHref: buildCommunityPath(communityId, community.route_slug),
          avatarSrc: community.avatar_ref ?? null,
          metricCount: community.view_count ?? 0,
          metricLabel: copy.common.viewsLabel,
        };
      })
      .sort((a, b) => b.metricCount - a.metricCount)
      .slice(0, 6);
  }, [copy.common.viewsLabel, topCommunities]);

  if (error) {
    return <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.home.failure)} title={copy.home.title} />;
  }

  return (
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
      <StandardRoutePage size="rail" className="gap-6" frameClassName="md:pb-0">
        <Feed
          activeSort={activeSort}
          aside={(
            <div className="flex flex-col gap-4">
              {popularCommunities.length > 0 ? (
                <PopularCommunitiesRail
                  items={popularCommunities}
                  localeTag={localeTag}
                  title={copy.common.popularTitle}
                />
              ) : null}
            </div>
          )}
          availableSorts={sortOptions}
          controls={activeSort === "top" ? <TopTimeRangeControl onValueChange={setTopTimeRange} options={topTimeRangeOptions} value={topTimeRange} /> : undefined}
          emptyState={{
            action: session ? (
              <Button onClick={() => navigate("/communities/new")} variant="secondary">
                {createCommunityLabel}
              </Button>
            ) : undefined,
            body: needsPostingVerification ? emptyHomeVerifyBody : emptyHomeBody,
            title: emptyHomeTitle,
          }}
          hideMobileHeaderControls
          items={feedItems}
          fullBleedMobile
          listClassName="border-t-0 md:rounded-none md:border-x-0 md:border-t md:bg-transparent"
          loading={loading}
          onSortChange={setActiveSort}
        />
      </StandardRoutePage>
    </>
  );
}

function YourCommunitiesAuthState() {
  const hydrated = useClientHydrated();
  const { busy, configured, connect, loaded } = usePiratePrivyRuntime();
  const { copy } = useRouteMessages();

  if (!hydrated || (configured && !loaded)) {
    return (
      <section className="flex min-h-[calc(100svh-11rem)] min-w-0 flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100svh-11rem)] min-w-0 flex-1 items-center justify-center px-1">
      <div className="w-full max-w-sm rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-col items-start gap-5 text-start">
          <div className="space-y-2">
            <Type as="h1" variant="h2">
              {copy.yourCommunities.title}
            </Type>
            <p className="text-base leading-7 text-muted-foreground">
              {copy.yourCommunities.signedOutBody}
            </p>
          </div>
          {configured && connect ? (
            <Button loading={busy} onClick={connect}>
              {copy.yourCommunities.signInLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const { error, loading, moderatedCommunities, recentCommunities } = useSidebarCommunities();
  const createCommunityLabel = copy.home.createCommunityLabel;
  const emptyYourCommunitiesBody = copy.home.emptyYourCommunitiesBody;
  const emptyYourCommunitiesTitle = copy.home.emptyYourCommunitiesTitle;
  const joinedCommunityIds = React.useMemo(
    () => new Set(moderatedCommunities.map((community) => community.communityId)),
    [moderatedCommunities],
  );
  const followingCommunities = React.useMemo(
    () => recentCommunities.filter((community) => !joinedCommunityIds.has(community.communityId)),
    [joinedCommunityIds, recentCommunities],
  );

  if (!session) {
    return <YourCommunitiesAuthState />;
  }

  if (loading && recentCommunities.length === 0 && moderatedCommunities.length === 0) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center py-20">
        <Spinner className="size-6" />
      </section>
    );
  }

  if (error && recentCommunities.length === 0 && moderatedCommunities.length === 0) {
    return (
      <RouteLoadFailureState
        description={getErrorMessage(error, copy.home.loadCommunitiesError)}
        title={copy.yourCommunities.title}
      />
    );
  }

  return (
    <YourCommunitiesPageView
      createCommunityLabel={createCommunityLabel}
      emptyFollowingLabel={`${emptyYourCommunitiesTitle}. ${emptyYourCommunitiesBody}`}
      emptyJoinedLabel={copy.yourCommunities.emptyJoinedLabel}
      followingCommunities={followingCommunities}
      followingLabel={copy.yourCommunities.followingLabel}
      joinedCommunities={moderatedCommunities}
      joinedLabel={copy.yourCommunities.joinedLabel}
      onCreateCommunity={() => navigate("/communities/new")}
      onSelectCommunity={(community) => navigate(buildCommunityPath(community.communityId, community.routeSlug))}
      title={copy.yourCommunities.title}
    />
  );
}

export function NotFoundBody({ title, description, body, backHomeLabel }: { title: string; description: string; body: string; backHomeLabel: string }) {
  return (
    <PageContainer className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Type as="h1" variant="h1" className="text-2xl md:text-3xl">{title}</Type>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button onClick={() => navigate("/")} variant="secondary">{backHomeLabel}</Button>
          </div>
        </div>
      </div>
      <EmptyFeedState message={body} />
    </PageContainer>
  );
}
