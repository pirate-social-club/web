import { describe, expect, test } from "bun:test";

import {
  altchaRequirement,
  gate,
  gatesPanel,
  interactionCopy,
  uniqueHumanRequirement,
} from "./community-interaction-gate/test-fixtures.test";
import {
  createCommunityBlockedModalStateFactory,
  createDefaultBlockedModalState,
  getRequirementGroups,
  getRequirementStatuses,
  selectPostVoteGateData,
  type BuildBlockedModalStateArgs,
  type CommunityGateData,
} from "./use-community-interaction-gate.helpers";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

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

function postWithViewerState(input: {
  role?: "owner" | "admin" | "moderator" | null;
  membership?: "member" | "not_member" | "banned" | null;
}): LocalizedPostResponse {
  return {
    post: { community: "com_test" },
    community: {
      id: "com_test",
      display_name: "Test Community",
      gate_match_mode: "any",
      human_verification_lane: "self",
      membership_gate_summaries: [{ gate_type: "altcha_pow" }],
      membership_mode: "gated",
      viewer_community_role: input.role ?? null,
      viewer_membership_status: input.membership ?? null,
    },
  } as LocalizedPostResponse;
}

function postWithViewerGateState(input: {
  role?: "owner" | "admin" | "moderator" | null;
  membership?: "member" | "not_member" | "banned" | null;
}): LocalizedPostResponse {
  return {
    post: { community: "com_test" },
    viewer_gate_state: {
      community_id: "com_test",
      community_display_name: "Test Community",
      gate_match_mode: "any",
      membership_gate_summaries: [{ gate_type: "altcha_pow" }],
      viewer_community_role: input.role ?? null,
      viewer_membership_status: input.membership ?? null,
    },
  } as LocalizedPostResponse;
}

