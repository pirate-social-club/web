import { describe, expect, test } from "bun:test";
import type { GatePolicy } from "@pirate/api-contracts";

import {
  captchaAloneAdmits,
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
