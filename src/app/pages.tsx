"use client";

import * as React from "react";
import { createVeryWidget } from "@veryai/widget";

import { AppRoute, navigate } from "@/app/router";
import { useApi } from "@/lib/api";
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
import type { VerificationSession } from "@pirate/api-contracts";
import { DEFAULT_BASE_URL, type ApiError } from "@/lib/api/client";
import type { PrivyLoginCard as PrivyLoginCardComponent } from "@/components/auth/privy-login-card";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import type { NamespaceAttachmentState } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { Feed, type FeedSort, type FeedSortOption } from "@/components/compositions/feed/feed";
import type { OnboardingPhase } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type {
  ImportJobState,
  RedditVerificationState,
  SnapshotState,
} from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { VerifyNamespaceModal } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal";
import type {
  NamespaceVerificationCallbacks,
  SpacesChallengePayload,
} from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Spinner } from "@/components/primitives/spinner";
import { getPrivyAppId, usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { useUiLocale } from "@/lib/ui-locale";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";
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

function StatusCard({
  title,
  description,
  actions,
  tone = "default",
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName = tone === "success"
    ? "border-emerald-500/20 bg-emerald-500/5"
    : tone === "warning"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-border-soft bg-card";

  return (
    <div className={`rounded-[var(--radius-3xl)] border px-5 py-5 ${toneClassName}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

function HomePage() {
  const { copy } = useRouteMessages();

  return (
    <EmptyFeedState message={copy.home.railTitle} />
  );
}

const YOUR_COMMUNITIES_SORT_OPTIONS: FeedSortOption[] = [
  { value: "best", label: "Best" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

function YourCommunitiesPage() {
  const { copy } = useRouteMessages();
  const [activeSort, setActiveSort] = React.useState<FeedSort>("new");

  return (
    <Feed
      activeSort={activeSort}
      availableSorts={YOUR_COMMUNITIES_SORT_OPTIONS}
      emptyState={{
        action: (
          <Button variant="secondary" onClick={() => navigate("/communities/new")}>
            Create community
          </Button>
        ),
        body: "Join a few communities or start one to make this feed useful.",
        title: "No posts yet.",
      }}
      items={[]}
      onSortChange={setActiveSort}
      title={copy.yourCommunities.title}
    />
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
  const normalizedLabel = profile.global_handle?.label.replace(/\.pirate$/i, "") ?? "";
  const handle = profile.global_handle
    ? `${normalizedLabel}.pirate`
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

  console.info("[/me] CurrentUserProfilePage rendered", {
    hasSession: !!session,
    hasProfile: !!profile,
    onboarding: session?.onboarding,
    profileDisplayName: profile?.display_name,
  });

  if (!profile) {
    console.warn("[/me] No profile in session — showing sign-in prompt");
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
  const phase = (() => {
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
  })();
  console.info("[resolveOnboardingPhase]", { phase, status });
  return phase;
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

function markImportQueued(
  status: OnboardingStatus | null,
  setOnboardingStatus: React.Dispatch<React.SetStateAction<OnboardingStatus | null>>,
): void {
  setOnboardingStatus(status ? {
    ...status,
    reddit_import_status: "queued",
  } : status);
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
        setImportJob(mapImportJobStatus(status.reddit_import_status));
        setPhase(resolveOnboardingPhase(status));

        if (status.reddit_verification_status === "verified") {
          setRedditVerification({
            usernameValue: "",
            verificationState: "verified",
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
    console.info("[onboarding] continue clicked", {
      phase,
      redditVerificationState: redditVerification.verificationState,
      importJobStatus: importJob.status,
      redditUsername,
    });
    setActionLoading(true);
    setError(null);

    const isVerified = redditVerification.verificationState === "verified";
    const isCodeReady = redditVerification.verificationState === "code_ready";
    const isNotStarted = redditVerification.verificationState === "not_started";
    const isImportDone = importJob.status === "succeeded";

    if (isImportDone) {
      console.info("[onboarding] import already complete, advancing to choose_name");
      setPhase("choose_name");
      setActionLoading(false);
      return;
    }

    if (isVerified && !isImportDone) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      console.info("[onboarding] starting reddit import", { username });
      void api.onboarding.startRedditImport(username)
        .then(() => {
          console.info("[onboarding] reddit import queued");
          markImportQueued(onboardingStatus, setOnboardingStatus);
          setImportJob({ status: "queued" });
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit import failed", e);
          setError(e instanceof Error ? e.message : "Failed to start import");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isCodeReady) {
      console.info("[onboarding] checking existing reddit verification code", { redditUsername });
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          console.info("[onboarding] reddit verification result", result);
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            markImportQueued(onboardingStatus, setOnboardingStatus);
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit verification check failed", e);
          setError(e instanceof Error ? e.message : "Verification check failed");
        })
        .finally(() => setActionLoading(false));
      return;
    }

    if (isNotStarted && redditUsername.trim().length > 0) {
      console.info("[onboarding] creating reddit verification", { redditUsername });
      setRedditVerification((prev) => ({ ...prev, verificationState: "checking" }));
      void api.onboarding.startRedditVerification(redditUsername)
        .then((result) => {
          console.info("[onboarding] reddit verification created/result", result);
          setRedditVerification(mapRedditVerification(result, redditUsername));

          if (result.status === "verified") {
            return api.onboarding.startRedditImport(result.reddit_username);
          }
          return undefined;
        })
        .then((importResult) => {
          if (importResult) {
            markImportQueued(onboardingStatus, setOnboardingStatus);
            setImportJob({ status: "queued" });
          }
        })
        .catch((e: unknown) => {
          console.error("[onboarding] reddit verification failed", e);
          setRedditVerification((prev) => ({ ...prev, verificationState: "failed", errorTitle: e instanceof Error ? e.message : "Verification failed" }));
        })
        .finally(() => setActionLoading(false));
      return;
    }

    console.warn("[onboarding] continue click had no eligible action", {
      redditVerificationState: redditVerification.verificationState,
      importJobStatus: importJob.status,
      redditUsername,
    });
    setActionLoading(false);
  }, [actionLoading, redditVerification, importJob, redditUsername, api, phase, onboardingStatus]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (actionLoading) return;
    if (generatedHandle.trim().length === 0) {
      setError("Choose a handle before continuing");
      return;
    }
    setActionLoading(true);
    setError(null);

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
      {!onboardingStatus && error ? (
        <FormNote tone="warning">{error}</FormNote>
      ) : null}
      <div className="mx-auto w-full max-w-5xl">
        <OnboardingRedditBootstrap
          actions={{
            tertiaryLabel: "Skip",
          }}
          busy={actionLoading}
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
          phaseError={onboardingStatus ? error : null}
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
  const session = useSession();
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

  React.useEffect(() => {
    console.info("[AuthPage] session effect", { hasSession: !!session, onboarding: session?.onboarding });
    if (session) {
      console.info("[AuthPage] redirecting to /onboarding because session exists");
      navigate("/onboarding");
    }
  }, [session]);

  return (
    <StackPageShell
      title={copy.auth.title}
      description="Use Privy when it is configured for this environment. The dev JWT path stays available for local backend testing."
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {getPrivyAppId() ? <PrivyLoginCard /> : null}

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

function PrivyLoginCard() {
  const { loaded } = usePiratePrivyRuntime();
  const [CardComponent, setCardComponent] =
    React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    if (!loaded) return;

    let cancelled = false;
    void import("@/components/auth/privy-login-card").then((mod) => {
      if (!cancelled) {
        setCardComponent(() => mod.PrivyLoginCard as typeof PrivyLoginCardComponent);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (!loaded || !CardComponent) {
    return (
      <div className="rounded-[var(--radius-3xl)] border border-border-soft bg-card px-5 py-5 space-y-4">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">Sign in with Privy</p>
          <p className="text-base leading-7 text-muted-foreground">
            Loading the Privy client for this browser session.
          </p>
        </div>
        <div className="flex justify-end">
          <Button disabled>Continue with Privy</Button>
        </div>
      </div>
    );
  }

  return <CardComponent />;
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

function toSpacesChallengePayload(
  value: Record<string, unknown> | null | undefined,
): SpacesChallengePayload | null {
  if (!value) {
    return null;
  }

  if (
    value.kind !== "schnorr_sign" ||
    typeof value.domain !== "string" ||
    typeof value.root_label !== "string" ||
    typeof value.root_pubkey !== "string" ||
    typeof value.nonce !== "string" ||
    typeof value.issued_at !== "string" ||
    typeof value.expires_at !== "string" ||
    typeof value.message !== "string" ||
    typeof value.digest !== "string"
  ) {
    return null;
  }

  return {
    kind: "schnorr_sign",
    domain: value.domain,
    root_label: value.root_label,
    root_pubkey: value.root_pubkey,
    nonce: value.nonce,
    issued_at: value.issued_at,
    expires_at: value.expires_at,
    message: value.message,
    digest: value.digest,
  };
}

function CreateCommunityPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const [verificationSessionId, setVerificationSessionId] = React.useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = React.useState(false);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);
  const [namespaceModalOpen, setNamespaceModalOpen] = React.useState(false);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [namespaceAttachment, setNamespaceAttachment] =
    React.useState<NamespaceAttachmentState | null>(null);
  const widgetRef = React.useRef<{ destroy?: () => void; open?: () => void } | null>(null);

  const cleanupWidget = React.useCallback(() => {
    widgetRef.current?.destroy?.();
    widgetRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => {
      cleanupWidget();
    };
  }, [cleanupWidget]);

  const refreshOnboardingStatus = React.useCallback(async () => {
    const status = await api.onboarding.getStatus();
    updateSessionOnboarding(status);
    return status;
  }, [api]);

  const openVeryWidget = React.useCallback(async (result: VerificationSession) => {
    const launch = result.launch?.very_widget;
    if (!launch) {
      throw new Error("Very launch data was not returned");
    }

    cleanupWidget();

    widgetRef.current = createVeryWidget({
      appId: launch.app_id,
      context: launch.context,
      typeId: launch.type_id,
      query: JSON.stringify(launch.query),
      verifyUrl: launch.verify_url ?? `${DEFAULT_BASE_URL}/very/verify`,
      onSuccess: async (proof: string) => {
        console.info("[very-widget] proof received", {
          verificationSessionId: result.verification_session_id,
          proofLength: proof.length,
        });
        try {
          console.info("[very-widget] completing verification session", {
            verificationSessionId: result.verification_session_id,
          });
          await api.verification.completeSession(result.verification_session_id, {
            provider_payload_ref: proof,
          });
          await refreshOnboardingStatus();
          setVerificationSessionId(null);
          setVerificationError(null);
        } catch (e: unknown) {
          const apiError = e as ApiError;
          setVerificationError(apiError?.message ?? "Could not complete Very verification");
        } finally {
          setVerificationLoading(false);
          cleanupWidget();
        }
      },
      onError: (error: string) => {
        console.error("[very-widget] verification failed", {
          verificationSessionId: result.verification_session_id,
          error,
        });
        setVerificationError(error || "Very verification failed");
        setVerificationLoading(false);
        cleanupWidget();
      },
      theme: "dark",
    });

    widgetRef.current.open?.();
  }, [api, cleanupWidget, refreshOnboardingStatus]);

  const handleStartVeryVerification = React.useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const result = await api.verification.startSession({
        provider: "very",
        verification_intent: "community_creation",
      });
      setVerificationSessionId(result.verification_session_id);
      await openVeryWidget(result);
    } catch (e: unknown) {
      const apiError = e as ApiError;
      setVerificationError(apiError?.message ?? (e instanceof Error ? e.message : "Could not start Very verification"));
      setVerificationLoading(false);
    } finally {
      if (!widgetRef.current) {
        setVerificationLoading(false);
      }
    }
  }, [api, openVeryWidget]);

  const creatorVerificationState = session?.onboarding
    ? {
        uniqueHumanVerified: session.onboarding.unique_human_verification_status === "verified",
        ageOver18Verified: false,
      }
    : { uniqueHumanVerified: false, ageOver18Verified: false };

  const veryVerificationState = creatorVerificationState.uniqueHumanVerified
    ? "verified"
    : verificationSessionId
      ? "pending"
      : "not_started";

  const namespaceVerificationCallbacks = React.useMemo<NamespaceVerificationCallbacks>(() => ({
    onStartSession: async ({ family, rootLabel }) => {
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      return {
        namespaceVerificationSessionId: result.namespace_verification_session_id,
        family: result.family,
        rootLabel: result.submitted_root_label,
        challengeHost: result.challenge_host ?? null,
        challengeTxtValue: result.challenge_txt_value ?? null,
        challengePayload: toSpacesChallengePayload(result.challenge_payload),
        challengeExpiresAt: result.challenge_expires_at ?? null,
        status: result.status,
      };
    },
    onCompleteSession: async ({
      namespaceVerificationSessionId,
      restartChallenge,
      signaturePayload,
    }) => {
      const result = await api.verification.completeNamespaceSession(
        namespaceVerificationSessionId,
        {
          restart_challenge: restartChallenge ?? null,
          signature_payload: signaturePayload ?? null,
        },
      );

      if (result.status === "verified" && result.namespace_verification_id) {
        const verification = await api.verification.getNamespaceVerification(
          result.namespace_verification_id,
        );
        setNamespaceAttachment({
          namespaceVerificationId: verification.namespace_verification_id,
          family: verification.family,
          normalizedRootLabel: verification.normalized_root_label,
        });
        setNamespaceModalOpen(false);
        setActiveNamespaceSessionId(null);
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }) => {
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);

      return {
        namespaceVerificationSessionId: result.namespace_verification_session_id,
        family: result.family,
        rootLabel: result.submitted_root_label,
        challengeHost: result.challenge_host ?? null,
        challengeTxtValue: result.challenge_txt_value ?? null,
        challengePayload: toSpacesChallengePayload(result.challenge_payload),
        challengeExpiresAt: result.challenge_expires_at ?? null,
        status: result.status,
      };
    },
  }), [api]);

  const handleCreate = React.useCallback(async (input: {
    displayName: string;
    description: string | null;
    membershipMode: "open" | "gated";
    defaultAgeGatePolicy: "none" | "18_plus";
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: "community_stable" | "thread_stable" | "post_ephemeral";
    gateTypes: Set<GateType>;
    namespaceVerificationId: string | null;
  }) => {
    try {
      const result = await api.communities.create({
        display_name: input.displayName,
        description: input.description,
        membership_mode: input.membershipMode,
        default_age_gate_policy: input.defaultAgeGatePolicy,
        allow_anonymous_identity: input.allowAnonymousIdentity,
        anonymous_identity_scope: input.anonymousIdentityScope,
        handle_policy: { policy_template: "standard" },
        governance_mode: "centralized",
        namespace: input.namespaceVerificationId
          ? { namespace_verification_id: input.namespaceVerificationId }
          : null,
      });

      navigate(`/c/${result.community.community_id}`);
      return { communityId: result.community.community_id };
    } catch (e: unknown) {
      const apiError = e as ApiError;
      throw new Error(apiError?.message ?? "Community creation failed");
    }
  }, [api]);

  if (!creatorVerificationState.uniqueHumanVerified) {
    return (
      <StackPageShell
        title={copy.createCommunity.title}
        description="Verify your identity before creating a community."
      >
        {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        <StatusCard
          title={
            veryVerificationState === "pending"
              ? "Finish your Very verification"
              : "Verify with Very"
          }
          description={
            veryVerificationState === "pending"
              ? "Complete the palm scan in Very."
              : "You must complete unique-human verification before creating a community."
          }
          tone="warning"
          actions={(
            <>
              {veryVerificationState === "not_started" ? (
                <Button loading={verificationLoading} onClick={handleStartVeryVerification}>
                  Start Verification
                </Button>
              ) : null}
              {veryVerificationState === "pending" ? (
                <>
                  <Button loading={verificationLoading} onClick={handleStartVeryVerification}>
                    Reopen Very
                  </Button>
                </>
              ) : null}
            </>
          )}
        />
      </StackPageShell>
    );
  }

  return (
    <StackPageShell
      title={copy.createCommunity.title}
      description={copy.createCommunity.description}
    >
      <div className="mx-auto w-full max-w-5xl">
        <CreateCommunityComposer
          creatorVerificationState={creatorVerificationState}
          namespaceAttachment={namespaceAttachment}
          onClearNamespaceVerification={() => setNamespaceAttachment(null)}
          onCreate={handleCreate}
          onOpenNamespaceVerification={() => setNamespaceModalOpen(true)}
        />
      </div>
      <VerifyNamespaceModal
        activeSessionId={activeNamespaceSessionId}
        callbacks={namespaceVerificationCallbacks}
        onOpenChange={setNamespaceModalOpen}
        onSessionCleared={() => setActiveNamespaceSessionId(null)}
        onSessionStarted={setActiveNamespaceSessionId}
        onVerified={() => setNamespaceModalOpen(false)}
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
  console.info("[renderRoute]", route.kind, route);
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
