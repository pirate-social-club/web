import { describe, expect, test } from "bun:test";

import {
  buildStarterPricingPolicyDraft,
  validatePricingPolicyDraft,
} from "./moderation-helpers";
import { COUNTRIES } from "@/lib/countries";

describe("pricing policy moderation helpers", () => {
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
