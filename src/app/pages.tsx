"use client";

import * as React from "react";

import { AppRoute, navigate } from "@/app/router";
import { useApi, useSessionRevalidation } from "@/lib/api";
import {
  setSession,
  updateSessionOnboarding,
  useSession,
} from "@/lib/api/session-store";
import type { OnboardingStatus } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { RedditVerification as ApiRedditVerification } from "@pirate/api-contracts";
import type { RedditImportSummary as ApiRedditImportSummary } from "@pirate/api-contracts";
import type { NamespaceVerificationSession as ApiNamespaceSession } from "@pirate/api-contracts";
import type { ApiError } from "@/lib/api/client";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import type { OnboardingPhase } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type {
  ImportJobState,
  RedditVerificationState,
  SnapshotState,
} from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { VerifyNamespaceModal } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import type { GateType } from "@/components/compositions/create-community-composer/create-community-composer.types";

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

function StackPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyFeedState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
      <p className="text-base leading-7 text-muted-foreground">{message}</p>
    </div>
  );
}

function HomePage() {
  const { copy } = useRouteMessages();

  return (
    <EmptyFeedState message={copy.home.railTitle} />
  );
}

function YourCommunitiesPage() {
  const { copy } = useRouteMessages();

  return (
    <EmptyFeedState message={copy.yourCommunities.railTitle} />
  );
}

function useCommunity(communityId: string) {
  const api = useApi();
  const [community, setCommunity] = React.useState<ApiCommunity | null>(null);
  const [posts, setPosts] = React.useState<ApiPost[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      api.communities.get(communityId),
      api.communities.listPosts(communityId),
    ])
      .then(([c, p]) => {
        if (cancelled) return;
        setCommunity(c);
        setPosts(p.items ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load community");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, communityId]);

  return { community, posts, error, loading };
}

function CommunityPage({ communityId }: { communityId: string }) {
  const { copy } = useRouteMessages();
  const { community, posts, error, loading } = useCommunity(communityId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !community) {
    return <NotFoundPage path={`/c/${communityId}`} />;
  }

  return (
    <StackPageShell title={community.display_name} description={community.description ?? undefined}>
      <CommunitySidebar
        createdAt={community.created_at}
        description={community.description ?? ""}
        displayName={community.display_name}
        membershipMode={community.membership_mode === "request" ? "open" : community.membership_mode}
        memberCount={community.member_count ?? 0}
      />
    </StackPageShell>
  );
}

function usePost(postId: string) {
  const api = useApi();
  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.posts.get(postId)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load post");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, postId]);

  return { post, error, loading };
}

function PostPage({ postId }: { postId: string }) {
  const { copy } = useRouteMessages();
  const { post, error, loading } = usePost(postId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !post) {
    return <NotFoundPage path={`/p/${postId}`} />;
  }

  return (
    <StackPageShell
      title={post.post.title ?? copy.post.fallbackTitle}
    >
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5">
        {post.post.body ? (
          <p className="text-base leading-7 text-foreground">{post.post.body}</p>
        ) : null}
      </div>
    </StackPageShell>
  );
}

function useProfile(userId: string) {
  const api = useApi();
  const [profile, setProfile] = React.useState<ApiProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.profiles.getByUserId(userId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, userId]);

  return { profile, error, loading };
}

function apiProfileToProps(
  profile: ApiProfile,
  ownProfile: boolean,
  joinedStatLabel: string,
) {
  const handle = profile.global_handle
    ? `${profile.global_handle.label}.pirate`
    : "";

  return {
    profile: {
      displayName: profile.display_name ?? handle,
      handle,
      bio: profile.bio ?? "",
      avatarSrc: profile.avatar_ref ?? undefined,
      bannerSrc: undefined,
      meta: [],
      viewerContext: ownProfile ? ("self" as const) : ("public" as const),
      viewerFollows: false,
      canMessage: !ownProfile,
    },
    rightRail: {
      stats: [
        { label: joinedStatLabel, value: new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ],
    },
    overviewItems: [],
    posts: [],
    comments: [],
    scrobbles: [],
  };
}

function CurrentUserProfilePage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;

  if (!profile) {
    return (
      <StackPageShell title={copy.common.joinedStatLabel}>
        <EmptyFeedState message="Sign in to view your profile." />
      </StackPageShell>
    );
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, copy.common.joinedStatLabel)}
    />
  );
}

