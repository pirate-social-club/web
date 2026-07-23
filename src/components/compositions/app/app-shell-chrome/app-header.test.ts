import { describe, expect, test } from "bun:test";

import { shouldShowMobileConnectAction } from "./app-header";

describe("shouldShowMobileConnectAction", () => {
  test("suppresses the filled connect CTA over video media", () => {
    expect(shouldShowMobileConnectAction(true, "media-overlay")).toBe(false);
  });

  test("preserves connect on normal mobile surfaces", () => {
    expect(shouldShowMobileConnectAction(true, "default")).toBe(true);
  });
});
