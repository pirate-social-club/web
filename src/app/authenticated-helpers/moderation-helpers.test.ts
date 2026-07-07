import { describe, expect, test } from "bun:test";
import type { Community as ApiCommunity, GatePolicy } from "@pirate/api-contracts";
import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";

import {
  buildCommunityModerationEntryPath,
  buildCommunityModerationPath,
  getCommunityGateDrafts,
  buildStarterPricingPolicyDraft,
  validatePricingPolicyDraft,
} from "@/app/authenticated-helpers/moderation-helpers";
import { serializeIdentityGateDrafts, serializeIdentityGateDraftsForSave } from "@/app/authenticated-helpers/community-gate-rule-serialization";
import { COUNTRIES } from "@/lib/countries";
import { getGatePolicyMatchMode, isGatePolicyProjectionLossy } from "@/lib/gate-policy-utils";

function communityWithGatePolicy(policy: GatePolicy): ApiCommunity {
  return { gate_policy: policy } as ApiCommunity;
}

function projectAndSaveUnchanged(policy: GatePolicy): GatePolicy | null {
  const drafts = getCommunityGateDrafts(communityWithGatePolicy(policy));
  const mode = getGatePolicyMatchMode(policy);
  return serializeIdentityGateDraftsForSave(drafts, {
    mode,
    preserve: {
      gateDrafts: drafts,
      mode,
      policy,
    },
  });
}

function expectLoadSaveFidelity(input: {
  expectedDrafts: IdentityGateDraft[];
  lossy: boolean;
  policy: GatePolicy;
}) {
  const drafts = getCommunityGateDrafts(communityWithGatePolicy(input.policy));
  const mode = getGatePolicyMatchMode(input.policy);
  expect(drafts).toEqual(input.expectedDrafts);
  expect(isGatePolicyProjectionLossy(
    input.policy,
    serializeIdentityGateDrafts(drafts, { mode }),
  )).toBe(input.lossy);
  expect(projectAndSaveUnchanged(input.policy)).toBe(input.policy);
}

