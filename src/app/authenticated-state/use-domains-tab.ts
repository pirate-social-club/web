"use client";

import * as React from "react";
import type { OnboardingStatus } from "@pirate/api-contracts";
import type { RedditImportSummary as ApiRedditImportSummary } from "@pirate/api-contracts";
import type { RedditVerification as ApiRedditVerification } from "@pirate/api-contracts";
import type { Hex } from "viem";

import { ApiError, type ApiClient } from "@/lib/api/client";
import { updateSessionOnboarding, updateSessionProfile, useSession } from "@/lib/api/session-store";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import {
  executeHandleUsdcCheckout,
  findConnectedFundingWallet,
} from "@/lib/commerce/routed-checkout";
import { getErrorMessage } from "@/lib/error-utils";
import { getWalletTransactionErrorMessage } from "@/lib/wallet-error-utils";
import { generateRedditFallbackHandle } from "@/lib/reddit-handle-suggestion";
import { generateSignupStyleHandle } from "@/lib/generated-handle-suggestion";
import {
  isCurrentGlobalHandleCandidate,
  isFreeCleanupHandleQuote,
  normalizeGlobalHandleStem,
} from "@/lib/global-handle-upgrade";
import type { HandleUpgradeQuoteResponse } from "@/lib/api/client-api-types";
import type {
  HandleSuggestion,
  ImportJobState,
  RedditImportSummaryState,
  RedditVerificationState,
} from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap.types";
import type { DomainsTabPhase } from "@/components/compositions/settings/settings-page/panels/settings-page-domains-tab";

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
    failureCode: apiResult.failure_code ?? undefined,
    errorTitle: apiResult.failure_code ? apiResult.failure_code.replace(/_/g, " ") : undefined,
  };
}

