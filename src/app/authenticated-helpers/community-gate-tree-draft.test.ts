import { describe, expect, test } from "bun:test";
import type { GatePolicy } from "@pirate/api-contracts";

import {
  captchaAloneAdmits,
  collectGateBuilderAtoms,
  createGateProfileDraft,
  evaluateGateProfile,
  gateAssetKey,
  gateAtomKey,
  gateBuilderDraftAtomsAreValid,
  gatePolicyHasUnsupportedExpressionNodes,
  isGateBuilderDraftSavable,
  gateTreeDraftMatchesPolicy,
  getGateBuilderBudget,
  isGateBuilderDraftWithinLimits,
  normalizePassportMinimumScore,
  parseGatePolicyToTreeDraft,
  serializeGateBuilderTreeDraft,
  type GateBuilderGroupDraft,
} from "@/app/authenticated-helpers/community-gate-tree-draft";

const selfHuman = { kind: "rule", gate: { type: "unique_human", provider: "self" } } as const;
const veryHuman = { kind: "rule", gate: { type: "unique_human", provider: "very" } } as const;
const antiBot = { kind: "rule", gate: { type: "altcha_pow" } } as const;
const score20 = {
  kind: "rule",
  gate: { type: "wallet_score", provider: "passport", minimum_score: 20 },
} as const;
const bayc = {
  kind: "rule",
  gate: {
    type: "erc721_holding",
    chain_namespace: "eip155:1",
    contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
  },
} as const;
const nationalityUs = {
  kind: "rule",
  gate: {
    type: "nationality",
    provider: "self",
    accepted_providers: ["self", "zkpassport"],
    allowed: ["US"],
  },
} as const;

describe("serializeGateBuilderTreeDraft", () => {
  test("serializes humans-only fixture as provider OR", () => {
    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [selfHuman, veryHuman],
    })).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
        ],
      },
    });
  });

  test("serializes stop-spam fixture as anti-bot OR human proof", () => {
    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [antiBot, selfHuman, veryHuman],
    })).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
        ],
      },
    });
  });

  test("serializes human-with-fallbacks fixture", () => {
    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [selfHuman, veryHuman, score20, bayc],
    })).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
          {
            op: "gate",
            gate: {
              type: "erc721_holding",
              chain_namespace: "eip155:1",
              contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
            },
          },
        ],
      },
    });
  });

  test("serializes nested AND/OR without flattening different operators", () => {
    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "and",
      children: [
        nationalityUs,
        {
          kind: "group",
          op: "or",
          children: [bayc, score20],
        },
      ],
    })).toEqual({
      version: 1,
      expression: {
        op: "and",
        children: [
          {
            op: "gate",
            gate: {
              type: "nationality",
              provider: "self",
              accepted_providers: ["self", "zkpassport"],
              allowed: ["US"],
            },
          },
          {
            op: "or",
            children: [
              {
                op: "gate",
                gate: {
                  type: "erc721_holding",
                  chain_namespace: "eip155:1",
                  contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
                },
              },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    });
  });

  test("allows repeated NFT rules in one OR group", () => {
    const punks = {
      kind: "rule",
      gate: {
        type: "erc721_holding",
        chain_namespace: "eip155:1",
        contract_address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
      },
    } as const;

    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [bayc, punks],
    })).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          {
            op: "gate",
            gate: {
              type: "erc721_holding",
              chain_namespace: "eip155:1",
              contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
            },
          },
          {
            op: "gate",
            gate: {
              type: "erc721_holding",
              chain_namespace: "eip155:1",
              contract_address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
            },
          },
        ],
      },
    });
  });

  test("flattens same-op nesting and collapses single-child wrappers", () => {
    expect(serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [
        selfHuman,
        {
          kind: "group",
          op: "or",
          children: [veryHuman, { kind: "group", op: "and", children: [score20] }],
        },
      ],
    })).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
        ],
      },
    });
  });
});