describe("gate policy moderation fidelity", () => {
  test("loads and saves every normal gate atom without changing the policy", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "unique_human", provider: "self" } },
          { op: "gate", gate: { type: "nationality", provider: "self", accepted_providers: ["self", "zkpassport"], allowed: ["US", "CA"] } },
          { op: "gate", gate: { type: "minimum_age", provider: "self", accepted_providers: ["zkpassport"], minimum_age: 30 } },
          { op: "gate", gate: { type: "gender", provider: "self", accepted_providers: ["self"], allowed: ["F"] } },
          { op: "gate", gate: { type: "wallet_score", provider: "passport", minimum_score: 20 } },
          { op: "gate", gate: { type: "erc721_holding", chain_namespace: "eip155:1", contract_address: "0x1111111111111111111111111111111111111111" } },
          {
            op: "gate",
            gate: {
              type: "erc721_inventory_match",
              provider: "courtyard",
              chain_namespace: "eip155:137",
              contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
              min_quantity: 2,
              match: {
                category: "trading_card",
                franchise: "Pokemon",
                subject: "Pikachu",
                set: "Base",
                grade: "10",
              },
            },
          },
        ],
      },
    };

    expectLoadSaveFidelity({
      policy,
      lossy: false,
      expectedDrafts: [
        { gateType: "unique_human", provider: "self" },
        { gateType: "nationality", provider: "self", acceptedProviders: ["self", "zkpassport"], requiredValues: ["US", "CA"] },
        { gateType: "minimum_age", provider: "self", acceptedProviders: ["zkpassport"], minimumAge: 30 },
        { gateType: "gender", provider: "self", acceptedProviders: ["self"], requiredValue: "F" },
        { gateType: "wallet_score", provider: "passport", minimumScore: 20 },
        { gateType: "erc721_holding", chainNamespace: "eip155:1", contractAddress: "0x1111111111111111111111111111111111111111" },
        {
          gateType: "erc721_inventory_match",
          chainNamespace: "eip155:137",
          contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
          inventoryProvider: "courtyard",
          minQuantity: 2,
          assetFilter: {
            category: "trading_card",
            franchise: "Pokemon",
            subject: "Pikachu",
            set: "Base",
            grade: "10",
          },
        },
      ],
    });
  });

  test("loads and saves standalone anti-bot when it is the whole policy", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
        ],
      },
    };

    expectLoadSaveFidelity({
      policy,
      lossy: false,
      expectedDrafts: [
        { gateType: "altcha_pow" },
      ],
    });
  });

  test("preserves standalone anti-bot when loading a lossy all-mode document policy", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "altcha_pow" } },
          { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
        ],
      },
    };

    const drafts = getCommunityGateDrafts(communityWithGatePolicy(policy));
    expect(drafts).toEqual([
      { gateType: "nationality", provider: "self", requiredValues: ["US"] },
    ]);
    expect(isGatePolicyProjectionLossy(
      policy,
      serializeIdentityGateDrafts(drafts, { mode: getGatePolicyMatchMode(policy) }),
    )).toBe(true);
    expect(projectAndSaveUnchanged(policy)).toBe(policy);
  });

  test("round-trips the palm-scan anti-bot fallback as a normal local OR", () => {
    const policy: GatePolicy = {
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
          { op: "gate", gate: { type: "minimum_age", provider: "self", minimum_age: 21 } },
        ],
      },
    };

    const drafts = getCommunityGateDrafts(communityWithGatePolicy(policy));
    expect(drafts).toEqual([
      { gateType: "unique_human", provider: "very" },
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
      { gateType: "minimum_age", provider: "self", minimumAge: 21 },
    ]);
    expect(isGatePolicyProjectionLossy(
      policy,
      serializeIdentityGateDrafts(drafts, { mode: getGatePolicyMatchMode(policy) }),
    )).toBe(false);
    expect(projectAndSaveUnchanged(policy)).toBe(policy);
  });

  test.each([
    ["Self-only", ["self"] as const],
    ["ZKPassport-only", ["zkpassport"] as const],
    ["Self or ZKPassport", ["self", "zkpassport"] as const],
  ])("loads and saves %s document provider choices", (_label, providers) => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "nationality", provider: "self", accepted_providers: [...providers], allowed: ["US"] } },
          { op: "gate", gate: { type: "minimum_age", provider: "self", accepted_providers: [...providers], minimum_age: 21 } },
          { op: "gate", gate: { type: "gender", provider: "self", accepted_providers: [...providers], allowed: ["M"] } },
        ],
      },
    };

    expectLoadSaveFidelity({
      policy,
      lossy: false,
      expectedDrafts: [
        { gateType: "nationality", provider: "self", acceptedProviders: [...providers], requiredValues: ["US"] },
        { gateType: "minimum_age", provider: "self", acceptedProviders: [...providers], minimumAge: 21 },
        { gateType: "gender", provider: "self", acceptedProviders: [...providers], requiredValue: "M" },
      ],
    });
  });

  test("does not backfill ZKPassport when loading legacy document gates without accepted providers", () => {
    const policy: GatePolicy = {
      version: 1,
      expression: {
        op: "and",
        children: [
          { op: "gate", gate: { type: "nationality", provider: "self", allowed: ["US"] } },
          { op: "gate", gate: { type: "minimum_age", provider: "self", minimum_age: 30 } },
        ],
      },
    };

    const drafts = getCommunityGateDrafts(communityWithGatePolicy(policy));
    expect(drafts).toEqual([
      { gateType: "nationality", provider: "self", acceptedProviders: undefined, requiredValues: ["US"] },
      { gateType: "minimum_age", provider: "self", acceptedProviders: undefined, minimumAge: 30 },
    ]);
    expect(projectAndSaveUnchanged(policy)).toBe(policy);
  });
});

