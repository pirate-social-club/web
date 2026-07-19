import { describe, expect, test } from "bun:test";

import { formatUsdCentsLabel } from "./currency";

describe("formatUsdCentsLabel", () => {
  test("preserves exact cent precision", () => {
    expect(formatUsdCentsLabel(1, "en-US")).toBe("$0.01");
    expect(formatUsdCentsLabel(1234, "en-US")).toBe("$12.34");
    expect(formatUsdCentsLabel(120, "en-US")).toBe("$1.20");
  });

  test("uses the requested locale", () => {
    expect(formatUsdCentsLabel(1234, "de-DE")).toBe("12,34\u00a0$");
  });

  test("rejects absent and non-finite values", () => {
    expect(formatUsdCentsLabel(null)).toBeUndefined();
    expect(formatUsdCentsLabel(Number.NaN)).toBeUndefined();
  });
});
