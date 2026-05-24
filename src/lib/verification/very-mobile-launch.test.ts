import { describe, expect, test } from "bun:test";

import {
  buildVeryMobileLaunchHref,
  createVeryMobileBridgeSession,
} from "./very-mobile-launch";

function withTestWindow(fetchImpl: typeof fetch): () => void {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      fetch: fetchImpl,
    },
  });

  return () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  };
}

describe("very mobile launch helpers", () => {
  test("builds the Very app verification deeplink", () => {
    const href = buildVeryMobileLaunchHref({
      key: "bridge-key",
      sessionId: "bridge-session",
    });
    const url = new URL(href);

    expect(url.protocol).toBe("veros:");
    expect(url.hostname).toBe("verify");
    expect(url.searchParams.get("sessionId")).toBe("bridge-session");
    expect(url.searchParams.get("key")).toBe("bridge-key");
    expect(url.searchParams.get("action")).toBe("verify");
  });

  test("creates bridge sessions through window fetch so the Pirate proxy can intercept", async () => {
    let capturedInput: RequestInfo | URL | null = null;
    let capturedInit: RequestInit | undefined;
    const restoreWindow = withTestWindow(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return Response.json({ sessionId: "bridge-session" });
    });

    try {
      const session = await createVeryMobileBridgeSession({
        app_id: "very-app",
        context: "profile",
        query: { user: "usr_1" },
        type_id: "palm_scan",
        verify_url: "https://verify.very.org/test",
      });

      expect(session.sessionId).toBe("bridge-session");
      expect(session.key.length).toBeGreaterThan(0);
      expect(capturedInput).toBe("https://bridge.very.org/api/v1/sessions");
      expect(capturedInit?.method).toBe("POST");
      expect(typeof capturedInit?.body).toBe("string");
    } finally {
      restoreWindow();
    }
  });
});
