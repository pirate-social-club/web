import { describe, expect, test } from "bun:test";

import { getErrorMessage } from "./error-utils";

describe("getErrorMessage", () => {
  test("uses non-empty Error messages", () => {
    expect(getErrorMessage(new Error("Could not save."), "Fallback")).toBe("Could not save.");
  });

  test("uses non-empty string errors", () => {
    expect(getErrorMessage("Network unavailable", "Fallback")).toBe("Network unavailable");
  });

  test("falls back for empty or unknown errors", () => {
    expect(getErrorMessage(new Error("   "), "Fallback")).toBe("Fallback");
    expect(getErrorMessage("", "Fallback")).toBe("Fallback");
    expect(getErrorMessage({ message: "not trusted" }, "Fallback")).toBe("Fallback");
  });
});
