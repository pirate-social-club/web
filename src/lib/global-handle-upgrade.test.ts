import { describe, expect, test } from "bun:test";

import {
  isCurrentGlobalHandleCandidate,
  isFreeCleanupHandleQuote,
  normalizeGlobalHandleStem,
} from "./global-handle-upgrade";

describe("global handle upgrades", () => {
  test("normalizes a .pirate name for comparisons", () => {
    expect(normalizeGlobalHandleStem(" Captain.PIRATE ")).toBe("captain");
  });

  test("recognizes the user's active name instead of treating it as unavailable", () => {
    expect(isCurrentGlobalHandleCandidate("captain", "captain.pirate")).toBe(true);
    expect(isCurrentGlobalHandleCandidate("new-captain", "captain.pirate")).toBe(false);
  });

  test("recognizes base and discounted free cleanup quotes without a paid quote id", () => {
    for (const pricingTier of ["base", "discounted"]) {
      expect(isFreeCleanupHandleQuote({
        cleanupRenameAvailable: true,
        label: "clean-name-123",
        quote: {
          desired_label: "clean-name-123.pirate",
          eligible: true,
          price_cents: 0,
          pricing_tier: pricingTier,
          tier: "standard",
        },
      })).toBe(true);
    }
  });

  test("does not mistake paid or unavailable quotes for a free cleanup rename", () => {
    expect(isFreeCleanupHandleQuote({
      cleanupRenameAvailable: true,
      label: "cleanname",
      quote: {
        quote: "ghq_paid",
        desired_label: "cleanname.pirate",
        eligible: true,
        price_cents: 500,
        pricing_tier: "base",
        tier: "standard",
      },
    })).toBe(false);
  });
});
