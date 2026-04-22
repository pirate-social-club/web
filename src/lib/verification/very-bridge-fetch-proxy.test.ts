import { describe, expect, test } from "bun:test";

import { resolveVeryBridgeProxyPath } from "./very-bridge-fetch-proxy";

describe("Very bridge fetch proxy", () => {
  test("maps Very bridge session creation to the Pirate API proxy", () => {
    expect(resolveVeryBridgeProxyPath("https://bridge.very.org/api/v1/sessions")).toBe(
      "/verification-sessions/very-bridge/sessions",
    );
  });

  test("maps Very bridge session status to the Pirate API proxy", () => {
    expect(resolveVeryBridgeProxyPath("https://bridge.very.org/api/v1/session/abc%20123")).toBe(
      "/verification-sessions/very-bridge/session/abc%20123",
    );
  });

  test("ignores unrelated requests", () => {
    expect(resolveVeryBridgeProxyPath("https://verify.very.org/api/v1/verify")).toBeNull();
    expect(resolveVeryBridgeProxyPath("https://bridge.very.org/api/v2/session/abc")).toBeNull();
  });
});
