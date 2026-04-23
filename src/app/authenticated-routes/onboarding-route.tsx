"use client";

import * as React from "react";
import type { OnboardingStatus } from "@pirate/api-contracts";
import type { RedditImportSummary as ApiRedditImportSummary } from "@pirate/api-contracts";
import type { RedditVerification as ApiRedditVerification } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { PageContainer } from "@/components/primitives/layout-shell";
import { useApi } from "@/lib/api";
import { updateSessionOnboarding, updateSessionProfile, useSession } from "@/lib/api/session-store";
import { resolveOnboardingPhase } from "@/lib/onboarding";
import { type OnboardingPhase } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type { ImportJobState, RedditVerificationState } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.types";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";

import { getErrorMessage, useClientHydrated, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState } from "./route-shell";

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

export function OnboardingPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const hydrated = useClientHydrated();
  const session = useSession();
  const [phase, setPhase] = React.useState<OnboardingPhase>("import_karma");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [onboardingStatus, setOnboardingStatus] = React.useState<OnboardingStatus | null>(null);
  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<RedditVerificationState>({ usernameValue: "", verificationState: "not_started" });
  const [importJob, setImportJob] = React.useState<ImportJobState>({ status: "not_started" });
  const [generatedHandle, setGeneratedHandle] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!hydrated) return () => { cancelled = true; };
    if (!session) {
      setOnboardingStatus(null);
      setError(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        const nextPhase = resolveOnboardingPhase(status);
        setOnboardingStatus(status);
        setImportJob(mapImportJobStatus(status.reddit_import_status));
        setGeneratedHandle(session.profile?.global_handle?.label ?? "");
        if (status.unique_human_verification_status !== "verified") {
          return;
        }
        if (!nextPhase) {
          navigate("/");
          return;
        }
        setPhase(nextPhase);
        if (status.reddit_verification_status === "verified") {
          setRedditVerification({ usernameValue: "", verificationState: "verified" });
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [api, hydrated, session, session?.profile?.global_handle?.label]);

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
            const nextPhase = resolveOnboardingPhase(status);
            if (!nextPhase) {
              navigate("/");
              return;
            }
            setPhase(nextPhase);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [api, onboardingStatus, phase]);

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

    if (isVerified) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      void api.onboarding.startRedditImport(username)
        .then(() => {
          markImportQueued(onboardingStatus, setOnboardingStatus);
          setImportJob({ status: "queued" });
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to start import"))
        .finally(() => setActionLoading(false));
      return;
    }

    const startVerification = () => void api.onboarding.startRedditVerification(redditUsername)
      .then((result) => {
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
      startVerification();
      return;
    }

    setActionLoading(false);
  }, [actionLoading, api, importJob.status, onboardingStatus, redditUsername, redditVerification]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (actionLoading) return;
    if (generatedHandle.trim().length === 0) {
      setError(copy.onboarding.errors.chooseHandle);
      return;
    }
    setActionLoading(true);
    setError(null);
    void api.profiles.renameHandle(generatedHandle.replace(/\.pirate$/, ""))
      .then(() => api.profiles.getMe().then((profile) => updateSessionProfile(profile)))
      .then(() => {
        updateSessionOnboarding({ ...onboardingStatus!, cleanup_rename_available: false });
        navigate("/");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : copy.onboarding.errors.renameFailed))
      .finally(() => setActionLoading(false));
  }, [actionLoading, api, copy.onboarding.errors.chooseHandle, copy.onboarding.errors.renameFailed, generatedHandle, onboardingStatus]);

  if (loading) {
    return <FullPageSpinner />;
  }

  if (error && !onboardingStatus) {
    if ((error as { status?: number; code?: string }).status === 401 || (error as { code?: string }).code === "auth_error") {
      return <AuthRequiredRouteState description={getRouteAuthDescription("onboarding")} title={copy.onboarding.title} />;
    }
    return <RouteLoadFailureState description={getErrorMessage(error, getRouteFailureDescription("onboarding"))} title={copy.onboarding.title} />;
  }

  if (!session) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("onboarding")} title={copy.onboarding.title} />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <PageContainer>
        <OnboardingRedditBootstrap
          busy={actionLoading}
          callbacks={{
            onUsernameChange: (value) => { setRedditUsername(value); setRedditVerification((prev) => ({ ...prev, usernameValue: value })); },
            onImportKarmaNext: handleImportKarmaNext,
            onImportKarmaSkip: () => navigate("/"),
            onHandleChange: (value) => setGeneratedHandle(value),
            onGenerateHandle: () => {},
            onChooseNameContinue: handleChooseNameContinue,
          }}
          canSkip
          generatedHandle={generatedHandle}
          handleSuggestion={redditVerification.verifiedUsername ? { suggestedLabel: redditVerification.verifiedUsername, availability: "available", source: "verified_reddit_username" } : undefined}
          importJob={importJob}
          phase={phase}
          phaseError={onboardingStatus && typeof error === "string" ? error : null}
          reddit={redditVerification}
        />
      </PageContainer>
    </section>
  );
}
