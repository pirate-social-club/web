import { describe, expect, test } from "bun:test";
import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import {
  createCommunityBlockedModalStateFactory,
  type BuildBlockedModalStateArgs,
  type CommunityGateData,
  type InteractionGateCopy,
} from "./use-community-interaction-gate.helpers";
import { getLocaleMessages } from "@/locales";

const routesCopy = getLocaleMessages("en", "routes");
const interactionCopy: InteractionGateCopy = {
  ...routesCopy.interactionGate,
  locale: "en",
  taskVerify: routesCopy.createCommunity.startVerification,
};

const requirement: MembershipGateSummary = {
  gate_type: "unique_human",
};

function eligibility(
  status: JoinEligibility["status"],
  overrides: Partial<JoinEligibility> = {},
): JoinEligibility {
  return {
    status,
    failure_reason: null,
    membership_gate_summaries: [requirement],
    missing_capabilities: [],
    suggested_verification_provider: null,
    ...overrides,
  } as JoinEligibility;
}

function gate(status: JoinEligibility["status"], overrides: Partial<JoinEligibility> = {}): CommunityGateData {
  return {
    eligibility: eligibility(status, overrides),
    preview: {
      community_id: "community-1",
      display_name: "Test Community",
      membership_gate_summaries: [requirement],
    },
  };
}

function args(gateData: CommunityGateData): BuildBlockedModalStateArgs {
  return {
    action: "vote_post",
    closeModal: () => {},
    gate: gateData,
    interactionCopy,
    invalidateCommunityGate: () => {},
    openCommunity: () => {},
  };
}

describe("createCommunityBlockedModalStateFactory", () => {
  test("falls back to the default modal for public joinable gates", () => {
    const buildBlockedModalState = createCommunityBlockedModalStateFactory({
      interactionCopy,
      selfLoading: false,
      veryLoading: false,
    });

    expect(buildBlockedModalState(args(gate("joinable")))).toBe(undefined);
  });

  test("falls back to the default modal for public requestable, pending, and banned gates", () => {
    const buildBlockedModalState = createCommunityBlockedModalStateFactory({
      interactionCopy,
      selfLoading: false,
      veryLoading: false,
    });

    expect(buildBlockedModalState(args(gate("requestable")))).toBe(undefined);
    expect(buildBlockedModalState(args(gate("pending_request")))).toBe(undefined);
    expect(buildBlockedModalState(args(gate("banned")))).toBe(undefined);
  });

  test("opens the local request modal when requestable handling is supplied", () => {
    let openedForCommunityId: string | null = null;
    const buildBlockedModalState = createCommunityBlockedModalStateFactory({
      interactionCopy,
      selfLoading: false,
      veryLoading: false,
      onRequestable: (gateData) => {
        openedForCommunityId = gateData.preview.community_id;
      },
    });

    expect(buildBlockedModalState(args(gate("requestable")))).toBeNull();
    expect(openedForCommunityId).toBe("community-1");
  });

  test("builds a local join action for authenticated joinable gates", async () => {
    const calls: string[] = [];
    const modal = createCommunityBlockedModalStateFactory({
      interactionCopy,
      joinLoading: true,
      selfLoading: false,
      veryLoading: false,
      onJoin: async (gateData) => {
        calls.push(`join:${gateData.preview.community_id}`);
      },
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
    })(args(gate("joinable")));

    expect(modal?.icon).toBe("join");
    expect(modal?.primaryAction?.label).toBe("Join");
    expect(modal?.primaryAction?.loading).toBe(true);

    await modal?.primaryAction?.onClick?.();
    expect(calls).toEqual(["join:community-1", "invalidate:community-1"]);
  });

  test("builds verification modals with route-owned verification callbacks", async () => {
    let startedSelfForCommunityId: string | null = null;
    const modal = createCommunityBlockedModalStateFactory({
      interactionCopy,
      selfLoading: true,
      veryLoading: false,
      includeVerificationCloseAction: true,
      onStartSelfVerification: async (gateData) => {
        startedSelfForCommunityId = gateData.preview.community_id;
        return { started: true, openedModal: true };
      },
    })(args(gate("verification_required", {
      missing_capabilities: ["unique_human"],
      suggested_verification_provider: "self",
    })));

    expect(modal?.icon).toBe("self");
    expect(modal?.primaryAction?.loading).toBe(true);
    expect(modal?.secondaryAction?.label).toBe(interactionCopy.close);

    await modal?.primaryAction?.onClick?.();
    expect(startedSelfForCommunityId).toBe("community-1");
  });
});
