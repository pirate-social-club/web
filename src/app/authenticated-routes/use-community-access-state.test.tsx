import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { parseHTML } from "linkedom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import type { SaveCommunityAction } from "./community-moderation-save";
import { useCommunityAccessState } from "./use-community-access-state";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;

type GatesBody = {
  membership_mode: "open" | "request" | "gated";
  default_age_gate_policy: "none" | "18_plus";
  allow_anonymous_identity: boolean;
  anonymous_identity_scope: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  gate_rules: unknown[];
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    community_id: "community-1",
    display_name: "Test Community",
    membership_mode: "gated",
    default_age_gate_policy: "18_plus",
    allow_anonymous_identity: false,
    anonymous_identity_scope: "thread_stable",
    gate_rules: [{
      gate_rule_id: "gate-1",
      community_id: "community-1",
      scope: "membership",
      gate_family: "identity_proof",
      gate_type: "nationality",
      proof_requirements: [{
        proof_type: "nationality",
        accepted_providers: ["self"],
        config: { required_value: "US" },
      }],
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }],
    ...overrides,
  } as ApiCommunity;
}

function installCommunityApiMocks() {
  const calls = {
    updateGates: [] as Array<{ communityId: string; body: GatesBody }>,
  };

  const communities = api.communities as unknown as {
    updateGates: (communityId: string, body: GatesBody) => Promise<ApiCommunity>;
  };

  communities.updateGates = async (communityId, body) => {
    calls.updateGates.push({ communityId, body });
    return createCommunity({
      membership_mode: body.membership_mode,
      default_age_gate_policy: body.default_age_gate_policy,
      allow_anonymous_identity: body.allow_anonymous_identity,
      anonymous_identity_scope: body.anonymous_identity_scope,
    });
  };

  return calls;
}

function createSaveCommunityMock() {
  const calls: Array<{ successMessage: string; failureMessage: string }> = [];
  const saveCommunity: SaveCommunityAction = async (
    action,
    savingSetter,
    successMessage,
    failureMessage,
  ) => {
    calls.push({ successMessage, failureMessage });
    savingSetter(true);
    try {
      return await action();
    } finally {
      savingSetter(false);
    }
  };

  return { calls, saveCommunity };
}

function renderAccessHook({
  community = createCommunity(),
  saveCommunity = createSaveCommunityMock().saveCommunity,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
} = {}) {
  return renderHook(() => useCommunityAccessState({ community, saveCommunity }));
}

describe("useCommunityAccessState", () => {
  test("initializes access draft state from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook();

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    expect(result.current.defaultAgeGatePolicy).toBe("18_plus");
    expect(result.current.allowAnonymousIdentity).toBe(false);
    expect(result.current.anonymousIdentityScope).toBe("thread_stable");
    expect(result.current.gateDrafts).toHaveLength(1);
    expect(result.current.gateDrafts[0]?.gateType).toBe("nationality");
  });

  test("saves normalized gate settings through the injected save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setMembershipMode("open");
      result.current.setDefaultAgeGatePolicy("none");
      result.current.setAllowAnonymousIdentity(false);
      result.current.setAnonymousIdentityScope("post_ephemeral");
      result.current.setGateDrafts([{
        gateType: "erc721_holding",
        chainNamespace: "eip155:1",
        contractAddress: " 0x123 ",
      }]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(save.calls).toEqual([{
      successMessage: "Access settings saved.",
      failureMessage: "Could not save access settings.",
    }]);
    expect(calls.updateGates[0]).toEqual({
      communityId: "community-1",
      body: {
        membership_mode: "open",
        default_age_gate_policy: "none",
        allow_anonymous_identity: false,
        anonymous_identity_scope: null,
        gate_rules: [{
          scope: "membership",
          gate_family: "token_holding",
          gate_type: "erc721_holding",
          gate_rule_id: null,
          chain_namespace: "eip155:1",
          gate_config: { contract_address: "0x123" },
        }],
      },
    });
  });

  test("derives adult content policy from an active minimum age membership gate", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({
      community: createCommunity({ default_age_gate_policy: "none" }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setDefaultAgeGatePolicy("none");
      result.current.setGateDrafts([{
        gateType: "minimum_age",
        provider: "self",
        minimumAge: 30,
      }]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(result.current.defaultAgeGatePolicy).toBe("none");
    expect(calls.updateGates[0]?.body.default_age_gate_policy).toBe("18_plus");
  });
});
