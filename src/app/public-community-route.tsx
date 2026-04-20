"use client";

import * as React from "react";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { toCommunityFeedItem } from "@/app/authenticated-route-renderer";
import { navigate } from "@/app/router";
import { loadProfilesByUserId } from "@/app/authenticated-routes/community-data";
import { useCommunityFeedPosts } from "@/app/authenticated-routes/community-feed-data";
import { clearPendingSelfJoinSession, readPendingSelfJoinSession, writePendingSelfJoinSession } from "@/app/authenticated-routes/community-session-helpers";
import { submitOptimisticPostVote, updateCommunityPostVote } from "@/app/authenticated-routes/post-vote";
import { type FeedSort } from "@/components/compositions/feed/feed";
import { CommunityPageShell } from "@/components/compositions/community-page-shell/community-page-shell";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { isApiNotFoundError, type ApiError } from "@/lib/api/client";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { getSelfVerificationCapabilities, getVerificationCapabilitiesForProvider, getVerificationPromptCopy, resolveSuggestedVerificationProvider } from "@/lib/identity-gates";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { getSelfVerificationLaunchHref, parseSelfCallback } from "@/lib/self-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { buildCommunitySidebarRequirements } from "./authenticated-routes/community-sidebar-helpers";
import { useCommunityInteractionGate } from "./authenticated-routes/community-interaction-gate";
import { buildFeedSortOptions } from "./authenticated-routes/route-core";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

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
    posts,
    preview,
    setPosts,
  };
}

function buildPreviewSidebar(preview: ApiCommunityPreview, locale: string) {
  const charityHref = preview.donation_partner?.provider_partner_ref
    ? `https://app.endaoment.org/orgs/${preview.donation_partner.provider_partner_ref}`
    : undefined;

  return {
    avatarSrc: preview.avatar_ref ?? undefined,
    charity: preview.donation_policy_mode !== "none" && preview.donation_partner
      ? {
        avatarSrc: preview.donation_partner.image_url ?? undefined,
        href: charityHref,
        name: preview.donation_partner.display_name,
      }
      : null,
    createdAt: preview.created_at,
    description: resolveCommunityLocalizedText(preview, "community.description", preview.description),
    displayName: preview.display_name,
    memberCount: preview.member_count ?? undefined,
    membershipMode: preview.membership_mode,
    requirements: buildCommunitySidebarRequirements({
      gateSummaries: preview.membership_gate_summaries,
      locale,
    }),
    rules: (preview.rules ?? []).map((rule) => ({
      ruleId: rule.rule_id,
      title: resolveCommunityLocalizedText(preview, `community.rule.${rule.rule_id}.title`, rule.title),
      body: resolveCommunityLocalizedText(preview, `community.rule.${rule.rule_id}.body`, rule.body),
      position: rule.position,
      status: rule.status,
    })),
  };
}

function PublicCommunityNotFound({ communityId }: { communityId: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.notFoundTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          {copy.notFoundDescription.replace("{communityId}", communityId)}
        </p>
      </div>
    </div>
  );
}