function UserProfilePage({ userId }: { userId: string }) {
  const { copy } = useRouteMessages();
  const { profile, loading } = useProfile(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!profile) {
    return <NotFoundPage path={`/u/${userId}`} />;
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, false, copy.common.joinedStatLabel)}
    />
  );
}

function resolveOnboardingPhase(status: OnboardingStatus): OnboardingPhase {
  if (status.reddit_verification_status !== "verified") {
    return "import_karma";
  }
  if (status.reddit_import_status !== "succeeded") {
    return "import_karma";
  }
  if (status.cleanup_rename_available) {
    return "choose_name";
  }
  return "suggested_communities";
}

function mapRedditVerification(
  apiResult: ApiRedditVerification,
  usernameValue: string,
): RedditVerificationState {
  const stateMap: Record<string, RedditVerificationState["verificationState"]> = {
    pending: "code_ready",
    verified: "verified",
    failed: "failed",
    expired: "failed",
  };

  return {
    usernameValue,
    verifiedUsername: apiResult.status === "verified" ? apiResult.reddit_username : undefined,
    verificationState: stateMap[apiResult.status] ?? "not_started",
    verificationHint: apiResult.verification_hint ?? undefined,
    codePlacementSurface: apiResult.code_placement_surface ?? undefined,
    errorTitle: apiResult.failure_code
      ? apiResult.failure_code.replace(/_/g, " ")
      : undefined,
  };
}

function mapImportJobStatus(
  apiStatus: OnboardingStatus["reddit_import_status"],
  importSummary?: ApiRedditImportSummary | null,
): ImportJobState {
  const statusMap: Record<string, ImportJobState["status"]> = {
    not_started: "not_started",
    queued: "queued",
    running: "running",
    succeeded: "succeeded",
    failed: "failed",
  };

  return {
    status: statusMap[apiStatus] ?? "not_started",
    sourceLabel: importSummary?.coverage_note ?? undefined,
  };
}

function OnboardingPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();

  const [phase, setPhase] = React.useState<OnboardingPhase>("import_karma");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = React.useState<OnboardingStatus | null>(null);

  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<RedditVerificationState>({
    usernameValue: "",
    verificationState: "not_started",
  });
  const [importJob, setImportJob] = React.useState<ImportJobState>({ status: "not_started" });
  const [snapshot, setSnapshot] = React.useState<SnapshotState | undefined>(undefined);
  const [generatedHandle, setGeneratedHandle] = React.useState("");

  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        setOnboardingStatus(status);
        setPhase(resolveOnboardingPhase(status));

        if (status.reddit_verification_status === "verified") {
          setRedditVerification({
            usernameValue: "",
            verificationState: "verified",
            verifiedUsername: "verified",
          });
        }

        setGeneratedHandle(session?.profile?.global_handle?.label ?? "");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load onboarding status");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, session?.profile?.global_handle?.label]);

  React.useEffect(() => {
    if (phase !== "import_karma" || !onboardingStatus) return;
    if (onboardingStatus.reddit_import_status === "queued" || onboardingStatus.reddit_import_status === "running") {
      const interval = setInterval(() => {
        void api.onboarding.getStatus()
          .then((status) => {
            setOnboardingStatus(status);
            setImportJob(mapImportJobStatus(status.reddit_import_status));

            if (status.reddit_import_status === "succeeded" || status.reddit_import_status === "failed") {
              clearInterval(interval);
              if (status.reddit_import_status === "succeeded") {
                void api.onboarding.getLatestRedditImport()
                  .then((summary) => {
                    setSnapshot({
                      accountAgeDays: summary.account_age_days ?? undefined,
                      globalKarma: summary.global_karma ?? null,
                      topSubreddits: summary.top_subreddits.map((s) => ({
                        subreddit: s.subreddit,
                        karma: s.karma ?? null,
                        posts: s.posts ?? null,
                        rankSource: s.rank_source ?? undefined,
                      })),
                      moderatorOf: summary.moderator_of,
                      inferredInterests: summary.inferred_interests,
                      suggestedCommunities: summary.suggested_communities.map((c) => ({
                        communityId: c.community_id,
                        name: c.name,
                        reason: c.reason,
                      })),
                    });
                    updateSessionOnboarding(status);
                    setPhase(resolveOnboardingPhase(status));
                  });
              }
            }
          });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [phase, onboardingStatus, api]);

  const handleImportKarmaNext = React.useCallback(() => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);

    const isVerified = redditVerification.verificationState === "verified";
    const isCodeReady = redditVerification.verificationState === "code_ready";
    const isNotStarted = redditVerification.verificationState === "not_started";
    const isImportDone = importJob.status === "succeeded";

    if (isImportDone) {
      setPhase("choose_name");
      setActionLoading(false);
      return;
    }

    if (isVerified && !isImportDone) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      void api.onboarding.startRedditImport(username)
        .then(() => {
          setImportJob({ status: "queued" });
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Failed to start import");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isCodeReady) {
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Verification check failed");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isNotStarted && redditUsername.trim().length > 0) {
      setRedditVerification((prev) => ({ ...prev, verificationState: "checking" }));
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          setRedditVerification((prev) => ({ ...prev, verificationState: "failed", errorTitle: e instanceof Error ? e.message : "Verification failed" }));
        })
        .finally(() => setActionLoading(false));
      return;
    }

    setActionLoading(false);
  }, [actionLoading, redditVerification, importJob, redditUsername, api]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (actionLoading) return;
    setActionLoading(true);

    void api.profiles.renameHandle(generatedHandle.replace(/\.pirate$/, ""))
      .then(() => {
        updateSessionOnboarding({
          ...onboardingStatus!,
          cleanup_rename_available: false,
        });
        setPhase("suggested_communities");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Handle rename failed");
      })
      .finally(() => setActionLoading(false));
  }, [actionLoading, generatedHandle, api, onboardingStatus]);

  const handleSkip = React.useCallback(() => {
    navigate("/");
  }, []);

  if (loading) {
    return (
      <StackPageShell title={copy.onboarding.title} description={copy.onboarding.description}>
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </div>
      </StackPageShell>
    );
  }

  return (
    <StackPageShell
      title={copy.onboarding.title}
      description={copy.onboarding.description}
    >
      {error ? (
        <FormNote tone="warning">{error}</FormNote>
      ) : null}
      <div className="mx-auto w-full max-w-5xl">
        <OnboardingRedditBootstrap
          actions={{
            primaryLabel: "Continue",
            tertiaryLabel: "Skip",
          }}
          callbacks={{
            onUsernameChange: (value) => {
              setRedditUsername(value);
              setRedditVerification((prev) => ({ ...prev, usernameValue: value }));
            },
            onImportKarmaNext: handleImportKarmaNext,
            onImportKarmaSkip: handleSkip,
            onHandleChange: (value) => setGeneratedHandle(value),
            onGenerateHandle: () => {},
            onChooseNameContinue: handleChooseNameContinue,
            onSuggestedCommunitiesContinue: () => navigate("/"),
            onSuggestedCommunitiesSkip: () => navigate("/"),
          }}
          canSkip
          generatedHandle={generatedHandle}
          handleSuggestion={
            redditVerification.verifiedUsername
              ? { suggestedLabel: redditVerification.verifiedUsername, availability: "available" as const, source: "verified_reddit_username" as const }
              : undefined
          }
          importJob={importJob}
          phase={phase}
          reddit={redditVerification}
          snapshot={snapshot}
        />
      </div>
    </StackPageShell>
  );
}

function AuthPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const [jwt, setJwt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExchange = React.useCallback(() => {
    if (!jwt.trim()) return;
    setLoading(true);
    setError(null);

    void api.auth.sessionExchange({ type: "jwt_based_auth", jwt })
      .then((response) => {
        setSession(response);
        navigate("/onboarding");
      })
      .catch((e: unknown) => {
        const apiError = e as ApiError;
        setError(apiError?.message ?? "Authentication failed");
      })
      .finally(() => setLoading(false));
  }, [jwt, api]);

  return (
    <StackPageShell
      title={copy.auth.title}
      description="Paste a dev JWT to sign in."
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 space-y-4">
          <div className="space-y-2">
            <FormFieldLabel label="Dev JWT" />
            <Input
              className="font-mono"
              disabled={loading}
              onChange={(e) => setJwt(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              size="lg"
              value={jwt}
            />
          </div>

          {error ? <FormNote tone="warning">{error}</FormNote> : null}

          <div className="flex justify-end">
            <Button
              disabled={!jwt.trim()}
              loading={loading}
              onClick={handleExchange}
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    </StackPageShell>
  );
}

function InboxPlaceholderPage() {
  const { copy } = useRouteMessages();

  return (
    <StackPageShell
      title={copy.inbox.title}
      description={copy.inbox.description}
    >
      <EmptyFeedState message={copy.inbox.body} />
    </StackPageShell>
  );
}

function CreateCommunityPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const [namespaceModalOpen, setNamespaceModalOpen] = React.useState(false);
  const [namespaceVerificationId, setNamespaceVerificationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const namespaceCallbacks: NamespaceVerificationCallbacks = React.useMemo(() => ({
    onStartSession: async ({ rootLabel }) => {
      const result = await api.verification.startNamespaceSession({
        family: "hns",
        root_label: rootLabel,
      }) as ApiNamespaceSession & {
        challenge_host?: string | null;
        challenge_txt_value?: string | null;
        challenge_expires_at?: string | null;
      };

      return {
        namespaceVerificationSessionId: result.namespace_verification_session_id,
        challengeHost: result.challenge_host ?? "",
        challengeTxtValue: result.challenge_txt_value ?? "",
        challengeExpiresAt: result.challenge_expires_at ?? null,
        status: result.status,
      };
    },

    onCompleteSession: async ({ namespaceVerificationSessionId: sessionId, restartChallenge }) => {
      const result = await api.verification.completeNamespaceSession(
        sessionId,
        { restart_challenge: restartChallenge ?? null },
      );

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
  }), [api]);

  const handleVerified = React.useCallback((nsId: string) => {
    setNamespaceVerificationId(nsId);
  }, []);

  const handleCreate = React.useCallback(async (input: {
    displayName: string;
    description: string | null;
    membershipMode: "open" | "gated";
    defaultAgeGatePolicy: "none" | "18_plus";
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: "community_stable" | "thread_stable" | "post_ephemeral";
    gateTypes: Set<GateType>;
  }) => {
    if (!namespaceVerificationId) {
      setError("Verify a namespace before creating a community.");
      return { communityId: "" };
    }

    try {
      const result = await api.communities.create({
        display_name: input.displayName,
        description: input.description,
        membership_mode: input.membershipMode,
        default_age_gate_policy: input.defaultAgeGatePolicy,
        allow_anonymous_identity: input.allowAnonymousIdentity,
        anonymous_identity_scope: input.anonymousIdentityScope,
        namespace: { namespace_verification_id: namespaceVerificationId },
        handle_policy: { policy_template: "standard" },
        governance_mode: "centralized",
      });

      return { communityId: result.community.community_id };
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setError(apiError?.message ?? "Community creation failed");
      return { communityId: "" };
    }
  }, [api, namespaceVerificationId]);

  const creatorVerificationState = session?.onboarding
    ? {
        uniqueHumanVerified: session.onboarding.unique_human_verification_status === "verified",
        ageOver18Verified: false,
      }
    : { uniqueHumanVerified: false, ageOver18Verified: false };

  return (
    <StackPageShell
      title={copy.createCommunity.title}
      description={copy.createCommunity.description}
    >
      {error ? <FormNote tone="warning">{error}</FormNote> : null}
      <div className="mx-auto w-full max-w-5xl">
        <CreateCommunityComposer
          creatorVerificationState={creatorVerificationState}
          onCreate={handleCreate}
        />
      </div>

      <VerifyNamespaceModal
        callbacks={namespaceCallbacks}
        onOpenChange={setNamespaceModalOpen}
        onVerified={handleVerified}
        open={namespaceModalOpen}
      />
    </StackPageShell>
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
      <EmptyFeedState message={copy.notFound.body} />
    </StackPageShell>
  );
}

export function renderRoute(route: AppRoute): React.ReactNode {
  switch (route.kind) {
    case "home":
      return <HomePage />;
    case "your-communities":
      return <YourCommunitiesPage />;
    case "community":
      return <CommunityPage communityId={route.communityId} />;
    case "create-community":
      return <CreateCommunityPage />;
    case "post":
      return <PostPage postId={route.postId} />;
    case "inbox":
      return <InboxPlaceholderPage />;
    case "me":
      return <CurrentUserProfilePage />;
    case "user":
      return <UserProfilePage userId={route.userId} />;
    case "onboarding":
      return <OnboardingPage />;
    case "auth":
      return <AuthPage />;
    case "not-found":
      return <NotFoundPage path={route.path} />;
  }
}