describe("isGateBuilderDraftWithinLimits", () => {
  test("rejects a group insertion that would create atom 21", () => {
    const children = Array.from({ length: 20 }, () => antiBot);
    const atLimit: GateBuilderGroupDraft = { kind: "group", op: "and", children };
    const withGroup: GateBuilderGroupDraft = {
      ...atLimit,
      children: [
        ...children,
        { kind: "group", op: "and", children: [antiBot] },
      ],
    };

    expect(isGateBuilderDraftWithinLimits(atLimit)).toBe(true);
    expect(isGateBuilderDraftWithinLimits(withGroup)).toBe(false);
  });

  test("rejects operator changes that produce depth beyond four", () => {
    const atLimit: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [{
        kind: "group",
        op: "or",
        children: [{
          kind: "group",
          op: "and",
          children: [antiBot, selfHuman],
        }, veryHuman],
      }, score20],
    };
    const tooDeep: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [{
        kind: "group",
        op: "or",
        children: [{
          kind: "group",
          op: "and",
          children: [{
            kind: "group",
            op: "or",
            children: [antiBot, selfHuman],
          }, veryHuman],
        }, score20],
      }, bayc],
    };

    expect(getGateBuilderBudget(atLimit).depth).toBe(4);
    expect(isGateBuilderDraftWithinLimits(atLimit)).toBe(true);
    expect(getGateBuilderBudget(tooDeep).depth).toBe(5);
    expect(isGateBuilderDraftWithinLimits(tooDeep)).toBe(false);
  });
});

describe("normalizePassportMinimumScore", () => {
  test("does not expose a non-binding score below Passport's passing floor", () => {
    expect(normalizePassportMinimumScore(5)).toBe(20);
    expect(normalizePassportMinimumScore(20)).toBe(20);
    expect(normalizePassportMinimumScore(42)).toBe(42);
    expect(normalizePassportMinimumScore(101)).toBe(100);
  });
});

describe("parseGatePolicyToTreeDraft", () => {
  test("round-trips a nested backend policy through the tree draft", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "altcha_pow" } },
              { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
            ],
          },
        ],
      },
    };

    expect(serializeGateBuilderTreeDraft(parseGatePolicyToTreeDraft(policy))).toEqual(policy);
  });

  test("wraps a root gate expression in the root group draft", () => {
    const draft = parseGatePolicyToTreeDraft({
      version: 1,
      expression: { op: "gate", gate: { type: "altcha_pow" } },
    });

    expect(draft).toEqual({
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "altcha_pow" } }],
    });
  });

  test("loads non-canonical policies and serializes to canonical equivalent", () => {
    const nonCanonicalPolicy: GatePolicy = {
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "unique_human", provider: "very" } },
              { op: "gate", gate: { type: "altcha_pow" } },
            ],
          },
        ],
      },
    };

    expect(serializeGateBuilderTreeDraft(parseGatePolicyToTreeDraft(nonCanonicalPolicy))).toEqual({
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "unique_human", provider: "very" } },
          { op: "gate", gate: { type: "altcha_pow" } },
        ],
      },
    });
  });

  test("no-op guard treats canonicalized loaded policies as unchanged", () => {
    const loadedPolicy: GatePolicy = {
      version: 1,
      expression: {
        op: "or",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          {
            op: "or",
            children: [
              { op: "gate", gate: { type: "unique_human", provider: "very" } },
              { op: "gate", gate: { type: "altcha_pow" } },
            ],
          },
        ],
      },
    };
    const draft = parseGatePolicyToTreeDraft(loadedPolicy);

    expect(gateTreeDraftMatchesPolicy(serializeGateBuilderTreeDraft(draft), draft)).toBe(true);
    expect(gateTreeDraftMatchesPolicy(loadedPolicy, draft)).toBe(true);
  });

  test("parses supported children while reporting malformed or future op nodes", () => {
    const policy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "not", gate: { type: "unique_human", provider: "self" } },
          { op: "or" },
        ],
      } as unknown as GatePolicy["expression"],
    };
    const draft = parseGatePolicyToTreeDraft(policy);

    expect(gatePolicyHasUnsupportedExpressionNodes(policy)).toBe(true);
    expect(serializeGateBuilderTreeDraft(draft)).toEqual({
      version: 1,
      expression: { op: "gate", gate: { type: "altcha_pow" } },
    });
  });

  test("does not classify safe canonicalization shapes as unsupported", () => {
    expect(gatePolicyHasUnsupportedExpressionNodes({
      version: 1,
      expression: {
        op: "and",
        children: [{
          op: "and",
          children: [{ op: "gate", gate: { type: "altcha_pow" } }],
        }],
      },
    })).toBe(false);
  });
});

