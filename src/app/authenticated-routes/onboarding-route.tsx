"use client";

import * as React from "react";
import type { OnboardingStatus } from "@pirate/api-contracts";
import type { RedditImportSummary as ApiRedditImportSummary } from "@pirate/api-contracts";
import type { RedditVerification as ApiRedditVerification } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { PageContainer } from "@/components/primitives/layout-shell";
import { useApi } from "@/lib/api";
import { updateSessionOnboarding, updateSessionProfile, updateSessionUser, useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { resolveOnboardingPhase } from "@/lib/onboarding";
import { generateRedditFallbackHandle } from "@/lib/reddit-handle-suggestion";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { type OnboardingPhase } from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type {
  HandleSuggestion,
  ImportJobState,
  RedditImportSummaryState,
  RedditVerificationState,
} from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap";
import { OnboardingVerificationGate } from "@/components/compositions/verification/onboarding-verification-gate/onboarding-verification-gate";
import { useIsMobile } from "@/hooks/use-mobile";

import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "@/app/authenticated-helpers/route-shell";

function mapRedditVerification(apiResult: ApiRedditVerification, usernameValue: string): RedditVerificationState {
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
    lastCheckedAt: apiResult.last_checked_at
      ? new Date(apiResult.last_checked_at * 1000).toISOString()
      : undefined,
    errorTitle: apiResult.failure_code ? apiResult.failure_code.replace(/_/g, " ") : undefined,
  };
}

function mapImportJobStatus(apiStatus: OnboardingStatus["reddit_import_status"], importSummary?: ApiRedditImportSummary | null): ImportJobState {
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
  setOnboardingStatus(status ? { ...status, reddit_import_status: "queued" } : status);
}

function normalizeHandleLabel(value: string): string {
  return value.trim().replace(/\.pirate$/i, "").toLowerCase();
}

function mapRedditImportSummary(summary: ApiRedditImportSummary): RedditImportSummaryState {
  return {
    redditUsername: summary.reddit_username,
    importedRedditScore: summary.imported_reddit_score ?? null,
    coverageNote: summary.coverage_note ?? null,
  };
}

function quoteToHandleSuggestion(username: string, eligible: boolean, reason?: string | null): HandleSuggestion {
  return {
    suggestedLabel: username,
    availability: eligible ? "available" : reason === "Desired label is unavailable" ? "taken" : "manual_review",
    source: "verified_reddit_username",
    reason: reason ?? undefined,
  };
}

function isHumanVerificationRequest(): boolean {
  return typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("verify") === "human";
}

