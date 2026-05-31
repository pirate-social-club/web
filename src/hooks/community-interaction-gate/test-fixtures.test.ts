import type {
  CommunityPreview,
  JoinEligibility,
  MembershipGateSummary,
  RefreshPassportWalletScoreResponse,
} from "@pirate/api-contracts";
import type * as React from "react";

import { getLocaleMessages } from "@/locales";
import type {
  CommunityGateData,
  InteractionGateCopy,
  ModalState,
  PendingInteraction,
} from "@/hooks/use-community-interaction-gate.helpers";

export const routesCopy = getLocaleMessages("en", "routes");
export const gatesPanel = getLocaleMessages("en", "gates").panel;
export const interactionCopy: InteractionGateCopy & { openInPirate: string } = {
  ...routesCopy.interactionGate,
  locale: "en",
  openInPirate: routesCopy.publicProfile.openInPirate,
  taskVerify: routesCopy.createCommunity.startVerification,
};

export const SELF_VERIFICATION_UNAVAILABLE_MESSAGE =
  "This community is missing the Self verification details needed to continue.";

export const uniqueHumanRequirement: MembershipGateSummary = {
  gate_type: "unique_human",
};

export const altchaRequirement: MembershipGateSummary = {
  gate_type: "altcha_pow",
};

export function altchaGateEvaluation(): JoinEligibility["gate_evaluation"] {
  return {
    passed: false,
    trace: { kind: "gate" },
    required_action_set: {
      kind: "set",
      mode: "all",
      items: [{
        kind: "action",
        provider: "altcha",
        capability: "altcha_pow",
        scope: "community_join",
      }],
    },
  } as JoinEligibility["gate_evaluation"];
}

export function eligibility(
  status: JoinEligibility["status"] = "already_joined",
  overrides: Partial<JoinEligibility> = {},
  requirements: MembershipGateSummary[] = [uniqueHumanRequirement],
): JoinEligibility {
  return {
    status,
    failure_reason: null,
    membership_gate_summaries: requirements,
    missing_capabilities: [],
    suggested_verification_provider: null,
    ...overrides,
  } as JoinEligibility;
}

export function gate(
  status: JoinEligibility["status"] = "verification_required",
  overrides: Partial<JoinEligibility> = {},
  requirements: MembershipGateSummary[] = [uniqueHumanRequirement],
): CommunityGateData {
  return {
    eligibility: eligibility(status, {
      membership_gate_summaries: requirements,
      ...overrides,
    }, requirements),
    preview: {
      id: "community-1",
      display_name: "Test Community",
      membership_gate_summaries: requirements,
    },
  };
}

export function createPendingInteraction(
  gateData = gate(),
  onAllowed: PendingInteraction["onAllowed"] = () => undefined,
): PendingInteraction {
  return {
    action: "reply_post",
    communityId: gateData.preview.id,
    gate: gateData,
    onAllowed,
    postId: "post-1",
  };
}

export function createModalSetter() {
  let modalState: ModalState | null = null;
  const setModalState: React.Dispatch<React.SetStateAction<ModalState | null>> = (next) => {
    modalState = typeof next === "function" ? next(modalState) : next;
  };
  return {
    get modalState() {
      return modalState;
    },
    setModalState,
  };
}

export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

export function createPreview(overrides: Partial<CommunityPreview> = {}): CommunityPreview {
  return {
    id: "com_test",
    display_name: "Test community",
    membership_gate_summaries: [],
    ...overrides,
  } as CommunityPreview;
}

export function refreshResponse(
  joinEligibility?: JoinEligibility | null,
): RefreshPassportWalletScoreResponse {
  return { join_eligibility: joinEligibility } as RefreshPassportWalletScoreResponse;
}