describe("gate builder budget and semantic evaluation", () => {
  test("budgets the serialized shape after canonicalization", () => {
    const draft: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [
        selfHuman,
        {
          kind: "group",
          op: "or",
          children: [antiBot, score20],
        },
      ],
    };

    expect(getGateBuilderBudget(draft)).toEqual({ atoms: 3, depth: 3 });
  });

  test("pins depth budget at backend boundary examples", () => {
    const deepestLegal: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [
        selfHuman,
        {
          kind: "group",
          op: "or",
          children: [
            veryHuman,
            {
              kind: "group",
              op: "and",
              children: [antiBot, score20],
            },
          ],
        },
      ],
    };
    const oneTooDeep: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [
        selfHuman,
        {
          kind: "group",
          op: "or",
          children: [
            veryHuman,
            {
              kind: "group",
              op: "and",
              children: [
                antiBot,
                {
                  kind: "group",
                  op: "or",
                  children: [score20, bayc],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(getGateBuilderBudget(deepestLegal)).toEqual({ atoms: 4, depth: 4 });
    expect(getGateBuilderBudget(oneTooDeep)).toEqual({ atoms: 5, depth: 5 });
  });

  test("strong anti-bot warning is semantic over the whole policy", () => {
    const humanAndCaptchaOrScore = serializeGateBuilderTreeDraft({
      kind: "group",
      op: "and",
      children: [
        veryHuman,
        { kind: "group", op: "or", children: [antiBot, score20] },
      ],
    });
    const humanOrCaptchaOrScore = serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [veryHuman, antiBot, score20],
    });

    expect(captchaAloneAdmits(humanAndCaptchaOrScore)).toBe(false);
    expect(captchaAloneAdmits(humanOrCaptchaOrScore)).toBe(true);
  });
});

describe("isGateBuilderDraftSavable", () => {
  const courtyard = (match: Record<string, unknown>) => ({
    kind: "rule",
    gate: {
      type: "erc721_inventory_match",
      provider: "courtyard",
      chain_namespace: "eip155:137",
      contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
      min_quantity: 1,
      match,
    },
  }) as unknown as GateBuilderGroupDraft["children"][number];

  test("blocks a draft whose atoms the API would reject", () => {
    // Within the atom/depth budget and serializes cleanly, yet the API rejects it: the old guard
    // checked only limits, so this saved and failed server-side.
    const categoryOnly: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [courtyard({ category: "trading_card" })],
    };

    expect(serializeGateBuilderTreeDraft(categoryOnly)).not.toBeNull();
    expect(isGateBuilderDraftWithinLimits(categoryOnly)).toBe(true);
    expect(gateBuilderDraftAtomsAreValid(categoryOnly)).toBe(false);
    expect(isGateBuilderDraftSavable(categoryOnly)).toBe(false);
  });

  test("allows a complete card rule", () => {
    const complete: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [courtyard({ category: "trading_card", franchise: "Pokemon", subject: "Charizard" })],
    };

    expect(isGateBuilderDraftSavable(complete)).toBe(true);
  });

  test("blocks an empty draft", () => {
    expect(isGateBuilderDraftSavable({ kind: "group", op: "and", children: [] })).toBe(false);
  });

  test("still allows saving a draft that preserves an unknown atom", () => {
    // Unknown means unknown to this build, not invalid — the API may be ahead of the client.
    // Blocking Save here would break preservation of a future atom.
    const unknown = {
      kind: "group",
      op: "and",
      children: [selfHuman, { kind: "rule", gate: { type: "nft_trait_snapshot_match" } }],
    } as unknown as GateBuilderGroupDraft;
    expect(isGateBuilderDraftSavable(unknown)).toBe(true);
  });

  test("blocks a rule nested inside a group", () => {
    const nested: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [selfHuman, { kind: "group", op: "or", children: [courtyard({ category: "watch" })] }],
    };

    expect(isGateBuilderDraftSavable(nested)).toBe(false);
  });
});

