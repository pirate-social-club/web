import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import type { Community as ApiCommunity } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import type { SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import { useCommunityAccessState } from "./use-community-access-state";

installDomGlobals();

type GatesBody = {
  membership_mode: "request" | "gated";
  default_age_gate_policy: "none" | "18_plus";
  allow_anonymous_identity: boolean;
  anonymous_identity_scope: "community_stable" | "thread_stable" | "post_ephemeral" | null;
  gate_policy: unknown;
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    id: "community-1",
    display_name: "Test Community",
    membership_mode: "gated",
    default_age_gate_policy: "18_plus",
    allow_anonymous_identity: false,
    anonymous_identity_scope: "thread_stable",
    gate_policy: {
      version: 1,
      expression: {
        op: "and",
        children: [{ op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } }],
      },
    },
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
  useGateTreeBuilder = false,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
  useGateTreeBuilder?: boolean;
} = {}) {
  return renderHook(() => useCommunityAccessState({ community, saveCommunity, useGateTreeBuilder }));
}

describe("useCommunityAccessState", () => {
  test("preserves a non-canonical policy verbatim on a flagged tree-builder no-op save", async () => {
    const calls = installCommunityApiMocks();
    const originalPolicy = {
      version: 1 as const,
      expression: {
        op: "and" as const,
        children: [{ op: "gate" as const, gate: { type: "altcha_pow" as const } }],
      },
    };
    const { result } = renderAccessHook({
      community: createCommunity({ gate_policy: originalPolicy }),
      useGateTreeBuilder: true,
    });

    await waitFor(() => expect(result.current.gateTreeDraft.children).toHaveLength(1));
    act(() => result.current.handleSaveGates());
    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
  });

  test("serializes recursive tree edits on the flagged save path", async () => {
    const calls = installCommunityApiMocks();
    const { result } = renderAccessHook({ useGateTreeBuilder: true });

    await waitFor(() => expect(result.current.gateTreeDraft.children).toHaveLength(1));
    act(() => result.current.setGateTreeDraft({
      kind: "group",
      op: "or",
      children: [
        { kind: "rule", gate: { type: "unique_human", provider: "self" } },
        { kind: "rule", gate: { type: "altcha_pow" } },
      ],
    }));
    await waitFor(() => expect(result.current.gateTreeDraft.op).toBe("or"));
    act(() => result.current.handleSaveGates());
    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "altcha_pow" } },
        ],
      },
    });
  });

  test("preserves unknown atoms when a flagged tree policy is edited", async () => {
    const calls = installCommunityApiMocks();
    const futureGate = { type: "future_reputation_gate", threshold: 7 };
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [
              { op: "gate", gate: futureGate },
              { op: "gate", gate: { type: "unique_human", provider: "self" } },
            ],
          },
        } as ApiCommunity["gate_policy"],
      }),
      useGateTreeBuilder: true,
    });

    await waitFor(() => expect(result.current.gateTreeDraft.children).toHaveLength(2));
    act(() => result.current.setGateTreeDraft({
      ...result.current.gateTreeDraft,
      op: "or",
    }));
    await waitFor(() => expect(result.current.gateTreeDraft.op).toBe("or"));
    act(() => result.current.handleSaveGates());
    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: futureGate },
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
        ],
      },
    });
  });

  test("preserves an unsupported-op policy on unrelated flagged saves", async () => {
    const calls = installCommunityApiMocks();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "not", child: { op: "gate", gate: { type: "unique_human", provider: "self" } } },
        ],
      },
    } as unknown as ApiCommunity["gate_policy"];
    const { result } = renderAccessHook({
      community: createCommunity({ gate_policy: originalPolicy }),
      useGateTreeBuilder: true,
    });

    await waitFor(() => expect(result.current.hasUnsupportedGateExpression).toBe(true));
    expect(result.current.advancedGatePolicyReplacementRequired).toBe(false);
    act(() => result.current.setAllowAnonymousIdentity(true));
    await waitFor(() => expect(result.current.allowAnonymousIdentity).toBe(true));
    act(() => result.current.handleSaveGates());
    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
  });

  test("requires replacement consent after editing a policy with an unsupported op", async () => {
    const calls = installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [
              { op: "gate", gate: { type: "altcha_pow" } },
              { op: "not", child: { op: "gate", gate: { type: "unique_human", provider: "self" } } },
            ],
          },
        } as unknown as ApiCommunity["gate_policy"],
      }),
      useGateTreeBuilder: true,
    });

    await waitFor(() => expect(result.current.hasUnsupportedGateExpression).toBe(true));
    act(() => result.current.setGateTreeDraft({
      ...result.current.gateTreeDraft,
      children: [
        ...result.current.gateTreeDraft.children,
        { kind: "rule", gate: { type: "unique_human", provider: "self" } },
      ],
    }));
    await waitFor(() => expect(result.current.advancedGatePolicyReplacementRequired).toBe(true));
    act(() => result.current.handleSaveGates());

    expect(calls.updateGates).toHaveLength(0);
  });

  test("initializes access draft state from the community record", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook();

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    expect(result.current.defaultAgeGatePolicy).toBe("18_plus");
    expect(result.current.allowAnonymousIdentity).toBe(false);
    expect(result.current.anonymousIdentityScope).toBe("thread_stable");
    expect(result.current.gateMatchMode).toBe("all");
    expect(result.current.gateDrafts).toHaveLength(1);
    expect(result.current.gateDrafts[0]?.gateType).toBe("nationality");
  });

  test("keeps gated communities without gates empty until explicitly configured", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: null,
      }),
    });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    expect(result.current.gateDrafts).toEqual([]);
  });

  test("initializes any match mode from an OR gate policy", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "or",
            children: [
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 10 } },
              { op: "gate", gate: { type: "unique_human", provider: "very" } },
            ],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    expect(result.current.gateMatchMode).toBe("any");
  });

  test("preserves proof-of-work fallback when OR identity gates are present", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "or",
            children: [
              { op: "gate", gate: { type: "unique_human", provider: "very" } },
              { op: "gate", gate: { type: "altcha_pow" } },
            ],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    expect(result.current.gateDrafts).toEqual([
      { gateType: "unique_human", provider: "very" },
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
    ]);
    expect(result.current.gateMatchMode).toBe("any");
  });

  test("loads nested palm-scan proof-of-work fallback without treating it as advanced", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [
              {
                op: "or",
                children: [
                  { op: "gate", gate: { type: "unique_human", provider: "very" } },
                  { op: "gate", gate: { type: "altcha_pow" } },
                ],
              },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 10 } },
            ],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(3));

    expect(result.current.gateDrafts).toEqual([
      { gateType: "unique_human", provider: "very" },
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
      { gateType: "wallet_score", provider: "passport", minimumScore: 10 },
    ]);
    expect(result.current.gateMatchMode).toBe("all");
    expect(result.current.hasAdvancedGatePolicy).toBe(false);
  });

  test("drops legacy proof-of-work fallback when AND identity gates are present", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [
              { op: "gate", gate: { type: "unique_human", provider: "very" } },
              { op: "gate", gate: { type: "altcha_pow" } },
            ],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(1));

    expect(result.current.gateDrafts[0]).toEqual({
      gateType: "unique_human",
      provider: "very",
    });
    expect(result.current.gateMatchMode).toBe("all");
  });

  test("preserves any-nationality Self gate drafts from empty allowed lists", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [{ op: "gate", gate: { type: "nationality", provider: "self", allowed: [] } }],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(1));

    expect(result.current.gateDrafts[0]).toEqual({
      gateType: "nationality",
      provider: "self",
      requiredValues: [],
    });
  });

  test("preserves accepted document proof providers from gate policy atoms", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [{
              op: "gate",
              gate: {
                type: "nationality",
                provider: "self",
                accepted_providers: ["self", "zkpassport"],
                allowed: ["US"],
              },
            }],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(1));

    expect(result.current.gateDrafts[0]).toEqual({
      gateType: "nationality",
      provider: "self",
      acceptedProviders: ["self", "zkpassport"],
      requiredValues: ["US"],
    });
  });

  test("initializes Courtyard inventory gate drafts from active token rules", async () => {
    installCommunityApiMocks();
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: {
          version: 1,
          expression: {
            op: "and",
            children: [{
              op: "gate",
              gate: {
                type: "erc721_inventory_match",
                provider: "courtyard",
                chain_namespace: "eip155:137",
                contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
                min_quantity: 3,
                match: {
                  category: "watch",
                  brand: "Rolex",
                  model: "Submariner",
                  reference: "124060",
                },
              },
            }],
          },
        },
      }),
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(1));

    expect(result.current.gateDrafts[0]).toEqual({
      gateType: "erc721_inventory_match",
      chainNamespace: "eip155:137",
      contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
      inventoryProvider: "courtyard",
      minQuantity: 3,
      assetFilter: {
        category: "watch",
        brand: "Rolex",
        model: "Submariner",
        reference: "124060",
        condition: undefined,
        franchise: undefined,
        grade: undefined,
        grader: undefined,
        set: undefined,
        subject: undefined,
        year: undefined,
      },
    });
  });

  test("saves normalized gate settings through the injected save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setMembershipMode("request");
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
        membership_mode: "request",
        default_age_gate_policy: "none",
        allow_anonymous_identity: false,
        anonymous_identity_scope: null,
        gate_policy: null,
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

  test("serializes Courtyard inventory gates when saving", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setGateDrafts([{
        gateType: "erc721_inventory_match",
        chainNamespace: "eip155:137",
        contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        inventoryProvider: "courtyard",
        minQuantity: 5,
        assetFilter: {
          category: "watch",
          brand: "Rolex",
        },
      }]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "gate",
          gate: {
            type: "erc721_inventory_match",
            provider: "courtyard",
            chain_namespace: "eip155:137",
        contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        min_quantity: 5,
        match: {
          category: "watch",
          brand: "Rolex",
        },
          },
        }],
      },
    });
  });

  test("serializes OR gate policy when match mode is any", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setGateMatchMode("any");
      result.current.setGateDrafts([
        { gateType: "wallet_score", provider: "passport", minimumScore: 10 },
        { gateType: "unique_human", provider: "very" },
      ]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          {
            op: "gate",
            gate: { type: "wallet_score", provider: "passport", minimum_score: 10 },
          },
          {
            op: "gate",
            gate: { type: "unique_human", provider: "very" },
          },
        ],
      },
    });
  });

  test("serializes palm-scan proof-of-work fallback without changing top-level gate mode", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setGateMatchMode("all");
      result.current.setGateDrafts([
        { gateType: "unique_human", provider: "very" },
        { gateType: "altcha_pow", fallbackFor: "unique_human" },
        { gateType: "wallet_score", provider: "passport", minimumScore: 10 },
      ]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [
          {
            op: "or",
            children: [
              {
                op: "gate",
                gate: { type: "unique_human", provider: "very" },
              },
              {
                op: "gate",
                gate: { type: "altcha_pow" },
              },
            ],
          },
          {
            op: "gate",
            gate: { type: "wallet_score", provider: "passport", minimum_score: 10 },
          },
        ],
      },
    });
  });

  test("preserves unchanged nested gate policies on settings save", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    } satisfies NonNullable<ApiCommunity["gate_policy"]>;
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: originalPolicy,
      }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    expect(result.current.hasAdvancedGatePolicy).toBe(true);
    expect(result.current.advancedGatePolicyReplacementRequired).toBe(false);

    act(() => {
      result.current.setAllowAnonymousIdentity(true);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
    expect(calls.updateGates[0]?.body.allow_anonymous_identity).toBe(true);
  });

  test("preserves loaded gate policies when equivalent drafts use different key order", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    } satisfies NonNullable<ApiCommunity["gate_policy"]>;
    const { result } = renderAccessHook({
      community: createCommunity({ gate_policy: originalPolicy }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    act(() => {
      result.current.setGateDrafts([
        { requiredValues: ["US"], provider: "self", gateType: "nationality" },
        { minimumScore: 20, provider: "passport", gateType: "wallet_score" },
      ]);
    });

    expect(result.current.advancedGatePolicyReplacementRequired).toBe(false);

    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));
    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
  });

  test("blocks advanced policy replacement until explicitly confirmed", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    } satisfies NonNullable<ApiCommunity["gate_policy"]>;
    const { result } = renderAccessHook({
      community: createCommunity({ gate_policy: originalPolicy }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    act(() => {
      result.current.setGateDrafts([
        { gateType: "nationality", provider: "self", requiredValues: ["US", "CA"] },
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      ]);
    });

    expect(result.current.advancedGatePolicyReplacementRequired).toBe(true);

    act(() => {
      result.current.handleSaveGates();
    });

    expect(calls.updateGates).toHaveLength(0);

    act(() => {
      result.current.setReplaceAdvancedGatePolicy(true);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));
    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US", "CA"] } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      },
    });
  });

  test("round-trips Self unique-human and mainnet Courtyard inventory policies as editable gates", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          {
            op: "gate",
            gate: {
              type: "erc721_inventory_match",
              provider: "courtyard",
              chain_namespace: "eip155:1",
              contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
              min_quantity: 1,
              match: { category: "watch", brand: "Rolex" },
            },
          },
        ],
      },
    } satisfies NonNullable<ApiCommunity["gate_policy"]>;
    const { result } = renderAccessHook({
      community: createCommunity({
        gate_policy: originalPolicy,
      }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    expect(result.current.gateDrafts).toEqual([
      { gateType: "unique_human", provider: "self" },
      {
        gateType: "erc721_inventory_match",
        chainNamespace: "eip155:1",
        contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        inventoryProvider: "courtyard",
        minQuantity: 1,
        assetFilter: {
          category: "watch",
          brand: "Rolex",
          condition: undefined,
          franchise: undefined,
          grade: undefined,
          grader: undefined,
          model: undefined,
          reference: undefined,
          set: undefined,
          subject: undefined,
          year: undefined,
        },
      },
    ]);
    expect(result.current.hasAdvancedGatePolicy).toBe(false);
    expect(result.current.advancedGatePolicyReplacementRequired).toBe(false);

    act(() => {
      result.current.setDefaultAgeGatePolicy("none");
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
    expect(calls.updateGates[0]?.body.default_age_gate_policy).toBe("none");
  });

  test("preserves advanced policy after request-to-gated membership mode flip restores the visible draft", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const originalPolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    } satisfies NonNullable<ApiCommunity["gate_policy"]>;
    const { result } = renderAccessHook({
      community: createCommunity({ gate_policy: originalPolicy }),
      saveCommunity: save.saveCommunity,
    });

    await waitFor(() => expect(result.current.gateDrafts).toHaveLength(2));

    act(() => {
      result.current.setMembershipMode("request");
      result.current.setGateDrafts([]);
    });
    act(() => {
      result.current.setMembershipMode("gated");
      result.current.setGateDrafts([
        { gateType: "nationality", provider: "self", requiredValues: ["US"] },
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
      ]);
    });

    expect(result.current.advancedGatePolicyReplacementRequired).toBe(false);

    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));
    expect(calls.updateGates[0]?.body.gate_policy).toBe(originalPolicy);
  });

  test("serializes proof-of-work gate policy when selected", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderAccessHook({ saveCommunity: save.saveCommunity });

    await waitFor(() => expect(result.current.membershipMode).toBe("gated"));

    act(() => {
      result.current.setGateDrafts([{ gateType: "altcha_pow" }]);
    });
    act(() => {
      result.current.handleSaveGates();
    });

    await waitFor(() => expect(calls.updateGates).toHaveLength(1));

    expect(calls.updateGates[0]?.body.gate_policy).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [
          {
            op: "gate",
            gate: { type: "altcha_pow" },
          },
        ],
      },
    });
  });
});
