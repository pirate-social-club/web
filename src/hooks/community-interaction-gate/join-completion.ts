import type { JoinEligibility } from "@pirate/api-contracts";

import {
  createDefaultBlockedModalState,
  getReadyActionLabel,
  getReadyAfterJoinDescription,
  getRequirementStatuses,
  type BuildBlockedModalStateArgs,
  type CommunityGateData,
  type InteractionAction,
  type InteractionGateCopy,
  type ModalState,
  type PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

export type InteractionGatePanelCopy = {
  pendingRequestDescription: string;
  pendingRequestTitle: string;
};

export type JoinCommunity = (
  communityId: string,
) => Promise<{ status: string }>;

type JoinCompletionContext = {
  action: InteractionAction;
  communityId: string;
  gate: CommunityGateData;
  onAllowed?: PendingInteraction["onAllowed"];
  pendingInteraction: PendingInteraction | null;
};

type JoinCompletionInput = {
  clearPendingInteraction: () => void;
  closeModal: () => void;
  defaultVerificationLoadingProvider?: "self" | "very" | "passport" | null;
  fallbackAction?: InteractionAction;
  gate?: CommunityGateData;
  gatesPanel: InteractionGatePanelCopy;
  getJoinEligibility: (communityId: string) => Promise<JoinEligibility>;
  interactionCopy: InteractionGateCopy;
  invalidateCommunityGate: (communityId: string) => void;
  openCommunity: (communityId: string) => void;
  pendingInteraction: PendingInteraction | null;
  setModalState: (modalState: ModalState) => void;
  startDefaultVerification?: BuildBlockedModalStateArgs["startDefaultVerification"];
  updateCachedGate: (communityId: string, gate: CommunityGateData) => void;
  autoRunPendingInteraction?: boolean;
};

function resolveJoinCompletionContext(input: JoinCompletionInput): JoinCompletionContext | null {
  if (input.pendingInteraction) {
    return {
      action: input.pendingInteraction.action,
      communityId: input.pendingInteraction.communityId,
      gate: input.pendingInteraction.gate,
      onAllowed: input.pendingInteraction.onAllowed,
      pendingInteraction: input.pendingInteraction,
    };
  }

  if (!input.gate) {
    return null;
  }

  return {
    action: input.fallbackAction ?? "reply_post",
    communityId: input.gate.preview.id,
    gate: input.gate,
    pendingInteraction: null,
  };
}

function setPendingRequestModal(
  input: JoinCompletionInput,
  context: JoinCompletionContext,
  gate: CommunityGateData,
) {
  input.setModalState({
    description: input.gatesPanel.pendingRequestDescription,
    icon: "pending",
    requirements: context.gate.preview.membership_gate_summaries,
    requirementStatuses: getRequirementStatuses(gate),
    title: input.gatesPanel.pendingRequestTitle,
  });
}

function setReadyModal(input: JoinCompletionInput, context: JoinCompletionContext) {
  input.setModalState({
    description: context.pendingInteraction
      ? getReadyAfterJoinDescription(context.gate, context.action, {
          locale: input.interactionCopy.locale,
        })
      : input.interactionCopy.readyDescription,
    primaryAction: {
      label: context.pendingInteraction
        ? getReadyActionLabel(context.action, {
            locale: input.interactionCopy.locale,
          })
        : input.interactionCopy.readyTitle,
      onClick: async () => {
        input.closeModal();
        input.clearPendingInteraction();
        await context.onAllowed?.();
      },
    },
    requirements: [],
    requirementStatuses: [],
    icon: "ready",
    title: input.interactionCopy.readyTitle,
  });
}

function setBlockedModal(
  input: JoinCompletionInput,
  context: JoinCompletionContext,
  nextEligibility: JoinEligibility,
) {
  input.setModalState(createDefaultBlockedModalState({
    action: context.action,
    closeModal: input.closeModal,
    gate: { ...context.gate, eligibility: nextEligibility },
    invalidateCommunityGate: input.invalidateCommunityGate,
    interactionCopy: input.interactionCopy,
    openCommunity: () => input.openCommunity(context.gate.preview.id),
    defaultVerificationLoadingProvider: input.defaultVerificationLoadingProvider,
    startDefaultVerification: input.startDefaultVerification,
  }));
}

async function finishCommunityJoinWithEligibility(
  input: JoinCompletionInput & {
    context: JoinCompletionContext;
    initialEligibility: JoinEligibility;
    joinCommunity?: JoinCommunity;
    joinIfJoinable: boolean;
  },
) {
  const { context } = input;
  let nextEligibility = input.initialEligibility;
  input.updateCachedGate(context.communityId, {
    ...context.gate,
    eligibility: nextEligibility,
  });

  if (nextEligibility.status === "joinable" && input.joinIfJoinable) {
    if (!input.joinCommunity) {
      setBlockedModal(input, context, nextEligibility);
      return;
    }

    const joinResult = await input.joinCommunity(context.communityId);
    input.invalidateCommunityGate(context.communityId);
    if (joinResult.status === "requested") {
      setPendingRequestModal(input, context, {
        ...context.gate,
        eligibility: nextEligibility,
      });
      return;
    }

    nextEligibility = await input.getJoinEligibility(context.communityId);
    input.updateCachedGate(context.communityId, {
      ...context.gate,
      eligibility: nextEligibility,
    });
  }

  if (nextEligibility.status === "already_joined") {
    if (input.autoRunPendingInteraction && context.pendingInteraction && context.onAllowed) {
      input.closeModal();
      await context.onAllowed();
      input.clearPendingInteraction();
      return;
    }
    setReadyModal(input, context);
    return;
  }

  if (nextEligibility.status === "pending_request") {
    setPendingRequestModal(input, context, {
      ...context.gate,
      eligibility: nextEligibility,
    });
    return;
  }

  setBlockedModal(input, context, nextEligibility);
}

export async function completeCommunityJoinFromEligibility(
  input: JoinCompletionInput & {
    initialEligibility?: JoinEligibility;
    joinCommunity?: JoinCommunity;
    joinIfJoinable?: boolean;
  },
) {
  const context = resolveJoinCompletionContext(input);
  if (!context) {
    return;
  }

  const initialEligibility = input.initialEligibility
    ?? await input.getJoinEligibility(context.communityId);
  await finishCommunityJoinWithEligibility({
    ...input,
    context,
    initialEligibility,
    joinIfJoinable: input.joinIfJoinable ?? true,
  });
}

export async function completeCommunityJoinStartingWithJoin(
  input: JoinCompletionInput & {
    joinCommunity: JoinCommunity;
    joinIfJoinableAfterInitialJoin?: boolean;
  },
) {
  const context = resolveJoinCompletionContext(input);
  if (!context) {
    return;
  }

  const joinResult = await input.joinCommunity(context.communityId);
  input.invalidateCommunityGate(context.communityId);
  if (joinResult.status === "requested") {
    setPendingRequestModal(input, context, context.gate);
    return;
  }

  const nextEligibility = await input.getJoinEligibility(context.communityId);
  await finishCommunityJoinWithEligibility({
    ...input,
    context,
    initialEligibility: nextEligibility,
    joinIfJoinable: input.joinIfJoinableAfterInitialJoin ?? false,
  });
}
