import type * as React from "react";
import type { JoinEligibility } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { buildCommunityPath } from "@/lib/community-routing";
import {
  completeCommunityJoinStartingWithJoin,
  type InteractionGatePanelCopy,
} from "./join-completion";
import {
  type CommunityGateData,
  type InteractionAllowedContext,
  type InteractionGateCopy,
  type ModalState,
  type PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";
import { logger } from "@/lib/logger";
import { isMembershipRequiredWriteRejection } from "./membership-write-rejection";

export type AltchaCommunitiesApi = {
  getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
  join: (
    communityId: string,
    body?: { note?: string | null },
    options?: { altchaPayload?: string | null },
  ) => Promise<{ status: string }>;
};

type SetModalState = React.Dispatch<React.SetStateAction<ModalState | null>>;

export async function completeAltchaJoin(input: {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  communitiesApi: AltchaCommunitiesApi;
  gatesPanel: InteractionGatePanelCopy;
  interactionCopy: InteractionGateCopy;
  invalidateCommunityGate: (communityId: string) => void;
  payload: string;
  pendingInteraction: PendingInteraction | null;
  setModalState: SetModalState;
  updateCachedGate: (communityId: string, gate: CommunityGateData) => void;
  rerunJoinedInteraction?: (
    pendingInteraction: PendingInteraction,
    joinedGate: CommunityGateData,
  ) => Promise<void> | void;
}) {
  const pendingInteraction = input.pendingInteraction;
  if (!pendingInteraction) {
    return;
  }

  await completeCommunityJoinStartingWithJoin({
    clearPendingInteraction: input.clearPendingInteraction,
    closeModal: input.closeModal,
    gatesPanel: input.gatesPanel,
    getJoinEligibility: input.communitiesApi.getJoinEligibility,
    interactionCopy: input.interactionCopy,
    invalidateCommunityGate: input.invalidateCommunityGate,
    joinCommunity: (communityId) =>
      input.communitiesApi.join(communityId, undefined, {
        altchaPayload: input.payload,
      }),
    openCommunity: (communityId) => navigate(buildCommunityPath(communityId)),
    pendingInteraction,
    setModalState: input.setModalState,
    updateCachedGate: input.updateCachedGate,
    onReadyAfterJoin: input.rerunJoinedInteraction,
  });
}

export async function completeAltchaAction(input: {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  context: InteractionAllowedContext;
  invalidateCommunityGate: (communityId: string) => void;
  pendingInteraction: PendingInteraction | null;
}) {
  const pendingInteraction = input.pendingInteraction;
  if (!pendingInteraction) {
    return;
  }

  try {
    await pendingInteraction.onAllowed(input.context);
  } catch (error) {
    if (isMembershipRequiredWriteRejection(error)) {
      input.invalidateCommunityGate(pendingInteraction.communityId);
      logger.warn("[interaction-gate] deferred write rejected for membership after allowed eligibility", {
        action: pendingInteraction.action,
        communityId: pendingInteraction.communityId,
        eligibilityStatus: pendingInteraction.gate.eligibility.status,
        postId: pendingInteraction.postId,
      });
    }
    throw error;
  }
  input.clearPendingInteraction();
  input.closeModal();
}
