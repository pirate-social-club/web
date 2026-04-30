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

  test("falls back for unhelpful browser network errors", () => {
    const fallback = "The post composer could not be loaded right now.";

    expect(getErrorMessage(new Error("Failed to fetch"), fallback)).toBe(fallback);
    expect(getErrorMessage(new Error("TypeError: Failed to fetch"), fallback)).toBe(fallback);
    expect(getErrorMessage(new Error("NetworkError when attempting to fetch resource."), fallback)).toBe(fallback);
    expect(getErrorMessage(new Error("Load failed"), fallback)).toBe(fallback);
    expect(getErrorMessage(new Error("Network request failed"), fallback)).toBe(fallback);
    expect(getErrorMessage(new Error("fetch failed"), fallback)).toBe(fallback);
    expect(getErrorMessage("Failed to fetch", fallback)).toBe(fallback);
  });

  test("preserves helpful error messages that contain network words", () => {
    const fallback = "Fallback";

    expect(getErrorMessage(new Error("Failed to fetch user profile"), fallback)).toBe("Failed to fetch user profile");
    expect(getErrorMessage(new Error("Network routing table is full"), fallback)).toBe("Network routing table is full");
  });
});
