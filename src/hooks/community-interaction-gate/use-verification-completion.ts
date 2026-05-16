"use client";

import * as React from "react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { getErrorMessage } from "@/lib/error-utils";
import {
  completeCommunityJoinFromEligibility,
  type InteractionGatePanelCopy,
  type JoinCommunity,
} from "./join-completion";
import {
  type CommunityGateData,
  type InteractionGateCopy,
  type ModalState,
  type PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

type SetModalState = React.Dispatch<React.SetStateAction<ModalState | null>>;

export function useVerificationCompletion({
  clearPendingInteraction,
  closeModal,
  gatesPanel,
  getJoinEligibility,
  interactionCopy,
  invalidateCommunityGate,
  joinCommunity,
  openCommunity,
  setModalState,
  showError,
  showSuccess,
  updateCachedGate,
}: {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  gatesPanel: InteractionGatePanelCopy;
  getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
  interactionCopy: InteractionGateCopy;
  invalidateCommunityGate: (communityId: string) => void;
  joinCommunity: JoinCommunity;
  openCommunity: (communityId: string) => void;
  setModalState: SetModalState;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  updateCachedGate: (communityId: string, gate: CommunityGateData) => void;
}) {
  const completeVerificationJoin = React.useCallback(async (
    pendingInteraction: PendingInteraction | null,
  ) => {
    if (!pendingInteraction) {
      showSuccess(interactionCopy.readyDescription);
      return;
    }

    try {
      await completeCommunityJoinFromEligibility({
        clearPendingInteraction,
        closeModal,
        gatesPanel,
        getJoinEligibility,
        interactionCopy,
        invalidateCommunityGate,
        joinCommunity,
        openCommunity,
        pendingInteraction,
        setModalState,
        updateCachedGate,
      });
    } catch (error: unknown) {
      showError(getErrorMessage(error, "Verification completed, but Pirate could not join this community."));
    }
  }, [
    clearPendingInteraction,
    closeModal,
    gatesPanel,
    getJoinEligibility,
    interactionCopy,
    invalidateCommunityGate,
    joinCommunity,
    openCommunity,
    setModalState,
    showError,
    showSuccess,
    updateCachedGate,
  ]);

  return { completeVerificationJoin };
}
