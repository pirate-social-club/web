"use client";

import * as React from "react";
import type {
  JoinEligibility,
  RefreshPassportWalletScoreRequest,
  RefreshPassportWalletScoreResponse,
  RequestedVerificationCapability,
  VerificationRequirement,
} from "@pirate/api-contracts";

import { getErrorMessage } from "@/lib/error-utils";
import {
  getVerificationCapabilitiesForProvider,
  getVerificationRequirementsForGates,
} from "@/lib/identity-gates";
import {
  completeCommunityJoinFromEligibility,
  type InteractionGatePanelCopy,
  type JoinCommunity,
} from "./join-completion";
import type {
  BuildBlockedModalStateArgs,
  CommunityGateData,
  InteractionGateCopy,
  ModalState,
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

type SetModalState = React.Dispatch<React.SetStateAction<ModalState | null>>;
type StartDefaultVerificationInput = Parameters<
  NonNullable<BuildBlockedModalStateArgs["startDefaultVerification"]>
>[0];
type StartVerificationResult = Promise<{ started: boolean }>;

type StartSelfVerificationFlow = (options: {
  requestedCapabilities: RequestedVerificationCapability[];
  unavailableMessage: string;
  verificationRequirements?: VerificationRequirement[] | null;
  skipModal?: boolean;
}) => Promise<{
  error?: string;
  href?: string | null;
  openedModal?: boolean;
  started: boolean;
}>;

type RefreshPassportWalletScore = (
  input: RefreshPassportWalletScoreRequest,
) => Promise<RefreshPassportWalletScoreResponse>;

const SELF_VERIFICATION_UNAVAILABLE_MESSAGE =
  "This community is missing the Self verification details needed to continue.";

export function useDefaultVerificationActions({
  clearPendingInteraction,
  closeModal,
  gatesPanel,
  getJoinEligibility,
  getPendingInteraction,
  interactionCopy,
  invalidateCommunityGate,
  joinCommunity,
  openCommunity,
  openHref,
  refreshPassportWalletScore,
  setModalState,
  showError,
  startSelfVerificationFlow,
  startVeryVerification,
  updateCachedGate,
}: {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  gatesPanel: InteractionGatePanelCopy;
  getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
  getPendingInteraction: () => PendingInteraction | null;
  interactionCopy: InteractionGateCopy;
  invalidateCommunityGate: (communityId: string) => void;
  joinCommunity: JoinCommunity;
  openCommunity: (communityId: string) => void;
  openHref?: (href: string) => void;
  refreshPassportWalletScore: RefreshPassportWalletScore;
  setModalState: SetModalState;
  showError: (message: string) => void;
  startSelfVerificationFlow: StartSelfVerificationFlow;
  startVeryVerification: () => StartVerificationResult;
  updateCachedGate: (communityId: string, gate: CommunityGateData) => void;
}) {
  const [passportLoading, setPassportLoading] = React.useState(false);
  const openSelfHref = React.useCallback((href: string) => {
    if (openHref) {
      openHref(href);
      return;
    }
    window.location.href = href;
  }, [openHref]);

  const startNonPassportVerification = React.useCallback(async ({
    gate,
    provider,
  }: {
    gate: CommunityGateData;
    provider: "self" | "very";
  }): StartVerificationResult => {
    if (provider === "very") {
      const result = await startVeryVerification();
      if (result.started) {
        closeModal();
      }
      return result;
    }

    const requestedCapabilities = getVerificationCapabilitiesForProvider(gate.eligibility, "self");
    const verificationRequirements = getVerificationRequirementsForGates(
      gate.eligibility.membership_gate_summaries,
    );
    if (requestedCapabilities.length === 0 && verificationRequirements.length === 0) {
      showError(SELF_VERIFICATION_UNAVAILABLE_MESSAGE);
      return { started: false };
    }

    const result = await startSelfVerificationFlow({
      requestedCapabilities,
      unavailableMessage: SELF_VERIFICATION_UNAVAILABLE_MESSAGE,
      verificationRequirements,
      skipModal: true,
    });
    if (!result.started && result.error) {
      showError(result.error);
    }
    if (result.started) {
      closeModal();
      if (result.openedModal) {
        return { started: result.started };
      }
      if (result.href) {
        openSelfHref(result.href);
      } else {
        showError("Could not get Self app launch link.");
      }
    }
    return { started: result.started };
  }, [
    closeModal,
    openSelfHref,
    showError,
    startSelfVerificationFlow,
    startVeryVerification,
  ]);

  const startDefaultVerification = React.useCallback(async ({
    gate,
    provider,
  }: StartDefaultVerificationInput): StartVerificationResult => {
    if (provider !== "passport") {
      return await startNonPassportVerification({ gate, provider });
    }

    const pendingInteraction = getPendingInteraction();
    const communityId = pendingInteraction?.communityId ?? gate.preview.id;
    setPassportLoading(true);
    try {
      const refreshed = await refreshPassportWalletScore({ community: communityId });
      const initialEligibility =
        refreshed.join_eligibility ?? await getJoinEligibility(communityId);
      await completeCommunityJoinFromEligibility({
        clearPendingInteraction,
        closeModal,
        defaultVerificationLoadingProvider: "passport",
        fallbackAction: "reply_post",
        gate,
        gatesPanel,
        getJoinEligibility,
        initialEligibility,
        interactionCopy,
        invalidateCommunityGate,
        joinCommunity,
        openCommunity,
        pendingInteraction,
        setModalState,
        startDefaultVerification: async (input) => {
          if (input.provider === "passport") {
            return { started: false };
          }
          return await startNonPassportVerification({
            gate: input.gate,
            provider: input.provider,
          });
        },
        updateCachedGate,
      });
      return { started: true };
    } catch (error: unknown) {
      showError(getErrorMessage(error, "Could not refresh Passport score."));
      return { started: false };
    } finally {
      setPassportLoading(false);
    }
  }, [
    clearPendingInteraction,
    closeModal,
    gatesPanel,
    getJoinEligibility,
    getPendingInteraction,
    interactionCopy,
    invalidateCommunityGate,
    joinCommunity,
    openCommunity,
    refreshPassportWalletScore,
    setModalState,
    showError,
    startNonPassportVerification,
    updateCachedGate,
  ]);

  return {
    passportLoading,
    startDefaultVerification,
  };
}
