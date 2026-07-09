import { describe, expect, test } from "bun:test";
import type { GatePolicy } from "@pirate/api-contracts";

import {
  captchaAloneAdmits,
  gateTreeDraftMatchesPolicy,
  getGateBuilderBudget,
  parseGatePolicyToTreeDraft,
  serializeGateBuilderTreeDraft,
  simulateGateBuilderPersonas,
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

  test("ignores malformed or future op nodes instead of throwing", () => {
    const draft = parseGatePolicyToTreeDraft({
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "not", gate: { type: "unique_human", provider: "self" } },
          { op: "or" },
        ],
      } as unknown as GatePolicy["expression"],
    });

    expect(serializeGateBuilderTreeDraft(draft)).toEqual({
      version: 1,
      expression: { op: "gate", gate: { type: "altcha_pow" } },
    });
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

  test("persona simulation exposes composition consequences", () => {
    const policy = serializeGateBuilderTreeDraft({
      kind: "group",
      op: "and",
      children: [
        veryHuman,
        { kind: "group", op: "or", children: [antiBot, score20] },
      ],
    });

    expect(simulateGateBuilderPersonas(policy)).toEqual([
      { id: "bot_captcha", joins: false, label: "Bot that solves browser anti-bot" },
      { id: "self_human", joins: false, label: "Self.xyz verified human" },
      { id: "very_human", joins: false, label: "Very palm scan verified human" },
      { id: "passport_score_20", joins: false, label: "Passport score 20 wallet" },
      { id: "nft_holder", joins: false, label: "NFT holder" },
    ]);
  });

  test("persona simulation admits a matching single-capability fallback", () => {
    const policy = serializeGateBuilderTreeDraft({
      kind: "group",
      op: "or",
      children: [veryHuman, score20],
    });

    expect(simulateGateBuilderPersonas(policy).filter((persona) => persona.joins)).toEqual([
      { id: "very_human", joins: true, label: "Very palm scan verified human" },
      { id: "passport_score_20", joins: true, label: "Passport score 20 wallet" },
    ]);
  });
});
