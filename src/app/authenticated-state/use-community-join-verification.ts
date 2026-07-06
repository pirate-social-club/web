"use client";

import * as React from "react";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { type ApiError } from "@/lib/api/client";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import {
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getVerificationPromptCopy,
  getVerificationRequirementsForGates,
  getMissingCapabilitiesFromGateEvaluation,
  hasZkPassportDocumentProviderOption,
  hasAltchaProofAction,
  hasOnlyWalletGateRequirements,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { toast } from "@/components/primitives/sonner";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useZkPassportVerification } from "@/lib/verification/use-zkpassport-verification";

type SelfVerificationOptions = {
  deeplinkCallbackBaseHref?: string | null;
  showToastOnError?: boolean;
  missingCapabilities?: string[] | null;
  membershipGateSummaries?: ApiJoinEligibility["membership_gate_summaries"] | null;
  skipModal?: boolean;
};

type ZkPassportVerificationOptions = {
  deferOpen?: boolean;
  showToastOnError?: boolean;
  missingCapabilities?: string[] | null;
  membershipGateSummaries?: ApiJoinEligibility["membership_gate_summaries"] | null;
};

type SelfVerificationStartResult = {
  error?: string;
  href?: string | null;
  launched?: false;
  openedModal?: boolean;
  started: boolean;
};

type UseCommunityJoinVerificationInput = {
  autoJoinAfterVerification?: boolean;
  communityId: string;
  eligibility: ApiJoinEligibility | null;
  locale: string;
  onJoined?: () => void;
  refetchEligibility: () => Promise<ApiJoinEligibility>;
};

type JoinAttemptOptions = {
  altchaPayload?: string | null;
  note?: string | null;
};

type JoinAttemptResult = "blocked" | "failed" | "joined" | "requested";

const SELF_CAPABILITIES = ["unique_human", "age_over_18", "minimum_age", "nationality", "gender"] as const;
type SelfCapability = typeof SELF_CAPABILITIES[number];
const ZKPASSPORT_CAPABILITIES = ["minimum_age", "nationality", "gender"] as const;
type ZkPassportCapability = typeof ZKPASSPORT_CAPABILITIES[number];

function isSelfCapability(value: string): value is SelfCapability {
  return (SELF_CAPABILITIES as readonly string[]).includes(value);
}

function isZkPassportCapability(value: string): value is ZkPassportCapability {
  return (ZKPASSPORT_CAPABILITIES as readonly string[]).includes(value);
}

function isTelegramMiniAppRuntime(): boolean {
  return typeof window !== "undefined" && Boolean((window as Window & {
    Telegram?: { WebApp?: unknown };
  }).Telegram?.WebApp);
}

