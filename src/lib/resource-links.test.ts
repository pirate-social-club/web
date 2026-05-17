import { describe, expect, test } from "bun:test";

import { prefersNativeRadicleLinks, resolveResourceHref } from "./resource-links";

function withWindow(value: unknown, callback: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value,
  });
  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
}

describe("resolveResourceHref", () => {
  test("resolves blog and legal resource links", () => {
    expect(resolveResourceHref("blog")).toBe("https://blog.pirate.sc");
    expect(resolveResourceHref("account-deletion")).toBe("/delete-account");
    expect(resolveResourceHref("terms-of-service")).toBe("/terms");
    expect(resolveResourceHref("privacy-policy")).toBe("/privacy");
  });

  test("resolves source links", () => {
    expect(resolveResourceHref("source-github")).toBe("https://github.com/pirate");
    expect(resolveResourceHref("source-freedom-browser")).toBe(
      "https://github.com/pirate-social-club/freedom-browser/releases",
    );
    expect(resolveResourceHref("source-radicle-web")).toBe(
      "https://app.radicle.xyz/nodes/iris.radicle.xyz/rad:z3qZx2qJDkjxfjBSPwRva4DutYJTh",
    );
    expect(resolveResourceHref("source-radicle-api")).toBe(
      "https://app.radicle.xyz/nodes/iris.radicle.xyz/rad:z2g5M6jqfcwzJobizqRbNCakDsdpU",
    );
    expect(resolveResourceHref("source-radicle-contracts")).toBe(
      "https://app.radicle.xyz/nodes/radicle.jarg.io/rad:zWrB9TTk3sZ5SfSPv5Z8gbq5sbvb",
    );
  });

  test("resolves native Radicle links when requested", () => {
    expect(resolveResourceHref("source-radicle-web", { preferNativeRadicle: true })).toBe(
      "rad://z3qZx2qJDkjxfjBSPwRva4DutYJTh",
    );
    expect(resolveResourceHref("source-radicle-api", { preferNativeRadicle: true })).toBe(
      "rad://z2g5M6jqfcwzJobizqRbNCakDsdpU",
    );
    expect(resolveResourceHref("source-radicle-contracts", { preferNativeRadicle: true })).toBe(
      "rad://zWrB9TTk3sZ5SfSPv5Z8gbq5sbvb",
    );
  });

  test("returns null for unknown resource ids", () => {
    expect(resolveResourceHref("unknown")).toBeNull();
  });
});

describe("prefersNativeRadicleLinks", () => {
  test("detects Freedom Browser from the current ethereum marker", () => {
    withWindow({ ethereum: { isFreedomBrowser: true } }, () => {
      expect(prefersNativeRadicleLinks()).toBe(true);
    });
  });

  test("keeps the legacy swarm marker as a fallback", () => {
    withWindow({ swarm: { isFreedomBrowser: true } }, () => {
      expect(prefersNativeRadicleLinks()).toBe(true);
    });
  });

  test("detects the explicit Freedom Browser marker", () => {
    withWindow({ freedomBrowser: { isFreedomBrowser: true } }, () => {
      expect(prefersNativeRadicleLinks()).toBe(true);
    });
  });

  test("detects Freedom Browser from the shell bridge fallback", () => {
    withWindow({ electronAPI: {}, internalPages: {}, nodeConfig: {} }, () => {
      expect(prefersNativeRadicleLinks()).toBe(true);
    });
  });

  test("returns false outside Freedom Browser", () => {
    withWindow({}, () => {
      expect(prefersNativeRadicleLinks()).toBe(false);
    });
  });
});
