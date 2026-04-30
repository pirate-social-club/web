"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { navigate } from "@/app/router";
import { loadProfilesByUserId } from "@/app/authenticated-data/community-data";
import { useCommunityFeedPosts } from "@/app/authenticated-data/community-feed-data";
import { submitOptimisticPostVote, updateCommunityPostVote } from "@/app/authenticated-helpers/post-vote";
import { type FeedSort } from "@/components/compositions/posts/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/error-utils";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { formatCommunityRouteLabel } from "@/lib/community-routing";
import { replaceWithCanonicalCommunityRoute } from "@/app/community-route-canonicalization";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { getJoinCtaLabel, getVerificationCapabilitiesForProvider, getVerificationRequirementsForGates, isJoinCtaActionable } from "@/lib/identity-gates";
import { createCommunityBlockedModalStateFactory } from "@/hooks/use-community-interaction-gate.helpers";
import { forgetKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { PublicRouteMessageState } from "./public-route-states";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { buildCommunityPreviewSidebar } from "@/lib/community-sidebar-helpers";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import { CommunityRouteLoadingState } from "./route-loading-states";
import { useCommunityJoinVerification } from "./authenticated-state/use-community-join-verification";

function usePublicCommunityPageData(communityId: string, localeTag: string, activeSort: FeedSort, hasSession: boolean) {
  const api = useApi();
  const [preview, setPreview] = React.useState<ApiCommunityPreview | null>(null);
  const [authorProfiles, setAuthorProfiles] = React.useState<Record<string, ApiProfile | null>>({});
  const [previewError, setPreviewError] = React.useState<unknown>(null);
  const [previewLoading, setPreviewLoading] = React.useState(true);

  React.useEffect(() => {
    setPreview(null);
    setAuthorProfiles({});
    setPreviewError(null);
    setPreviewLoading(true);
  }, [communityId, localeTag]);

  const loadPosts = React.useCallback(async ({ communityId: nextCommunityId, locale, sort }: {
    communityId: string;
    locale: string;
    sort: FeedSort;
  }) => api.publicCommunities.listPosts(nextCommunityId, {
    limit: "100",
    locale,
    sort,
  }), [api]);

  const {
    error: postsError,
    loading: postsLoading,
    posts,
    setPosts,
  } = useCommunityFeedPosts({
    communityId,
    locale: localeTag,
    sort: activeSort,
    loadPosts,
  });

  React.useEffect(() => {
    let cancelled = false;
    setPreviewError(null);
    setPreviewLoading(true);

    logger.debug("[community-follow] loading preview", {
      communityId,
      hasSession,
      source: hasSession ? "authenticated" : "public",
    });

    const previewRequest = hasSession
      ? api.communities.preview(communityId, { locale: localeTag })
      : api.publicCommunities.get(communityId, { locale: localeTag });

    void previewRequest
      .then((previewResult) => {
        if (cancelled) return;
        logger.debug("[community-follow] preview loaded", {
          communityId: previewResult.id,
          followerCount: previewResult.follower_count,
          viewerFollowing: previewResult.viewer_following,
          viewerMembershipStatus: previewResult.viewer_membership_status,
        });
        setPreview(previewResult);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        logger.warn("[community-follow] preview load failed", {
          communityId,
          hasSession,
          error: nextError,
        });
        setPreviewError(nextError);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityId, hasSession, localeTag]);

  React.useEffect(() => {
    let cancelled = false;

    const authorUserIds = posts
      .map((item) => item.post.identity_mode === "public" ? item.post.author_user : null)
      .filter((userId): userId is string => Boolean(userId));

    if (authorUserIds.length === 0) {
      setAuthorProfiles({});
      return () => {
        cancelled = true;
      };
    }

    void loadProfilesByUserId(api, authorUserIds)
      .then((nextProfiles) => {
        if (cancelled) return;
        setAuthorProfiles(nextProfiles);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthorProfiles({});
      });

    return () => {
      cancelled = true;
    };
  }, [api, posts]);

  return {
    authorProfiles,
    error: previewError ?? postsError,
    loading: previewLoading || postsLoading,
    postsLoading,
    posts,
    preview,
    previewLoading,
    setPosts,
  };
}

function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <PublicRouteMessageState
      description={copy.notFoundDescription.replace("{communityId}", communityId)}
      title={copy.notFoundTitle}
    />
  );
}

function PublicCommunityErrorState({ description }: { description: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return <PublicRouteMessageState description={description} title={copy.errorTitle} />;
}

const FOLLOW_BUTTON_CLASS_NAME = "min-w-32";

export function resolvePublicCommunityJoinActionLabel(
  eligibility: ApiJoinEligibility | null,
  locale: string,
): string {
  return getJoinCtaLabel(eligibility ?? ({ status: "joinable" } as ApiJoinEligibility), { locale });
}

export function PublicCommunityRoutePage({ communityId }: { communityId: string }) {
  const api = useApi();
  const session = useSession();
  const authRuntime = usePiratePrivyRuntime();
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes"), [locale]);
  const sortOptions = React.useMemo(() => buildFeedSortOptions(copy.common), [copy.common]);
  const contentLocale = React.useMemo(() => resolveViewerContentLocale({
    uiLocale: locale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [locale]);
  const [activeSort, setActiveSort] = React.useState<FeedSort>("best");
  const hasSession = Boolean(session?.accessToken);
  const { authorProfiles, error, posts, postsLoading, preview, previewLoading, setPosts } = usePublicCommunityPageData(communityId, contentLocale, activeSort, hasSession);
  const [eligibility, setEligibility] = React.useState<ApiJoinEligibility | null>(null);
  const [followLoading, setFollowLoading] = React.useState(false);
  const [viewerFollowing, setViewerFollowing] = React.useState(false);
  const [followerCount, setFollowerCount] = React.useState<number | null>(null);
  const [memberCount, setMemberCount] = React.useState<number | null>(null);
  const [joinRequestModalOpen, setJoinRequestModalOpen] = React.useState(false);
  const [joinRequestSubmitting, setJoinRequestSubmitting] = React.useState(false);
  const [joinRequestError, setJoinRequestError] = React.useState<string | null>(null);
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "public-community",
    uiLocale: locale,
  });
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: () => {
      invalidateCommunityGate(communityId);
      toast.success(copy.publicCommunity.verificationCompleted);
    },
  });
  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerificationFlow,
  } = useSelfVerification({
    completeErrorMessage: copy.publicCommunity.verificationCompletionFailed,
    locale,
    onVerified: () => {
      invalidateCommunityGate(communityId);
      toast.success(copy.publicCommunity.verificationCompleted);
    },
    startErrorMessage: copy.publicCommunity.verificationStartFailed,
    storageKey: `pirate_pending_self_join_session:${communityId}`,
    verificationIntent: "community_join",
  });

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  React.useEffect(() => {
    if (isApiNotFoundError(error)) {
      forgetKnownCommunity(communityId);
    }
  }, [communityId, error]);

  React.useEffect(() => {
    if (!preview?.id) return;
    replaceWithCanonicalCommunityRoute(preview.id, preview.route_slug);
  }, [preview?.id, preview?.route_slug]);

  React.useEffect(() => {
    setViewerFollowing(Boolean(preview?.viewer_following));
    setFollowerCount(preview?.follower_count ?? null);
    setMemberCount(preview?.member_count ?? null);
  }, [preview?.id, preview?.follower_count, preview?.member_count, preview?.viewer_following]);

  const refetchEligibility = React.useCallback(async () => {
    const nextEligibility = await api.communities.getJoinEligibility(preview?.id ?? communityId);
    setEligibility(nextEligibility);
    return nextEligibility;
  }, [api.communities, communityId, preview?.id]);

  React.useEffect(() => {
    if (!session || !preview?.id) {
      setEligibility(null);
      return;
    }

    let cancelled = false;
    void api.communities.getJoinEligibility(preview.id)
      .then((nextEligibility) => {
        if (!cancelled) setEligibility(nextEligibility);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) toast.error(getErrorMessage(nextError, "Could not load community membership."));
      });
    return () => { cancelled = true; };
  }, [api.communities, preview?.id, session]);

  const markViewerJoined = React.useCallback(() => {
    setViewerFollowing((current) => {
      if (!current) {
        setFollowerCount((count) => typeof count === "number" ? count + 1 : count);
      }
      return true;
    });
    setMemberCount((count) => typeof count === "number" ? count + 1 : count);
  }, []);

  const requestAuth = React.useCallback((fallbackMessage: string) => {
    if (authRuntime.connect) {
      authRuntime.connect();
      return;
    }

    toast.error(authRuntime.loadError ?? fallbackMessage);
  }, [authRuntime.connect, authRuntime.loadError]);

  const {
    handleJoin,
    handleSelfModalOpenChange: handleJoinSelfModalOpenChange,
    handleSelfQrError: handleJoinSelfQrError,
    handleSelfQrSuccess: handleJoinSelfQrSuccess,
	    joinError,
	    joinLoading,
	    passportLoading,
	    selfError: joinSelfError,
    selfLoading: joinSelfLoading,
    selfModalOpen: joinSelfModalOpen,
    selfPrompt: joinSelfPrompt,
    veryLoading: joinVeryLoading,
  } = useCommunityJoinVerification({
    communityId: preview?.id ?? communityId,
    eligibility,
    locale,
    onJoined: markViewerJoined,
    refetchEligibility,
  });

  React.useEffect(() => {
    if (joinError) toast.error(joinError);
  }, [joinError]);

  const interactionCopy = React.useMemo(
    () => ({
      ...copy.interactionGate,
      locale,
      taskVerify: copy.createCommunity.startVerification,
    }),
    [copy, locale],
  );

  const buildBlockedModalState = React.useMemo(
    () =>
      createCommunityBlockedModalStateFactory({
        interactionCopy,
        veryLoading,
        selfLoading,
        onStartVeryVerification: startVeryVerification,
        onStartSelfVerification: async (gate) => {
          const requestedCapabilities = getVerificationCapabilitiesForProvider(
            gate.eligibility,
            "self",
          );
          const verificationRequirements = getVerificationRequirementsForGates(
            gate.eligibility.membership_gate_summaries,
          );
          if (
            requestedCapabilities.length === 0 &&
            verificationRequirements.length === 0
          ) {
            const message = copy.publicCommunity.verificationMissingSelf;
            toast.error(message);
            return { started: false };
          }

          const result = await startSelfVerificationFlow({
            requestedCapabilities,
            unavailableMessage: copy.publicCommunity.verificationMissingSelf,
            verificationRequirements,
            skipModal: true,
          });
          if (!result.started && result.error) {
            toast.error(result.error);
          }
          return {
            started: result.started,
            openedModal: result.openedModal,
            href: result.href,
          };
        },
        invalidateCommunityGate,
        includeVerificationCloseAction: true,
      }),
    [
      interactionCopy,
      veryLoading,
      selfLoading,
      startVeryVerification,
      startSelfVerificationFlow,
      copy.publicCommunity.verificationMissingSelf,
      invalidateCommunityGate,
    ],
  );

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    const previousPost = posts.find((candidate) => candidate.post.id === postId);
    if (!previousPost) return;
    await runGatedCommunityAction({
      action: "vote_post",
      buildBlockedModalState: buildBlockedModalState ?? undefined,
      communityId: previousPost.post.community,
      onAllowed: async () => {
        await submitOptimisticPostVote({
          direction,
          onApply: (nextValue) => setPosts((current) => updateCommunityPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setPosts((current) => current.map((post) => post.post.id === postId ? restoredPost : post)),
          postId,
          previousPost,
          requestIdsRef: voteRequestIdsRef,
          vote: api.posts.vote,
        });
      },
      postId,
    });
  }, [api.posts.vote, buildBlockedModalState, posts, runGatedCommunityAction, setPosts]);

  if (previewLoading && !preview) {
    return <CommunityRouteLoadingState />;
  }

  if (error) {
    if (isApiNotFoundError(error)) {
      return <PublicCommunityNotFound communityId={communityId} />;
    }

    return (
      <PublicCommunityErrorState
        description={getErrorMessage(error, copy.publicCommunity.errorDescription)}
      />
    );
  }

  if (!preview) {
    return <PublicCommunityNotFound communityId={communityId} />;
  }

  const handleToggleFollow = async () => {
    if (followLoading) {
      return;
    }

    if (!session) {
      logger.info("[community-follow] blocked follow without session", {
        communityId: preview.id,
      });
      requestAuth("Connect your wallet to follow communities.");
      return;
    }

    setFollowLoading(true);
    const previousFollowing = viewerFollowing;
    const nextFollowing = !viewerFollowing;
    logger.info("[community-follow] submit", {
      communityId: preview.id,
      previousFollowing,
      nextFollowing,
      followerCount,
    });
    setViewerFollowing(nextFollowing);
    setFollowerCount((count) => {
      if (typeof count !== "number") return count;
      return Math.max(0, count + (nextFollowing ? 1 : -1));
    });

    try {
      const result = nextFollowing
        ? await api.communities.follow(preview.id)
        : await api.communities.unfollow(preview.id);
      logger.info("[community-follow] saved", {
        communityId: preview.id,
        following: result.following,
        followerCount: result.follower_count,
      });
      setViewerFollowing(result.following);
      setFollowerCount(result.follower_count ?? null);
    } catch (nextError: unknown) {
      logger.warn("[community-follow] failed", {
        communityId: preview.id,
        attemptedFollowing: nextFollowing,
        error: nextError,
      });
      setViewerFollowing(previousFollowing);
      setFollowerCount(preview.follower_count ?? null);
      toast.error(getErrorMessage(nextError, "Follow failed"));
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePrimaryJoinAction = async () => {
    if (!session) {
      requestAuth("Connect your wallet to join communities.");
      return;
    }
    if (eligibility?.status === "requestable") {
      setJoinRequestError(null);
      setJoinRequestModalOpen(true);
      return;
    }
    await handleJoin();
  };

  const handleJoinRequestSubmit = async (note: string) => {
    setJoinRequestSubmitting(true);
    setJoinRequestError(null);
    try {
      const result = await handleJoin({ note });
      if (result === "requested" || result === "joined") {
        setJoinRequestModalOpen(false);
      } else if (result === "failed") {
        setJoinRequestError("Could not submit your request. Try again.");
      }
    } finally {
      setJoinRequestSubmitting(false);
    }
  };

  const joinActionLabel = resolvePublicCommunityJoinActionLabel(eligibility, locale);
  const joinActionDisabled = Boolean(session) && (
    !eligibility
      || !isJoinCtaActionable(eligibility)
  );
  const routeLabel = formatCommunityRouteLabel(
    preview.id,
    preview.route_slug ?? communityId,
  );

  const headerAction = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Button
        className={FOLLOW_BUTTON_CLASS_NAME}
        loading={followLoading || (!session && authRuntime.busy)}
        onClick={() => void handleToggleFollow()}
        variant={viewerFollowing ? "secondary" : "default"}
      >
        {viewerFollowing ? copy.community.followingLabel : copy.community.followLabel}
      </Button>
      <Button
        disabled={joinActionDisabled}
        loading={joinLoading || joinVeryLoading || joinSelfLoading || passportLoading || (!session && authRuntime.busy)}
        onClick={() => void handlePrimaryJoinAction()}
        variant="secondary"
      >
        {joinActionLabel}
      </Button>
    </div>
  );

  return (
    <>
      {gateModal}
      <CommunityJoinRequestModal
        communityName={preview.display_name}
        error={joinRequestError}
        onOpenChange={setJoinRequestModalOpen}
        onSubmit={handleJoinRequestSubmit}
        open={joinRequestModalOpen}
        submitting={joinRequestSubmitting || joinLoading}
      />
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          onOpenChange={handleSelfModalOpenChange}
          onQrError={handleSelfQrError}
          onQrSuccess={handleSelfQrSuccess}
          open={selfModalOpen}
          selfApp={selfPrompt.selfApp}
          title={selfPrompt.title}
        />
      ) : null}
      {joinSelfPrompt ? (
        <SelfVerificationModal
          actionLabel={joinSelfPrompt.actionLabel}
          description={joinSelfPrompt.description}
          error={joinSelfError}
          href={joinSelfPrompt.href}
          onOpenChange={handleJoinSelfModalOpenChange}
          onQrError={handleJoinSelfQrError}
          onQrSuccess={handleJoinSelfQrSuccess}
          open={joinSelfModalOpen}
          selfApp={joinSelfPrompt.selfApp}
          title={joinSelfPrompt.title}
        />
      ) : null}
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={preview.avatar_ref ?? undefined}
        availableSorts={sortOptions}
        bannerSrc={preview.banner_ref ?? undefined}
        communityId={preview.id}
        emptyState={{
          title: copy.publicCommunity.emptyPosts,
          body: "Be the first to share something in this community.",
          illustration: (
            <div className="relative size-32 overflow-hidden rounded-full md:size-40">
              <picture>
                <source srcSet="/mascots/celebrate-ghost-512.webp 2x, /mascots/celebrate-ghost-256.webp 1x" type="image/webp" />
                <img alt="Celebrating pirate ghost" className="size-full object-cover" draggable={false} src="/mascots/celebrate-ghost-256.png" />
              </picture>
            </div>
          ),
        }}
        headerAction={headerAction}
        items={posts.map((post) => toCommunityFeedItem(post, authorProfiles, undefined, {
          onComment: () => navigate(`/p/${post.post.id}`),
          onVote: (direction) => void voteOnPost(post.post.id, direction),
        }))}
        loading={postsLoading}
        onSortChange={setActiveSort}
        routeLabel={routeLabel}
        sidebar={{
          ...buildCommunityPreviewSidebar(preview, locale),
          followerCount,
          memberCount,
        }}
        title={preview.display_name}
        />
      </section>
    </>
  );
}