export function useCommunityJoinVerification({
  autoJoinAfterVerification = true,
  communityId,
  eligibility,
  locale,
  onJoined,
  refetchEligibility,
}: UseCommunityJoinVerificationInput) {
  const api = useApi();
	  const [joinLoading, setJoinLoading] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
	  const [joinRequested, setJoinRequested] = React.useState(false);
	  const [passportLoading, setPassportLoading] = React.useState(false);
  const [altchaPayload, setAltchaPayload] = React.useState<string | null>(null);
  const altchaRequired = eligibility ? hasAltchaProofAction(eligibility) : false;
  const walletGateRequired = eligibility?.status === "verification_required" && hasOnlyWalletGateRequirements(eligibility);
  const privyRuntime = usePiratePrivyRuntime();
  const { connectedWallets, walletsReady } = usePiratePrivyWallets({ enabled: walletGateRequired });
  const walletSnapshot = React.useMemo(
    () => connectedWallets.map((wallet) => wallet.address.toLowerCase()).sort().join(","),
    [connectedWallets],
  );
  const [walletGateVerificationPending, setWalletGateVerificationPending] = React.useState(false);
  const walletGateStartSnapshotRef = React.useRef<string | null>(null);

  const joinIfEligible = React.useCallback(async (
    updatedEligibility: ApiJoinEligibility,
  ): Promise<JoinAttemptResult> => {
    if (!autoJoinAfterVerification) {
      return "blocked";
    }
    if (updatedEligibility.status === "joinable") {
      const joinResult = await api.communities.join(communityId);
      if (joinResult.status === "requested") setJoinRequested(true);
      if (joinResult.status === "joined") onJoined?.();
      await refetchEligibility();
      return joinResult.status === "requested" ? "requested" : "joined";
    }
    if (updatedEligibility.status === "gate_failed") {
      setJoinError(getGateFailureMessage(updatedEligibility, { locale }) ?? "You still do not meet this community's requirements.");
    }
    return "blocked";
  }, [api, autoJoinAfterVerification, communityId, locale, onJoined, refetchEligibility]);

  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
    verificationHref: veryHref,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      await joinIfEligible(updatedEligibility);
    },
  });

  const {
    handleModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerificationFlow,
  } = useSelfVerification({
    completeErrorMessage: "Verification completion failed",
    locale,
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      await joinIfEligible(updatedEligibility);
    },
    startErrorMessage: "Could not start self verification",
    storageKey: `pirate_pending_self_join_session:${communityId}`,
    verificationIntent: "community_join",
  });

  const {
    startVerification: startZkPassportVerificationFlow,
    verificationError: zkPassportError,
    verificationHref: zkPassportHref,
    verificationLoading: zkPassportLoading,
  } = useZkPassportVerification({
    verificationIntent: "community_join",
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      await joinIfEligible(updatedEligibility);
    },
  });

  const startSelfVerification = React.useCallback(async ({
    deeplinkCallbackBaseHref,
    showToastOnError = false,
    missingCapabilities,
    membershipGateSummaries,
    skipModal,
  }: SelfVerificationOptions = {}): Promise<SelfVerificationStartResult> => {
    const rawCapabilities = missingCapabilities ?? (eligibility ? getMissingCapabilitiesFromGateEvaluation(eligibility) : []);
    const activeGateSummaries = membershipGateSummaries ?? eligibility?.membership_gate_summaries ?? [];
    const verificationRequirements = getVerificationRequirementsForGates(activeGateSummaries);
    const selfCapabilities = rawCapabilities.filter(isSelfCapability);
    const requestedCapabilities = SELF_CAPABILITIES.filter((capability) =>
      capability !== "age_over_18" && selfCapabilities.includes(capability)
    );

    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
      const message = "This community is missing the Self verification details needed to continue.";
      if (showToastOnError) {
        toast.error(message);
      }
      setJoinError(message);
      return { launched: false, started: false };
    }

    const result = await startSelfVerificationFlow({
      deeplinkCallbackBaseHref,
      requestedCapabilities,
      unavailableMessage: "This community is missing the Self verification details needed to continue.",
      verificationRequirements,
      skipModal,
    });
    if (!result.started && showToastOnError && result.error) {
      toast.error(result.error);
    }
    return result;
  }, [eligibility, startSelfVerificationFlow]);

  const startZkPassportVerification = React.useCallback(async ({
    deferOpen = false,
    showToastOnError = false,
    missingCapabilities,
    membershipGateSummaries,
  }: ZkPassportVerificationOptions = {}): Promise<{ error?: string; href?: string | null; started: boolean }> => {
    const rawCapabilities = missingCapabilities ?? (eligibility ? getMissingCapabilitiesFromGateEvaluation(eligibility) : []);
    const activeGateSummaries = membershipGateSummaries ?? eligibility?.membership_gate_summaries ?? [];
    const verificationRequirements = getVerificationRequirementsForGates(activeGateSummaries);
    const requestedCapabilities = ZKPASSPORT_CAPABILITIES.filter((capability) =>
      rawCapabilities.some(isZkPassportCapability) && rawCapabilities.includes(capability)
    );

    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
      const message = "This community is missing the ZKPassport verification details needed to continue.";
      if (showToastOnError) {
        toast.error(message);
      }
      setJoinError(message);
      return { error: message, href: null, started: false };
    }

    const result = await startZkPassportVerificationFlow({
      deferOpen,
      requestedCapabilities,
      unavailableMessage: "This community is missing the ZKPassport verification details needed to continue.",
      verificationRequirements,
    });
    if (!result.started && showToastOnError && result.error) {
      toast.error(result.error);
    }
    return result;
  }, [eligibility, startZkPassportVerificationFlow]);

	  React.useEffect(() => {
	    if (veryError) {
	      toast.error(veryError);
	    }
	  }, [veryError]);

  React.useEffect(() => {
    if (zkPassportError) {
      toast.error(zkPassportError);
    }
  }, [zkPassportError]);

	  const refreshPassportAndJoin = React.useCallback(async (
	    details?: Pick<ApiJoinEligibility, "membership_gate_summaries" | "gate_evaluation" | "wallet_score_status" | "failure_reason"> | ApiGateFailureDetails | null,
	  ): Promise<JoinAttemptResult> => {
	    setPassportLoading(true);
	    setJoinError(null);
	    try {
	      const refreshed = await api.verification.refreshPassportWalletScore({ community: communityId });
	      const updatedEligibility = refreshed.join_eligibility ?? await refetchEligibility();
	      if (updatedEligibility.status === "joinable") {
	        const joinResult = await api.communities.join(communityId);
	        if (joinResult.status === "requested") setJoinRequested(true);
	        if (joinResult.status === "joined") onJoined?.();
	        await refetchEligibility();
	        return joinResult.status === "requested" ? "requested" : "joined";
	      }
	      await refetchEligibility();
	      const gateFailureMessage = updatedEligibility.status === "gate_failed"
	        ? getGateFailureMessage(updatedEligibility, { locale })
	        : null;
	      setJoinError(gateFailureMessage ?? getVerificationPromptCopy(
	        "passport",
	        getPassportPromptCapabilities(details ?? updatedEligibility),
	        { locale },
	      ).description);
	      return "blocked";
	    } catch (error: unknown) {
	      const apiError = error as ApiError;
	      const message = apiError?.message ?? "Could not refresh Passport score";
	      setJoinError(message);
	      toast.error(message);
	      return "failed";
	    } finally {
	      setPassportLoading(false);
	    }
	  }, [api, communityId, locale, onJoined, refetchEligibility]);

  React.useEffect(() => {
    if (!walletGateVerificationPending || !walletsReady) {
      return;
    }
    if (walletGateStartSnapshotRef.current === walletSnapshot) {
      return;
    }

    void (async () => {
      try {
        const updatedEligibility = await refetchEligibility();
        await joinIfEligible(updatedEligibility);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        const message = apiError?.message ?? "Could not refresh wallet gate eligibility.";
        setJoinError(message);
        toast.error(message);
      } finally {
        setWalletGateVerificationPending(false);
      }
    })();
  }, [
    joinIfEligible,
    refetchEligibility,
    walletGateVerificationPending,
    walletSnapshot,
    walletsReady,
  ]);

  const handleJoin = React.useCallback(async (options: JoinAttemptOptions = {}): Promise<JoinAttemptResult> => {
    const resolvedAltchaPayload = options.altchaPayload ?? altchaPayload;
    setJoinLoading(true);
    setJoinError(null);
    trackAnalyticsEvent({
      eventName: "community_join_requested",
      communityId,
      properties: { status: eligibility?.status ?? "unknown" },
    });
    if (eligibility?.status === "verification_required") {
      setJoinLoading(false);
      if (hasOnlyWalletGateRequirements(eligibility)) {
        if (!privyRuntime.configured || !privyRuntime.connect) {
          setJoinError("Connect the wallet that holds the required NFT from wallet settings, then try again.");
          return "blocked";
        }
        walletGateStartSnapshotRef.current = walletSnapshot;
        setWalletGateVerificationPending(true);
        privyRuntime.connect();
        return "blocked";
      }
      if (altchaRequired) {
        if (!resolvedAltchaPayload) {
          setJoinError("Complete the proof-of-work check first.");
          return "blocked";
        }
        try {
          setJoinLoading(true);
          const result = await api.communities.join(
            communityId,
            { note: options.note ?? null },
            { altchaPayload: resolvedAltchaPayload },
          );
          setAltchaPayload(null);
          if (result.status === "requested") setJoinRequested(true);
          if (result.status === "joined") onJoined?.();
          await refetchEligibility();
          return result.status === "requested" ? "requested" : "joined";
        } catch (error: unknown) {
          const apiError = error as ApiError;
          setAltchaPayload(null);
          setJoinError(apiError?.message ?? "Proof-of-work check failed.");
          return "failed";
        } finally {
          setJoinLoading(false);
        }
      }
      const provider = resolveSuggestedVerificationProvider(eligibility);
      const resolvedProvider = provider === "self" && isTelegramMiniAppRuntime() && hasZkPassportDocumentProviderOption(eligibility)
        ? "zkpassport"
        : provider;
	      if (resolvedProvider === "very") {
	        await startVeryVerification();
	      } else if (resolvedProvider === "passport") {
	        return await refreshPassportAndJoin(eligibility);
	      } else if (resolvedProvider === "zkpassport") {
	        await startZkPassportVerification();
	      } else {
	        await startSelfVerification();
	      }
	      return "blocked";
    }

    try {
      const result = await api.communities.join(communityId, { note: options.note ?? null });
      if (result.status === "requested") setJoinRequested(true);
      if (result.status === "joined") onJoined?.();
      await refetchEligibility();
      return result.status === "requested" ? "requested" : "joined";
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError?.code === "gate_failed" && apiError.details) {
        const details = apiError.details as ApiGateFailureDetails;
	        if (details.failure_reason === "missing_verification" || details.failure_reason === "wallet_score_too_low") {
	          setJoinLoading(false);
	          const provider = resolveSuggestedVerificationProvider(details);
          const resolvedProvider = provider === "self" && isTelegramMiniAppRuntime() && hasZkPassportDocumentProviderOption(details)
            ? "zkpassport"
            : provider;
	          if (resolvedProvider === "very") {
	            await startVeryVerification();
	          } else if (resolvedProvider === "passport" || details.failure_reason === "wallet_score_too_low") {
	            return await refreshPassportAndJoin(details);
	          } else if (resolvedProvider === "zkpassport") {
	            await startZkPassportVerification({
              missingCapabilities: getMissingCapabilitiesFromGateEvaluation(details),
              membershipGateSummaries: details.membership_gate_summaries ?? null,
            });
	          } else {
	            await startSelfVerification({
              missingCapabilities: getMissingCapabilitiesFromGateEvaluation(details),
              membershipGateSummaries: details.membership_gate_summaries ?? null,
            });
          }
          return "blocked";
        }

        const gateFailureMessage = getGateFailureMessage(details, { locale });
        if (gateFailureMessage) {
          setJoinError(gateFailureMessage);
        } else {
          toast.error(apiError.message);
        }
      } else {
        toast.error(apiError?.message ?? "Join failed");
      }
      return "failed";
    } finally {
      setJoinLoading(false);
    }
	  }, [altchaPayload, altchaRequired, api, communityId, eligibility, locale, onJoined, privyRuntime, refetchEligibility, refreshPassportAndJoin, startSelfVerification, startVeryVerification, startZkPassportVerification, walletSnapshot]);

  return {
    handleJoin,
    altchaAction: `community:${communityId}`,
    altchaPayload,
    altchaRequired,
    altchaScope: "community_join" as const,
    setAltchaPayload,
    handleSelfModalOpenChange: handleModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    joinError,
	    joinLoading,
	    joinRequested,
	    passportLoading,
	    refreshPassportScore: refreshPassportAndJoin,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startSelfVerification,
    startZkPassportVerification,
    startVeryVerification,
    veryLoading,
    veryHref,
    zkPassportError,
    zkPassportHref,
    zkPassportLoading,
  };
}
