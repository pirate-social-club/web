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
import { RecentPostRail, type RecentPostRailItem } from "@/components/compositions/posts/feed/recent-post-rail";
import { Type } from "@/components/primitives/type";

import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
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

function buildRecentPostRail(input: {
  feedEntries: ApiHomeFeedItem[];
  recentCommunities: ReturnType<typeof useRecentCommunities>;
  limit?: number;
}): RecentPostRailItem[] {
  const limit = input.limit ?? 6;
  if (limit <= 0 || input.feedEntries.length === 0 || input.recentCommunities.length === 0) {
    return [];
  }

  const communityVisitRank = new Map<string, number>();
  const recentCommunityMeta = new Map<string, ReturnType<typeof useRecentCommunities>[number]>();
  for (const [index, community] of input.recentCommunities.entries()) {
    communityVisitRank.set(community.communityId, index);
    recentCommunityMeta.set(community.communityId, community);
  }

  const eligiblePosts = input.feedEntries
    .filter((entry) => communityVisitRank.has(entry.community.community_id))
    .sort((left, right) => {
      const leftRank = communityVisitRank.get(left.community.community_id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = communityVisitRank.get(right.community.community_id) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const createdAtDiff = Date.parse(right.post.post.created_at) - Date.parse(left.post.post.created_at);
      if (!Number.isNaN(createdAtDiff) && createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return right.post.post.post_id.localeCompare(left.post.post.post_id);
    });

  const railPosts: RecentPostRailItem[] = [];
  const seenPostIds = new Set<string>();
  const seenCommunityIds = new Set<string>();

  for (const entry of eligiblePosts) {
    if (railPosts.length >= limit) break;
    if (seenCommunityIds.has(entry.community.community_id) || seenPostIds.has(entry.post.post.post_id)) {
      continue;
    }

    const recentCommunity = recentCommunityMeta.get(entry.community.community_id);
    const title = (entry.post.translated_title ?? entry.post.post.title ?? entry.post.post.caption ?? entry.post.post.body ?? "").trim();
    if (!title) {
      continue;
    }

    railPosts.push({
      commentCount: entry.post.thread_snapshot?.comment_count ?? 0,
      communityAvatarSrc: recentCommunity?.avatarSrc ?? null,
      communityHref: buildCommunityPath(entry.community.community_id, recentCommunity?.routeSlug ?? entry.community.route_slug),
      communityId: entry.community.community_id,
      communityLabel: recentCommunity?.displayName ?? entry.community.display_name,
      postHref: `/p/${entry.post.post.post_id}`,
      postId: entry.post.post.post_id,
      postTitle: title,
      score: entry.post.upvote_count - entry.post.downvote_count,
      timestampLabel: formatRelativeTimestamp(entry.post.post.created_at),
      thumbnailSrc: resolveRailThumbnail(entry),
    });
    seenCommunityIds.add(entry.community.community_id);
    seenPostIds.add(entry.post.post.post_id);
  }

  for (const entry of eligiblePosts) {
    if (railPosts.length >= limit) break;
    if (seenPostIds.has(entry.post.post.post_id)) {
      continue;
    }

    const recentCommunity = recentCommunityMeta.get(entry.community.community_id);
    const title = (entry.post.translated_title ?? entry.post.post.title ?? entry.post.post.caption ?? entry.post.post.body ?? "").trim();
    if (!title) {
      continue;
    }

    railPosts.push({
      commentCount: entry.post.thread_snapshot?.comment_count ?? 0,
      communityAvatarSrc: recentCommunity?.avatarSrc ?? null,
      communityHref: buildCommunityPath(entry.community.community_id, recentCommunity?.routeSlug ?? entry.community.route_slug),
      communityId: entry.community.community_id,
      communityLabel: recentCommunity?.displayName ?? entry.community.display_name,
      postHref: `/p/${entry.post.post.post_id}`,
      postId: entry.post.post.post_id,
      postTitle: title,
      score: entry.post.upvote_count - entry.post.downvote_count,
      timestampLabel: formatRelativeTimestamp(entry.post.post.created_at),
      thumbnailSrc: resolveRailThumbnail(entry),
    });
    seenPostIds.add(entry.post.post.post_id);
  }

  return railPosts;
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
  const [feedEntries, setFeedEntries] = React.useState<ApiHomeFeedItem[]>([]);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [listingsByAssetId, setListingsByAssetId] = React.useState<Record<string, ApiCommunityListing | undefined>>({});
  const [purchasesByAssetId, setPurchasesByAssetId] = React.useState<Record<string, ApiCommunityPurchase | undefined>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const recentCommunities = useRecentCommunities();
  const songPlayback = useSongPlayback(session?.accessToken ?? null);
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const { gateModal, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "home",
    uiLocale: locale,
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!hydrated) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    void api.feed.home({
      locale: contentLocale,
      sort: activeSort,
      timeRange: activeSort === "top" ? topTimeRange : null,
    })
      .then(async (result) => {
        const nextFeedEntries = result.items;
        const nextAuthorProfiles = await loadProfilesByUserId(
          api,
          nextFeedEntries.map((entry) => entry.post.post.identity_mode === "public" ? entry.post.post.author_user_id : null).filter((userId): userId is string => Boolean(userId)),
          session?.profile ? { [session.user.user_id]: session.profile } : {},
        );
        const commerceCommunityIds = session
          ? [...new Set(nextFeedEntries
            .filter((entry) => entry.post.post.post_type === "song" || entry.post.post.post_type === "video")
            .map((entry) => entry.community.community_id))]
          : [];
        const commerceByCommunity = await Promise.all(commerceCommunityIds.map(async (communityId) => {
          const [listings, purchases] = await Promise.all([
            api.communities.listListings(communityId).then((response) => response.items).catch(() => []),
            api.communities.listPurchases(communityId).then((response) => response.items).catch(() => []),
          ]);
          return { communityId, listings, purchases };
        }));

        if (cancelled) return;

        setFeedEntries(nextFeedEntries);
        setAuthorProfiles(nextAuthorProfiles);
        setListingsByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.listings.map((listing) => (
          typeof listing.asset_id === "string" && listing.asset_id.length > 0 ? [[listing.asset_id, listing] as const] : []
        )))));
        setPurchasesByAssetId(Object.fromEntries(commerceByCommunity.flatMap((result) => result.purchases.map((purchase) => (
          typeof purchase.asset_id === "string" && purchase.asset_id.length > 0 ? [[purchase.asset_id, purchase] as const] : []
        )))));
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        if ((nextError as { status?: number; code?: string }).status === 401 || (nextError as { code?: string }).code === "auth_error") {
          clearSession();
          return;
        }
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSort, api, contentLocale, hydrated, session, topTimeRange]);

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
    const entry = feedEntries.find((candidate) => candidate.post.post.post_id === postId);
    if (!entry) return;
    await runGatedCommunityAction({
      action: "vote_post",
      communityId: entry.community.community_id,
      onAllowed: async () => {
        const previousPost = entry.post;
        await submitOptimisticPostVote({
          direction,
          onApply: (nextValue) => setFeedEntries((current) => updateHomeFeedEntryPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setFeedEntries((current) => current.map((currentEntry) => currentEntry.post.post.post_id === postId ? { ...currentEntry, post: restoredPost } : currentEntry)),
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
    const assetId = entry.post.post.asset_id ?? undefined;
    return toHomeFeedItem(
      entry,
      authorProfiles,
      entry.post.post.post_type === "song" || entry.post.post.post_type === "video"
        ? {
          currentUserId: session?.user?.user_id,
          listing: assetId ? listingsByAssetId[assetId] : undefined,
          localeTag,
          playback: songPlayback,
          purchase: assetId ? purchasesByAssetId[assetId] : undefined,
        }
        : undefined,
      {
        onComment: () => navigate(`/p/${entry.post.post.post_id}`),
        onVote: (direction) => void voteOnPost(entry.post.post.post_id, direction),
        showOriginalLabel: copy.common.showOriginal,
        showTranslationLabel: copy.common.showTranslation,
      },
    );
  });
  const recentRailPosts = React.useMemo(() => buildRecentPostRail({
    feedEntries,
    recentCommunities,
  }), [feedEntries, recentCommunities]);

  if (error) {
    return <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.home.failure)} title={copy.home.title} />;
  }

  return (
    <>
      {gateModal}
      <StandardRoutePage size="rail" className="gap-6">
        <Feed
          activeSort={activeSort}
          aside={recentRailPosts.length > 0 ? (
            <RecentPostRail
              items={recentRailPosts}
              localeTag={localeTag}
              title={copy.home.railTitle}
            />
          ) : undefined}
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
