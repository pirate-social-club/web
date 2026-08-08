import { describe, expect, test } from "bun:test";

import { formatCompactAddress } from "./address";

describe("formatCompactAddress", () => {
  test("uses the established three-dot separator", () => {
    expect(formatCompactAddress("0x1234567890abcdef1234567890abcdef12345678"))
      .toBe("0x1234...5678");
  });

  test("preserves short labels and supports wider displays", () => {
    expect(formatCompactAddress("0x1234")).toBe("0x1234");
    expect(formatCompactAddress("0x1234567890abcdef", {
      prefixLength: 10,
      suffixLength: 6,
      truncateAt: 18,
    })).toBe("0x1234567890abcdef");
  });
});
