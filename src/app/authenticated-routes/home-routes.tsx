"use client";

import * as React from "react";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { clearSession, useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { buildCommunityPath } from "@/lib/community-routing";
import { getCurrentHomeFeedSort, HOME_FEED_SORT_CHANGE_EVENT, setCurrentHomeFeedSort, type HomeFeedSort } from "@/lib/home-feed-sort";
import { useRecentCommunities, useSidebarCommunities } from "@/lib/owned-communities";
import { useUiLocale } from "@/lib/ui-locale";
import { Button } from "@/components/primitives/button";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Spinner } from "@/components/primitives/spinner";
import { YourCommunitiesPageView } from "@/components/compositions/community/your-communities-page/your-communities-page";
import { Feed, type FeedSort, TopTimeRangeControl } from "@/components/compositions/posts/feed/feed";
import { PopularCommunitiesRail, type PopularCommunityItem } from "@/components/compositions/community/popular-communities-rail/popular-communities-rail";
import { RecentPostRail, type RecentPostRailItem } from "@/components/compositions/posts/feed/recent-post-rail";
import { Type } from "@/components/primitives/type";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { resolveHomeFeedCommunityId } from "@/app/authenticated-helpers/home-feed-presentation";
import { toHomeFeedItem } from "@/app/authenticated-helpers/post-presentation";
import { submitOptimisticPostVote, updateHomeFeedEntryPostVote } from "@/app/authenticated-helpers/post-vote";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { buildFeedSortOptions, buildTopTimeRangeOptions } from "@/lib/feed-sort-options";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { EmptyFeedState, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";
import { useSongPlayback } from "@/app/authenticated-helpers/song-commerce";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";

function resolveRailThumbnail(entry: ApiHomeFeedItem): string | null {
  const primaryMedia = entry.post.post.media_refs?.[0];
  if (entry.post.post.post_type === "video") {
    return primaryMedia?.poster_ref ?? null;
  }
  if (entry.post.post.post_type === "image") {
    return primaryMedia?.storage_ref ?? null;
  }
  if (entry.post.post.post_type === "link") {
    const embed = entry.post.post.embeds?.[0];
    if (embed?.provider === "youtube") {
      return embed.preview?.thumbnail_url ?? null;
    }
    if (embed?.provider === "x") {
      return embed.preview?.media_url ?? null;
    }
    return entry.post.post.link_og_image_url ?? null;
  }
  return null;
}

function unixOrIsoMs(value: string | number): number {
  return typeof value === "number" ? value * 1000 : Date.parse(value);
}

function buildRailItem(entry: ApiHomeFeedItem): RecentPostRailItem | null {
  const title = (entry.post.translated_title ?? entry.post.post.title ?? entry.post.post.caption ?? entry.post.post.body ?? "").trim();
  if (!title) return null;

  const communityId = resolveHomeFeedCommunityId(entry.community);
  return {
    commentCount: entry.post.thread_snapshot?.comment_count ?? 0,
    communityAvatarSrc: entry.community.avatar_ref ?? null,
    communityHref: buildCommunityPath(communityId, entry.community.route_slug),
    communityId,
    communityLabel: entry.community.display_name,
    postHref: `/p/${entry.post.post.id}`,
    postId: entry.post.post.id,
    postTitle: title,
    score: entry.post.upvote_count - entry.post.downvote_count,
    timestampLabel: formatRelativeTimestamp(entry.post.post.created),
    thumbnailSrc: resolveRailThumbnail(entry),
  };
}

export function buildRecentPostRail(input: {
  feedEntries: ApiHomeFeedItem[];
  recentCommunities: ReturnType<typeof useRecentCommunities>;
  limit?: number;
}): RecentPostRailItem[] {
  const limit = input.limit ?? 6;
  if (limit <= 0 || input.feedEntries.length === 0) {
    return [];
  }

  const railPosts: RecentPostRailItem[] = [];
  const seenPostIds = new Set<string>();

  // When the user has recent communities, prioritize posts from those communities.
  if (input.recentCommunities.length > 0) {
    const communityVisitRank = new Map<string, number>();
    const recentCommunityMeta = new Map<string, ReturnType<typeof useRecentCommunities>[number]>();
    for (const [index, community] of input.recentCommunities.entries()) {
      communityVisitRank.set(community.communityId, index);
      recentCommunityMeta.set(community.communityId, community);
    }

    const eligiblePosts = input.feedEntries
      .filter((entry) => communityVisitRank.has(resolveHomeFeedCommunityId(entry.community)))
      .sort((left, right) => {
        const leftCommunityId = resolveHomeFeedCommunityId(left.community);
        const rightCommunityId = resolveHomeFeedCommunityId(right.community);
        const leftRank = communityVisitRank.get(leftCommunityId) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = communityVisitRank.get(rightCommunityId) ?? Number.MAX_SAFE_INTEGER;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        const createdAtDiff = unixOrIsoMs(right.post.post.created) - unixOrIsoMs(left.post.post.created);
        if (!Number.isNaN(createdAtDiff) && createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return right.post.post.id.localeCompare(left.post.post.id);
      });

    const seenCommunityIds = new Set<string>();

    // First pass: one post per recent community.
    for (const entry of eligiblePosts) {
      if (railPosts.length >= limit) break;

      const communityId = resolveHomeFeedCommunityId(entry.community);
      if (seenCommunityIds.has(communityId) || seenPostIds.has(entry.post.post.id)) {
        continue;
      }

      const recentCommunity = recentCommunityMeta.get(communityId);
      const item = buildRailItem(entry);
      if (!item) continue;

      railPosts.push({
        ...item,
        communityAvatarSrc: recentCommunity?.avatarSrc ?? item.communityAvatarSrc,
        communityHref: buildCommunityPath(communityId, recentCommunity?.routeSlug ?? entry.community.route_slug),
        communityLabel: recentCommunity?.displayName ?? item.communityLabel,
      });
      seenCommunityIds.add(communityId);
      seenPostIds.add(entry.post.post.id);
    }

    // Second pass: fill remaining slots with any eligible posts.
    for (const entry of eligiblePosts) {
      if (railPosts.length >= limit) break;
      if (seenPostIds.has(entry.post.post.id)) continue;

      const communityId = resolveHomeFeedCommunityId(entry.community);
      const recentCommunity = recentCommunityMeta.get(communityId);
      const item = buildRailItem(entry);
      if (!item) continue;

      railPosts.push({
        ...item,
        communityAvatarSrc: recentCommunity?.avatarSrc ?? item.communityAvatarSrc,
        communityHref: buildCommunityPath(communityId, recentCommunity?.routeSlug ?? entry.community.route_slug),
        communityLabel: recentCommunity?.displayName ?? item.communityLabel,
      });
      seenPostIds.add(entry.post.post.id);
    }
  }

  // Fallback: fill any remaining slots with the newest posts from the full feed.
  if (railPosts.length < limit) {
    const fallbackPosts = [...input.feedEntries]
      .sort((left, right) => {
        const createdAtDiff = unixOrIsoMs(right.post.post.created) - unixOrIsoMs(left.post.post.created);
        if (!Number.isNaN(createdAtDiff) && createdAtDiff !== 0) {
          return createdAtDiff;
        }
        return right.post.post.id.localeCompare(left.post.post.id);
      });

    for (const entry of fallbackPosts) {
      if (railPosts.length >= limit) break;
      if (seenPostIds.has(entry.post.post.id)) continue;

      const item = buildRailItem(entry);
      if (!item) continue;

      railPosts.push(item);
      seenPostIds.add(entry.post.post.id);
    }
  }

  return railPosts;
}

type UseHomeFeedInput = {
  activeSort: FeedSort;
  contentLocale: string;
  hydrated: boolean;
  session: ReturnType<typeof useSession>;
  topTimeRange: string;
};

export function useHomeFeed({ activeSort, contentLocale, hydrated, session, topTimeRange }: UseHomeFeedInput) {
  const api = useApi();
  const sessionProfile = session?.profile;
  const sessionUserId = session?.user.id;
  const [feedEntries, setFeedEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    if (!hydrated) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    setAuthorProfiles({});
    setListingsByAssetId({});
    setPurchasesByAssetId({});

    void api.feed.home({
      locale: contentLocale,
      sort: activeSort,
      timeRange: activeSort === "top" ? topTimeRange : null,
    })
      .then((result) => {
        if (cancelled) return;

        const nextFeedEntries = result.items;
        setFeedEntries(nextFeedEntries);
        setLoading(false);

        void loadProfilesByUserId(
          api,
          nextFeedEntries.map((entry) => entry.post.post.identity_mode === "public" ? entry.post.post.author_user : null).filter((userId): userId is string => Boolean(userId)),
          sessionProfile && sessionUserId ? { [sessionUserId]: sessionProfile } : {},
        )
          .then((profiles) => {
            if (!cancelled) setAuthorProfiles(profiles);
          })
          .catch(() => {
            if (!cancelled) setAuthorProfiles({});
          });

        const commerceCommunityIds = sessionUserId
          ? [...new Set(nextFeedEntries
            .filter((entry) => entry.post.post.post_type === "song" || entry.post.post.post_type === "video")
            .map((entry) => entry.community.id))]
          : [];

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
              setListingsByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.listings.map((listing) => (
                typeof listing.asset === "string" && listing.asset.length > 0 ? [[listing.asset, listing] as const] : []
              )))));
              setPurchasesByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.purchases.map((purchase) => (
                typeof purchase.asset === "string" && purchase.asset.length > 0 ? [[purchase.asset, purchase] as const] : []
              )))));
            })
            .catch(() => {
              // ignore commerce enrichment errors
            });
        }
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        if ((nextError as { status?: number; code?: string }).status === 401 || (nextError as { code?: string }).code === "auth_error") {
          clearSession();
          return;
        }
        setError(nextError);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSort, api, contentLocale, hydrated, sessionProfile, sessionUserId, topTimeRange]);

  return {
    feedEntries,
    setFeedEntries,
    authorProfiles,
    listingsByAssetId,
    purchasesByAssetId,
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
  const [topTimeRange, setTopTimeRange] = React.useState("day");
  const {
    feedEntries,
    setFeedEntries,
    authorProfiles,
    listingsByAssetId,
    purchasesByAssetId,
    error,
    loading,
  } = useHomeFeed({ activeSort, contentLocale, hydrated, session, topTimeRange });
  const recentCommunities = useRecentCommunities();
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const { gateModal, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: locale,
  });

  React.useEffect(() => {
    setCurrentHomeFeedSort(activeSort);
  }, [activeSort]);

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
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: entry.community.id,
      onAllowed: async () => {
        const previousPost = entry.post;
        await submitOptimisticPostVote({
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
    });
  }, [api.posts.vote, feedEntries, runGatedCommunityAction]);

  const feedItems = feedEntries.map((entry) => {
    const assetId = entry.post.post.asset ?? undefined;
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
        onComment: () => navigate(`/p/${entry.post.post.id}`),
        onVote: (direction) => void voteOnPost(entry.post.post.id, direction),
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
      },
    );
  });
  const recentRailPosts = React.useMemo(() => buildRecentPostRail({
    feedEntries,
    recentCommunities,
  }), [feedEntries, recentCommunities]);

  const popularCommunities = React.useMemo((): PopularCommunityItem[] => {
    if (feedEntries.length === 0) return [];

    const seen = new Set<string>();
    const communities: PopularCommunityItem[] = [];

    for (const entry of feedEntries) {
      const communityId = resolveHomeFeedCommunityId(entry.community);
      if (seen.has(communityId)) continue;
      seen.add(communityId);

      communities.push({
        communityId,
        communityLabel: entry.community.display_name,
        communityHref: buildCommunityPath(communityId, entry.community.route_slug),
        avatarSrc: entry.community.avatar_ref ?? null,
        memberCount: entry.community.member_count ?? 0,
      });
    }

    return communities
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 6);
  }, [feedEntries]);

  if (error) {
    return <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.home.failure)} title={copy.home.title} />;
  }

  return (
    <>
      {gateModal}
      <StandardRoutePage size="rail" className="gap-6" frameClassName="md:pb-0">
        <Feed
          activeSort={activeSort}
          aside={(
            <div className="flex flex-col gap-4">
              {recentRailPosts.length > 0 ? (
                <RecentPostRail
                  items={recentRailPosts}
                  localeTag={localeTag}
                  title={copy.home.railTitle}
                />
              ) : null}
              {popularCommunities.length > 0 ? (
                <PopularCommunitiesRail
                  items={popularCommunities}
                  localeTag={localeTag}
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
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
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
