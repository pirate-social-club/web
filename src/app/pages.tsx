"use client";

import * as React from "react";
import { CaretRight, DotsThree, Plus, X } from "@phosphor-icons/react";

import { type AppRoute, navigate, useRoute } from "@/app/router";
import {
  type CommunitySummary,
  type ProfileSummary,
  type RoutePost,
} from "@/app/mocks";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { CommunityModerationCaseDetail } from "@/components/compositions/community-moderation/community-moderation-case-detail";
import { CommunityModerationQueue } from "@/components/compositions/community-moderation/community-moderation-queue";
import { CommunitySettings } from "@/components/compositions/community-settings/community-settings";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import { Feed, type FeedSort, type FeedSortOption } from "@/components/compositions/feed/feed";
import { OnboardingRedditOptional } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { OnboardingChoosePirateUsername } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { OnboardingCommunitySuggestions } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { usePirateAuth } from "@/components/compositions/pirate-auth/pirate-auth-provider";
import { PostCard } from "@/components/compositions/post-card/post-card";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { PostReportDialog } from "@/components/compositions/post-report-dialog/post-report-dialog";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import type { PostComposerSubmitPayload } from "@/components/compositions/post-composer/post-composer.types";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import type { ProfilePageProps as ProfileCompositionProps } from "@/components/compositions/profile-page/profile-page.types";
import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { ContentWithRail } from "@/components/primitives/content-with-rail";
import { IconButton } from "@/components/primitives/icon-button";
import { pillButtonVariants } from "@/components/primitives/pill-button";
import { Skeleton } from "@/components/primitives/skeleton";
import { toast } from "@/components/primitives/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Stepper } from "@/components/primitives/stepper";
import { useIsMobile } from "@/hooks/use-mobile";
import { readPublicRuntimeEnv } from "@/lib/public-runtime-env";
import {
  describeHandleAvailability,
  describeRedditVerificationFailure,
  getDefaultOnboardingPhase,
  mapRedditVerificationUiState,
  normalizePirateHandleLabel,
} from "@/lib/onboarding-flow";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
import {
  completeVerificationSession,
  completeNamespaceVerificationSession,
  createCommunity as createCommunityApi,
  createCommunityPost,
  createCommunitySongArtifactBundle,
  createCommunitySongArtifactUpload,
  createModerationAction,
  createUserReport,
  getCommunityById,
  getCommunityByNamespaceLabel,
  getCommunitySongArtifactBundle,
  getGlobalHandleAvailability,
  getHomeFeed,
  getCommunityPosts,
  getCurrentProfile,
  getLatestRedditImportSummary,
  getOnboardingStatus,
  getCurrentUser,
  getModerationCaseDetail,
  getPostById,
  getProfileById,
  getVerificationSession,
  getYourCommunitiesFeed,
  joinCommunity,
  listCommunities,
  listDiscoverableCommunities,
  listModerationCases,
  PirateApiError,
  renameGlobalHandle,
  startOrCheckRedditVerification,
  startRedditImport,
  type PirateApiFeedItem,
  type PirateApiGlobalHandleAvailability,
  type PirateApiModerationCaseDetail,
  type PirateApiModerationCaseStatus,
  type PirateApiProfile,
  type PirateApiRedditImportSummary,
  type PirateApiRedditVerification,
  type PirateApiSongArtifactUploadRef,
  type PirateApiUser,
  type PirateApiCommunityGateRule,
  type VerificationPolicyHint,
  type VerificationSessionResponse,
  readPirateAccessToken,
  startVerificationSession,
  startNamespaceVerificationSession,
  type PirateApiCommunity,
  type PirateApiLocalizedPostResponse,
  uploadCommunitySongArtifactContent,
} from "@/lib/pirate-api";
import {
  createVeryBridgeSession,
  decryptVeryBridgeProof,
  getVeryBridgeSessionStatus,
  normalizeVeryBridgeQuery,
  type VeryBridgeClientSession,
} from "@/lib/very-bridge";
import { buildCreateCommunityRequestBody } from "@/lib/create-community-flow";
import type {
  CreateCommunityCallbacks,
  NamespaceChallengeKind,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { cn } from "@/lib/utils";
import {
  consumePendingCommunityJoinRetry,
  consumePendingVerificationStart,
  storePendingVerificationStart,
  type PendingVerificationStart,
} from "@/lib/verification-handoff";

const DeviceAuthPage = React.lazy(async () => {
  const module = await import("@/components/compositions/device-auth/device-auth-page");
  return { default: module.DeviceAuthPage };
});

const VerificationCenterPage = React.lazy(async () => {
  const module = await import("@/components/compositions/verification-center/verification-center-page");
  return { default: module.VerificationCenterPage };
});

function interpolateMessage(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

function useRouteMessages() {
  const { locale } = useUiLocale();

  return {
    copy: getLocaleMessages(locale, "routes"),
    localeTag: resolveLocaleLanguageTag(locale),
  };
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function usePirateAccountSnapshot(accessToken: string | null | undefined) {
  const [profile, setProfile] = React.useState<PirateApiProfile | null>(null);
  const [onboarding, setOnboarding] = React.useState<Awaited<ReturnType<typeof getOnboardingStatus>> | null>(null);
  const [user, setUser] = React.useState<PirateApiUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setOnboarding(null);
      setUser(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);

    void Promise.all([
      getCurrentProfile({ accessToken }),
      getOnboardingStatus(accessToken),
      getCurrentUser({ accessToken }),
    ]).then(([nextProfile, nextOnboarding, nextUser]) => {
      if (cancelled) {
        return;
      }

      setProfile(nextProfile);
      setOnboarding(nextOnboarding);
      setUser(nextUser);
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Could not load account status");
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return {
    error,
    onboarding,
    profile,
    user,
  };
}

type FeedTopTimeRange = "hour" | "day" | "week" | "month" | "year" | "all";

function getFeedSortOptions(copy: {
  bestTab: string;
  newTab: string;
  topTab: string;
}): FeedSortOption[] {
  return [
    { value: "best", label: copy.bestTab },
    { value: "new", label: copy.newTab },
    { value: "top", label: copy.topTab },
  ];
}

function getTopTimeRangeOptions(copy: {
  topHour: string;
  topDay: string;
  topWeek: string;
  topMonth: string;
  topYear: string;
  topAll: string;
}) {
  return [
    { value: "hour" as const, label: copy.topHour },
    { value: "day" as const, label: copy.topDay },
    { value: "week" as const, label: copy.topWeek },
    { value: "month" as const, label: copy.topMonth },
    { value: "year" as const, label: copy.topYear },
    { value: "all" as const, label: copy.topAll },
  ];
}

function FeedTopTimeRangeSelect({
  activeRange,
  options,
  onRangeChange,
}: {
  activeRange: FeedTopTimeRange;
  options: Array<{ value: FeedTopTimeRange; label: string }>;
  onRangeChange: (value: FeedTopTimeRange) => void;
}) {
  return (
    <Select onValueChange={(value) => onRangeChange(value as FeedTopTimeRange)} value={activeRange}>
      <SelectTrigger
        className={cn(
          pillButtonVariants({ tone: "default" }),
          "w-full min-w-[10rem] justify-between bg-card py-0 pl-4 pr-3 shadow-none md:w-[11rem]",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function formatCommunityLabel(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return `c/${slug || "community"}`;
}

function formatPostTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

const DEFAULT_IPFS_GATEWAY_BASE_URL = "https://psc.myfilebase.com/ipfs";

function formatProfileDate(isoString: string, fallback: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatProfileDisplayName(profile: PirateApiProfile): string {
  return firstNonEmpty(
    profile.display_name,
    profile.global_handle.label.replace(/\.pirate$/u, ""),
    "Pirate user",
  );
}

function resolveProfileAssetUrl(assetRef: string | null | undefined): string | undefined {
  const normalized = assetRef?.trim();
  if (!normalized) {
    return undefined;
  }

  if (/^https?:\/\//u.test(normalized)) {
    return normalized;
  }

  if (!normalized.startsWith("ipfs://")) {
    return undefined;
  }

  const configuredGatewayBase = readPublicRuntimeEnv().VITE_IPFS_GATEWAY_URL;
  const gatewayBase =
    configuredGatewayBase?.replace(/\/+$/u, "")
    || DEFAULT_IPFS_GATEWAY_BASE_URL;

  return `${gatewayBase}/${normalized.slice("ipfs://".length)}`;
}

function mapCurrentProfilePageProps(
  profile: PirateApiProfile,
  joinedStatLabel: string,
): ProfileCompositionProps {
  const displayName = formatProfileDisplayName(profile);
  const joinedValue = formatProfileDate(profile.created_at, "Recently");

  return {
    profile: {
      displayName,
      handle: profile.global_handle.label,
      bio: profile.bio?.trim() || undefined,
      avatarSrc: resolveProfileAssetUrl(profile.avatar_ref),
      viewerContext: "self",
      viewerFollows: false,
      canMessage: false,
    },
    rightRail: {
      stats: [{ label: joinedStatLabel, value: joinedValue }],
      walletAddress: profile.primary_wallet_address?.trim() || undefined,
    },
    overviewItems: [],
    posts: [],
    comments: [],
    scrobbles: [],
  };
}

function mapApiPostContent(item: PirateApiLocalizedPostResponse): RoutePost["content"] {
  const post = item.post;
  const textBody = firstNonEmpty(
    item.translated_body,
    post.body,
    post.caption,
    post.link_url,
    post.media_refs?.[0]?.gateway_url,
    post.media_refs?.[0]?.storage_ref,
  );

  switch (post.post_type) {
    case "text":
      return {
        type: "text",
        body: textBody || "No body.",
      };
    case "link":
      return {
        type: "link",
        href: post.link_url || "#",
        linkTitle: firstNonEmpty(post.title, post.caption, post.link_url, "Link"),
        linkLabel: post.link_url || undefined,
        body: firstNonEmpty(item.translated_body, post.body, post.caption) || undefined,
      };
    default:
      return {
        type: "text",
        body: textBody || "Preview unavailable.",
      };
  }
}

function mapApiPostToRoutePost(
  item: PirateApiLocalizedPostResponse,
  community: PirateApiCommunity,
  communityRouteRef?: string,
): RoutePost {
  const post = item.post;
  const authorLabel =
    post.identity_mode === "anonymous"
      ? post.anonymous_label || "anonymous"
      : post.author_user_id
        ? `u/${post.author_user_id.slice(0, 8)}`
        : "u/unknown";

  return {
    postId: post.post_id,
    viewContext: "community",
    byline: {
      community: {
        kind: "community",
        label: formatCommunityLabel(community.display_name),
        href: `/c/${communityRouteRef ?? community.community_id}`,
      },
      author: {
        kind: "user",
        label: authorLabel,
      },
      timestampLabel: formatPostTimestamp(post.created_at),
    },
    content: mapApiPostContent(item),
    engagement: {
      score: item.upvote_count - item.downvote_count,
      commentCount: 0,
      viewerVote: item.viewer_vote === 1 ? "up" : item.viewer_vote === -1 ? "down" : null,
    },
    menuItems: [],
    postHref: `/p/${post.post_id}`,
    title: firstNonEmpty(post.title, post.caption, post.post_type.toUpperCase()),
    titleHref: `/p/${post.post_id}`,
  };
}

function mapApiCommunityToSummary(
  community: PirateApiCommunity,
  items: PirateApiLocalizedPostResponse[],
  communityRouteRef?: string,
): CommunitySummary {
  const membershipMode = community.membership_mode === "open" ? "open" : "gated";
  const creatorHandle = community.created_by_user_id
    ? `u/${community.created_by_user_id.slice(0, 8)}`
    : "u/creator";

  return {
    id: communityRouteRef ?? community.community_id,
    communityId: community.community_id,
    label: formatCommunityLabel(community.display_name),
    displayName: community.display_name,
    description: community.description || "",
    createdAt: community.created_at,
    memberCount: community.member_count ?? 0,
    membershipMode,
    ownerUserId: community.created_by_user_id ?? null,
    gateRules: community.gate_rules ?? null,
    moderator: {
      displayName: "Creator",
      handle: creatorHandle,
    },
    referenceLinks: [],
    rules: [],
    flairPolicy: {
      flairEnabled: community.flair_policy?.flair_enabled === true,
      definitions: (community.flair_policy?.definitions ?? []).map((definition) => ({
        flairId: definition.flair_id,
        label: definition.label,
        colorToken: definition.color_token ?? null,
        status: definition.status,
        position: definition.position,
      })),
    },
    posts: items.map((item) => mapApiPostToRoutePost(item, community, communityRouteRef)),
  };
}

type CreatePostDestination = Pick<
  CommunitySummary,
  "id" | "communityId" | "label" | "displayName" | "description" | "moderator"
>;

function summarizeCreatePostDestination(community: PirateApiCommunity): CreatePostDestination {
  return {
    id: community.community_id,
    communityId: community.community_id,
    label: formatCommunityLabel(community.display_name),
    displayName: community.display_name,
    description: community.description || "",
    moderator: {
      displayName: "Creator",
      handle: community.created_by_user_id ? `u/${community.created_by_user_id.slice(0, 8)}` : "u/creator",
    },
  };
}

function dedupeCreatePostDestinations(
  items: CreatePostDestination[],
): CreatePostDestination[] {
  const byId = new Map<string, CreatePostDestination>();

  for (const item of items) {
    const key = item.communityId ?? item.id;
    if (!byId.has(key)) {
      byId.set(key, item);
    }
  }

  return [...byId.values()];
}

async function loadCreatePostDestinations(input: {
  accessToken?: string | null;
  signal?: AbortSignal;
}): Promise<CreatePostDestination[]> {
  if (input.accessToken) {
    const [ownedResponse, joinedFeed, discoverableResponse] = await Promise.all([
      listCommunities({
        accessToken: input.accessToken,
        signal: input.signal,
      }).catch(() => ({ items: [] })),
      getYourCommunitiesFeed({
        accessToken: input.accessToken,
        signal: input.signal,
      }).catch(() => ({ items: [], next_cursor: null })),
      listDiscoverableCommunities({
        accessToken: input.accessToken,
        signal: input.signal,
      }).catch(() => ({ items: [] })),
    ]);

    const joinedCommunitiesById = await loadCommunitiesByIds({
      accessToken: input.accessToken,
      communityIds: joinedFeed.items.map((item) => item.post.community_id),
      signal: input.signal,
    });

    return dedupeCreatePostDestinations([
      ...ownedResponse.items.map(summarizeCreatePostDestination),
      ...[...joinedCommunitiesById.values()].map(summarizeCreatePostDestination),
      ...discoverableResponse.items.map(summarizeCreatePostDestination),
    ]);
  }

  const discoverableResponse = await listDiscoverableCommunities({
    signal: input.signal,
  }).catch(() => ({ items: [] }));

  return dedupeCreatePostDestinations(
    discoverableResponse.items.map(summarizeCreatePostDestination),
  );
}

function closeCreatePostFlow(fallbackPath: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallbackPath);
}

function loadCommunityByRouteRef(input: {
  communityRef: string;
  accessToken?: string | null;
  signal?: AbortSignal;
}) {
  if (input.communityRef.startsWith("@")) {
    return getCommunityByNamespaceLabel({
      namespaceLabel: input.communityRef,
      accessToken: input.accessToken,
      signal: input.signal,
    });
  }

  return getCommunityById({
    communityId: input.communityRef,
    accessToken: input.accessToken,
    signal: input.signal,
  });
}

async function loadCommunitiesByIds(input: {
  accessToken?: string | null;
  communityIds: string[];
  signal?: AbortSignal;
}): Promise<Map<string, PirateApiCommunity>> {
  const uniqueCommunityIds = [...new Set(input.communityIds.map((value) => value.trim()).filter(Boolean))];
  const communities = await Promise.all(uniqueCommunityIds.map(async (communityId) => {
    try {
      const community = await getCommunityById({
        communityId,
        accessToken: input.accessToken,
        signal: input.signal,
      });
      return [communityId, community] as const;
    } catch {
      return null;
    }
  }));

  return new Map(
    communities.filter((entry): entry is readonly [string, PirateApiCommunity] => entry != null),
  );
}

function buildFallbackCommunity(post: PirateApiFeedItem): PirateApiCommunity {
  return {
    community_id: post.post.community_id,
    display_name: post.post.community_id,
    membership_mode: "open",
    created_at: post.post.created_at,
  };
}

async function loadFeedRoutePosts(input: {
  accessToken?: string | null;
  feedLoader: (args: {
    accessToken?: string | null;
    signal?: AbortSignal;
  }) => Promise<{ items: PirateApiFeedItem[] }>;
  signal?: AbortSignal;
}): Promise<RoutePost[]> {
  const response = await input.feedLoader({
    accessToken: input.accessToken,
    signal: input.signal,
  });
  const communitiesById = await loadCommunitiesByIds({
    accessToken: input.accessToken,
    communityIds: response.items.map((item) => item.post.community_id),
    signal: input.signal,
  });

  return response.items.map((item) => {
    const community = communitiesById.get(item.post.community_id) ?? buildFallbackCommunity(item);
    return mapApiPostToRoutePost(item, community);
  });
}

function buildReportLabel(post: RoutePost): string {
  return firstNonEmpty(post.title, post.byline.community?.label, "Untitled post");
}

function withReportMenuAction(
  post: RoutePost,
  onReport: (post: RoutePost) => void,
): RoutePost {
  const hasReportItem = (post.menuItems ?? []).some((item) => item.key === "report");

  return {
    ...post,
    menuItems: hasReportItem
      ? post.menuItems
      : [...(post.menuItems ?? []), { key: "report", label: "Report", destructive: true }],
    onMenuAction: (key: string) => {
      if (key === "report") {
        onReport(post);
        return;
      }

      post.onMenuAction?.(key);
    },
  };
}

function mapModerationPostToRoutePost(
  detail: PirateApiModerationCaseDetail,
  community: PirateApiCommunity,
  communityRouteRef: string,
): RoutePost {
  return {
    postId: detail.post.post_id,
    viewContext: "community",
    byline: {
      community: {
        kind: "community",
        label: formatCommunityLabel(community.display_name),
        href: `/c/${communityRouteRef}`,
      },
      author: {
        kind: "user",
        label:
          detail.post.identity_mode === "anonymous"
            ? detail.post.anonymous_label || "anonymous"
            : detail.post.author_user_id
              ? `u/${detail.post.author_user_id.slice(0, 8)}`
              : "u/unknown",
      },
      timestampLabel: formatPostTimestamp(detail.post.created_at),
    },
    content: mapApiPostContent({
      post: detail.post,
      upvote_count: 0,
      downvote_count: 0,
      translated_body: null,
      viewer_vote: null,
    }),
    engagement: {
      score: 0,
      commentCount: 0,
      viewerVote: null,
    },
    hideEngagement: true,
    menuItems: [],
    postHref: `/p/${detail.post.post_id}`,
    title: firstNonEmpty(detail.post.title, detail.post.caption, detail.post.post_type.toUpperCase()),
    titleHref: `/p/${detail.post.post_id}`,
  };
}

function describeModerationAccessError(error: unknown, fallback: string): string {
  if (error instanceof PirateApiError) {
    if (error.status === 403) {
      return "You do not have moderation access in this community.";
    }

    if (error.status === 404) {
      return fallback;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function RouteLoadState({
  body,
}: {
  body: string;
  title?: string;
}) {
  return (
    <section className="flex min-w-0 flex-1 items-center justify-center px-4 py-16">
      <div className="flex items-center gap-3 text-base text-muted-foreground">
        <span
          aria-hidden
          className="size-2.5 animate-pulse rounded-full bg-muted-foreground/60"
        />
        <p>{body}</p>
      </div>
    </section>
  );
}

function ProfilePageSkeleton() {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="overflow-hidden rounded-[var(--radius-4xl)] border border-border-soft bg-card shadow-[var(--shadow-lg)]">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="flex flex-col gap-5 px-5 pb-6 pt-5 lg:px-8 lg:pb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Skeleton className="-mt-16 size-24 rounded-full border border-border-soft" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-5 w-72" />
              </div>
            </div>
            <div className="hidden gap-3 lg:flex">
              <Skeleton className="h-11 w-28 rounded-full" />
              <Skeleton className="h-11 w-28 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 overflow-hidden rounded-[var(--radius-3xl)] bg-muted/80 p-1.5">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Card className="overflow-hidden p-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </Card>
          <Card className="overflow-hidden p-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </Card>
        </div>
        <Card className="overflow-hidden p-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
      </div>
    </section>
  );
}

function LiveCommunityPage({ communityId }: { communityId: string }) {
  const { accessToken } = usePirateAuth();
  const [community, setCommunity] = React.useState<CommunitySummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState<RoutePost | null>(null);
  const [viewerUserId, setViewerUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setCommunity(null);
    setError(null);

    const communityRef = communityId;
    const loadCommunity = loadCommunityByRouteRef({
      communityRef,
      signal: controller.signal,
    });

    void loadCommunity.then((nextCommunity) => Promise.all([
      Promise.resolve(nextCommunity),
      getCommunityPosts({ communityId: nextCommunity.community_id, signal: controller.signal }),
    ])).then(([nextCommunity, nextPosts]) => {
      if (cancelled) {
        return;
      }

      setCommunity(mapApiCommunityToSummary(nextCommunity, nextPosts.items, communityRef));
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      if (controller.signal.aborted) {
        return;
      }

      setError(describeRouteLoadError(nextError, {
        communityRef,
        entity: "community",
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [communityId]);

  React.useEffect(() => {
    if (!accessToken) {
      setViewerUserId(null);
      return;
    }

    const controller = new AbortController();

    void getCurrentUser({
      accessToken,
      signal: controller.signal,
    }).then((viewer) => {
      if (!controller.signal.aborted) {
        setViewerUserId(viewer.user_id);
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setViewerUserId(null);
      }
    });

    return () => controller.abort();
  }, [accessToken]);

  if (error) {
    return <RouteLoadState body={error} title="Community unavailable" />;
  }

  if (!community) {
    return <RouteLoadState body="Loading community." title="Loading community" />;
  }

  const reportableCommunity: CommunitySummary = {
    ...community,
    posts: community.posts.map((post) => withReportMenuAction(post, setReportTarget)),
  };

  return (
    <>
      <CommunityPage
        community={reportableCommunity}
        showModerationAction={Boolean(
          accessToken
          && community.ownerUserId
          && viewerUserId === community.ownerUserId,
        )}
        showSettingsAction={Boolean(
          accessToken
          && community.ownerUserId
          && viewerUserId === community.ownerUserId,
        )}
      />
      {reportTarget ? (
        <PostReportDialog
          errorMessage={reportError}
          onOpenChange={(open) => {
            if (!open) {
              setReportTarget(null);
              setReportError(null);
            }
          }}
          onSubmit={async (input) => {
            if (!accessToken) {
              setReportError("Sign in before reporting a post.");
              return;
            }

            setReportSubmitting(true);
            setReportError(null);

            try {
              await createUserReport({
                accessToken,
                communityId: community.communityId ?? community.id,
                postId: reportTarget.postId,
                body: {
                  reason_code: input.reasonCode,
                  note: input.note.trim() || null,
                },
              });
              toast.success("Report sent.");
              setReportTarget(null);
            } catch (nextError) {
              if (nextError instanceof PirateApiError && nextError.status === 403) {
                setReportError("Complete unique-human verification before reporting posts.");
              } else {
                setReportError(nextError instanceof Error ? nextError.message : "Could not send report");
              }
            } finally {
              setReportSubmitting(false);
            }
          }}
          open={reportTarget != null}
          postLabel={buildReportLabel(reportTarget)}
          submitting={reportSubmitting}
        />
      ) : null}
    </>
  );
}

function LivePostPage({ postId }: { postId: string }) {
  const { accessToken } = usePirateAuth();
  const [post, setPost] = React.useState<RoutePost | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState<RoutePost | null>(null);
  const [resolvedCommunityId, setResolvedCommunityId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setPost(null);
    setError(null);
    setResolvedCommunityId(null);
    setReportTarget(null);
    setReportError(null);

    void getPostById({
      accessToken,
      postId,
      signal: controller.signal,
    }).then(async (item) => {
      if (cancelled) {
        return;
      }

      let community: PirateApiCommunity;

      try {
        community = await getCommunityById({
          accessToken,
          communityId: item.post.community_id,
          signal: controller.signal,
        });
      } catch {
        community = {
          community_id: item.post.community_id,
          display_name: item.post.community_id,
          membership_mode: "open",
          created_at: item.post.created_at,
        };
      }

      if (cancelled || controller.signal.aborted) {
        return;
      }

      setResolvedCommunityId(item.post.community_id);
      setPost(withReportMenuAction(mapApiPostToRoutePost(item, community), setReportTarget));
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      if (controller.signal.aborted) {
        return;
      }

      setError(describeRouteLoadError(nextError, {
        entity: "post",
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, postId]);

  if (error) {
    return <RouteLoadState body={error} title="Post unavailable" />;
  }

  if (!post) {
    return <RouteLoadState body="Loading post." title="Loading post" />;
  }

  return (
    <>
      <PostPage post={post} />
      {reportTarget && resolvedCommunityId ? (
        <PostReportDialog
          errorMessage={reportError}
          onOpenChange={(open) => {
            if (!open) {
              setReportTarget(null);
              setReportError(null);
            }
          }}
          onSubmit={async (input) => {
            if (!accessToken) {
              setReportError("Sign in before reporting a post.");
              return;
            }

            setReportSubmitting(true);
            setReportError(null);

            try {
              await createUserReport({
                accessToken,
                communityId: resolvedCommunityId,
                postId: reportTarget.postId,
                body: {
                  reason_code: input.reasonCode,
                  note: input.note.trim() || null,
                },
              });
              toast.success("Report sent.");
              setReportTarget(null);
            } catch (nextError) {
              if (nextError instanceof PirateApiError && nextError.status === 403) {
                setReportError("Complete unique-human verification before reporting posts.");
              } else {
                setReportError(nextError instanceof Error ? nextError.message : "Could not send report");
              }
            } finally {
              setReportSubmitting(false);
            }
          }}
          open={reportTarget != null}
          postLabel={buildReportLabel(reportTarget)}
          submitting={reportSubmitting}
        />
      ) : null}
    </>
  );
}

function LiveCreatePostPage() {
  const route = useRoute();
  const preselectedCommunityRef = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("c");
  }, [route]);
  const { accessToken } = usePirateAuth();
  const [community, setCommunity] = React.useState<CommunitySummary | null>(null);
  const [communityError, setCommunityError] = React.useState<string | null>(null);
  const [destinations, setDestinations] = React.useState<CreatePostDestination[] | null>(null);
  const [destinationsError, setDestinationsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!preselectedCommunityRef) return;
    let cancelled = false;
    const controller = new AbortController();
    setCommunity(null);
    setCommunityError(null);

    void loadCommunityByRouteRef({
      communityRef: preselectedCommunityRef,
      signal: controller.signal,
    }).then((nextCommunity) => Promise.all([
      Promise.resolve(nextCommunity),
      getCommunityPosts({ communityId: nextCommunity.community_id, signal: controller.signal }),
    ])).then(([nextCommunity, nextPosts]) => {
      if (cancelled) return;
      setCommunity(mapApiCommunityToSummary(nextCommunity, nextPosts.items, preselectedCommunityRef));
    }).catch((nextError) => {
      if (cancelled || controller.signal.aborted) return;
      setCommunityError(describeRouteLoadError(nextError, {
        communityRef: preselectedCommunityRef,
        entity: "create-post",
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [preselectedCommunityRef]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setDestinations(null);
    setDestinationsError(null);

    void loadCreatePostDestinations({
      accessToken,
      signal: controller.signal,
    }).then((nextDestinations) => {
      if (!cancelled && !controller.signal.aborted) {
        setDestinations(nextDestinations);
      }
    }).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setDestinationsError(nextError instanceof Error ? nextError.message : "Could not load communities");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  if (communityError) {
    return <RouteLoadState body={communityError} title="Create post unavailable" />;
  }

  if (preselectedCommunityRef) {
    if (!community) {
      return <RouteLoadState body="Loading composer." title="Loading composer" />;
    }
    return <CreatePostPage community={community} />;
  }

  if (destinationsError) {
    return <RouteLoadState body={destinationsError} title="Create post unavailable" />;
  }

  if (!destinations?.length) {
    return <RouteLoadState body="Loading composer." title="Loading composer" />;
  }

  navigate(`/submit?c=${destinations[0].id}`);
  return null;
}

function LiveCommunityModerationPage({ communityId }: { communityId: string }) {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const [cases, setCases] = React.useState<PirateApiModerationCaseDetail["case"][] | null>(null);
  const [community, setCommunity] = React.useState<PirateApiCommunity | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PirateApiModerationCaseStatus>("open");

  React.useEffect(() => {
    if (!accessToken) {
      setCases(null);
      setCommunity(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setCases(null);
    setCommunity(null);
    setError(null);

    void loadCommunityByRouteRef({
      communityRef: communityId,
      accessToken,
      signal: controller.signal,
    }).then((nextCommunity) => Promise.all([
      Promise.resolve(nextCommunity),
      listModerationCases({
        communityId: nextCommunity.community_id,
        status,
        accessToken,
        signal: controller.signal,
      }),
    ])).then(([nextCommunity, nextCases]) => {
      if (controller.signal.aborted) {
        return;
      }

      setCommunity(nextCommunity);
      setCases(nextCases.items);
    }).catch((nextError) => {
      if (controller.signal.aborted) {
        return;
      }

      setError(describeModerationAccessError(nextError, "Moderation queue unavailable."));
    });

    return () => controller.abort();
  }, [accessToken, communityId, status]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Needs Review"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to review moderation cases.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Moderation queue unavailable" />;
  }

  if (!community || !cases) {
    return <RouteLoadState body="Loading moderation queue." title="Loading moderation queue" />;
  }

  return (
    <StackPageShell
      actions={(
        <>
          <Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">
            Back to community
          </Button>
          <Button onClick={() => navigate(`/c/${communityId}/settings`)} variant="secondary">
            Settings
          </Button>
        </>
      )}
      description={community.display_name}
      title="Needs Review"
    >
      <CommunityModerationQueue
        activeStatus={status}
        cases={cases}
        communityName={community.display_name}
        onCaseSelect={(moderationCaseId) => navigate(`/c/${communityId}/moderation/${moderationCaseId}`)}
        onStatusChange={setStatus}
      />
    </StackPageShell>
  );
}

function LiveCommunityModerationCasePage({
  communityId,
  moderationCaseId,
}: {
  communityId: string;
  moderationCaseId: string;
}) {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const [community, setCommunity] = React.useState<PirateApiCommunity | null>(null);
  const [detail, setDetail] = React.useState<PirateApiModerationCaseDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [resolving, setResolving] = React.useState(false);

  React.useEffect(() => {
    if (!accessToken) {
      setCommunity(null);
      setDetail(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setCommunity(null);
    setDetail(null);
    setError(null);

    void loadCommunityByRouteRef({
      communityRef: communityId,
      accessToken,
      signal: controller.signal,
    }).then((nextCommunity) => Promise.all([
      Promise.resolve(nextCommunity),
      getModerationCaseDetail({
        communityId: nextCommunity.community_id,
        moderationCaseId,
        accessToken,
        signal: controller.signal,
      }),
    ])).then(([nextCommunity, nextDetail]) => {
      if (controller.signal.aborted) {
        return;
      }

      setCommunity(nextCommunity);
      setDetail(nextDetail);
    }).catch((nextError) => {
      if (controller.signal.aborted) {
        return;
      }

      setError(describeModerationAccessError(nextError, "Moderation case unavailable."));
    });

    return () => controller.abort();
  }, [accessToken, communityId, moderationCaseId]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Moderation case"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to review this moderation case.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Moderation case unavailable" />;
  }

  if (!community || !detail) {
    return <RouteLoadState body="Loading moderation case." title="Loading moderation case" />;
  }

  return (
    <StackPageShell
      actions={(
        <>
          <Button onClick={() => navigate(`/c/${communityId}/moderation`)} variant="secondary">
            Back to queue
          </Button>
          <Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">
            Community
          </Button>
        </>
      )}
      description={community.display_name}
      title="Moderation case"
    >
      <CommunityModerationCaseDetail
        detail={detail}
        onResolve={async (input) => {
          if (!accessToken) {
            toast.error("Sign in before resolving moderation cases.");
            return;
          }

          setResolving(true);

          try {
            const nextDetail = await createModerationAction({
              accessToken,
              communityId: community.community_id,
              moderationCaseId,
              body: {
                action_type: input.actionType,
                note: input.note.trim() || null,
              },
            });
            setDetail(nextDetail);
            toast.success("Case updated.");
          } catch (nextError) {
            toast.error(nextError instanceof Error ? nextError.message : "Could not update case");
          } finally {
            setResolving(false);
          }
        }}
        post={mapModerationPostToRoutePost(detail, community, communityId)}
        resolving={resolving}
      />
    </StackPageShell>
  );
}

function LiveCommunitySettingsPage({ communityId }: { communityId: string }) {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const [resolvedCommunityId, setResolvedCommunityId] = React.useState<string | null>(null);
  const [communityTitle, setCommunityTitle] = React.useState("Community settings");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setResolvedCommunityId(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setResolvedCommunityId(null);
    setError(null);

    const loadCommunity = loadCommunityByRouteRef({
      communityRef: communityId,
      accessToken,
      signal: controller.signal,
    });

    void loadCommunity.then((community) => {
      if (controller.signal.aborted) {
        return;
      }

      setResolvedCommunityId(community.community_id);
      setCommunityTitle(community.display_name);
    }).catch((nextError) => {
      if (controller.signal.aborted) {
        return;
      }

      setError(describeRouteLoadError(nextError, {
        communityRef: communityId,
        entity: "community",
      }));
    });

    return () => controller.abort();
  }, [accessToken, communityId]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Community settings"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to manage this community.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Community settings unavailable" />;
  }

  if (!resolvedCommunityId) {
    return <RouteLoadState body="Loading settings." title="Loading settings" />;
  }

  return (
    <StackPageShell
      actions={(
        <>
          <Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">
            Back to community
          </Button>
          <Button onClick={() => navigate(`/c/${communityId}/moderation`)} variant="secondary">
            Needs Review
          </Button>
        </>
      )}
      title={communityTitle}
    >
      <CommunitySettings
        accessToken={accessToken}
        communityId={resolvedCommunityId}
      />
    </StackPageShell>
  );
}

function describeRouteLoadError(
  error: unknown,
  input: {
    communityRef?: string;
    entity: "community" | "create-post" | "post";
  },
): string {
  if (error instanceof PirateApiError && error.status === 404) {
    if (input.communityRef?.startsWith("@")) {
      return `No Pirate community is attached to ${input.communityRef} yet.`;
    }

    if (input.entity === "post") {
      return "Post not found.";
    }
  }

  return error instanceof Error
    ? error.message
    : input.entity === "post"
      ? "Could not load post"
      : "Could not load community";
}

function StackPageShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      {hasHeader ? (
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              {title ? (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function FeedRailList({
  items,
  title,
}: {
  items: Array<{ id: string; label: string; meta: string; href: string }>;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
      <div className="border-b border-border-soft px-5 py-4">
        <div className="text-lg font-semibold text-foreground">{title}</div>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map((item) => (
          <button
            className="flex w-full flex-col items-start gap-1 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            key={item.id}
            onClick={() => navigate(item.href)}
            type="button"
          >
            <div className="text-base font-medium text-foreground">{item.label}</div>
            <div className="text-base text-muted-foreground">{item.meta}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function toFeedItems(posts: RoutePost[]) {
  return posts.map((post) => ({
    id: post.postId,
    post,
  }));
}

function toRecentPostRailItems(posts: RoutePost[]) {
  return posts.slice(0, 5).map((post) => ({
    id: `recent-${post.postId}`,
    label: post.title ?? post.byline.community?.label ?? post.byline.author?.label ?? "Post",
    meta: [post.byline.community?.label, post.byline.timestampLabel].filter(Boolean).join(" · "),
    href: post.postHref ?? `/p/${post.postId}`,
  }));
}

function HomePage() {
  const { accessToken } = usePirateAuth();
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const [posts, setPosts] = React.useState<RoutePost[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setPosts(null);
    setError(null);

    void loadFeedRoutePosts({
      accessToken,
      feedLoader: getHomeFeed,
      signal: controller.signal,
    }).then((nextPosts) => {
      if (!cancelled && !controller.signal.aborted) {
        setPosts(nextPosts);
      }
    }).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : "Could not load home feed");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  if (error) {
    return <RouteLoadState body={error} title="Home feed unavailable" />;
  }

  if (!posts) {
    return <RouteLoadState body="Loading feed." title="Loading feed" />;
  }

  const railItems = toRecentPostRailItems(posts);

  return (
    <Feed
      activeSort={activeSort}
      aside={<FeedRailList items={railItems} title={copy.home.railTitle} />}
      availableSorts={sortOptions}
      controls={
        activeSort === "top" ? (
          <FeedTopTimeRangeSelect
            activeRange={topTimeRange}
            onRangeChange={setTopTimeRange}
            options={topTimeRangeOptions}
          />
        ) : undefined
      }
      items={toFeedItems(posts)}
      onSortChange={setActiveSort}
    />
  );
}

function YourCommunitiesPage() {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("new");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const [posts, setPosts] = React.useState<RoutePost[] | null>(null);
  const [communities, setCommunities] = React.useState<PirateApiCommunity[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);

  React.useEffect(() => {
    if (!accessToken) {
      setPosts(null);
      setCommunities(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setPosts(null);
    setCommunities(null);
    setError(null);

    void getYourCommunitiesFeed({
      accessToken,
      signal: controller.signal,
    }).then(async (feed) => {
      const communitiesById = await loadCommunitiesByIds({
        accessToken,
        communityIds: feed.items.map((item) => item.post.community_id),
        signal: controller.signal,
      });

      if (cancelled || controller.signal.aborted) {
        return;
      }

      const orderedCommunities = [...new Set(feed.items.map((item) => item.post.community_id))]
        .map((communityId) => communitiesById.get(communityId))
        .filter((community): community is PirateApiCommunity => community != null);

      setCommunities(orderedCommunities);
      setPosts(feed.items.map((item) => {
        const community = communitiesById.get(item.post.community_id) ?? buildFallbackCommunity(item);
        return mapApiPostToRoutePost(item, community);
      }));
    }).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : "Could not load your communities");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Your communities"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to load communities you created or joined.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Your communities unavailable" />;
  }

  if (!posts || !communities) {
    return <RouteLoadState body="Loading your communities." title="Loading your communities" />;
  }

  const railItems = communities.map((community) => ({
    id: `${community.community_id}-rail`,
    label: community.display_name,
    meta:
      community.membership_mode === "gated"
        ? copy.yourCommunities.gatedLabel
        : copy.yourCommunities.openLabel,
    href: `/c/${community.community_id}`,
  }));

  return (
    <Feed
      activeSort={activeSort}
      aside={<FeedRailList items={railItems} title={copy.yourCommunities.railTitle} />}
      availableSorts={sortOptions}
      controls={
        activeSort === "top" ? (
          <FeedTopTimeRangeSelect
            activeRange={topTimeRange}
            onRangeChange={setTopTimeRange}
            options={topTimeRangeOptions}
          />
        ) : undefined
      }
      items={toFeedItems(posts)}
      onSortChange={setActiveSort}
    />
  );
}

function CommunityPage({
  community,
  showModerationAction = false,
  showSettingsAction = false,
}: {
  community: CommunitySummary;
  showModerationAction?: boolean;
  showSettingsAction?: boolean;
}) {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const [topTimeRange, setTopTimeRange] = React.useState<FeedTopTimeRange>("day");
  const sortOptions = getFeedSortOptions(copy.common);
  const topTimeRangeOptions = getTopTimeRangeOptions(copy.common);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5">
      <CommunityHero
        community={community}
        showModerationAction={showModerationAction}
        showSettingsAction={showSettingsAction}
      />
      <ContentWithRail
        rail={(
          <CommunitySidebar
            charity={{
              href: "https://www.musicares.org/",
              name: "MusiCares",
            }}
            createdAt={community.createdAt}
            description={community.description}
            displayName={community.displayName}
            flairPolicy={community.flairPolicy}
            memberCount={community.memberCount}
            membershipMode={community.membershipMode}
            moderator={community.moderator}
            referenceLinks={community.referenceLinks}
            rules={community.rules}
          />
        )}
        railWidth="22rem"
      >
        <Feed
          activeSort={activeSort}
          availableSorts={sortOptions}
          controls={
            activeSort === "top" ? (
              <FeedTopTimeRangeSelect
                activeRange={topTimeRange}
                onRangeChange={setTopTimeRange}
                options={topTimeRangeOptions}
              />
            ) : undefined
          }
          emptyState={{
            title: "No posts yet",
            body: "Be the first to start this community.",
            action: (
              <Button
                leadingIcon={<Plus className="size-5" />}
                onClick={() => navigate(`/submit?c=${community.id}`)}
                variant="outline"
              >
                Create Post
              </Button>
            ),
          }}
          items={toFeedItems(community.posts)}
          onSortChange={setActiveSort}
        />
      </ContentWithRail>
    </section>
  );
}

function formatCommunityHeroLabel(community: CommunitySummary): string {
  const normalized = community.label.trim();
  if (normalized) {
    return normalized;
  }

  return `c/${community.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;
}

function formatCommunityCreatedDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCommunityMemberCount(count: number): string {
  return count.toLocaleString("en-US");
}

function hashStringToHue(input: string): number {
  let hash = 0;
  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return (hash + 360) % 360;
}

function buildCommunityBannerStyle(community: CommunitySummary): React.CSSProperties {
  const hue = hashStringToHue(`${community.id}:${community.displayName}`);

  return {
    backgroundColor: `oklch(0.2 0.02 ${hue}deg)`,
    backgroundImage: [
      `radial-gradient(circle at 14% 24%, oklch(0.78 0.2 ${hue}deg / 0.75), transparent 20%)`,
      `radial-gradient(circle at 85% 22%, oklch(0.72 0.18 ${Math.abs((hue + 42) % 360)}deg / 0.45), transparent 26%)`,
      `linear-gradient(135deg, oklch(0.24 0.02 ${hue}deg), oklch(0.17 0.02 ${Math.abs((hue + 120) % 360)}deg) 58%, oklch(0.16 0.01 260deg))`,
    ].join(", "),
  };
}

function buildCommunityAvatarStyle(community: CommunitySummary): React.CSSProperties {
  const hue = hashStringToHue(`${community.displayName}:${community.id}:avatar`);

  return {
    backgroundImage: [
      `radial-gradient(circle at 30% 28%, oklch(0.86 0.17 ${hue}deg), transparent 32%)`,
      `linear-gradient(145deg, oklch(0.62 0.18 ${hue}deg), oklch(0.42 0.12 ${Math.abs((hue + 55) % 360)}deg) 56%, oklch(0.28 0.03 260deg))`,
    ].join(", "),
  };
}

function buildPendingVerificationStartFromGateFailure(input: {
  communityId: string;
  error: PirateApiError;
}): PendingVerificationStart | null {
  const details = input.error.details as { verification_policy?: VerificationPolicyHint } | undefined;
  const verificationPolicy = details?.verification_policy;
  if (!verificationPolicy?.provider || !verificationPolicy.policy_id) {
    return null;
  }

  return {
    provider: verificationPolicy.provider,
    verificationIntent: verificationPolicy.verification_intent ?? "ucommunity_join",
    policyId: verificationPolicy.policy_id,
    requestedCapabilities: ["unique_human"],
    reason: "community_join_gate_failed",
    communityId: input.communityId,
    returnPath: `/c/${input.communityId}`,
  };
}

function CommunityHero({
  community,
  showModerationAction = false,
  showSettingsAction = false,
}: {
  community: CommunitySummary;
  showModerationAction?: boolean;
  showSettingsAction?: boolean;
}) {
  const { accessToken } = usePirateAuth();
  const [isJoinPending, setIsJoinPending] = React.useState(false);
  const autoJoinRetryConsumedRef = React.useRef(false);
  const communityHandle = formatCommunityHeroLabel(community);
  const createdLabel = formatCommunityCreatedDate(community.createdAt);
  const membershipLabel = community.membershipMode === "open" ? "Open" : "Gated";
  const bannerWordmark = community.displayName.toUpperCase();

  const handleJoin = React.useCallback(async () => {
    if (!accessToken) {
      toast("Sign in to join this community.");
      return;
    }

    const joinCommunityId = community.communityId ?? community.id;
    setIsJoinPending(true);
    try {
      const result = await joinCommunity({
        communityId: joinCommunityId,
        accessToken,
      });
      toast(result.status === "requested" ? "Join request sent." : "Joined community.");
    } catch (error) {
      if (error instanceof PirateApiError && error.code === "gate_failed") {
        const pendingVerificationStart = buildPendingVerificationStartFromGateFailure({
          communityId: community.id,
          error,
        });
        if (pendingVerificationStart) {
          storePendingVerificationStart(pendingVerificationStart);
          toast("Complete verification to join this community.");
          navigate("/verify");
          return;
        }
      }

      toast(error instanceof Error ? error.message : "Could not join this community.");
    } finally {
      setIsJoinPending(false);
    }
  }, [accessToken, community.communityId, community.id]);

  React.useEffect(() => {
    if (!accessToken || isJoinPending || autoJoinRetryConsumedRef.current) {
      return;
    }

    const pendingRetry = consumePendingCommunityJoinRetry(community.id);
    if (!pendingRetry) {
      return;
    }

    autoJoinRetryConsumedRef.current = true;
    void handleJoin();
  }, [accessToken, community.id, handleJoin, isJoinPending]);

  return (
    <section className="border-b border-border-soft">
      <div
        className="relative h-36 overflow-hidden sm:h-40 lg:h-48"
        style={buildCommunityBannerStyle(community)}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(8,11,16,0.16)_55%,rgba(8,11,16,0.5)_100%)]" />
        <div className="absolute inset-x-4 bottom-3 overflow-hidden text-[clamp(2.6rem,9vw,6.5rem)] font-black uppercase tracking-[0.24em] text-white/14 sm:inset-x-6 sm:bottom-4">
          <div className="whitespace-nowrap">{bannerWordmark}</div>
        </div>
      </div>

      <div className="relative px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <div
              className="-mt-10 grid size-20 place-items-center rounded-full border-4 border-background text-[1.6rem] font-black uppercase text-white shadow-[0_10px_34px_rgba(0,0,0,0.38)] sm:-mt-12 sm:size-24 sm:text-[1.9rem]"
              style={buildCommunityAvatarStyle(community)}
            >
              <div className="grid size-[74%] place-items-center rounded-full border border-white/18 bg-black/26 backdrop-blur-sm sm:size-[76%]">
                {community.displayName.slice(0, 1)}
              </div>
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-[clamp(1.875rem,4vw,3rem)] font-semibold tracking-tight text-foreground">
                {communityHandle}
              </h1>
              <div className="mt-0.5 text-lg text-foreground/78">
                {community.displayName}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground">
                <span>{formatCommunityMemberCount(community.memberCount)} members</span>
                <span>{membershipLabel}</span>
                <span>Created {createdLabel}</span>
              </div>
              {community.description ? (
                <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">
                  {community.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {showModerationAction ? (
              <Button
                className="border-[#c67b2c]/35 bg-[#c67b2c]/12 text-[#f0c48b] hover:bg-[#c67b2c]/18"
                onClick={() => navigate(`/c/${community.id}/moderation`)}
                variant="outline"
              >
                Needs Review
              </Button>
            ) : null}
            {showSettingsAction ? (
              <Button
                onClick={() => navigate(`/c/${community.id}/settings`)}
                variant="secondary"
              >
                Settings
              </Button>
            ) : null}
            <Button
              className="border-border-soft bg-background px-6 text-foreground hover:bg-muted"
              leadingIcon={<Plus className="size-5" weight="bold" />}
              onClick={() => navigate(`/submit?c=${community.id}`)}
              variant="outline"
            >
              Create Post
            </Button>
            <Button
              className="bg-[#7f6911] px-6 text-white hover:bg-[#917915]"
              disabled={isJoinPending}
              onClick={() => {
                void handleJoin();
              }}
            >
              {isJoinPending ? "Joining..." : "Join"}
            </Button>
            <IconButton
              aria-label="More community actions"
              className="border-border-soft bg-background text-foreground hover:bg-muted"
              onClick={() => {
                toast("More community actions coming next.");
              }}
              variant="outline"
            >
              <DotsThree className="size-6" weight="bold" />
            </IconButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function gateRuleAppliesToPostType(rule: PirateApiCommunityGateRule, postType: "text" | "link") {
  const configuredPostTypes = rule.gate_config?.post_types;
  if (!Array.isArray(configuredPostTypes) || configuredPostTypes.length === 0) {
    return true;
  }

  return configuredPostTypes.includes(postType);
}

function gateRuleIsFirstPostOnly(rule: PirateApiCommunityGateRule) {
  return rule.gate_config?.first_post_only === true;
}

function findVeryPalmTextPostingGate(community: CommunitySummary): PirateApiCommunityGateRule | null {
  for (const rule of community.gateRules ?? []) {
    if (
      rule.scope !== "posting"
      || rule.gate_family !== "identity_proof"
      || rule.gate_type !== "unique_human"
      || rule.status !== "active"
      || !gateRuleAppliesToPostType(rule, "text")
    ) {
      continue;
    }

    const requiresVery = (rule.proof_requirements ?? []).some((requirement) =>
      requirement.proof_type === "unique_human"
      && Array.isArray(requirement.accepted_providers)
      && requirement.accepted_providers.includes("very")
    );

    if (requiresVery) {
      return rule;
    }
  }

  return null;
}

type PostingPalmGateProps = {
  accessToken: string | null;
  community: CommunitySummary;
  firstTextPostOnly: boolean;
  isRefreshingAccess: boolean;
  isSigningIn: boolean;
  onRefreshAccess: () => Promise<void>;
  onSignIn: () => void;
};

function PostingPalmGate({
  accessToken,
  community,
  firstTextPostOnly,
  isRefreshingAccess,
  isSigningIn,
  onRefreshAccess,
  onSignIn,
}: PostingPalmGateProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isActionPending, setIsActionPending] = React.useState(false);
  const [verificationSession, setVerificationSession] = React.useState<VerificationSessionResponse | null>(null);
  const [veryBridgeSession, setVeryBridgeSession] = React.useState<(VeryBridgeClientSession & {
    verificationSessionId: string;
  }) | null>(null);
  const submittedVeryBridgeSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!accessToken || !verificationSession || verificationSession.status !== "pending") {
      return;
    }

    const interval = window.setInterval(() => {
      void getVerificationSession({
        verificationSessionId: verificationSession.verification_session_id,
        accessToken,
      }).then((next) => {
        setVerificationSession(next);
      }).catch(() => {
        // Keep the current session in place and let the user retry manually.
      });
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [accessToken, verificationSession]);

  const activeVeryWidgetConfig = verificationSession?.provider === "very"
    ? verificationSession.launch?.very_widget ?? null
    : null;
  const activeVerySessionId = verificationSession?.provider === "very"
    ? verificationSession.verification_session_id
    : null;
  const activeVeryStatus = verificationSession?.provider === "very"
    ? verificationSession.status
    : null;
  const activeVeryAppId = activeVeryWidgetConfig?.app_id ?? null;
  const activeVeryContext = activeVeryWidgetConfig?.context ?? null;
  const activeVeryTypeId = activeVeryWidgetConfig?.type_id ?? null;
  const activeVeryQuery = activeVeryWidgetConfig?.query ?? null;
  const activeVeryQueryPayload = React.useMemo(
    () => normalizeVeryBridgeQuery(activeVeryQuery),
    [activeVeryQuery],
  );

  const refreshPostingAccess = React.useCallback(async () => {
    setError(null);

    try {
      await onRefreshAccess();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not refresh access");
    }
  }, [onRefreshAccess]);

  const completeCurrentVerification = React.useCallback(async (proof?: string | null) => {
    if (!accessToken || !activeVerySessionId) {
      return;
    }

    setIsActionPending(true);
    setError(null);

    try {
      const next = await completeVerificationSession({
        verificationSessionId: activeVerySessionId,
        accessToken,
        proof,
      });
      setVerificationSession(next);
      if (next.status === "verified") {
        await refreshPostingAccess();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not finish verification");
    } finally {
      setIsActionPending(false);
    }
  }, [accessToken, activeVerySessionId, refreshPostingAccess]);

  React.useEffect(() => {
    if (
      !activeVerySessionId
      || activeVeryStatus !== "pending"
      || activeVeryAppId === null
      || !activeVeryContext
      || !activeVeryTypeId
      || !activeVeryQueryPayload
    ) {
      setVeryBridgeSession(null);
      submittedVeryBridgeSessionIdRef.current = null;
      return;
    }

    if (veryBridgeSession?.verificationSessionId === activeVerySessionId) {
      return;
    }

    let cancelled = false;

    void createVeryBridgeSession({
      appId: activeVeryAppId,
      context: activeVeryContext,
      query: activeVeryQueryPayload,
      typeId: activeVeryTypeId,
    }).then((nextBridgeSession) => {
      if (cancelled) {
        return;
      }

      setVeryBridgeSession({
        ...nextBridgeSession,
        verificationSessionId: activeVerySessionId,
      });
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Very verification failed");
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeVeryAppId,
    activeVeryContext,
    activeVeryQueryPayload,
    activeVerySessionId,
    activeVeryStatus,
    activeVeryTypeId,
    veryBridgeSession,
  ]);

  React.useEffect(() => {
    if (
      activeVeryStatus !== "pending"
      || !activeVerySessionId
      || !veryBridgeSession
      || submittedVeryBridgeSessionIdRef.current === veryBridgeSession.bridgeSessionId
    ) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const poll = async () => {
      if (
        cancelled
        || submittedVeryBridgeSessionIdRef.current === veryBridgeSession.bridgeSessionId
      ) {
        return;
      }

      try {
        const nextStatus = await getVeryBridgeSessionStatus(veryBridgeSession.bridgeSessionId);
        if (cancelled) {
          return;
        }

        if (nextStatus.status === "error") {
          setError(nextStatus.userMessage || "Very verification failed");
          return;
        }

        if (nextStatus.status === "completed" && nextStatus.response) {
          submittedVeryBridgeSessionIdRef.current = veryBridgeSession.bridgeSessionId;
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
          const proof = await decryptVeryBridgeProof({
            iv: nextStatus.response.iv,
            key: veryBridgeSession.key,
            payload: nextStatus.response.payload,
          });
          await completeCurrentVerification(proof);
        }
      } catch {
        // Keep polling. Bridge status fetch is best-effort here.
      }
    };

    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeVerySessionId, activeVeryStatus, completeCurrentVerification, veryBridgeSession]);

  const openVeryFlow = React.useCallback(async () => {
    if (!accessToken) {
      setError("Sign in before starting the palm scan.");
      return;
    }

    if (verificationSession?.provider === "very" && verificationSession.status === "pending") {
      if (veryBridgeSession?.qrUrl) {
        window.location.assign(veryBridgeSession.qrUrl);
      }
      return;
    }

    setIsActionPending(true);
    setError(null);

    try {
      const session = await startVerificationSession({
        provider: "very",
        accessToken,
        verificationIntent: "ucommunity_join",
        policyId: "policy_very_join_v1",
      });
      setVerificationSession(session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not start Very verification");
    } finally {
      setIsActionPending(false);
    }
  }, [accessToken, verificationSession, veryBridgeSession?.qrUrl]);

  const statusText = !accessToken
    ? "Sign in to start the Very palm scan."
    : verificationSession?.status === "verified"
        ? "Verification finished. Rechecking access."
        : isRefreshingAccess
          ? "Checking posting access."
        : verificationSession?.status === "pending"
          ? "Waiting for the Very palm scan to finish."
        : verificationSession?.status === "failed"
            ? "Verification did not complete."
            : verificationSession?.status === "expired"
              ? "Verification expired. Start again."
              : firstTextPostOnly
                ? `${community.displayName} requires a Very palm scan before you can publish your first text post.`
                : `${community.displayName} requires a Very palm scan before you can publish text posts.`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="overflow-hidden">
        <CardHeader className="gap-3">
          <CardTitle className="text-2xl">Palm scan required</CardTitle>
          <CardDescription>
            {statusText}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/10 px-4 py-4 text-base text-foreground">
              {error}
            </div>
          ) : null}
          {verificationSession?.status === "pending" && veryBridgeSession ? (
            <div className="grid place-items-center overflow-hidden rounded-xl border border-border-soft bg-white p-4 shadow-sm">
              <img
                alt="Very verification QR code"
                className="h-[300px] w-[300px]"
                src={veryBridgeSession.qrDataUrl}
              />
            </div>
          ) : null}
          <div className="rounded-[var(--radius-xl)] border border-border-soft bg-muted px-4 py-4 text-base text-foreground">
            Complete the Very flow here, then the composer will unlock automatically.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          {accessToken ? (
            <>
              <Button
                loading={isActionPending}
                onClick={() => void openVeryFlow()}
              >
                {verificationSession?.provider === "very" && verificationSession.status === "pending"
                  ? "Open Very QR"
                  : "Palm scan with Very"}
              </Button>
              {verificationSession?.status === "pending" && veryBridgeSession ? (
                <Button asChild variant="secondary">
                  <a href={veryBridgeSession.qrUrl}>Open Very</a>
                </Button>
              ) : null}
            </>
          ) : (
            <Button loading={isSigningIn} onClick={onSignIn}>
              Sign in
            </Button>
          )}
          <Button
            loading={isRefreshingAccess}
            onClick={() => void refreshPostingAccess()}
            variant="secondary"
          >
            Refresh access
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

async function computeSha256Hash(file: File): Promise<string | null> {
  if (typeof crypto === "undefined" || !("subtle" in crypto)) {
    return null;
  }

  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

async function uploadSongArtifactFile(input: {
  communityId: string;
  accessToken: string;
  file: File;
  artifactKind: "primary_audio" | "cover_art";
}): Promise<PirateApiSongArtifactUploadRef> {
  const mimeType = input.file.type || "application/octet-stream";
  const contentHash = await computeSha256Hash(input.file);
  const created = await createCommunitySongArtifactUpload({
    communityId: input.communityId,
    accessToken: input.accessToken,
    body: {
      artifact_kind: input.artifactKind,
      mime_type: mimeType,
      filename: input.file.name || null,
      size_bytes: input.file.size,
      content_hash: contentHash,
    },
  });
  const uploaded = await uploadCommunitySongArtifactContent({
    communityId: input.communityId,
    songArtifactUploadId: created.song_artifact_upload_id,
    accessToken: input.accessToken,
    file: input.file,
    contentType: mimeType,
  });

  return {
    storage_ref: uploaded.storage_ref,
    mime_type: uploaded.mime_type,
    size_bytes: uploaded.size_bytes ?? input.file.size,
    content_hash: uploaded.content_hash ?? contentHash,
  };
}

function CreatePostPage({ community }: { community: CommunitySummary }) {
  const { accessToken, connect, isConnecting } = usePirateAuth();
  const isMobile = useIsMobile();
  const [submitting, setSubmitting] = React.useState(false);
  const [viewer, setViewer] = React.useState<PirateApiUser | null>(null);
  const [viewerError, setViewerError] = React.useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [destinationPickerOpen, setDestinationPickerOpen] = React.useState(false);
  const [destinations, setDestinations] = React.useState<CreatePostDestination[] | null>(null);
  const [destinationsError, setDestinationsError] = React.useState<string | null>(null);
  const postingCommunityId = community.communityId ?? community.id;
  const textPostingPalmGate = findVeryPalmTextPostingGate(community);
  const requiresPalmScanForTextPost = textPostingPalmGate !== null;
  const firstTextPostOnly = textPostingPalmGate ? gateRuleIsFirstPostOnly(textPostingPalmGate) : false;

  const refreshPostingAccess = React.useCallback(async () => {
    if (!requiresPalmScanForTextPost || !accessToken) {
      setViewer(null);
      setViewerError(null);
      setViewerLoading(false);
      return;
    }

    setViewerLoading(true);
    setViewerError(null);

    try {
      const nextViewer = await getCurrentUser({
        accessToken,
        communityRef: postingCommunityId,
      });
      setViewer(nextViewer);
    } catch (nextError) {
      setViewerError(nextError instanceof Error ? nextError.message : "Could not load posting access");
    } finally {
      setViewerLoading(false);
    }
  }, [accessToken, postingCommunityId, requiresPalmScanForTextPost]);

  React.useEffect(() => {
    if (!requiresPalmScanForTextPost) {
      return;
    }

    const controller = new AbortController();
    setViewerLoading(Boolean(accessToken));
    setViewerError(null);

    if (!accessToken) {
      setViewer(null);
      setViewerLoading(false);
      return () => {
        controller.abort();
      };
    }

    void getCurrentUser({
      accessToken,
      communityRef: postingCommunityId,
      signal: controller.signal,
    }).then((nextViewer) => {
      if (controller.signal.aborted) {
        return;
      }

      setViewer(nextViewer);
    }).catch((nextError) => {
      if (controller.signal.aborted) {
        return;
      }

      setViewerError(nextError instanceof Error ? nextError.message : "Could not load posting access");
    }).finally(() => {
      if (!controller.signal.aborted) {
        setViewerLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
  }, [accessToken, postingCommunityId, requiresPalmScanForTextPost]);

  React.useEffect(() => {
    if (!isMobile) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setDestinationsError(null);

    void loadCreatePostDestinations({
      accessToken,
      signal: controller.signal,
    }).then((nextDestinations) => {
      if (!cancelled && !controller.signal.aborted) {
        setDestinations(dedupeCreatePostDestinations([
          {
            id: community.id,
            communityId: community.communityId,
            label: community.label,
            displayName: community.displayName,
            description: community.description,
            moderator: community.moderator,
          },
          ...nextDestinations,
        ]));
      }
    }).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setDestinationsError(nextError instanceof Error ? nextError.message : "Could not load communities");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, community, isMobile]);

  const uniqueHumanCapability = viewer?.verification_capabilities.unique_human;
  const hasCreatedTextPost = viewer?.community_posting_state?.has_created_text_post === true;
  const hasVeryPalmVerification = uniqueHumanCapability?.state === "verified"
    && uniqueHumanCapability.provider === "very";
  const hasTextPostingPalmAccess = firstTextPostOnly
    ? hasCreatedTextPost || hasVeryPalmVerification
    : hasVeryPalmVerification;
  const createPostDescription = `Post to ${community.displayName}.`;

  const handleSubmit = React.useCallback(async (payload: PostComposerSubmitPayload) => {
    if (payload.mode === "image" || payload.mode === "video" || payload.mode === "live") {
      toast.error(`${payload.mode.charAt(0).toUpperCase() + payload.mode.slice(1)} posts are not yet supported by the API.`);
      return;
    }

    if (!accessToken) {
      toast.error("Sign in before creating a post.");
      return;
    }

    if (requiresPalmScanForTextPost && payload.mode === "text" && !hasTextPostingPalmAccess) {
      toast.error(`Complete the Very palm scan before posting in ${community.displayName}.`);
      return;
    }

    setSubmitting(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `post_${Date.now()}`;

      if (payload.mode === "song") {
        if (payload.identityMode === "anonymous") {
          toast.error("Song posts must use your public identity.");
          return;
        }

        if (!payload.song.primaryAudioUpload) {
          toast.error("Add audio before posting a song.");
          return;
        }

        if (payload.lyrics.trim().length === 0) {
          toast.error("Add lyrics before posting a song.");
          return;
        }

        const upstreamAssetRefs = payload.songMode === "remix"
          ? Array.from(new Set((payload.derivativeStep?.references ?? []).map((reference) => reference.id).filter(Boolean)))
          : [];

        if (payload.songMode === "remix" && upstreamAssetRefs.length === 0) {
          toast.error("Attach the upstream song before posting a remix.");
          return;
        }

        const primaryAudio = await uploadSongArtifactFile({
          communityId: postingCommunityId,
          accessToken,
          file: payload.song.primaryAudioUpload,
          artifactKind: "primary_audio",
        });
        const coverArt = payload.song.coverUpload
          ? await uploadSongArtifactFile({
              communityId: postingCommunityId,
              accessToken,
              file: payload.song.coverUpload,
              artifactKind: "cover_art",
            })
          : null;

        const createdBundle = await createCommunitySongArtifactBundle({
          communityId: postingCommunityId,
          accessToken,
          body: {
            primary_audio: primaryAudio,
            lyrics: payload.lyrics,
            cover_art: coverArt,
          },
        });
        const readyBundle = createdBundle.status === "ready"
          ? createdBundle
          : await getCommunitySongArtifactBundle({
              communityId: postingCommunityId,
              songArtifactBundleId: createdBundle.song_artifact_bundle_id,
              accessToken,
            });

        if (readyBundle.status !== "ready") {
          throw new Error("Song processing is still running. Try again in a moment.");
        }

        const createdSongPost = await createCommunityPost({
          communityId: postingCommunityId,
          accessToken,
          body: {
            idempotency_key: idempotencyKey,
            post_type: "song",
            identity_mode: "public",
            title: payload.title || null,
            caption: payload.body || payload.caption || null,
            access_mode: "public",
            song_artifact_bundle_id: readyBundle.song_artifact_bundle_id,
            song_mode: payload.songMode,
            rights_basis: payload.songMode === "remix" ? "derivative" : "original",
            upstream_asset_refs: upstreamAssetRefs.length > 0 ? upstreamAssetRefs : null,
          },
        });

        toast.success("Post created.");
        navigate(`/p/${createdSongPost.post_id}`);
        return;
      }

      const created = await createCommunityPost({
        communityId: postingCommunityId,
        accessToken,
        body:
          payload.mode === "text"
            ? {
                idempotency_key: idempotencyKey,
                post_type: "text",
                title: payload.title || null,
                body: payload.body || null,
                identity_mode: payload.identityMode,
                anonymous_scope:
                  payload.identityMode === "anonymous" ? "community_stable" : null,
                disclosed_qualifier_ids:
                  payload.identityMode === "anonymous" && payload.selectedQualifierIds.length > 0
                    ? payload.selectedQualifierIds
                    : null,
              }
            : {
                idempotency_key: idempotencyKey,
                post_type: "link",
                title: payload.title || null,
                body: payload.caption || null,
                link_url: payload.linkUrl,
                identity_mode: payload.identityMode,
                anonymous_scope:
                  payload.identityMode === "anonymous" ? "community_stable" : null,
                disclosed_qualifier_ids:
                  payload.identityMode === "anonymous" && payload.selectedQualifierIds.length > 0
                    ? payload.selectedQualifierIds
                    : null,
              },
      });

      toast.success("Post created.");
      navigate(`/p/${created.post_id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create post");
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, community.displayName, hasTextPostingPalmAccess, postingCommunityId, requiresPalmScanForTextPost]);

  if (isMobile && destinationPickerOpen) {
    return (
      <section className="flex min-w-0 flex-1 flex-col gap-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <IconButton
            aria-label="Close community picker"
            onClick={() => setDestinationPickerOpen(false)}
            variant="ghost"
          >
            <X className="size-6" weight="bold" />
          </IconButton>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Post to</h1>
        </div>

        {destinationsError ? (
          <div className="rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/10 px-4 py-4 text-base text-foreground">
            {destinationsError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
          {destinations == null ? (
            <div className="space-y-3 px-4 py-4">
              <Skeleton className="h-14 rounded-full" />
              <Skeleton className="h-14 rounded-full" />
              <Skeleton className="h-14 rounded-full" />
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {destinations.map((destination) => (
                <button
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                  key={destination.communityId ?? destination.id}
                  onClick={() => {
                    if (destination.id === community.id) {
                      setDestinationPickerOpen(false);
                      return;
                    }

                    navigate(`/submit?c=${destination.id}`);
                  }}
                  type="button"
                >
                  <Avatar
                    className="h-11 w-11 bg-card text-base"
                    fallback={destination.displayName}
                    size="sm"
                    src={destination.moderator.avatarSrc ?? undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-foreground">{destination.label}</div>
                    {destination.description ? (
                      <div className="truncate text-base text-muted-foreground">{destination.description}</div>
                    ) : null}
                  </div>
                  <CaretRight className="size-5 text-muted-foreground" weight="bold" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (requiresPalmScanForTextPost && (!accessToken || viewerLoading || !hasTextPostingPalmAccess)) {
    return (
      <StackPageShell
        title="Create post"
        description={createPostDescription}
        actions={
          <Button onClick={() => navigate(`/c/${community.id}`)} variant="secondary">
            Back to community
          </Button>
        }
      >
        <PostingPalmGate
          accessToken={accessToken}
          community={community}
          firstTextPostOnly={firstTextPostOnly}
          isRefreshingAccess={viewerLoading}
          isSigningIn={isConnecting}
          onRefreshAccess={refreshPostingAccess}
          onSignIn={connect}
        />
        {viewerError ? (
          <div className="mx-auto w-full max-w-2xl rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/10 px-4 py-4 text-base text-foreground">
            {viewerError}
          </div>
        ) : null}
      </StackPageShell>
    );
  }

  return (
    isMobile ? (
      <section className="flex min-w-0 flex-1 flex-col gap-4 pb-6">
        <PostComposer
          availableTabs={["text", "link"]}
          canCreateSongPost={false}
          clubAvatarSrc={community.moderator.avatarSrc ?? undefined}
          clubName={community.label}
          identity={{
            allowAnonymousIdentity: true,
            allowQualifiersOnAnonymousPosts: true,
            anonymousLabel: "anon_club",
            availableQualifiers: [
              {
                qualifierId: "qlf_unique_human",
                label: "Unique Human",
                description: "Verified uniqueness",
              },
            ],
            identityMode: "public",
            publicHandle: "@you",
          }}
          linkPreview={{
            title: "Linked page preview",
            domain: "External URL",
            description: "Posting stores the link URL and optional commentary.",
          }}
          mobileChrome={{
            destinationLabel: community.label,
            onClose: () => closeCreatePostFlow(`/c/${community.id}`),
            onDestinationClick: () => setDestinationPickerOpen(true),
            postLabel: submitting ? "Posting…" : "Post",
          }}
          mode="text"
          onSubmit={handleSubmit}
          titleCountLabel={submitting ? "Submitting…" : "0/300"}
        />
      </section>
    ) : (
      <StackPageShell
        title="Create post"
        description={createPostDescription}
        actions={
          <Button onClick={() => navigate(`/c/${community.id}`)} variant="secondary">
            Back to community
          </Button>
        }
      >
        <div className="mx-auto w-full max-w-5xl">
          <PostComposer
            availableTabs={["text", "link"]}
            canCreateSongPost={false}
            clubAvatarSrc={community.moderator.avatarSrc ?? undefined}
            clubName={community.label}
            identity={{
              allowAnonymousIdentity: true,
              allowQualifiersOnAnonymousPosts: true,
              anonymousLabel: "anon_club",
              availableQualifiers: [
                {
                  qualifierId: "qlf_unique_human",
                  label: "Unique Human",
                  description: "Verified uniqueness",
                },
              ],
              identityMode: "public",
              publicHandle: "@you",
            }}
            linkPreview={{
              title: "Linked page preview",
              domain: "External URL",
              description: "Posting stores the link URL and optional commentary.",
            }}
            mode="text"
            onSubmit={handleSubmit}
            titleCountLabel={submitting ? "Submitting…" : "0/300"}
          />
        </div>
      </StackPageShell>
    )
  );
}

function PostPage({ post }: { post: RoutePost }) {
  const { copy } = useRouteMessages();
  const postDescription = post.byline.community
    ? `${post.byline.community.label} · ${post.byline.timestampLabel}`
    : post.byline.timestampLabel;

  return (
    <StackPageShell
      title={post.title ?? copy.post.fallbackTitle}
      description={postDescription}
    >
      <PostThread
        commentsBody={copy.post.commentsBody}
        commentsHeading={copy.common.commentsHeading}
        post={post}
      />
    </StackPageShell>
  );
}

function toProfilePageProps(
  profile: ProfileSummary,
  ownProfile: boolean,
  joinedStatLabel: string,
): ProfileCompositionProps {
  const overviewItems: ProfileCompositionProps["overviewItems"] = [];
  const overviewLength = Math.max(
    profile.posts.length,
    profile.comments.length,
    profile.scrobbles.length,
  );

  for (let index = 0; index < overviewLength; index += 1) {
    const post = profile.posts[index];
    if (post) {
      overviewItems.push({
        kind: "post",
        id: `activity_post_${post.postId}`,
        post: {
          postId: post.postId,
          post,
        },
      });
    }

    const comment = profile.comments[index];
    if (comment) {
      overviewItems.push({
        kind: "comment",
        id: `activity_comment_${comment.commentId}`,
        comment,
      });
    }

    const scrobble = profile.scrobbles[index];
    if (scrobble) {
      overviewItems.push({
        kind: "scrobble",
        id: `activity_scrobble_${scrobble.scrobbleId}`,
        scrobble,
      });
    }
  }

  return {
    profile: {
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarSrc: profile.avatarSrc,
      bannerSrc: `https://picsum.photos/seed/${profile.userId}-banner/1600/480`,
      meta: profile.stats,
      viewerContext: ownProfile ? "self" : "public",
      viewerFollows: false,
      canMessage: !ownProfile,
    },
    rightRail: {
      stats: [
        { label: joinedStatLabel, value: profile.joinedLabel.replace(/^Joined\s+/, "") },
        ...profile.stats,
      ],
    },
    overviewItems,
    posts: profile.posts.map((post) => ({
      postId: post.postId,
      post,
    })),
    comments: profile.comments,
    scrobbles: profile.scrobbles,
  };
}

function CurrentUserProfilePage() {
  const {
    accessToken,
    isBrowserAuthenticated,
    isConnecting,
    isReady,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();
  const { copy } = useRouteMessages();
  const [profile, setProfile] = React.useState<PirateApiProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      if (isReady && !isBrowserAuthenticated) {
        setProfile(null);
        setError(null);
      }
      return;
    }

    let cancelled = false;
    setProfile(null);
    setError(null);

    void getCurrentProfile({ accessToken }).then((nextProfile) => {
      if (cancelled) {
        return;
      }

      setProfile(nextProfile);
    }).catch((nextError) => {
      if (cancelled) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Could not load profile");
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, isBrowserAuthenticated, isReady]);

  const awaitingSession = !accessToken && (isConnecting || isBrowserAuthenticated);

  if (!isReady || runtimeStatus === "loading_runtime" || awaitingSession) {
    if (profile) {
      return (
        <ProfilePageComposition
          {...mapCurrentProfilePageProps(profile, copy.common.joinedStatLabel)}
        />
      );
    }

    return <ProfilePageSkeleton />;
  }

  if (!accessToken) {
    return (
      <RouteLoadState
        body={runtimeStatus === "runtime_error"
          ? runtimeErrorMessage ?? "Privy could not load in this browser session."
          : "Sign in to view your profile."}
        title={runtimeStatus === "runtime_error" ? "Profile unavailable" : "Sign in required"}
      />
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Profile unavailable" />;
  }

  if (!profile) {
    return <ProfilePageSkeleton />;
  }

  return (
    <ProfilePageComposition
      {...mapCurrentProfilePageProps(profile, copy.common.joinedStatLabel)}
    />
  );
}

function LiveUserProfilePage({ userId }: { userId: string }) {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const { copy } = useRouteMessages();
  const [profile, setProfile] = React.useState<PirateApiProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setProfile(null);
    setError(null);

    void getProfileById({
      userId,
      accessToken,
      signal: controller.signal,
    }).then((nextProfile) => {
      if (!cancelled && !controller.signal.aborted) {
        setProfile(nextProfile);
      }
    }).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : "Could not load profile");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, userId]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Profile"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to load Pirate profiles.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Profile unavailable" />;
  }

  if (!profile) {
    return <ProfilePageSkeleton />;
  }

  const pageProps = mapCurrentProfilePageProps(profile, copy.common.joinedStatLabel);

  return (
    <ProfilePageComposition
      {...pageProps}
      profile={{
        ...pageProps.profile,
        canMessage: true,
        viewerContext: "public",
      }}
    />
  );
}

function mapRedditImportStatus(
  status: "not_started" | "queued" | "running" | "succeeded" | "failed",
): "not_started" | "queued" | "running" | "succeeded" | "failed" {
  return status;
}

const REDDIT_ONBOARDING_STORAGE_KEY = "pirate.onboarding.reddit";

type StoredRedditOnboardingState = {
  userId: string;
  username: string;
  verification: PirateApiRedditVerification | null;
};

function readStoredRedditOnboardingState(): StoredRedditOnboardingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(REDDIT_ONBOARDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredRedditOnboardingState>;
    if (typeof parsed.userId !== "string" || typeof parsed.username !== "string") {
      return null;
    }
    return {
      userId: parsed.userId,
      username: parsed.username,
      verification: parsed.verification ?? null,
    };
  } catch {
    return null;
  }
}

function writeStoredRedditOnboardingState(input: StoredRedditOnboardingState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REDDIT_ONBOARDING_STORAGE_KEY, JSON.stringify(input));
}

function clearStoredRedditOnboardingState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(REDDIT_ONBOARDING_STORAGE_KEY);
}


function mapSuggestedCommunitiesFromImportSummary(summary: PirateApiRedditImportSummary): Array<{
  communityId: string;
  name: string;
  reason: string;
}> {
  return summary.suggested_communities.map((community) => ({
    communityId: community.community_id,
    name: community.name,
    reason: community.reason,
  }));
}

async function loadOnboardingRouteState(input: {
  accessToken: string;
  signal?: AbortSignal;
}): Promise<{
  onboarding: Awaited<ReturnType<typeof getOnboardingStatus>>;
  profile: PirateApiProfile;
  redditImportSummary: PirateApiRedditImportSummary | null;
  suggestedCommunities: Array<{
    communityId: string;
    name: string;
    reason: string;
  }>;
}> {
  const [onboarding, profile] = await Promise.all([
    getOnboardingStatus(input.accessToken),
    getCurrentProfile({ accessToken: input.accessToken }),
  ]);

  let redditImportSummary: PirateApiRedditImportSummary | null = null;
  if (onboarding.reddit_import_status === "succeeded") {
    redditImportSummary = await getLatestRedditImportSummary({ accessToken: input.accessToken }).catch(() => null);
  }

  if (redditImportSummary) {
    return {
      onboarding,
      profile,
      redditImportSummary,
      suggestedCommunities: mapSuggestedCommunitiesFromImportSummary(redditImportSummary),
    };
  }

  const communitiesById = await loadCommunitiesByIds({
    accessToken: input.accessToken,
    communityIds: onboarding.suggested_community_ids ?? [],
    signal: input.signal,
  });

  return {
    onboarding,
    profile,
    redditImportSummary: null,
    suggestedCommunities: (onboarding.suggested_community_ids ?? []).map((communityId) => {
      const community = communitiesById.get(communityId);
      return {
        communityId,
        name: community ? formatCommunityLabel(community.display_name) : `c/${communityId}`,
        reason: "Suggested from your current Reddit import and onboarding state.",
      };
    }),
  };
}

export function OnboardingPage() {
  const { accessToken, connect, isAuthenticated, isConnecting } = usePirateAuth();
  const [phase, setPhase] = React.useState<"reddit" | "username" | "communities">("reddit");
  const [onboarding, setOnboarding] = React.useState<Awaited<ReturnType<typeof getOnboardingStatus>> | null>(null);
  const [profile, setProfile] = React.useState<PirateApiProfile | null>(null);
  const [redditImportSummary, setRedditImportSummary] = React.useState<PirateApiRedditImportSummary | null>(null);
  const [suggestedCommunities, setSuggestedCommunities] = React.useState<Array<{
    communityId: string;
    name: string;
    reason: string;
  }>>([]);
  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<PirateApiRedditVerification | null>(null);
  const [isRedditActionPending, setIsRedditActionPending] = React.useState(false);
  const [handleValue, setHandleValue] = React.useState("");
  const [handleAvailability, setHandleAvailability] = React.useState<PirateApiGlobalHandleAvailability | null>(null);
  const [isHandleAvailabilityPending, setIsHandleAvailabilityPending] = React.useState(false);
  const [isHandleSubmitPending, setIsHandleSubmitPending] = React.useState(false);
  const [joiningCommunityId, setJoiningCommunityId] = React.useState<string | null>(null);
  const [joinedCommunityIds, setJoinedCommunityIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const refreshOnboardingState = React.useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    const next = await loadOnboardingRouteState({
      accessToken,
      signal,
    });

    setOnboarding(next.onboarding);
    setProfile(next.profile);
    setRedditImportSummary(next.redditImportSummary);
    setSuggestedCommunities(next.suggestedCommunities);
    setPhase((currentPhase) => (
      currentPhase === "reddit"
        ? getDefaultOnboardingPhase({
            generatedHandleAssigned: next.onboarding.generated_handle_assigned,
            redditVerificationStatus: next.onboarding.reddit_verification_status,
          })
        : currentPhase
    ));
    const storedRedditState = readStoredRedditOnboardingState();
    if (storedRedditState?.userId === next.profile.user_id) {
      if (next.onboarding.reddit_verification_status === "pending" || next.onboarding.reddit_verification_status === "verified") {
        setRedditUsername((currentValue) => currentValue || storedRedditState.username);
        setRedditVerification((currentValue) => currentValue ?? storedRedditState.verification);
      } else {
        clearStoredRedditOnboardingState();
      }
    }
    if (next.redditImportSummary?.reddit_username) {
      setRedditUsername((currentValue) => currentValue || next.redditImportSummary?.reddit_username || "");
    }

    return next;
  }, [accessToken]);

  React.useEffect(() => {
    if (!accessToken) {
      setOnboarding(null);
      setProfile(null);
      setRedditImportSummary(null);
      setSuggestedCommunities([]);
      setRedditUsername("");
      setRedditVerification(null);
      setHandleValue("");
      setHandleAvailability(null);
      setJoinedCommunityIds([]);
      clearStoredRedditOnboardingState();
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setOnboarding(null);
    setProfile(null);
    setRedditImportSummary(null);
    setSuggestedCommunities([]);
    setError(null);

    void refreshOnboardingState(controller.signal).catch((nextError) => {
      if (!cancelled && !controller.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : "Could not load onboarding");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, refreshOnboardingState]);

  React.useEffect(() => {
    if (!profile?.global_handle.label) {
      return;
    }

    setHandleValue(normalizePirateHandleLabel(profile.global_handle.label));
  }, [profile?.global_handle.label]);

  React.useEffect(() => {
    if (!accessToken || phase !== "username") {
      return;
    }

    const desiredLabel = normalizePirateHandleLabel(handleValue);
    if (!desiredLabel) {
      setHandleAvailability(null);
      setIsHandleAvailabilityPending(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsHandleAvailabilityPending(true);
      void getGlobalHandleAvailability({
        accessToken,
        label: desiredLabel,
      }).then((nextAvailability) => {
        if (!cancelled) {
          setHandleAvailability(nextAvailability);
        }
      }).catch(() => {
        if (!cancelled) {
          setHandleAvailability(null);
        }
      }).finally(() => {
        if (!cancelled) {
          setIsHandleAvailabilityPending(false);
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, handleValue, phase]);

  React.useEffect(() => {
    if (!accessToken || (onboarding?.reddit_import_status !== "queued" && onboarding?.reddit_import_status !== "running")) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshOnboardingState().catch(() => {});
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, onboarding?.reddit_import_status, refreshOnboardingState]);

  const handleRedditNext = React.useCallback(async () => {
    if (!accessToken) {
      toast("Sign in to continue onboarding.");
      return;
    }

    const nextUsername = redditUsername.trim();
    if (!nextUsername) {
      toast("Enter a Reddit username.");
      return;
    }

    setIsRedditActionPending(true);
    try {
      const verification = await startOrCheckRedditVerification({
        accessToken,
        redditUsername: nextUsername,
      });
      setRedditUsername(verification.reddit_username);
      setRedditVerification(verification);
      if (profile) {
        writeStoredRedditOnboardingState({
          userId: profile.user_id,
          username: verification.reddit_username,
          verification,
        });
      }

      if (verification.status === "verified") {
        await startRedditImport({
          accessToken,
          redditUsername: verification.reddit_username,
        });
        await refreshOnboardingState();
      }
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Could not verify your Reddit username.");
    } finally {
      setIsRedditActionPending(false);
    }
  }, [accessToken, profile, redditUsername, refreshOnboardingState]);

  const handleUsernameNext = React.useCallback(async () => {
    if (!accessToken) {
      toast("Sign in to continue onboarding.");
      return;
    }

    const desiredLabel = normalizePirateHandleLabel(handleValue);
    if (!desiredLabel) {
      toast("Enter a username.");
      return;
    }

    setIsHandleSubmitPending(true);
    try {
      const availability = await getGlobalHandleAvailability({
        accessToken,
        label: desiredLabel,
      });
      setHandleAvailability(availability);

      if (availability.status !== "available") {
        toast(`${desiredLabel}.pirate ${describeHandleAvailability(availability.status)}.`);
        return;
      }

      await renameGlobalHandle({
        accessToken,
        desiredLabel,
      });
      await refreshOnboardingState();
      setPhase("communities");
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : "Could not claim your username.");
    } finally {
      setIsHandleSubmitPending(false);
    }
  }, [accessToken, handleValue, refreshOnboardingState]);

  const handleJoinSuggestedCommunity = React.useCallback(async (communityId: string) => {
    if (!accessToken) {
      toast("Sign in to join communities.");
      return;
    }

    setJoiningCommunityId(communityId);
    try {
      const result = await joinCommunity({
        communityId,
        accessToken,
      });
      setJoinedCommunityIds((currentValue) => currentValue.includes(communityId)
        ? currentValue
        : [...currentValue, communityId]);
      toast(result.status === "requested" ? "Join request sent." : "Joined community.");
    } catch (nextError) {
      if (nextError instanceof PirateApiError && nextError.code === "gate_failed") {
        const pendingVerificationStart = buildPendingVerificationStartFromGateFailure({
          communityId,
          error: nextError,
        });
        if (pendingVerificationStart) {
          storePendingVerificationStart(pendingVerificationStart);
          toast("Complete verification to join this community.");
          navigate("/verify");
          return;
        }
      }

      toast(nextError instanceof Error ? nextError.message : "Could not join this community.");
    } finally {
      setJoiningCommunityId(null);
    }
  }, [accessToken]);

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button loading={isConnecting} onClick={connect}>
            Sign in
          </Button>
        )}
        title="Onboarding"
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            Sign in to continue Pirate onboarding.
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title="Onboarding unavailable" />;
  }

  if (!onboarding || !profile) {
    return <RouteLoadState body="Loading onboarding." title="Loading onboarding" />;
  }

  const profileHandleLabel = normalizePirateHandleLabel(profile.global_handle.label);
  const normalizedHandleValue = normalizePirateHandleLabel(handleValue);
  const currentHandleAvailability = handleAvailability?.label === normalizedHandleValue.toLowerCase()
    ? handleAvailability.status
    : undefined;
  const handleSuggestion: React.ComponentProps<typeof OnboardingChoosePirateUsername>["handleSuggestion"] = (
    currentHandleAvailability != null
      || normalizedHandleValue === profileHandleLabel
  ) && normalizedHandleValue
    ? {
        suggestedLabel: normalizedHandleValue,
        source: profile.global_handle.issuance_source === "reddit_verified_claim"
          ? "verified_reddit_username"
          : "generated",
        availability: currentHandleAvailability ?? "available",
      }
    : undefined;
  const redditVerificationState = mapRedditVerificationUiState({
    onboardingStatus: onboarding.reddit_verification_status,
    verification: redditVerification,
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Stepper
        currentStep={phase === "reddit" ? 1 : phase === "username" ? 2 : 3}
        steps={[
          { label: "Reddit" },
          { label: "Username" },
          { label: "Communities" },
        ]}
      />
      <Card className="overflow-hidden border-border shadow-none">
        <CardContent className="p-5">
          {phase === "reddit" ? (
            <OnboardingRedditOptional
              actions={{
                primaryLabel: "Continue",
                tertiaryLabel: "Skip",
              }}
              canContinue={onboarding.reddit_verification_status === "verified"}
              canSkip={true}
              importJob={{
                sourceLabel: "Reddit import",
                status: mapRedditImportStatus(onboarding.reddit_import_status),
              }}
              nextLoading={isRedditActionPending}
              onNext={handleRedditNext}
              onSkip={() => setPhase("username")}
              onUsernameChange={setRedditUsername}
              reddit={{
                usernameValue: redditUsername,
                verifiedUsername: redditVerification?.reddit_username ?? redditImportSummary?.reddit_username,
                verificationHint: redditVerification?.verification_hint ?? undefined,
                codePlacementSurface: redditVerification?.code_placement_surface ?? undefined,
                errorTitle: describeRedditVerificationFailure(redditVerification),
                lastCheckedAt: redditVerification?.last_checked_at ?? undefined,
                verificationState: redditVerificationState,
              }}
            />
          ) : null}
          {phase === "username" ? (
            <OnboardingChoosePirateUsername
              handleValue={handleValue}
              handleSuggestion={handleSuggestion}
              actions={{ primaryLabel: "Continue" }}
              nextLoading={isHandleSubmitPending || isHandleAvailabilityPending}
              onHandleChange={setHandleValue}
              onNext={handleUsernameNext}
            />
          ) : null}
          {phase === "communities" ? (
            <OnboardingCommunitySuggestions
              communities={suggestedCommunities}
              actions={{
                primaryLabel: "Done",
                tertiaryLabel: "Skip",
              }}
              joinedCommunityIds={joinedCommunityIds}
              joiningCommunityId={joiningCommunityId}
              onJoinCommunity={handleJoinSuggestedCommunity}
              onNext={() => {
                clearStoredRedditOnboardingState()
                navigate("/")
              }}
              onSkip={() => {
                clearStoredRedditOnboardingState()
                navigate("/")
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function AuthPage() {
  const {
    accessToken,
    connect,
    isAuthenticated,
    isBrowserAuthenticated,
    isConfigured,
    isConnecting,
    isReady,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();
  const { copy } = useRouteMessages();
  const { onboarding, profile, error } = usePirateAccountSnapshot(accessToken);

  const awaitingSession = !accessToken && (isConnecting || isBrowserAuthenticated);

  if (!isReady || runtimeStatus === "loading_runtime" || awaitingSession) {
    return <RouteLoadState body="Loading account status." title={copy.auth.title} />;
  }

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button
            loading={isConnecting}
            onClick={isConfigured ? connect : undefined}
          >
            Sign in
          </Button>
        )}
        description={copy.auth.description}
        title={copy.auth.title}
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            {runtimeStatus === "runtime_error"
              ? runtimeErrorMessage ?? copy.auth.body
              : copy.auth.body}
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title={copy.auth.title} />;
  }

  return (
    <StackPageShell
      actions={(
        <>
          <Button onClick={() => navigate("/me")} variant="secondary">
            Profile
          </Button>
          <Button onClick={() => navigate("/verify")} variant="secondary">
            Verify
          </Button>
          <Button onClick={() => navigate("/onboarding")} variant="secondary">
            Onboarding
          </Button>
        </>
      )}
      description={copy.auth.description}
      title={copy.auth.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle>Session</CardTitle>
            <CardDescription>
              Browser authentication and Pirate session state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-base text-muted-foreground">
              Browser auth: {isBrowserAuthenticated ? "connected" : "not connected"}
            </div>
            <div className="text-base text-muted-foreground">
              Pirate session: {accessToken ? "active" : "missing"}
            </div>
            <div className="text-base text-muted-foreground">
              Handle: {profile?.global_handle.label ?? "Unavailable"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              Current readiness across verification and setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-base text-muted-foreground">
              Unique human: {onboarding?.unique_human_verification_status ?? "unknown"}
            </div>
            <div className="text-base text-muted-foreground">
              Reddit verification: {onboarding?.reddit_verification_status ?? "unknown"}
            </div>
            <div className="text-base text-muted-foreground">
              Community creation: {onboarding?.community_creation_ready ? "ready" : "not ready"}
            </div>
          </CardContent>
        </Card>
      </div>
    </StackPageShell>
  );
}

function InboxPage() {
  const {
    accessToken,
    connect,
    isBrowserAuthenticated,
    isAuthenticated,
    isConfigured,
    isConnecting,
    isReady,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();
  const { copy } = useRouteMessages();
  const { onboarding, profile, user, error } = usePirateAccountSnapshot(accessToken);
  const awaitingSession = !accessToken && (isConnecting || isBrowserAuthenticated);

  if (!isReady || runtimeStatus === "loading_runtime" || awaitingSession) {
    return <RouteLoadState body="Loading inbox." title={copy.inbox.title} />;
  }

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button
            loading={isConnecting}
            onClick={isConfigured ? connect : undefined}
          >
            Sign in
          </Button>
        )}
        description={copy.inbox.description}
        title={copy.inbox.title}
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            {runtimeStatus === "runtime_error"
              ? runtimeErrorMessage ?? copy.inbox.body
              : copy.inbox.body}
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title={copy.inbox.title} />;
  }

  if (!profile || !onboarding || !user) {
    return <RouteLoadState body="Loading inbox." title={copy.inbox.title} />;
  }

  return (
    <StackPageShell
      actions={isAuthenticated ? (
        <>
          <Button onClick={() => navigate("/me")} variant="secondary">
            Profile
          </Button>
          <Button onClick={() => navigate("/verify")} variant="secondary">
            Verify
          </Button>
        </>
      ) : (
        <Button
          loading={isConnecting}
          onClick={isConfigured ? connect : undefined}
        >
          Sign in
        </Button>
      )}
      description={copy.inbox.description}
      title={copy.inbox.title}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle>Session</CardTitle>
            <CardDescription>{copy.inbox.body}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-base text-muted-foreground">
              Browser auth: {isBrowserAuthenticated ? "connected" : "not connected"}
            </div>
            <div className="text-base text-muted-foreground">
              Pirate session: {accessToken ? "active" : "missing"}
            </div>
            <div className="text-base text-muted-foreground">
              Handle: {profile.global_handle.label}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle>Verification</CardTitle>
            <CardDescription>
              Current account verification capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-base text-muted-foreground">
              Account state: {formatStatusLabel(user.verification_state)}
            </div>
            <div className="text-base text-muted-foreground">
              Provider: {user.capability_provider ? formatStatusLabel(user.capability_provider) : "Not assigned"}
            </div>
            <div className="text-base text-muted-foreground">
              Unique human: {formatStatusLabel(user.verification_capabilities.unique_human.state)}
            </div>
            <div className="text-base text-muted-foreground">
              Age over 18: {formatStatusLabel(user.verification_capabilities.age_over_18.state)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none md:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              Current onboarding and account-readiness state.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="text-base text-muted-foreground">
              Reddit verification: {formatStatusLabel(onboarding.reddit_verification_status)}
            </div>
            <div className="text-base text-muted-foreground">
              Namespace verification: {formatStatusLabel(onboarding.namespace_verification_status)}
            </div>
            <div className="text-base text-muted-foreground">
              Community creation: {onboarding.community_creation_ready ? "Ready" : "Not ready"}
            </div>
          </CardContent>
          {onboarding.missing_requirements.length > 0 ? (
            <CardFooter className="border-t border-border px-6 py-4">
              <p className="text-base text-muted-foreground">
                Missing requirements: {onboarding.missing_requirements.map((item) => formatStatusLabel(item)).join(", ")}
              </p>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </StackPageShell>
  );
}

function VerifyPageRoute() {
  const [initialStartRequest, setInitialStartRequest] = React.useState<PendingVerificationStart | null>(null);

  React.useEffect(() => {
    setInitialStartRequest(consumePendingVerificationStart());
  }, []);

  return (
    <React.Suspense fallback={<RouteLoadState body="Loading verification." title="Loading verification" />}>
      <StackPageShell
        title="Verify your account"
        description="Very or Self can satisfy unique-human verification. Use Self as well only if you need document-based qualifiers like age or nationality."
      >
        <VerificationCenterPage
          copy={{
            connectAction: "Verify",
            connectBody: "This page needs an existing Pirate session. Open it after sign-in, or pass `pirate_access_token` in the URL once while wiring the flow.",
            connectTitle: "Verification needs a Pirate session",
            guidanceBody: "Finish one path for unique-human verification. Add Self only if you need document-based qualifiers on this account.",
            guidanceTitle: "Recommended",
            launchUnavailableBody: "This verification session started, but the provider launch payload is missing. Refresh and try again.",
            missingSessionBody: "No Pirate access token is available in this browser yet.",
            missingSessionTitle: "Session missing",
            providerLabel: "Active provider",
            refreshAction: "Refresh status",
            selfAction: "Passport scan with Self",
            selfBody: "Use Self for document-backed checks. Scan the QR with the Self app or open the mobile link directly.",
            selfOpenAction: "Open Self app",
            selfStatusNote: "Use this if you want document-based checks on the same Pirate account.",
            sessionDetailsTitle: "Account status",
            sessionPanelBody: "Keep this page open while the provider finishes. The session panel will refresh automatically, and you can always reopen the QR flow.",
            sessionPanelTitle: "Current verification session",
            sessionStatusLabel: "Session status",
            sessionTokenLabel: "Browser session",
            uniqueHumanLabel: "Unique human",
            verifiedBody: "Verification is complete for this session. Use the other provider only if you need its additional qualifiers.",
            verifiedCta: "Refresh account status",
            veryAction: "Palm scan with Very",
            veryBody: "Use Very for palm-backed unique-human verification.",
            veryOpenAction: "Open Very QR",
            veryStatusNote: "This satisfies the unique-human check for palm-backed access.",
            waitingSelfBody: "Waiting for the Self ceremony to finish.",
            waitingVeryBody: "Waiting for the Very palm scan to finish.",
            errorLabel: "Verification error",
          }}
          initialStartRequest={initialStartRequest}
        />
      </StackPageShell>
    </React.Suspense>
  );
}

function AuthDevicePageRoute() {
  const { copy } = useRouteMessages();

  return (
    <React.Suspense fallback={<RouteLoadState body="Loading sign-in." title="Loading sign-in" />}>
      <DeviceAuthPage
        copy={{
          title: "Link your terminal to Pirate",
          subtitle: "Finish sign-in here, verify once, and let the terminal keep moving. The browser owns the ceremony. The terminal just waits for the session to be claimed.",
          missingParamsTitle: "This device session link is incomplete",
          missingParamsBody: "The browser URL needs both a device session id and the code shown in your terminal. Re-open the link from the terminal and try again.",
          missingPrivyTitle: "Privy is not configured for this web app",
          missingPrivyBody: "Set `VITE_PRIVY_APP_ID` in `pirate-web` before using the browser handoff flow.",
          codeLabel: "Terminal code",
          continueInBrowser: "Continue in browser",
          signInAction: "Sign in with Privy",
          exchangePending: "Creating your Pirate session",
          checkingStatus: "Checking whether this account already satisfies Pirate's verification requirements.",
          verifiedReadyTitle: "This account is already verified",
          verifiedReadyBody: "Pirate can bind this browser session to the terminal immediately. Once you authorize, the terminal can claim its app session and continue.",
          authorizeAction: "Authorize terminal session",
          authorizedTitle: "Terminal session authorized",
          authorizedBody: "You can close this window. The terminal now has everything it needs to claim the Pirate session with its device code.",
          openTerminalLabel: "Close this tab",
          verifyChoiceTitle: "Choose how to verify this account",
          verifyChoiceBody: "Unique-human verification is required before the terminal session can be authorized. Start with Self or Very below.",
          selfAction: "Verify with Self",
          veryAction: "Verify with Very",
          selfReadyBody: "Self is the mobile-first path. Scan the QR with the Self app or open the deeplink directly from this browser.",
          selfWaitingBody: "Waiting for the Self ceremony to finish. Keep this page open while the provider callback updates the session.",
          selfOpenAction: "Open Self app",
          selfRetryAction: "Refresh status",
          veryReadyBody: "Very uses the same QR handoff pattern. Scan the QR with the Very app, or reopen the QR here if you close it before the palm scan finishes.",
          veryWaitingBody: "Waiting for the Very QR ceremony to finish. Keep this page open while the palm verification resolves.",
          veryOpenAction: "Open Very QR",
          refreshStatusAction: "Refresh status",
          sessionDetailsTitle: "Session details",
          pirateHandleLabel: "Pirate handle",
          walletCountLabel: "Linked wallets",
          apiOriginLabel: "API origin",
          errorLabel: "Flow error",
          authStageLabel: "Auth stage",
          verificationStageLabel: "Verification stage",
        }}
      />
    </React.Suspense>
  );
}

function CreateCommunityPage() {
  const {
    accessToken,
    connect,
    isBrowserAuthenticated,
    isAuthenticated,
    isConfigured,
    isConnecting,
    isReady,
    runtimeErrorMessage,
    runtimeStatus,
  } = usePirateAuth();
  const { copy } = useRouteMessages();
  const { onboarding, user, error } = usePirateAccountSnapshot(accessToken);
  const namespaceVerification = React.useMemo(() => ({
    onInspect: async ({ family, rootLabel }: { family: "hns" | "spaces"; rootLabel: string }) => {
      const accessToken = readPirateAccessToken();
      console.info("[create-community-page] start inspect", {
        family,
        rootLabel,
        hasAccessToken: accessToken != null,
      });
      if (!accessToken) throw new Error("Sign in before inspecting a namespace.");

      const session = await startNamespaceVerificationSession({
        accessToken,
        family,
        rootLabel,
      });

      console.info("[create-community-page] inspect session response", {
        family,
        rootLabel,
        session,
      });

      return {
        namespaceVerificationSessionId: session.namespace_verification_session_id,
        status: session.status,
        challengeKind: session.challenge_kind as NamespaceChallengeKind | null,
        challengePayload: session.challenge_payload,
        challengeTxtValue: session.challenge_txt_value,
        challengeHost: session.challenge_host,
        expiryHorizonSufficient: session.assertions.expiry_horizon_sufficient,
        expiresAt: session.expires_at,
        failureReason: session.failure_reason,
      };
    },
    onCompleteVerification: async ({
      family,
      namespaceVerificationSessionId,
      restartChallenge,
      signaturePayload,
    }: {
      family: "hns" | "spaces";
      namespaceVerificationSessionId: string;
      restartChallenge?: boolean;
      signaturePayload?: {
        signature: string;
        algorithm?: string | null;
        signerPubkey?: string | null;
        digest?: string | null;
      };
    }) => {
      const accessToken = readPirateAccessToken();
      console.info("[create-community-page] start verify", {
        family,
        namespaceVerificationSessionId,
        hasAccessToken: accessToken != null,
      });
      if (!accessToken) throw new Error("Sign in before completing verification.");

      const session = await completeNamespaceVerificationSession({
        accessToken,
        namespaceVerificationSessionId,
        restartChallenge,
        signaturePayload: signaturePayload
          ? {
              signature: signaturePayload.signature,
              algorithm: signaturePayload.algorithm ?? null,
              signer_pubkey: signaturePayload.signerPubkey ?? null,
              digest: signaturePayload.digest ?? null,
            }
          : undefined,
      });

      console.info("[create-community-page] verify session response", {
        family,
        namespaceVerificationSessionId,
        session,
      });

      return {
        status: session.status,
        challengeKind: session.challenge_kind as NamespaceChallengeKind | null,
        challengePayload: session.challenge_payload,
        namespaceVerificationId: session.namespace_verification_id,
        failureReason: session.failure_reason,
      };
    },
  }), []);

  const handleCreate = React.useCallback<CreateCommunityCallbacks["onCreate"]>(async (input) => {
    const accessToken = readPirateAccessToken();
    if (!accessToken) throw new Error("Sign in before creating a community.");

    const response = await createCommunityApi({
      accessToken,
      body: buildCreateCommunityRequestBody({
        displayName: input.displayName,
        description: input.description,
        membershipMode: input.membershipMode,
        defaultAgeGatePolicy: input.defaultAgeGatePolicy,
        allowAnonymousIdentity: input.allowAnonymousIdentity,
        anonymousIdentityScope: input.anonymousIdentityScope,
        namespaceVerificationId: input.namespaceVerificationId,
        handlePolicyTemplate: input.handlePolicyTemplate,
        gateTypes: input.gateTypes,
      }),
    });

    toast.success("Community created.");
    navigate(`/c/${response.community.community_id}`);

    return { communityId: response.community.community_id };
  }, []);

  const awaitingSession = !accessToken && (isConnecting || isBrowserAuthenticated);

  if (!isReady || runtimeStatus === "loading_runtime" || awaitingSession) {
    return <RouteLoadState body="Loading community creator." title={copy.createCommunity.title} />;
  }

  if (!isAuthenticated) {
    return (
      <StackPageShell
        actions={(
          <Button
            loading={isConnecting}
            onClick={isConfigured ? connect : undefined}
          >
            Sign in
          </Button>
        )}
        description={copy.createCommunity.description}
        title={copy.createCommunity.title}
      >
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
          <p className="text-base leading-7 text-muted-foreground">
            {runtimeStatus === "runtime_error"
              ? runtimeErrorMessage ?? "Sign in before creating a community."
              : "Sign in before creating a community."}
          </p>
        </div>
      </StackPageShell>
    );
  }

  if (error) {
    return <RouteLoadState body={error} title={copy.createCommunity.title} />;
  }

  if (!onboarding || !user) {
    return <RouteLoadState body="Loading community creator." title={copy.createCommunity.title} />;
  }

  const creatorVerificationState = {
    uniqueHumanVerified:
      onboarding.unique_human_verification_status === "verified"
      || user.verification_capabilities.unique_human.state === "verified",
    ageOver18Verified: user.verification_capabilities.age_over_18.state === "verified",
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <CreateCommunityComposer
        allowAnonymousIdentity={true}
        creatorVerificationState={creatorVerificationState}
        defaultAgeGatePolicy="none"
        description=""
        displayName=""
        handlePolicy={{
          membershipRequiredForClaim: true,
          policyTemplate: "standard",
          pricingModel: "free",
        }}
        membershipMode="open"
        namespace={{
          externalRoot: "",
          family: "hns",
          hnsDelegationMode: "owner_managed",
          importStatus: "not_imported",
          ownerLabel: "",
        }}
        namespaceVerification={namespaceVerification}
        onCreate={handleCreate}
      />
    </div>
  );
}

function NotFoundPage({ path }: { path: string }) {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.notFound.title}
      description={interpolateMessage(copy.notFound.description, { path })}
      actions={
        <Button onClick={() => navigate("/")} variant="secondary">
          {copy.common.backHome}
        </Button>
      }
    >
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
        <p className="text-base leading-7 text-muted-foreground">
          {copy.notFound.body}
        </p>
      </div>
    </StackPageShell>
  );
}

export function renderRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "your-communities":
      return <YourCommunitiesPage />;
    case "verify":
      return <VerifyPageRoute />;
    case "community":
      return <LiveCommunityPage communityId={route.communityId} />;
    case "community-settings":
      return <LiveCommunitySettingsPage communityId={route.communityId} />;
    case "community-moderation":
      return <LiveCommunityModerationPage communityId={route.communityId} />;
    case "community-moderation-case":
      return (
        <LiveCommunityModerationCasePage
          communityId={route.communityId}
          moderationCaseId={route.moderationCaseId}
        />
      );
    case "create-post":
      return <LiveCreatePostPage />;
    case "create-community":
      return <CreateCommunityPage />;
    case "post":
      return <LivePostPage postId={route.postId} />;
    case "inbox":
      return <InboxPage />;
    case "me":
      return <CurrentUserProfilePage />;
    case "user":
      return <LiveUserProfilePage userId={route.userId} />;
    case "onboarding":
      return <OnboardingPage />;
    case "auth":
      return <AuthPage />;
    case "auth-device":
      return <AuthDevicePageRoute />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
  }
}