function getOnboardingExitPath(): string {
  if (typeof window === "undefined") return "/";

  const returnTo = new URLSearchParams(window.location.search).get("return_to");
  if (!returnTo) return "/";

  try {
    const url = new URL(returnTo, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const href = `${url.pathname}${url.search}${url.hash}`;
    return href.startsWith("/") && !href.startsWith("//") ? href : "/";
  } catch {
    return "/";
  }
}

export function OnboardingPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const hydrated = useClientHydrated();
  const isMobile = useIsMobile();
  const session = useSession();
  const [phase, setPhase] = React.useState<OnboardingPhase>("import_karma");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [onboardingStatus, setOnboardingStatus] = React.useState<OnboardingStatus | null>(null);
  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<RedditVerificationState>({ usernameValue: "", verificationState: "not_started" });
  const [importJob, setImportJob] = React.useState<ImportJobState>({ status: "not_started" });
  const [redditImportSummary, setRedditImportSummary] = React.useState<RedditImportSummaryState | null>(null);
  const [handleSuggestion, setHandleSuggestion] = React.useState<HandleSuggestion | undefined>(undefined);
  const [generatedHandle, setGeneratedHandle] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const quoteHandleCandidate = React.useCallback(async (desiredLabel: string): Promise<boolean> => {
    const label = desiredLabel.trim().replace(/\.pirate$/iu, "");

    try {
      const quote = await api.profiles.quoteHandleUpgrade(label);
      setHandleSuggestion(quoteToHandleSuggestion(label, quote.eligible, quote.reason));
      return quote.eligible;
    } catch {
      setHandleSuggestion(quoteToHandleSuggestion(label, false, "Handle claim needs review"));
      return false;
    }
  }, [api]);

  const refreshRedditImportBenefits = React.useCallback(async (preferredUsername?: string | null) => {
    const summary = await api.onboarding.getLatestRedditImport();
    const mappedSummary = mapRedditImportSummary(summary);
    const username = preferredUsername ?? summary.reddit_username;
    setRedditImportSummary(mappedSummary);
    setRedditVerification((prev) => ({
      ...prev,
      usernameValue: username,
      verifiedUsername: username,
      verificationState: "verified",
    }));

    const usernameClaimAvailable = await quoteHandleCandidate(username);
    if (usernameClaimAvailable) {
      setGeneratedHandle(username);
      return;
    }

    const fallbackHandle = generateRedditFallbackHandle(username);
    setGeneratedHandle(fallbackHandle);
    await quoteHandleCandidate(fallbackHandle);
  }, [api, quoteHandleCandidate]);

  const applyOnboardingStatus = React.useCallback((status: OnboardingStatus) => {
    const nextPhase = resolveOnboardingPhase(status);
    setOnboardingStatus(status);
    setImportJob(mapImportJobStatus(status.reddit_import_status));
    setGeneratedHandle(session?.profile?.global_handle?.label ?? "");
    if (!nextPhase) {
      if (isHumanVerificationRequest() && status.unique_human_verification_status !== "verified") {
        return;
      }
      navigate(getOnboardingExitPath());
      return;
    }
    setPhase(nextPhase);
    if (status.reddit_verification_status === "verified") {
      setRedditVerification((prev) => ({
        ...prev,
        verificationState: "verified",
      }));
    }
    if (status.reddit_import_status === "succeeded") {
      void refreshRedditImportBenefits().catch(() => {});
    }
  }, [refreshRedditImportBenefits, session?.profile?.global_handle?.label]);

  const {
    startVerification: startHumanVerification,
    verificationError: humanVerificationError,
    verificationLoading: humanVerificationLoading,
    verificationState: humanVerificationState,
  } = useVeryVerification({
    onVerified: async (status) => {
      updateSessionOnboarding(status);
      applyOnboardingStatus(status);
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);
    },
    verified: onboardingStatus?.unique_human_verification_status === "verified",
    verificationIntent: "profile_verification",
  });

  React.useEffect(() => {
    let cancelled = false;
    if (!hydrated) return () => { cancelled = true; };
    if (!session) {
      setOnboardingStatus(null);
      setError(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    applyOnboardingStatus(session.onboarding);
    setLoading(false);
    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        updateSessionOnboarding(status);
        applyOnboardingStatus(status);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, applyOnboardingStatus, hydrated, session]);

  React.useEffect(() => {
    if (phase !== "import_karma" || !onboardingStatus) return;
    if (onboardingStatus.reddit_import_status !== "queued" && onboardingStatus.reddit_import_status !== "running") return;

    const interval = setInterval(() => {
      void api.onboarding.getStatus().then((status) => {
        setOnboardingStatus(status);
        setImportJob(mapImportJobStatus(status.reddit_import_status));

        if (status.reddit_import_status === "succeeded" || status.reddit_import_status === "failed") {
          clearInterval(interval);
          if (status.reddit_import_status === "succeeded") {
            updateSessionOnboarding(status);
            void refreshRedditImportBenefits().catch(() => {});
            const nextPhase = resolveOnboardingPhase(status);
            if (!nextPhase) {
              navigate(getOnboardingExitPath());
              return;
            }
            setPhase(nextPhase);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [api, onboardingStatus, phase, refreshRedditImportBenefits]);

  const verificationTaskRequested = hydrated && isHumanVerificationRequest();

  const handleImportKarmaNext = React.useCallback(() => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);

    const isVerified = redditVerification.verificationState === "verified";
    const isCodeReady = redditVerification.verificationState === "code_ready";
    const isNotStarted = redditVerification.verificationState === "not_started";
    const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";

    if (isImportDone) {
      setPhase("choose_name");
      setActionLoading(false);
      return;
    }

    if (isVerified) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      void api.onboarding.startRedditImport(username)
        .then(() => {
          markImportQueued(onboardingStatus, setOnboardingStatus);
          setImportJob({ status: "queued" });
          void refreshRedditImportBenefits(username).catch(() => {});
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to start import"))
        .finally(() => setActionLoading(false));
      return;
    }

    const startVerification = () => void api.onboarding.startRedditVerification(redditUsername)
      .then((result) => {
        setRedditVerification(mapRedditVerification(result, redditUsername));
        if (result.status === "verified") {
          return api.onboarding.startRedditImport(result.reddit_username).then((importResult) => ({
            importResult,
            username: result.reddit_username,
          }));
        }
        return undefined;
      })
      .then((result) => {
        if (result) {
          markImportQueued(onboardingStatus, setOnboardingStatus);
          setImportJob({ status: "queued" });
          void refreshRedditImportBenefits(result.username).catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (isCodeReady) {
          setError(e instanceof Error ? e.message : "Verification check failed");
        } else {
          setRedditVerification((prev) => ({ ...prev, verificationState: "failed", errorTitle: e instanceof Error ? e.message : "Verification failed" }));
        }
      })
      .finally(() => setActionLoading(false));

    if (isCodeReady || (isNotStarted && redditUsername.trim().length > 0)) {
      if (isNotStarted) {
        setRedditVerification((prev) => ({ ...prev, verificationState: "checking" }));
      }
      trackAnalyticsEvent({
        eventName: "reddit_verification_started",
        properties: { surface: "onboarding" },
      });
      startVerification();
      return;
    }

    setActionLoading(false);
  }, [actionLoading, api, importJob.status, onboardingStatus, redditUsername, redditVerification, refreshRedditImportBenefits]);

  const handleSkipRedditImport = React.useCallback(() => {
    if (actionLoading) return;
    setError(null);
    setPhase("choose_name");
  }, [actionLoading]);

  const handleChooseNameBack = React.useCallback(() => {
    if (actionLoading) return;
    setError(null);
    setPhase("import_karma");
  }, [actionLoading]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (actionLoading) return;
    if (generatedHandle.trim().length === 0) {
      setError(copy.onboarding.errors.chooseHandle);
      return;
    }
    setActionLoading(true);
    setError(null);

    const currentHandle = session?.profile?.global_handle?.label ?? "";
    if (normalizeHandleLabel(generatedHandle) === normalizeHandleLabel(currentHandle)) {
      void api.onboarding.dismiss()
        .then(async (status) => {
          updateSessionOnboarding(status);
          navigate(getOnboardingExitPath());
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not finish onboarding"))
        .finally(() => setActionLoading(false));
      return;
    }

    const desiredLabel = generatedHandle.replace(/\.pirate$/, "");
    const shouldUseRedditClaim = redditImportSummary
      && normalizeHandleLabel(desiredLabel) === normalizeHandleLabel(redditImportSummary.redditUsername);
    trackAnalyticsEvent({
      eventName: "handle_claim_started",
      properties: {
        surface: "onboarding",
        source: shouldUseRedditClaim ? "verified_reddit_username" : "free_cleanup_rename",
        handle_length: normalizeHandleLabel(desiredLabel).length,
      },
    });
    const rename = shouldUseRedditClaim
      ? api.profiles.claimRedditHandle(desiredLabel)
      : api.profiles.renameHandle(desiredLabel);

    void rename
      .then(() => api.profiles.getMe().then((profile) => updateSessionProfile(profile)))
      .then(async () => {
        updateSessionOnboarding({ ...onboardingStatus!, cleanup_rename_available: false });
        navigate(getOnboardingExitPath());
      })
      .catch((e: unknown) => {
        trackAnalyticsEvent({
          eventName: "handle_claim_failed",
          properties: {
            surface: "onboarding",
            source: shouldUseRedditClaim ? "verified_reddit_username" : "free_cleanup_rename",
            handle_length: normalizeHandleLabel(desiredLabel).length,
            failure_code: typeof (e as { code?: unknown })?.code === "string" ? (e as { code: string }).code : "unknown",
          },
        });
        setError(e instanceof Error ? e.message : copy.onboarding.errors.renameFailed);
      })
      .finally(() => setActionLoading(false));
  }, [actionLoading, api, copy.onboarding.errors.chooseHandle, copy.onboarding.errors.renameFailed, generatedHandle, onboardingStatus, redditImportSummary, session?.profile?.global_handle?.label]);

  const handleGenerateHandle = React.useCallback(() => {
    const sourceUsername = (redditImportSummary?.redditUsername
      ?? redditVerification.verifiedUsername
      ?? redditUsername)
      || "reddit";
    const fallbackHandle = generateRedditFallbackHandle(sourceUsername);
    setGeneratedHandle(fallbackHandle);
    void quoteHandleCandidate(fallbackHandle);
  }, [quoteHandleCandidate, redditImportSummary?.redditUsername, redditUsername, redditVerification.verifiedUsername]);

  const importDone = phase === "import_karma"
    && (importJob.status === "succeeded" || importJob.status === "partial_success");
  const canSkipRedditImport = phase === "import_karma" && !importDone;

  if (loading) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(getOnboardingExitPath())} title="" />
          <section className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <FullPageSpinner />
          </section>
        </div>
      );
    }
    return <FullPageSpinner />;
  }

  if (error && !onboardingStatus) {
    if ((error as { status?: number; code?: string }).status === 401 || (error as { code?: string }).code === "auth_error") {
      return <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title={copy.onboarding.title} />;
    }
    return <RouteLoadFailureState description={getErrorMessage(error, copy.routeStatus.onboarding.failure)} title={copy.onboarding.title} />;
  }

  if (!session) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(getOnboardingExitPath())} title="" />
          <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title="" />
          </section>
        </div>
      );
    }
    return <AuthRequiredRouteState description={copy.routeStatus.onboarding.auth} title={copy.onboarding.title} />;
  }

  const verificationGate = verificationTaskRequested && onboardingStatus?.unique_human_verification_status !== "verified" ? (
    <OnboardingVerificationGate
      onVerify={() => void startHumanVerification()}
      verificationError={humanVerificationError}
      verificationLoading={humanVerificationLoading}
      verificationState={humanVerificationState === "pending" ? "pending" : "not_started"}
    />
  ) : null;

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={() => navigate(getOnboardingExitPath())}
          title=""
          trailingAction={null}
        />
        <section className="flex min-w-0 flex-1 flex-col justify-start px-4 pb-32 pt-[calc(env(safe-area-inset-top)+5rem)]">
          {verificationGate ?? (
            <OnboardingRedditBootstrap
              busy={actionLoading}
              callbacks={{
                onUsernameChange: (value) => { setRedditUsername(value); setRedditVerification((prev) => ({ ...prev, usernameValue: value })); },
                onImportKarmaNext: handleImportKarmaNext,
                onImportKarmaSkip: handleSkipRedditImport,
                onHandleChange: (value) => setGeneratedHandle(value),
                onGenerateHandle: handleGenerateHandle,
                onChooseNameBack: handleChooseNameBack,
                onChooseNameContinue: handleChooseNameContinue,
              }}
              canSkip={canSkipRedditImport}
              generatedHandle={generatedHandle}
              handleSuggestion={handleSuggestion}
              importJob={importJob}
              layout="mobile"
              phase={phase}
              phaseError={onboardingStatus && typeof error === "string" ? error : null}
              reddit={redditVerification}
              redditImportSummary={redditImportSummary}
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <PageContainer>
        {verificationGate ?? (
          <OnboardingRedditBootstrap
            busy={actionLoading}
            callbacks={{
              onUsernameChange: (value) => { setRedditUsername(value); setRedditVerification((prev) => ({ ...prev, usernameValue: value })); },
              onImportKarmaNext: handleImportKarmaNext,
              onImportKarmaSkip: handleSkipRedditImport,
              onHandleChange: (value) => setGeneratedHandle(value),
              onGenerateHandle: handleGenerateHandle,
              onChooseNameBack: handleChooseNameBack,
              onChooseNameContinue: handleChooseNameContinue,
            }}
            canSkip={canSkipRedditImport}
            generatedHandle={generatedHandle}
            handleSuggestion={handleSuggestion}
            importJob={importJob}
            phase={phase}
            phaseError={onboardingStatus && typeof error === "string" ? error : null}
            reddit={redditVerification}
            redditImportSummary={redditImportSummary}
          />
        )}
      </PageContainer>
    </section>
  );
}
