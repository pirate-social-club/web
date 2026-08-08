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

  test("appends a reference to unexpected server failures that carry a request id", () => {
    const error = Object.assign(new Error("Internal server error"), {
      status: 500,
      requestId: "8f3a2b1c9d0e4f5a",
    });

    expect(getErrorMessage(error, "Fallback")).toBe("Internal server error (ref: 8f3a2b1c9d0e4f5a)");
  });

  test("does not append references to expected 4xx rejections", () => {
    const error = Object.assign(new Error("Join this community to comment"), {
      status: 403,
      requestId: "8f3a2b1c9d0e4f5a",
    });

    expect(getErrorMessage(error, "Fallback")).toBe("Join this community to comment");
  });

  test("omits the reference when a server failure has no request id", () => {
    const error = Object.assign(new Error("Internal server error"), { status: 500 });

    expect(getErrorMessage(error, "Fallback")).toBe("Internal server error");
  });
});