function PublicCommunityErrorState({ description }: { description: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").publicCommunity;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-[var(--radius-3xl)] border border-border-soft bg-card px-6 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.errorTitle}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
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
  const { authorProfiles, error, loading, posts, preview, setPosts } = usePublicCommunityPageData(communityId, contentLocale, activeSort);
  const { gateModal, invalidateCommunityGate, runGatedCommunityAction } = useCommunityInteractionGate({
    previewLocale: contentLocale,
    routeKind: "public-community",
    uiLocale: locale,
  });
  const voteRequestIdsRef = React.useRef<Record<string, number>>({});
  const [selfSession, setSelfSession] = React.useState<Awaited<ReturnType<typeof api.verification.startSession>> | null>(null);
  const [selfRequestedCapabilities, setSelfRequestedCapabilities] = React.useState<ApiJoinEligibility["missing_capabilities"]>([]);
  const [selfLoading, setSelfLoading] = React.useState(false);
  const [selfError, setSelfError] = React.useState<string | null>(null);
  const [selfModalOpen, setSelfModalOpen] = React.useState(false);
  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: () => {
      invalidateCommunityGate(communityId);
      toast.success("Verification completed. Try the action again.");
    },
  });

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  const startSelfVerification = React.useCallback(async ({
    eligibility,
    source,
  }: {
    eligibility: Pick<ApiJoinEligibility, "missing_capabilities">;
    source: "vote_modal";
  }) => {
    const requestedCapabilities = getVerificationCapabilitiesForProvider(eligibility, "self");
    if (requestedCapabilities.length === 0) {
      const message = "This community is missing the Self verification details needed to continue.";
      setSelfError(message);
      console.warn("[public-community] self verification unavailable", {
        communityId,
        missingCapabilities: eligibility.missing_capabilities,
        source,
      });
      toast.error(message);
      return { started: false };
    }

    setSelfLoading(true);
    setSelfError(null);
    try {
      const result = await api.verification.startSession({
        provider: "self",
        requested_capabilities: requestedCapabilities,
        verification_intent: "community_join",
      });
      setSelfRequestedCapabilities(requestedCapabilities);
      setSelfSession(result);
      setSelfModalOpen(true);
      writePendingSelfJoinSession({
        communityId,
        requestedCapabilities,
        verificationSessionId: result.verification_session_id,
      });

      console.info("[public-community] self session started", {
        communityId,
        requestedCapabilities,
        source,
        verificationSessionId: result.verification_session_id,
      });
      return { started: true };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message = apiError?.message ?? "Could not start self verification";
      setSelfError(message);
      console.warn("[public-community] self session failed", {
        communityId,
        message,
        source,
      });
      toast.error(message);
      return { started: false };
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("proof") && !url.searchParams.has("error") && url.searchParams.get("expired") !== "true") {
        return;
      }

      const pendingSession = readPendingSelfJoinSession(communityId);
      if (!pendingSession || pendingSession.communityId !== communityId) {
        console.warn("[public-community] self callback missing pending session", { communityId });
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        setSelfError("Verification session was lost. Start the ID check again.");
        toast.error("Verification session was lost. Start the ID check again.");
        clearPendingSelfJoinSession(communityId);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      setSelfRequestedCapabilities(pendingSession.requestedCapabilities);
      const result = parseSelfCallback(url);
      if (result.status === "completed") {
        console.info("[public-community] self callback received proof", {
          communityId,
          verificationSessionId: pendingSession.verificationSessionId,
        });
        setSelfLoading(true);
        void api.verification.completeSession(pendingSession.verificationSessionId, { proof: result.proof })
          .then(() => {
            console.info("[public-community] self verification completed", {
              communityId,
              verificationSessionId: pendingSession.verificationSessionId,
            });
            setSelfSession(null);
            setSelfRequestedCapabilities([]);
            setSelfModalOpen(false);
            setSelfError(null);
            clearPendingSelfJoinSession(communityId);
            invalidateCommunityGate(communityId);
            toast.success("Verification completed. Try the action again.");
          })
          .catch((error: unknown) => {
            const apiError = error as ApiError;
            setSelfError(apiError?.message ?? "Verification completion failed");
            console.warn("[public-community] self verification completion failed", {
              communityId,
              message: apiError?.message ?? String(error),
              verificationSessionId: pendingSession.verificationSessionId,
            });
            toast.error(apiError?.message ?? "Verification completion failed");
          })
          .finally(() => {
            setSelfLoading(false);
            window.history.replaceState({}, "", window.location.pathname);
          });
        return;
      }

      setSelfSession(null);
      setSelfRequestedCapabilities([]);
      setSelfModalOpen(false);
      setSelfError(result.status === "expired" ? "Verification session expired. Please try again." : result.reason);
      console.warn("[public-community] self callback did not complete", {
        communityId,
        reason: result.status === "failed" ? result.reason : "expired",
        verificationSessionId: pendingSession.verificationSessionId,
      });
      clearPendingSelfJoinSession(communityId);
      toast.error(result.status === "expired" ? "Verification session expired. Please try again." : result.reason);
      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();
    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [api, communityId, invalidateCommunityGate]);

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
    return {
      description: action === "vote_post" || action === "vote_comment"
        ? copy.interactionGate.verifyToVoteDescription
        : copy.interactionGate.verifyToReplyDescription,
      primaryAction: {
        label: copy.createCommunity.startVerification,
        loading: provider === "very" ? veryLoading : selfLoading,
        onClick: async () => {
          if (provider === "very") {
            const result = await startVeryVerification();
            if (result.started) {
              closeModal();
            }
          } else {
            const result = await startSelfVerification({
              eligibility: gate.eligibility,
              source: "vote_modal",
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
      title: action === "vote_post" || action === "vote_comment"
        ? copy.interactionGate.verifyToVoteTitle
        : copy.interactionGate.verifyToReplyTitle,
    };
  }, [copy.createCommunity.startVerification, copy.interactionGate, selfLoading, startSelfVerification, startVeryVerification, veryLoading]);

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

  if (loading) {
    return null;
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

  const selfPrompt = selfSession ? {
    ...getVerificationPromptCopy("self", selfRequestedCapabilities, { locale }),
    href: getSelfVerificationLaunchHref(selfSession.launch?.self_app),
    qrValue: getSelfVerificationLaunchHref(selfSession.launch?.self_app),
  } : null;

  return (
    <>
      {gateModal}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          loading={selfLoading}
          onOpenChange={(open) => {
            setSelfModalOpen(open);
            if (!open) {
              setSelfSession(null);
              setSelfRequestedCapabilities([]);
              setSelfError(null);
              clearPendingSelfJoinSession(communityId);
            }
          }}
          open={selfModalOpen}
          qrValue={selfPrompt.qrValue}
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
        onSortChange={setActiveSort}
        routeLabel={`c/${communityId}`}
        sidebar={buildPreviewSidebar(preview, locale)}
        title={preview.display_name}
        />
      </section>
    </>
  );
}
