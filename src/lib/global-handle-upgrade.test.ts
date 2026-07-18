import { describe, expect, test } from "bun:test";

import {
  isCurrentGlobalHandleCandidate,
  isFreeCleanupHandleQuote,
  isValidGlobalHandleCandidate,
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

  test("validates candidates before they reach the quote endpoint", () => {
    expect(isValidGlobalHandleCandidate(" clean-name-123.pirate ")).toBe(true);
    expect(isValidGlobalHandleCandidate("pokémon")).toBe(true);
    expect(isValidGlobalHandleCandidate("ab")).toBe(false);
    expect(isValidGlobalHandleCandidate("not a handle!")).toBe(false);
    expect(isValidGlobalHandleCandidate("a".repeat(32))).toBe(true);
    expect(isValidGlobalHandleCandidate("a".repeat(33))).toBe(false);
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