function mapImportJobStatus(apiStatus: OnboardingStatus["reddit_import_status"]): ImportJobState {
  const statusMap: Record<string, ImportJobState["status"]> = {
    not_started: "not_started",
    queued: "queued",
    running: "running",
    succeeded: "succeeded",
    partial_success: "partial_success",
    failed: "failed",
  };

  return {
    status: statusMap[apiStatus] ?? "not_started",
  };
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

type UseDomainsTabMessages = {
  connectPrimaryWalletError: string;
  chooseHandleError: string;
  reconnectPrimaryWalletError: string;
  renameFailedError: string;
};

type UseDomainsTabOptions = {
  api: ApiClient;
  enabled: boolean;
  messages: UseDomainsTabMessages;
};

export function useDomainsTab({ api, enabled, messages }: UseDomainsTabOptions) {
  const session = useSession();
  const { connectedWallets } = usePiratePrivyWallets({ enabled });
  const [phase, setPhaseState] = React.useState<DomainsTabPhase>("buy_name");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [redditUsername, setRedditUsername] = React.useState("");
  const [redditVerification, setRedditVerification] = React.useState<RedditVerificationState>({
    usernameValue: "",
    verificationState: "not_started",
  });
  const [importJob, setImportJob] = React.useState<ImportJobState>({ status: "not_started" });
  const [redditImportSummary, setRedditImportSummary] = React.useState<RedditImportSummaryState | null>(null);
  const [handleSuggestion, setHandleSuggestion] = React.useState<HandleSuggestion | undefined>(undefined);
  const [generatedHandle, setGeneratedHandle] = React.useState("");
  const [onboardingStatus, setOnboardingStatus] = React.useState<OnboardingStatus | null>(null);
  const [buyNameValue, setBuyNameValue] = React.useState("");
  const [buyNameChecking, setBuyNameChecking] = React.useState(false);
  const [paidQuote, setPaidQuote] = React.useState<HandleUpgradeQuoteResponse | null>(null);
  const [paidClaimedHandle, setPaidClaimedHandle] = React.useState<string | null>(null);
  const buyNameQuoteRequestRef = React.useRef(0);
  const phaseInitializedRef = React.useRef(false);
  const phaseTouchedRef = React.useRef(false);
  const buyNameValueRef = React.useRef("");

  const setPhase = React.useCallback((next: DomainsTabPhase) => {
    phaseTouchedRef.current = true;
    setPhaseState(next);
  }, []);

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
    setOnboardingStatus(status);
    setImportJob(mapImportJobStatus(status.reddit_import_status));
    const currentHandle = session?.profile?.global_handle?.label ?? "";
    setGeneratedHandle(currentHandle);
    if (!phaseInitializedRef.current) {
      setPhaseState("buy_name");
      phaseInitializedRef.current = true;
    } else if (
      status.cleanup_rename_available
      && !phaseTouchedRef.current
      && buyNameValueRef.current.trim().length === 0
    ) {
      setPhaseState("buy_name");
    }

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

  React.useEffect(() => {
    if (!enabled || !session) return;
    applyOnboardingStatus(session.onboarding);
    let cancelled = false;
    void api.onboarding.getStatus()
      .then((status) => {
        if (cancelled) return;
        updateSessionOnboarding(status);
        applyOnboardingStatus(status);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, session, applyOnboardingStatus, api]);

  React.useEffect(() => {
    if (!enabled || !onboardingStatus) return;
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
            setPhase("buy_name");
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [enabled, api, onboardingStatus, refreshRedditImportBenefits]);

  const handleImportKarmaNext = React.useCallback(() => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const isVerified = redditVerification.verificationState === "verified";
    const isCodeReady = redditVerification.verificationState === "code_ready";
    const isNotStarted = redditVerification.verificationState === "not_started";
    const isImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";

    if (isImportDone) {
      setPhase("choose_name");
      setBusy(false);
      return;
    }

    if (isVerified) {
      const username = redditVerification.verifiedUsername ?? redditUsername;
      void api.onboarding.startRedditImport(username)
        .then(() => {
          setOnboardingStatus((prev) => (prev ? { ...prev, reddit_import_status: "queued" } : prev));
          setImportJob({ status: "queued" });
          void refreshRedditImportBenefits(username).catch(() => {});
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to start import"))
        .finally(() => setBusy(false));
      return;
    }

    const startVerification = () => void api.onboarding.startRedditVerification(redditUsername)
      .then((result) => {
        setRedditVerification(mapRedditVerification(result, redditUsername));
        if (result.status === "verified") {
          return api.onboarding.startRedditImport(result.reddit_username).then(() => ({
            username: result.reddit_username,
          }));
        }
        return undefined;
      })
      .then((result) => {
        if (result) {
          setOnboardingStatus((prev) => (prev ? { ...prev, reddit_import_status: "queued" } : prev));
          setImportJob({ status: "queued" });
          void refreshRedditImportBenefits(result.username).catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (isCodeReady) {
          setError(e instanceof Error ? e.message : "Verification check failed");
        } else {
          setRedditVerification((prev) => ({
            ...prev,
            verificationState: "failed",
            errorTitle: e instanceof Error ? e.message : "Verification failed",
          }));
        }
      })
      .finally(() => setBusy(false));

    if (isCodeReady || (isNotStarted && redditUsername.trim().length > 0)) {
      if (isNotStarted) {
        setRedditVerification((prev) => ({ ...prev, verificationState: "checking" }));
      }
      trackAnalyticsEvent({
        eventName: "reddit_verification_started",
        properties: { surface: "settings" },
      });
      startVerification();
      return;
    }

    setBusy(false);
  }, [busy, api, importJob.status, redditUsername, redditVerification, refreshRedditImportBenefits]);

  const handleSkipRedditImport = React.useCallback(() => {
    if (busy) return;
    setError(null);
    setPhase("options");
  }, [busy]);

  const handleChooseNameBack = React.useCallback(() => {
    if (busy) return;
    setError(null);
    setPhase("options");
  }, [busy]);

  const handleChooseNameContinue = React.useCallback(() => {
    if (busy) return;
    if (generatedHandle.trim().length === 0) {
      setError(messages.chooseHandleError);
      return;
    }
    setBusy(true);
    setError(null);

    const currentHandle = session?.profile?.global_handle?.label ?? "";
    if (normalizeGlobalHandleStem(generatedHandle) === normalizeGlobalHandleStem(currentHandle)) {
      setBusy(false);
      setPhase("buy_name");
      return;
    }

    const desiredLabel = generatedHandle.replace(/\.pirate$/, "");
    const shouldUseRedditClaim = redditImportSummary
      && normalizeGlobalHandleStem(desiredLabel) === normalizeGlobalHandleStem(redditImportSummary.redditUsername);
    trackAnalyticsEvent({
      eventName: "handle_claim_started",
      properties: {
        surface: "settings",
        source: shouldUseRedditClaim ? "verified_reddit_username" : "free_cleanup_rename",
        handle_length: normalizeGlobalHandleStem(desiredLabel).length,
      },
    });
    const rename = shouldUseRedditClaim
      ? api.profiles.claimRedditHandle(desiredLabel)
      : api.profiles.renameHandle(desiredLabel);

    void rename
      .then(() => api.profiles.getMe().then((profile) => updateSessionProfile(profile)))
      .then(async () => {
        if (onboardingStatus) {
          updateSessionOnboarding({ ...onboardingStatus, cleanup_rename_available: false });
        }
        setPhase("buy_name");
      })
      .catch((e: unknown) => {
        trackAnalyticsEvent({
          eventName: "handle_claim_failed",
          properties: {
            surface: "settings",
            source: shouldUseRedditClaim ? "verified_reddit_username" : "free_cleanup_rename",
            handle_length: normalizeGlobalHandleStem(desiredLabel).length,
            failure_code: typeof (e as { code?: unknown })?.code === "string" ? (e as { code: string }).code : "unknown",
          },
        });
        setError(e instanceof Error ? e.message : messages.renameFailedError);
      })
      .finally(() => setBusy(false));
  }, [busy, api, generatedHandle, messages, onboardingStatus, redditImportSummary, session?.profile?.global_handle?.label]);

  const handleGenerateHandle = React.useCallback(() => {
    const sourceUsername = (redditImportSummary?.redditUsername
      ?? redditVerification.verifiedUsername
      ?? redditUsername)
      || session?.profile?.global_handle?.label
      || "name";
    const fallbackHandle = generateRedditFallbackHandle(sourceUsername);
    setGeneratedHandle(fallbackHandle);
    buyNameValueRef.current = fallbackHandle;
    setBuyNameValue(fallbackHandle);
    setPaidQuote(null);
    setPaidClaimedHandle(null);
    setError(null);
    void quoteHandleCandidate(fallbackHandle);
  }, [quoteHandleCandidate, redditImportSummary?.redditUsername, redditUsername, redditVerification.verifiedUsername, session?.profile?.global_handle?.label]);

  const handleGenerateBuyName = React.useCallback(() => {
    const fallbackHandle = generateSignupStyleHandle();
    buyNameValueRef.current = fallbackHandle;
    setBuyNameValue(fallbackHandle);
    setGeneratedHandle(fallbackHandle);
    setPaidQuote(null);
    setPaidClaimedHandle(null);
    setError(null);
  }, []);

  const redditImportDone = importJob.status === "succeeded" || importJob.status === "partial_success";
  const cleanupRenameAvailable = Boolean(onboardingStatus?.cleanup_rename_available);

  const handleBuyNameChange = React.useCallback((value: string) => {
    buyNameQuoteRequestRef.current += 1;
    buyNameValueRef.current = value;
    setBuyNameValue(value);
    setPaidQuote(null);
    setPaidClaimedHandle(null);
    setError(null);
  }, []);

  const quoteBuyName = React.useCallback((input: {
    desiredValue?: string;
    surfaceErrors: boolean;
  }) => {
    if (busy) return;
    const value = input.desiredValue ?? buyNameValue;
    const label = value.trim().replace(/\.pirate$/iu, "");
    if (!label) {
      if (input.surfaceErrors) {
        setError(messages.chooseHandleError);
      }
      setPaidQuote(null);
      setBuyNameChecking(false);
      return;
    }
    const currentHandle = session?.profile?.global_handle?.label ?? "";
    if (isCurrentGlobalHandleCandidate(label, currentHandle)) {
      setPaidQuote(null);
      setBuyNameChecking(false);
      setError(null);
      return;
    }
    const requestId = buyNameQuoteRequestRef.current + 1;
    buyNameQuoteRequestRef.current = requestId;
    setBuyNameChecking(true);
    setError(null);
    setPaidClaimedHandle(null);
    void api.profiles.quoteHandleUpgrade(label)
      .then((quote) => {
        if (buyNameQuoteRequestRef.current !== requestId) return;
        setPaidQuote(quote);
      })
      .catch((caught: unknown) => {
        if (buyNameQuoteRequestRef.current !== requestId) return;
        setPaidQuote(null);
        if (input.surfaceErrors) {
          setError(getErrorMessage(caught, "Could not quote this name."));
        }
      })
      .finally(() => {
        if (buyNameQuoteRequestRef.current === requestId) {
          setBuyNameChecking(false);
        }
      });
  }, [api, busy, buyNameValue, messages.chooseHandleError, session?.profile?.global_handle?.label]);

  React.useEffect(() => {
    if (!enabled || phase !== "buy_name" || paidClaimedHandle) return;
    const label = buyNameValue.trim().replace(/\.pirate$/iu, "");
    if (!label) {
      setPaidQuote(null);
      setBuyNameChecking(false);
      return;
    }
    const currentHandle = session?.profile?.global_handle?.label ?? "";
    if (isCurrentGlobalHandleCandidate(label, currentHandle)) {
      setPaidQuote(null);
      setBuyNameChecking(false);
      return;
    }
    setBuyNameChecking(true);
    const timeout = window.setTimeout(() => {
      quoteBuyName({ desiredValue: label, surfaceErrors: false });
    }, 350);
    return () => {
      window.clearTimeout(timeout);
      setBuyNameChecking(false);
    };
  }, [buyNameValue, enabled, paidClaimedHandle, phase, quoteBuyName, session?.profile?.global_handle?.label]);

  const handleBuyNameQuote = React.useCallback(() => {
    quoteBuyName({ surfaceErrors: true });
  }, [quoteBuyName]);

  const handleBuyNameClaim = React.useCallback(() => {
    const desiredLabel = buyNameValue.trim().replace(/\.pirate$/iu, "");
    const quote = paidQuote;
    const freeCleanupClaim = isFreeCleanupHandleQuote({
      cleanupRenameAvailable,
      label: desiredLabel,
      quote,
    });
    const paidClaim = Boolean(quote?.eligible && quote.quote && (quote.price_cents ?? 0) > 0);
    if (
      busy
      || isCurrentGlobalHandleCandidate(desiredLabel, session?.profile?.global_handle?.label ?? "")
      || (!freeCleanupClaim && !paidClaim)
    ) return;
    setBusy(true);
    setError(null);
    let fundingTxRef: Hex | null = null;
    void (async () => {
      if (freeCleanupClaim) {
        await api.profiles.renameHandle(desiredLabel);
        const profile = await api.profiles.getMe();
        updateSessionProfile(profile);
        if (onboardingStatus) {
          updateSessionOnboarding({ ...onboardingStatus, cleanup_rename_available: false });
          setOnboardingStatus((current) => current ? { ...current, cleanup_rename_available: false } : current);
        }
        setPaidClaimedHandle(profile.global_handle.label);
        setPaidQuote(null);
        setBuyNameValue(profile.global_handle.label.replace(/\.pirate$/iu, ""));
        return;
      }
      if (!quote?.quote || !quote.payment_instructions) {
        throw new Error("This paid quote is missing payment instructions.");
      }
      const settlementWalletAttachment = session?.user.primary_wallet_attachment;
      if (!settlementWalletAttachment) {
        throw new Error(messages.connectPrimaryWalletError);
      }
      const fundingWallet = findConnectedFundingWallet({
        connectedWallets,
        primaryWalletAddress: session.profile.primary_wallet_address,
      });
      if (!fundingWallet) {
        throw new Error(messages.reconnectPrimaryWalletError);
      }
      const submittedFundingTxRef = await executeHandleUsdcCheckout({
        paymentInstructions: quote.payment_instructions,
        wallet: fundingWallet,
      });
      fundingTxRef = submittedFundingTxRef;
      const handle = await api.profiles.claimPaidHandle({
        quote: quote.quote,
        settlement_wallet_attachment: settlementWalletAttachment,
        funding_tx_ref: submittedFundingTxRef,
      });
      updateSessionProfile(await api.profiles.getMe());
      setPaidClaimedHandle(handle.label);
      setPaidQuote(null);
      setBuyNameValue(handle.label.replace(/\.pirate$/iu, ""));
    })()
      .catch((caught: unknown) => {
        const fallback = fundingTxRef ? "Could not claim this name." : "Could not complete payment.";
        setError(caught instanceof ApiError
          ? getErrorMessage(caught, fallback)
          : getWalletTransactionErrorMessage(caught, fallback));
      })
      .finally(() => setBusy(false));
  }, [api, busy, buyNameValue, cleanupRenameAvailable, connectedWallets, messages.connectPrimaryWalletError, messages.reconnectPrimaryWalletError, onboardingStatus, paidQuote, session]);

  return {
    phase,
    onPhaseChange: setPhase,
    busy,
    phaseError: error,
    redditVerification,
    onRedditUsernameChange: React.useCallback((value: string) => {
      setRedditUsername(value);
      setRedditVerification((prev) => ({ ...prev, usernameValue: value }));
    }, []),
    importJob,
    redditImportSummary,
    generatedHandle,
    handleSuggestion,
    buyNameValue,
    buyNameChecking,
    paidQuote,
    paidClaimedHandle,
    cleanupRenameAvailable,
    onImportKarmaNext: handleImportKarmaNext,
    onImportKarmaSkip: handleSkipRedditImport,
    onHandleChange: React.useCallback((value: string) => setGeneratedHandle(value), []),
    onGenerateHandle: handleGenerateHandle,
    onChooseNameContinue: handleChooseNameContinue,
    onChooseNameBack: handleChooseNameBack,
    onBuyNameChange: handleBuyNameChange,
    onBuyNameGenerate: handleGenerateBuyName,
    onBuyNameQuote: handleBuyNameQuote,
    onBuyNameClaim: handleBuyNameClaim,
    redditImportDone,
  };
}
