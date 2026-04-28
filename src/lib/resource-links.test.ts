import { describe, expect, test } from "bun:test";

import { resolveResourceHref } from "./resource-links";

describe("resolveResourceHref", () => {
  test("resolves blog and legal resource links", () => {
    expect(resolveResourceHref("blog")).toBe("https://blog.pirate.sc");
    expect(resolveResourceHref("terms-of-service")).toBe("/terms");
    expect(resolveResourceHref("privacy-policy")).toBe("/privacy");
  });

  test("resolves source links", () => {
    expect(resolveResourceHref("source-github")).toBe("https://github.com/pirate-social-club");
    expect(resolveResourceHref("source-freedom-browser")).toBe(
      "https://github.com/pirate-social-club/freedom-browser",
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
