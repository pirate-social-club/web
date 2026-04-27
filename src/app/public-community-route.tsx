"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { navigate } from "@/app/router";
import { loadProfilesByUserId } from "@/app/authenticated-routes/community-data";
import { useCommunityFeedPosts } from "@/app/authenticated-routes/community-feed-data";
import { submitOptimisticPostVote, updateCommunityPostVote } from "@/app/authenticated-routes/post-vote";
import { type FeedSort } from "@/components/compositions/posts/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community/page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { isApiNotFoundError } from "@/lib/api/client";
import { formatCommunityRouteLabel } from "@/lib/community-routing";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { getErrorMessage } from "@/lib/error-utils";
import { getPassportPromptCapabilities, getVerificationCapabilitiesForProvider, getVerificationPromptCopy, getVerificationRequirementsForGates, resolveSuggestedVerificationProvider } from "@/lib/identity-gates";
import { forgetKnownCommunity } from "@/lib/known-communities-store";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { PublicRouteMessageState } from "./public-route-states";
import { useCommunityInteractionGate } from "@/hooks/use-community-interaction-gate";
import { buildCommunityPreviewSidebar } from "@/lib/community-sidebar-helpers";
import { buildFeedSortOptions } from "@/lib/feed-sort-options";
import { CommunityRouteLoadingState } from "./route-loading-states";

function usePublicCommunityPageData(communityId: string, localeTag: string, activeSort: FeedSort) {
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

    void api.publicCommunities.get(communityId, { locale: localeTag })
      .then((previewResult) => {
        if (cancelled) return;
        setPreview(previewResult);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setPreviewError(nextError);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityId, localeTag]);

  React.useEffect(() => {
    let cancelled = false;

    const authorUserIds = posts
      .map((item) => item.post.identity_mode === "public" ? item.post.author_user_id : null)
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

export function PublicCommunityRoutePage({ communityId }: { communityId: string }) {
  const api = useApi();
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
  const { authorProfiles, error, posts, postsLoading, preview, previewLoading, setPosts } = usePublicCommunityPageData(communityId, contentLocale, activeSort);
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

  const startSelfVerification = React.useCallback(async ({
    eligibility,
  }: {
    eligibility: Pick<ApiJoinEligibility, "membership_gate_summaries" | "missing_capabilities">;
  }) => {
    const requestedCapabilities = getVerificationCapabilitiesForProvider(eligibility, "self");
    const verificationRequirements = getVerificationRequirementsForGates(eligibility.membership_gate_summaries);
    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
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
    if (result.started && result.href) {
      window.location.href = result.href;
    }
    return result;
  }, [copy.publicCommunity.verificationMissingSelf, startSelfVerificationFlow]);

  const buildBlockedModalState = React.useCallback(({ action, closeModal, gate }: {
    action: "reply_comment" | "reply_post" | "vote_comment" | "vote_post";
    closeModal: () => void;
    gate: {
      eligibility: ApiJoinEligibility;
      preview: {
        community_id: string;
        display_name: string;
        membership_gate_summaries: ApiCommunityPreview["membership_gate_summaries"];
      };
    };
  }) => {
    if (gate.eligibility.status !== "verification_required") {
      return null;
    }

    const provider = resolveSuggestedVerificationProvider(gate.eligibility);
    const verificationPrompt = getVerificationPromptCopy(
      provider,
      provider === "passport"
        ? getPassportPromptCapabilities(gate.eligibility)
        : getVerificationCapabilitiesForProvider(gate.eligibility, provider),
      { locale },
    );
    return {
      description: verificationPrompt.description,
      icon: provider === "passport" ? null : provider,
      primaryAction: provider === "passport"
        ? {
            href: "https://app.passport.xyz/",
            label: verificationPrompt.actionLabel || copy.createCommunity.startVerification,
            onClick: closeModal,
            rel: "noopener noreferrer",
            target: "_blank",
          }
        : {
            label: verificationPrompt.actionLabel || copy.createCommunity.startVerification,
            loading: provider === "very" ? veryLoading : provider === "self" ? selfLoading : false,
            onClick: async () => {
              if (provider === "very") {
                const result = await startVeryVerification();
                if (result.started) {
                  closeModal();
                }
              } else {
                const result = await startSelfVerification({
                  eligibility: gate.eligibility,
                });
                if (result.started) {
                  closeModal();
                }
              }
            },
          },
      requirements: gate.preview.membership_gate_summaries,
      secondaryAction: {
        label: copy.interactionGate.close,
        onClick: closeModal,
      },
      title: provider === "passport"
        ? verificationPrompt.title
        : action === "vote_post" || action === "vote_comment"
          ? copy.interactionGate.verifyToVoteTitle
          : copy.interactionGate.verifyToReplyTitle,
    };
  }, [copy.createCommunity.startVerification, copy.interactionGate, locale, selfLoading, startSelfVerification, startVeryVerification, veryLoading]);

  const voteOnPost = React.useCallback(async (postId: string, direction: "up" | "down" | null) => {
    const previousPost = posts.find((candidate) => candidate.post.post_id === postId);
    if (!previousPost) return;
    await runGatedCommunityAction({
      action: "vote_post",
      buildBlockedModalState: buildBlockedModalState ?? undefined,
      communityId: previousPost.post.community_id,
      onAllowed: async () => {
        await submitOptimisticPostVote({
          direction,
          onApply: (nextValue) => setPosts((current) => updateCommunityPostVote(current, postId, nextValue)),
          onRollback: (restoredPost) => setPosts((current) => current.map((post) => post.post.post_id === postId ? restoredPost : post)),
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

  return (
    <>
      {gateModal}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          onOpenChange={handleSelfModalOpenChange}
          open={selfModalOpen}
          title={selfPrompt.title}
        />
      ) : null}
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <CommunityPageShell
        activeSort={activeSort}
        avatarSrc={preview.avatar_ref ?? undefined}
        availableSorts={sortOptions}
        bannerSrc={preview.banner_ref ?? undefined}
        communityId={preview.community_id}
        emptyState={{
          title: copy.publicCommunity.emptyPosts,
        }}
        items={posts.map((post) => toCommunityFeedItem(post, authorProfiles, undefined, {
          onComment: () => navigate(`/p/${post.post.post_id}`),
          onVote: (direction) => void voteOnPost(post.post.post_id, direction),
        }))}
        loading={postsLoading}
        onSortChange={setActiveSort}
        routeLabel={formatCommunityRouteLabel(preview.community_id, communityId)}
        sidebar={buildCommunityPreviewSidebar(preview, locale)}
        title={preview.display_name}
        />
      </section>
    </>
  );
}
