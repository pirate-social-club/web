import { describe, expect, test } from "bun:test";

import { installVeryBridgeFetchProxy, resolveVeryBridgeProxyPath } from "./very-bridge-fetch-proxy";

function withTestWindow(fetchImpl: typeof fetch): () => void {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      fetch: fetchImpl,
      location: { hostname: "localhost" },
    },
  });

  return () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  };
}

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

  test("preserves Request method, body, and headers when proxying session creation", async () => {
    let capturedInput: RequestInfo | URL | null = null;
    let capturedInit: RequestInit | undefined;
    const restoreWindow = withTestWindow(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return Response.json({ ok: true });
    });
    const cleanupProxy = installVeryBridgeFetchProxy();

    try {
      const response = await window.fetch(new Request("https://bridge.very.org/api/v1/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-widget": "very",
        },
        body: JSON.stringify({ iv: "iv-1", payload: "payload-1" }),
      }));

      expect(response.ok).toBe(true);
      expect(capturedInit).toBe(undefined);
      const forwardedInput = capturedInput as unknown;
      expect(forwardedInput instanceof Request).toBe(true);
      if (!(forwardedInput instanceof Request)) {
        throw new Error("Expected Very bridge proxy to forward a Request");
      }

      const request = forwardedInput;
      expect(request.url).toBe("http://127.0.0.1:8787/verification-sessions/very-bridge/sessions");
      expect(request.method).toBe("POST");
      expect(request.headers.get("content-type")).toBe("application/json");
      expect(request.headers.get("x-widget")).toBe("very");
      expect(await request.clone().text()).toBe("{\"iv\":\"iv-1\",\"payload\":\"payload-1\"}");
    } finally {
      cleanupProxy();
      restoreWindow();
    }
  });
});
