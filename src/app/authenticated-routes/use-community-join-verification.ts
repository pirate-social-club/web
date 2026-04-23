"use client";

import * as React from "react";
import type { GateFailureDetails as ApiGateFailureDetails } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { VerificationSession } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { getApiErrorMessage, type ApiError } from "@/lib/api/client";
import {
  getGateFailureMessage,
  getPassportPromptCapabilities,
  getVerificationCapabilitiesForProvider,
  getVerificationPromptCopy,
  getVerificationRequirementsForGates,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";
import { getSelfVerificationLaunchHref, parseSelfCallback } from "@/lib/self-verification";
import { toast } from "@/components/primitives/sonner";
import { useVeryVerification } from "@/lib/verification/use-very-verification";

import {
  clearPendingSelfJoinSession,
  readPendingSelfJoinSession,
  writePendingSelfJoinSession,
} from "./community-session-helpers";

type SelfVerificationOptions = {
  showToastOnError?: boolean;
  missingCapabilities?: string[] | null;
  membershipGateSummaries?: ApiJoinEligibility["membership_gate_summaries"] | null;
};

type SelfVerificationStartResult = {
  launched?: false;
  started: boolean;
};

type SelfPrompt = {
  actionLabel: string;
  description: string;
  href: string | null;
  qrValue: string | null;
  title: string;
};

type UseCommunityJoinVerificationInput = {
  communityId: string;
  eligibility: ApiJoinEligibility | null;
  locale: string;
  onJoined?: () => void;
  refetchEligibility: () => Promise<ApiJoinEligibility>;
};

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
  const [selfSession, setSelfSession] = React.useState<VerificationSession | null>(null);
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
    onVerified: async () => {
      const updatedEligibility = await refetchEligibility();
      if (updatedEligibility.status === "joinable" || updatedEligibility.status === "requestable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") setJoinRequested(true);
        await refetchEligibility();
      }
    },
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
      setSelfError(message);
      if (showToastOnError) {
        toast.error(message);
      }
      return { launched: false, started: false };
    }

    setSelfLoading(true);
    setSelfError(null);
    setJoinError(null);
    try {
      const result = await api.verification.startSession({
        provider: "self",
        requested_capabilities: requestedCapabilities,
        verification_requirements: verificationRequirements,
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
      return { started: true };
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not start self verification");
      setSelfError(message);
      if (showToastOnError) {
        toast.error(message);
      }
      return { started: false };
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, eligibility]);

  const completeSelfAndRetryJoin = React.useCallback(async ({
    proof,
    verificationSessionId,
  }: {
    proof: string;
    verificationSessionId: string;
  }) => {
    setSelfLoading(true);
    setSelfError(null);
    try {
      await api.verification.completeSession(verificationSessionId, { proof });
      setSelfSession(null);
      setSelfRequestedCapabilities([]);
      setSelfModalOpen(false);
      clearPendingSelfJoinSession(communityId);
      const updatedEligibility = await refetchEligibility();

      if (updatedEligibility.status === "joinable" || updatedEligibility.status === "requestable") {
        const joinResult = await api.communities.join(communityId);
        if (joinResult.status === "requested") setJoinRequested(true);
        await refetchEligibility();
      } else if (updatedEligibility.status === "gate_failed") {
        setJoinError("Verification succeeded but you still do not meet this community's requirements.");
      }
    } catch (error: unknown) {
      setSelfError(getApiErrorMessage(error, "Verification completion failed"));
    } finally {
      setSelfLoading(false);
    }
  }, [api, communityId, refetchEligibility]);

  React.useEffect(() => {
    if (veryError) {
      toast.error(veryError);
    }
  }, [veryError]);

  const handleJoin = React.useCallback(async () => {
    setJoinLoading(true);
    setJoinError(null);
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
      return;
    }

    try {
      const result = await api.communities.join(communityId);
      if (result.status === "requested") setJoinRequested(true);
      if (result.status === "joined") onJoined?.();
      await refetchEligibility();
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
          return;
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
    } finally {
      setJoinLoading(false);
    }
  }, [api, communityId, eligibility, locale, onJoined, refetchEligibility, startSelfVerification, startVeryVerification]);

  React.useEffect(() => {
    function handleSelfCallback() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("proof") && !url.searchParams.has("error") && url.searchParams.get("expired") !== "true") return;

      const pendingSession = readPendingSelfJoinSession(communityId);
      if (!pendingSession || pendingSession.communityId !== communityId) {
        setSelfError("Verification session was lost. Start the ID check again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      setSelfRequestedCapabilities(pendingSession.requestedCapabilities);
      const result = parseSelfCallback(url);
      if (result.status === "completed") {
        void completeSelfAndRetryJoin({
          proof: result.proof,
          verificationSessionId: pendingSession.verificationSessionId,
        });
      } else if (result.status === "expired") {
        setSelfError("Verification session expired. Please try again.");
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
      } else {
        setSelfError(result.reason);
        setSelfSession(null);
        setSelfRequestedCapabilities([]);
        setSelfModalOpen(false);
        clearPendingSelfJoinSession(communityId);
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener("popstate", handleSelfCallback);
    handleSelfCallback();
    return () => window.removeEventListener("popstate", handleSelfCallback);
  }, [communityId, completeSelfAndRetryJoin]);

  const handleSelfModalOpenChange = React.useCallback((open: boolean) => {
    setSelfModalOpen(open);
    if (!open) {
      setSelfSession(null);
      setSelfRequestedCapabilities([]);
      setSelfError(null);
      clearPendingSelfJoinSession(communityId);
    }
  }, [communityId]);

  const selfPrompt = React.useMemo<SelfPrompt | null>(() => {
    if (!selfSession) {
      return null;
    }

    const href = getSelfVerificationLaunchHref(selfSession.launch?.self_app);
    return {
      ...getVerificationPromptCopy("self", selfRequestedCapabilities, { locale }),
      href,
      qrValue: href,
    };
  }, [locale, selfRequestedCapabilities, selfSession]);

  return {
    handleJoin,
    handleSelfModalOpenChange,
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
