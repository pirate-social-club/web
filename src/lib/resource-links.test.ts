import { describe, expect, test } from "bun:test";

import { resolveResourceHref } from "./resource-links";

describe("resolveResourceHref", () => {
  test("resolves blog and legal resource links", () => {
    expect(resolveResourceHref("blog")).toBe("https://blog.pirate.sc");
    expect(resolveResourceHref("terms-of-service")).toBe("/terms");
    expect(resolveResourceHref("privacy-policy")).toBe("/privacy");
  });

  test("returns null for unknown resource ids", () => {
    expect(resolveResourceHref("unknown")).toBeNull();
  });
});