describe("evaluateGateProfile (atom-derived 'who gets in')", () => {
  const nationalityRule = (allowed: string[]) => ({
    kind: "rule",
    gate: { type: "nationality", provider: "self", allowed },
  }) as unknown as GateBuilderGroupDraft["children"][number];

  test("a matching nationality joins a nationality-only gate", () => {
    // The fixed persona matrix carried no nationality proof, so it reported "can't join" for all
    // five personas here — a valid gate looked unjoinable.
    const draft: GateBuilderGroupDraft = { kind: "group", op: "and", children: [nationalityRule(["US", "CA"])] };

    expect(evaluateGateProfile(draft, { ...createGateProfileDraft(), nationality: "US" }).joins).toBe(true);
    expect(evaluateGateProfile(draft, { ...createGateProfileDraft(), nationality: "FR" }).joins).toBe(false);
    expect(evaluateGateProfile(draft, createGateProfileDraft()).joins).toBe(false);
  });

  test("an empty nationality list admits any verified nationality", () => {
    const draft: GateBuilderGroupDraft = { kind: "group", op: "and", children: [nationalityRule([])] };

    expect(evaluateGateProfile(draft, { ...createGateProfileDraft(), nationality: "AR" }).joins).toBe(true);
    expect(evaluateGateProfile(draft, createGateProfileDraft()).joins).toBe(false);
  });

  test("nested AND/OR: a member holding two kinds of proof gets in", () => {
    // human AND (anti-bot OR score) — every single-capability persona reported "can't join".
    const draft: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [veryHuman, { kind: "group", op: "or", children: [antiBot, score20] }],
    };

    expect(evaluateGateProfile(draft, { ...createGateProfileDraft(), humanProviders: ["very"] }).joins).toBe(false);
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(),
      humanProviders: ["very"],
      passportScore: 20,
    }).joins).toBe(true);
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(),
      humanProviders: ["very"],
      altcha: true,
    }).joins).toBe(true);
  });

  test("deeply nested OR inside AND resolves through the whole tree", () => {
    const draft: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [
        nationalityRule(["US"]),
        { kind: "group", op: "or", children: [veryHuman, { kind: "group", op: "and", children: [selfHuman, score20] }] },
      ],
    };

    // US + Self alone fails: the inner AND also needs the score.
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), nationality: "US", humanProviders: ["self"],
    }).joins).toBe(false);
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), nationality: "US", humanProviders: ["self"], passportScore: 20,
    }).joins).toBe(true);
    // Or satisfy the other branch outright.
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), nationality: "US", humanProviders: ["very"],
    }).joins).toBe(true);
  });

  test("numeric thresholds stay coherent", () => {
    const age18: GateBuilderGroupDraft = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "minimum_age", provider: "self", minimum_age: 18 } }],
    } as unknown as GateBuilderGroupDraft;
    expect(evaluateGateProfile(age18, { ...createGateProfileDraft(), age: 21 }).joins).toBe(true);
    expect(evaluateGateProfile(age18, { ...createGateProfileDraft(), age: 17 }).joins).toBe(false);

  });

  test("uses one coherent asset quantity across distinct holding thresholds", () => {
    const holding = (minCount: number) => ({
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D",
      min_count: minCount,
    }) as const;
    const one = holding(1);
    const two = holding(2);
    const draft = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: one }, { kind: "rule", gate: two }],
    } as GateBuilderGroupDraft;
    const assetKey = gateAssetKey(one);

    expect(gateAtomKey(one)).not.toBe(gateAtomKey(two));
    expect(gateAssetKey(one)).toBe(gateAssetKey(two));
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), assetQuantities: { [assetKey]: 1 },
    })).toMatchObject({ joins: false, atoms: [{ met: true }, { met: false }] });
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), assetQuantities: { [assetKey]: 2 },
    })).toMatchObject({ joins: true, atoms: [{ met: true }, { met: true }] });
  });

  test("evaluates Courtyard min_quantity from the matching predicate balance", () => {
    const gate = {
      type: "erc721_inventory_match",
      provider: "courtyard",
      chain_namespace: "eip155:137",
      contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
      min_quantity: 2,
      match: { category: "trading_card", franchise: "Pokemon" },
    } as const;
    const draft = {
      kind: "group", op: "and", children: [{ kind: "rule", gate }],
    } as GateBuilderGroupDraft;
    const assetKey = gateAssetKey(gate);

    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), assetQuantities: { [assetKey]: 1 },
    }).joins).toBe(false);
    expect(evaluateGateProfile(draft, {
      ...createGateProfileDraft(), assetQuantities: { [assetKey]: 2 },
    }).joins).toBe(true);
  });

  test("preserves array shape in inventory predicate identity", () => {
    const base = {
      type: "erc721_inventory_match",
      provider: "courtyard",
      chain_namespace: "eip155:137",
      contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
      min_quantity: 1,
    } as const;
    const arrayMatch = { ...base, match: { category: "trading_card", franchise: "Pokemon", subject: ["Charizard", "Gengar"] } };
    const stringMatch = { ...base, match: { category: "trading_card", franchise: "Pokemon", subject: "Charizard,Gengar" } };

    expect(gateAssetKey(arrayMatch)).not.toBe(gateAssetKey(stringMatch));
  });

  test("only propagates an unknown atom when it is pivotal", () => {
    const unknown = { kind: "rule", gate: { type: "nft_trait_snapshot_match" } } as const;
    const andDraft = {
      kind: "group", op: "and", children: [unknown, selfHuman],
    } as unknown as GateBuilderGroupDraft;
    const orDraft = {
      kind: "group", op: "or", children: [unknown, selfHuman],
    } as unknown as GateBuilderGroupDraft;
    const noHuman = createGateProfileDraft();
    const hasHuman = { ...createGateProfileDraft(), humanProviders: ["self"] };

    expect(evaluateGateProfile(andDraft, noHuman).joins).toBe(false);
    expect(evaluateGateProfile(andDraft, hasHuman).joins).toBeNull();
    expect(evaluateGateProfile(orDraft, noHuman).joins).toBeNull();
    expect(evaluateGateProfile(orDraft, hasHuman).joins).toBe(true);
    expect(evaluateGateProfile(andDraft, hasHuman).atoms[0]?.met).toBeNull();
  });

  test("per-atom results report which requirements were met", () => {
    const draft: GateBuilderGroupDraft = { kind: "group", op: "or", children: [veryHuman, score20] };
    const result = evaluateGateProfile(draft, { ...createGateProfileDraft(), humanProviders: ["very"] });

    expect(result.joins).toBe(true);
    // An unmet atom inside an OR does not block admission — the flat matrix could not show this.
    expect(result.atoms.map((atom) => atom.met)).toEqual([true, false]);
  });

  test("an empty draft admits everyone and dedupes repeated atoms", () => {
    expect(evaluateGateProfile({ kind: "group", op: "and", children: [] }, createGateProfileDraft()).joins).toBe(true);
    expect(collectGateBuilderAtoms({ kind: "group", op: "or", children: [veryHuman, veryHuman, score20] })).toHaveLength(2);
  });
});
