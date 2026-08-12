import { describe, expect, test } from "bun:test";

import { parseAtomicAmountInput } from "./token-amount";

describe("parseAtomicAmountInput", () => {
  test("preserves all 18 decimal places without Number", () => {
    expect(parseAtomicAmountInput("25.123456789012345678", 18)).toEqual({
      atomic: "25123456789012345678",
      ok: true,
    });
  });

  test("pads shorter fractional amounts to atomic units", () => {
    expect(parseAtomicAmountInput("25.1", 18)).toEqual({
      atomic: "25100000000000000000",
      ok: true,
    });
    expect(parseAtomicAmountInput("1", 6)).toEqual({ atomic: "1000000", ok: true });
  });

  test("rejects malformed and over-precise values", () => {
    expect(parseAtomicAmountInput("1.2.3", 18)).toEqual({ ok: false, problem: "invalid" });
    expect(parseAtomicAmountInput("$1.00", 18)).toEqual({ ok: false, problem: "invalid" });
    expect(parseAtomicAmountInput("0.0000001", 6)).toEqual({ ok: false, problem: "too_precise" });
  });

  test("rejects empty and zero values", () => {
    expect(parseAtomicAmountInput("", 18)).toEqual({ ok: false, problem: "missing" });
    expect(parseAtomicAmountInput("0.000", 18)).toEqual({ ok: false, problem: "zero" });
  });
});