describe("selectPostVoteGateData", () => {
  test("returns an already-joined gate for community staff", () => {
    const gateData = selectPostVoteGateData(postWithViewerState({
      membership: "not_member",
      role: "moderator",
    }));

    expect(gateData?.eligibility.status).toBe("already_joined");
    expect(gateData?.preview.viewer_community_role).toBe("moderator");
    expect(gateData?.gateMatchMode).toBe("any");
  });

  test("returns an already-joined gate for members", () => {
    const gateData = selectPostVoteGateData(postWithViewerState({
      membership: "member",
      role: null,
    }));

    expect(gateData?.eligibility.status).toBe("already_joined");
    expect(gateData?.preview.viewer_community_role).toBe(null);
  });

  test("returns a banned gate for banned viewers", () => {
    const gateData = selectPostVoteGateData(postWithViewerState({
      membership: "banned",
      role: null,
    }));

    expect(gateData?.eligibility.status).toBe("banned");
    expect(gateData?.eligibility.failure_reason).toBe("banned");
  });

  test("returns null when preview state cannot prove vote eligibility", () => {
    expect(selectPostVoteGateData(postWithViewerState({
      membership: "not_member",
      role: null,
    }))).toBe(null);
    expect(selectPostVoteGateData({ post: { community: "com_test" } } as LocalizedPostResponse)).toBe(null);
  });

  test("reads compact viewer gate state before full community preview", () => {
    const gateData = selectPostVoteGateData(postWithViewerGateState({
      membership: "not_member",
      role: "owner",
    }));

    expect(gateData?.eligibility.status).toBe("already_joined");
    expect(gateData?.preview.id).toBe("com_test");
    expect(gateData?.preview.display_name).toBe("Test Community");
    expect(gateData?.preview.viewer_community_role).toBe("owner");
    expect(gateData?.preview.membership_gate_summaries).toEqual([{ gate_type: "altcha_pow" }]);
    expect(gateData?.gateMatchMode).toBe("any");
  });

  test("returns null for compact non-member state", () => {
    expect(selectPostVoteGateData(postWithViewerGateState({
      membership: "not_member",
      role: null,
    }))).toBe(null);
  });
});

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
        openedForCommunityId = gateData.preview.id;
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
        calls.push(`join:${gateData.preview.id}`);
      },
      invalidateCommunityGate: (communityId) => {
        calls.push(`invalidate:${communityId}`);
      },
    })(args(gate("joinable")));

    expect(modal?.icon).toBe("join");
    expect(modal?.description).toBe(gatesPanel.joinableDescription);
    expect(modal?.primaryAction?.label).toBe("Join");
    expect(modal?.primaryAction?.loading).toBe(true);
    expect(modal?.requirements).toEqual([]);

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
        startedSelfForCommunityId = gateData.preview.id;
        return { started: true, openedModal: true };
      },
    })(args(gate("verification_required", {
      missing_capabilities: ["unique_human"],
      suggested_verification_provider: "self",
    })));

    expect(modal?.icon).toBeUndefined();
    expect(modal?.primaryAction).toBeUndefined();
    expect(modal?.verificationProviderActions?.map((action) => action.label)).toEqual([
      "Verify with Self",
      "Verify with ZKPassport",
      "Verify with Very",
    ]);
    expect(modal?.verificationProviderActions?.[0]?.loading).toBe(true);

    await modal?.verificationProviderActions?.[0]?.onClick();
    expect(startedSelfForCommunityId).toBe("community-1");
  });

  test("routes zkpassport verification to the zkpassport starter, not self", async () => {
    const started: string[] = [];
    const modal = createCommunityBlockedModalStateFactory({
      interactionCopy,
      selfLoading: false,
      veryLoading: false,
      zkPassportLoading: true,
      onStartSelfVerification: async () => {
        started.push("self");
        return { started: true };
      },
      onStartZkPassportVerification: async (gateData) => {
        started.push(`zkpassport:${gateData.preview.id}`);
        return { started: true };
      },
    })(args(gate("verification_required", {
      missing_capabilities: ["nationality"],
      suggested_verification_provider: "zkpassport",
    }, [{ gate_type: "nationality", accepted_providers: ["zkpassport"] }])));

    expect(modal?.primaryAction?.loading).toBe(true);
    await modal?.primaryAction?.onClick?.();
    expect(started).toEqual(["zkpassport:community-1"]);
  });
});

describe("createDefaultBlockedModalState", () => {
  test("keeps a joinable modal focused on joining instead of repeating gate options", () => {
    const modal = createDefaultBlockedModalState({
      ...args(gate("joinable", {}, [uniqueHumanRequirement, altchaRequirement], { gateMatchMode: "any" })),
      defaultVerificationLoadingProvider: null,
      startDefaultVerification: async () => ({ started: false }),
    });

    expect(modal.description).toBe(gatesPanel.joinableDescription);
    expect(modal.title).toBe("Join to Vote");
    expect(modal.requirements).toEqual([]);
  });

  test("passes the real zkpassport provider to startDefaultVerification", async () => {
    const startedProviders: string[] = [];
    const gateData = gate("verification_required", {
      missing_capabilities: ["nationality"],
      suggested_verification_provider: "zkpassport",
    }, [{ gate_type: "nationality", accepted_providers: ["zkpassport"] }]);

    const modal = createDefaultBlockedModalState({
      ...args(gateData),
      defaultVerificationLoadingProvider: "zkpassport",
      startDefaultVerification: async ({ provider }) => {
        startedProviders.push(provider);
        return { started: true };
      },
    });

    expect(modal?.primaryAction?.loading).toBe(true);
    await modal?.primaryAction?.onClick?.();
    expect(startedProviders).toEqual(["zkpassport"]);
  });

  test("does not invent a verification action when no provider is supported", () => {
    const gateData = gate("verification_required", {
      missing_capabilities: ["altcha_pow"],
      gate_evaluation: null,
    }, [altchaRequirement]);

    const modal = createDefaultBlockedModalState(args(gateData));

    expect(modal.icon).toBe("blocked");
    expect(modal.primaryAction).toBeNull();
  });
});

