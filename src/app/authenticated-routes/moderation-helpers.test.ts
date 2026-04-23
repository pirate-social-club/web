import { describe, expect, test } from "bun:test";

import {
  buildStarterPricingPolicyDraft,
  validatePricingPolicyDraft,
} from "./moderation-helpers";

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
    expect(validatePricingPolicyDraft(starter)).toBeNull();
  });
});
