import { describe, expect, test } from "bun:test";

import { formatAssetAmount, parseAssetAmount } from "./asset-amount";

describe("asset amount conversion", () => {
  test("parses ETH and USDC without passing through Number", () => {
    expect(parseAssetAmount("0.5", 18)).toEqual({ ok: true, atomic: "500000000000000000" });
    expect(parseAssetAmount("10", 6)).toEqual({ ok: true, atomic: "10000000" });
  });

  test("supports uint256-sized values exactly", () => {
    const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    expect(parseAssetAmount(maxUint256, 0)).toEqual({ ok: true, atomic: maxUint256 });
    expect(formatAssetAmount(maxUint256, 0)).toBe(maxUint256);
  });

  test("rejects invalid syntax, zero, and excess precision", () => {
    expect(parseAssetAmount("", 6)).toEqual({ ok: false, error: "invalid" });
    expect(parseAssetAmount("0", 6)).toEqual({ ok: false, error: "invalid" });
    expect(parseAssetAmount("1e6", 6)).toEqual({ ok: false, error: "invalid" });
    expect(parseAssetAmount("-1", 6)).toEqual({ ok: false, error: "invalid" });
    expect(parseAssetAmount("0.1234567", 6)).toEqual({ ok: false, error: "precision" });
  });

  test("re-parses the displayed amount using the newly selected asset decimals", () => {
    const displayed = "10";
    expect(parseAssetAmount(displayed, 6)).toEqual({ ok: true, atomic: "10000000" });
    expect(parseAssetAmount(displayed, 18)).toEqual({ ok: true, atomic: "10000000000000000000" });
  });

  test("formats exact values and trims only insignificant fractional zeroes", () => {
    expect(formatAssetAmount("500000000000000000", 18)).toBe("0.5");
    expect(formatAssetAmount("10000000", 6)).toBe("10");
    expect(formatAssetAmount("123456", 6)).toBe("0.123456");
    expect(formatAssetAmount("01", 6)).toBeNull();
  });
});
