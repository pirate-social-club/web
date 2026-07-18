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
  });
}

export async function completeAltchaAction(input: {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  context: InteractionAllowedContext;
  pendingInteraction: PendingInteraction | null;
}) {
  const pendingInteraction = input.pendingInteraction;
  if (!pendingInteraction) {
    return;
  }

  await pendingInteraction.onAllowed(input.context);
  input.clearPendingInteraction();
  input.closeModal();
}