describe("pricing policy moderation helpers", () => {
  test("uses the moderation index as the mobile web entry point", () => {
    expect(buildCommunityModerationEntryPath("cmt_74675bfb653a43809b1238fd6d271867", true))
      .toBe("/c/cmt_74675bfb653a43809b1238fd6d271867/mod");
    expect(buildCommunityModerationEntryPath("cmt_74675bfb653a43809b1238fd6d271867", false))
      .toBe("/c/cmt_74675bfb653a43809b1238fd6d271867/mod/queue");
  });

  test("canonicalizes emoji community handles in moderation paths", () => {
    expect(buildCommunityModerationEntryPath("@🇵🇸", true)).toBe("/c/@xn--t77hga/mod");
    expect(buildCommunityModerationPath("@🇵🇸", "links")).toBe("/c/@xn--t77hga/mod/links");
  });

  test("rejects duplicate country assignments across price groups", () => {
    expect(validatePricingPolicyDraft({
      countryAssignments: [
        { country_code: "US", tier_key: "standard" },
        { country_code: " us ", tier_key: "reduced" },
      ],
      defaultTierKey: "standard",
      regionalPricingEnabled: true,
      tiers: [
        { id: "standard", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 },
        { id: "reduced", tier_key: "reduced", display_name: "Reduced", adjustment_type: "multiplier", adjustment_value: 0.85 },
      ],
    })).toBe("Each country can only be assigned to one price group.");
  });

  test("requires saved price groups to have human-readable names", () => {
    expect(validatePricingPolicyDraft({
      countryAssignments: [],
      defaultTierKey: "standard",
      regionalPricingEnabled: true,
      tiers: [
        { id: "standard", tier_key: "standard", display_name: " ", adjustment_type: "multiplier", adjustment_value: 1 },
      ],
    })).toBe("Each price group needs a name.");
  });

  test("starter pricing policy has unique hidden keys and country assignments", () => {
    const starter = buildStarterPricingPolicyDraft();
    const tierKeys = starter.tiers.map((tier) => tier.tier_key);
    const countryCodes = starter.countryAssignments.map((assignment) => assignment.country_code);

    expect(new Set(tierKeys).size).toBe(tierKeys.length);
    expect(new Set(countryCodes).size).toBe(countryCodes.length);
    expect(countryCodes.length).toBe(COUNTRIES.length);
    expect(COUNTRIES.every((country) => countryCodes.includes(country.code))).toBe(true);
    expect(validatePricingPolicyDraft(starter)).toBeNull();
  });

  test("starter pricing policy uses a ten-times high-to-low spread", () => {
    const starter = buildStarterPricingPolicyDraft();
    const tierByKey = new Map(starter.tiers.map((tier) => [tier.tier_key, tier]));
    const assignmentByCountry = new Map(
      starter.countryAssignments.map((assignment) => [assignment.country_code, assignment]),
    );
    const denmarkTier = tierByKey.get(assignmentByCountry.get("DK")?.tier_key ?? "");
    const indiaTier = tierByKey.get(assignmentByCountry.get("IN")?.tier_key ?? "");

    expect(denmarkTier?.adjustment_value).toBe(1);
    expect(indiaTier?.adjustment_value).toBe(0.1);
    expect((denmarkTier?.adjustment_value ?? 0) / (indiaTier?.adjustment_value ?? 1)).toBe(10);
  });

  test("starter pricing policy keeps major developed economies at full price", () => {
    const starter = buildStarterPricingPolicyDraft();
    const tierByKey = new Map(starter.tiers.map((tier) => [tier.tier_key, tier]));
    const assignmentByCountry = new Map(
      starter.countryAssignments.map((assignment) => [assignment.country_code, assignment]),
    );
    const fullPriceCountryCodes = [
      "AE", "AT", "AU", "BE", "CA", "DE", "FI", "FR", "GB", "IE",
      "IL", "JP", "KR", "KW", "NL", "NO", "NZ", "QA", "SA", "SE", "SG", "US",
    ];

    expect(fullPriceCountryCodes.every((countryCode) => {
      const tier = tierByKey.get(assignmentByCountry.get(countryCode)?.tier_key ?? "");
      return tier?.tier_key === "high_income" && tier.adjustment_value === 1;
    })).toBe(true);
  });

  test("starter pricing policy discounts nationality-gated local countries", () => {
    const starter = buildStarterPricingPolicyDraft({ localCountryCodes: ["ECU"] });

    expect(starter.tiers.find((tier) => tier.tier_key === "local_members")).toEqual({
      id: "starter-local_members",
      tier_key: "local_members",
      display_name: "Local members",
      adjustment_type: "multiplier",
      adjustment_value: 0.08,
    });
    expect(starter.countryAssignments.find((assignment) => assignment.country_code === "EC")).toEqual({
      country_code: "EC",
      tier_key: "local_members",
    });
    expect(starter.countryAssignments.filter((assignment) => assignment.country_code === "EC")).toHaveLength(1);
    expect(validatePricingPolicyDraft(starter)).toBeNull();
  });
});
