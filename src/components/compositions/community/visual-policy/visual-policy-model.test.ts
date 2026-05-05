import { describe, expect, test } from "bun:test";

import {
  adultToplessNonExplicitSettings,
  resolveVisualPolicyDecision,
  sampleVisualFacts,
  type VisualClassifierFacts,
} from "./visual-policy-model";

const baselineAllowedFacts: VisualClassifierFacts = {
  ...sampleVisualFacts,
  commercialSignal: "none",
  imageTextSignal: "none",
};

describe("resolveVisualPolicyDecision", () => {
  test("allows adult-presenting non-explicit topless media when the board allows it", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, baselineAllowedFacts);

    expect(result).toEqual({
      policyDecision: "allow",
      publishDecision: "allow",
      reasonCodes: [],
    });
  });

  test("queues allowed adult media when an adult-platform watermark requires review", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      commercialSignal: "adult_platform_watermark",
    });

    expect(result.policyDecision).toBe("queue");
    expect(result.publishDecision).toBe("queue");
    expect(result.reasonCodes).toContain("adult_platform_watermark");
  });

  test("rejects explicit sexual activity even when topless media is allowed", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      sexualActivity: "explicit",
    });

    expect(result.policyDecision).toBe("reject");
    expect(result.publishDecision).toBe("reject");
    expect(result.reasonCodes).toContain("explicit_sexual_activity");
  });

  test("rejects possible-minor adult content as a locked platform floor", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      apparentAgeRisk: "possible_minor",
    });

    expect(result.policyDecision).toBe("reject");
    expect(result.publishDecision).toBe("reject");
    expect(result.reasonCodes).toContain("possible_minor_with_adult_content");
  });

  test("deduplicates repeated reason codes from image facts", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      imageTextSignal: "payment_handle",
      nudity: "none",
      visibleNipples: false,
    });

    expect(result.reasonCodes.filter((code) => code === "payment_handle_ocr")).toHaveLength(1);
    expect(result.publishDecision).toBe("queue");
  });

  test("keeps commercial and OCR payment-handle reason codes distinct", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      commercialSignal: "payment_handle",
      imageTextSignal: "payment_handle",
      nudity: "none",
      visibleNipples: false,
    });

    expect(result.reasonCodes).toContain("payment_handle_commercial");
    expect(result.reasonCodes).toContain("payment_handle_ocr");
    expect(result.publishDecision).toBe("queue");
  });

  test("rejects granular sexual activity signals", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      nudity: "none",
      visibleNipples: false,
      sexualizedContact: true,
    });

    expect(result.policyDecision).toBe("reject");
    expect(result.reasonCodes).toContain("sexualized_contact");
  });

  test("applies sex toy policy from classifier facts", () => {
    const packagingResult = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      nudity: "none",
      visibleNipples: false,
      sexToy: "packaging_or_ad",
    });
    const inUseResult = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      nudity: "none",
      visibleNipples: false,
      sexToy: "in_use",
    });

    expect(packagingResult.publishDecision).toBe("queue");
    expect(packagingResult.reasonCodes).toContain("sex_toy_packaging");
    expect(inUseResult.publishDecision).toBe("reject");
    expect(inUseResult.reasonCodes).toContain("sex_toy_in_use");
  });

  test("rejects voyeuristic or hidden-camera signals as platform floor", () => {
    const result = resolveVisualPolicyDecision(adultToplessNonExplicitSettings, {
      ...baselineAllowedFacts,
      voyeuristicOrHiddenCamera: true,
    });

    expect(result.publishDecision).toBe("reject");
    expect(result.reasonCodes).toContain("voyeuristic_or_hidden_camera");
  });
});
