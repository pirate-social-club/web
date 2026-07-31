import { describe, expect, test } from "bun:test";
import { phoneticStreamSimilarity } from "../src/scoring";

describe("phoneticStreamSimilarity", () => {
  test("scores fragmented tokens identically to merged tokens", () => {
    const result = phoneticStreamSimilarity(["shoo", "be", "doo"], ["shooby", "doo"]);
    expect(result.available).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.similarity).toBe(1);
  });

  test("charges a small distance for a near-vowel substitution plus trailing consonant", () => {
    const result = phoneticStreamSimilarity(["said"], ["say"]);
    expect(result.available).toBe(true);
    expect(result.distance).toBeGreaterThan(0);
    expect(result.distance).toBeLessThanOrEqual(2);
    expect(result.similarity).toBeLessThan(1);
    expect(result.similarity).toBeGreaterThan(0);
  });

  test("reports unavailable for non-Latin tokens", () => {
    expect(phoneticStreamSimilarity(["日本語"], ["日本語"]).available).toBe(false);
  });

  test("reports unavailable for empty token arrays without crashing", () => {
    const bothEmpty = phoneticStreamSimilarity([], []);
    expect(bothEmpty.available).toBe(false);
    expect(phoneticStreamSimilarity([], ["love"]).available).toBe(false);
    expect(phoneticStreamSimilarity(["love"], []).available).toBe(false);
  });

  test("scores a clearly different pair well below 1", () => {
    const result = phoneticStreamSimilarity(["love"], ["hate"]);
    expect(result.available).toBe(true);
    expect(result.similarity).toBeLessThan(0.5);
  });
});