describe("gate requirement display state", () => {
  test("keeps OR alternatives neutral when the satisfied path is ambiguous", () => {
    const gateData = gate("already_joined", {}, [uniqueHumanRequirement, altchaRequirement], { gateMatchMode: "any" });

    expect(getRequirementStatuses(gateData)).toEqual(["unknown", "unknown"]);
    expect(getRequirementGroups(gateData)).toEqual([{
      mode: "any",
      requirements: [uniqueHumanRequirement, altchaRequirement],
      requirementStatuses: ["unknown", "unknown"],
    }]);
  });

  test("keeps flat OR failures neutral when no evaluation trace is available", () => {
    const gateData = gate("gate_failed", {}, [uniqueHumanRequirement, altchaRequirement], { gateMatchMode: "any" });

    expect(getRequirementStatuses(gateData)).toEqual(["unknown", "unknown"]);
    expect(getRequirementGroups(gateData)).toEqual([{
      mode: "any",
      requirements: [uniqueHumanRequirement, altchaRequirement],
      requirementStatuses: ["unknown", "unknown"],
    }]);
  });

  test("groups required actions without inferring status for leaves omitted from the trace", () => {
    const nationalityRequirement = { gate_type: "nationality" as const, required_value: "GE" };
    const gateData = gate("verification_required", {
      gate_evaluation: {
        passed: false,
        trace: { kind: "op", op: "and", passed: false, children: [] },
        required_action_set: {
          kind: "set",
          mode: "all",
          items: [
            { kind: "action", provider: "self", capability: "nationality", allowed_countries: ["GE"] },
            {
              kind: "set",
              mode: "any",
              items: [
                { kind: "action", provider: "very", capability: "unique_human" },
                { kind: "action", provider: "altcha", capability: "altcha_pow", scope: "community_join" },
              ],
            },
          ],
        },
      } as NonNullable<CommunityGateData["eligibility"]["gate_evaluation"]>,
    }, [nationalityRequirement, uniqueHumanRequirement, altchaRequirement]);

    expect(getRequirementGroups(gateData)).toEqual([
      {
        mode: "all",
        requirements: [nationalityRequirement],
        requirementStatuses: ["unknown"],
      },
      {
        mode: "any",
        requirements: [uniqueHumanRequirement, altchaRequirement],
        requirementStatuses: ["unknown", "unknown"],
      },
    ]);
  });

  test("joins same-type required actions to summaries by gate identity", () => {
    const first = { gate_id: "balance-first", gate_type: "asset_balance" as const, asset_id: "asset:first", min_amount_atomic: "10" };
    const second = { gate_id: "balance-second", gate_type: "asset_balance" as const, asset_id: "asset:second", min_amount_atomic: "20" };
    const gateData = gate("verification_required", {
      gate_evaluation: {
        passed: false,
        trace: {
          kind: "op",
          op: "or",
          passed: false,
          children: [
            { kind: "gate", gate_id: "balance-first", gate_type: "asset_balance", outcome: "action_required", passed: false },
            { kind: "gate", gate_id: "balance-second", gate_type: "asset_balance", outcome: "action_required", passed: false },
          ],
        },
        required_action_set: {
          kind: "set",
          mode: "any",
          items: [
            { kind: "action", gate_id: "balance-second", provider: "wallet", capability: "asset_balance" },
            { kind: "action", gate_id: "balance-first", provider: "wallet", capability: "asset_balance" },
          ],
        },
      } as NonNullable<CommunityGateData["eligibility"]["gate_evaluation"]>,
    }, [first, second]);

    expect(getRequirementGroups(gateData)?.[0]?.requirements).toEqual([second, first]);
    expect(getRequirementGroups(gateData)?.[0]?.requirementStatuses).toEqual(["unmet", "unmet"]);
  });
});
