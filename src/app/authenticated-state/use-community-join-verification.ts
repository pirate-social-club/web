"use client";

import * as React from "react";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { type ApiError } from "@/lib/api/client";
import {
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getVerificationPromptCopy,
  getVerificationRequirementsForGates,
  getMissingCapabilitiesFromGateEvaluation,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { toast } from "@/components/primitives/sonner";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";

type SelfVerificationOptions = {
  showToastOnError?: boolean;
  missingCapabilities?: string[] | null;
  membershipGateSummaries?: ApiJoinEligibility["membership_gate_summaries"] | null;
  skipModal?: boolean;
};

type SelfVerificationStartResult = {
  href?: string | null;
  launched?: false;
  openedModal?: boolean;
  started: boolean;
};

type UseCommunityJoinVerificationInput = {
  communityId: string;
  eligibility: ApiJoinEligibility | null;
  locale: string;
  onJoined?: () => void;
  refetchEligibility: () => Promise<ApiJoinEligibility>;
};

type JoinAttemptOptions = {
  note?: string | null;
};

type JoinAttemptResult = "blocked" | "failed" | "joined" | "requested";

const SELF_CAPABILITIES = ["unique_human", "age_over_18", "minimum_age", "nationality", "gender"] as const;
type SelfCapability = typeof SELF_CAPABILITIES[number];

function isSelfCapability(value: string): value is SelfCapability {
  return (SELF_CAPABILITIES as readonly string[]).includes(value);
}

export function useCommunityJoinVerification({
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

  const {
    startVerification: startVeryVerification,
    verificationLoading: veryLoading,
    verificationError: veryError,
  } = useVeryVerification({
    verified: false,
    verificationIntent: "community_join",
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      if (updatedEligibility.status === "joinable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") setJoinRequested(true);
        if (joinResult.status === "joined") onJoined?.();
        await refetchEligibility();
      }
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
      if (updatedEligibility.status === "joinable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") {
          setJoinRequested(true);
        }
        if (joinResult.status === "joined") {
          onJoined?.();
        }
        await refetchEligibility();
      } else if (updatedEligibility.status === "gate_failed") {
        setJoinError("Verification succeeded but you still do not meet this community's requirements.");
      }
    },
    startErrorMessage: "Could not start self verification",
    storageKey: `pirate_pending_self_join_session:${communityId}`,
    verificationIntent: "community_join",
  });

  const startSelfVerification = React.useCallback(async ({
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

	  React.useEffect(() => {
	    if (veryError) {
	      toast.error(veryError);
	    }
	  }, [veryError]);

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

  const handleJoin = React.useCallback(async (options: JoinAttemptOptions = {}): Promise<JoinAttemptResult> => {
    setJoinLoading(true);
    setJoinError(null);
    trackAnalyticsEvent({
      eventName: "community_join_requested",
      communityId,
      properties: { status: eligibility?.status ?? "unknown" },
    });
    if (eligibility?.status === "verification_required") {
      setJoinLoading(false);
      const provider = resolveSuggestedVerificationProvider(eligibility);
	      if (provider === "very") {
	        await startVeryVerification();
	      } else if (provider === "passport") {
	        return await refreshPassportAndJoin(eligibility);
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
	          if (provider === "very") {
	            await startVeryVerification();
	          } else if (provider === "passport" || details.failure_reason === "wallet_score_too_low") {
	            return await refreshPassportAndJoin(details);
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
	  }, [api, communityId, eligibility, locale, onJoined, refetchEligibility, refreshPassportAndJoin, startSelfVerification, startVeryVerification]);

  return {
    handleJoin,
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
    startVeryVerification,
    veryLoading,
  };
}
