import { describe, expect, test } from "bun:test";

import { readCanonicalLearningDeckPackage } from "./deck-package-reader";

describe("readCanonicalLearningDeckPackage", () => {
  test("ignores additive fields and preserves the v1 contract", () => {
    const result = readCanonicalLearningDeckPackage({
      schema_version: 1,
      title: "  Geography ",
      description: null,
      future_metadata: { owner: "ignored" },
      cards: [{
        card_id: "lcd_1",
        ordinal: 0,
        card_type: "basic",
        prompt: "Capital?",
        answer: "Tbilisi",
        tags: ["geography"],
        future_field: true,
      }],
    });

    expect(result).toEqual({
      status: "supported",
      package: {
        schema_version: 1,
        title: "  Geography ",
        description: null,
        cards: [{
          card_id: "lcd_1",
          ordinal: 0,
          card_type: "basic",
          prompt: "Capital?",
          answer: "Tbilisi",
          tags: ["geography"],
        }],
      },
    });
  });

  test("returns an unsupported result for a future schema", () => {
    expect(readCanonicalLearningDeckPackage({
      schema_version: 2,
      title: "Future",
      description: null,
      cards: [],
    })).toEqual({ status: "unsupported", schemaVersion: 2 });
  });

  test("rejects malformed card data instead of coercing it", () => {
    expect(() => readCanonicalLearningDeckPackage({
      schema_version: 1,
      title: "Bad",
      description: null,
      cards: [{ card_id: "lcd_1", ordinal: 0, card_type: "basic", prompt: "Q", answer: "A", tags: [1] }],
    })).toThrow("tags");
  });
});
