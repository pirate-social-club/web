"use client";

import * as React from "react";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { type ApiError } from "@/lib/api/client";
import {
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getVerificationCapabilitiesForProvider,
  getVerificationPromptCopy,
  getVerificationRequirementsForGates,
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
};

type SelfVerificationStartResult = {
  launched?: false;
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

const SELF_CAPABILITIES = ["unique_human", "age_over_18", "minimum_age", "nationality", "gender"];

function isSelfCapability(value: string): value is ApiJoinEligibility["missing_capabilities"][number] {
  return SELF_CAPABILITIES.includes(value);
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
        await refetchEligibility();
      }
    },
  });

  const {
    handleModalOpenChange,
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
  }: SelfVerificationOptions = {}): Promise<SelfVerificationStartResult> => {
    const rawCapabilities = missingCapabilities ?? eligibility?.missing_capabilities ?? [];
    const activeGateSummaries = membershipGateSummaries ?? eligibility?.membership_gate_summaries ?? [];
    const verificationRequirements = getVerificationRequirementsForGates(activeGateSummaries);
    const requestedCapabilities = getVerificationCapabilitiesForProvider(
      { missing_capabilities: rawCapabilities.filter((capability): capability is ApiJoinEligibility["missing_capabilities"][number] => isSelfCapability(capability)) },
      "self",
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
        setJoinError(getVerificationPromptCopy("passport", getPassportPromptCapabilities(eligibility), { locale }).description);
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
        if (details.failure_reason === "missing_verification") {
          setJoinLoading(false);
          const provider = resolveSuggestedVerificationProvider(details);
          if (provider === "very") {
            await startVeryVerification();
          } else if (provider === "passport") {
            setJoinError(getVerificationPromptCopy("passport", getPassportPromptCapabilities(details), { locale }).description);
          } else {
            await startSelfVerification({
              missingCapabilities: details.missing_capabilities,
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
  }, [api, communityId, eligibility, locale, onJoined, refetchEligibility, startSelfVerification, startVeryVerification]);

  return {
    handleJoin,
    handleSelfModalOpenChange: handleModalOpenChange,
    joinError,
    joinLoading,
    joinRequested,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startSelfVerification,
    startVeryVerification,
    veryLoading,
  };
}
