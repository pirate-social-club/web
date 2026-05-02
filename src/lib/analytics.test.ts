import { afterEach, describe, expect, test } from "bun:test";

import { trackAnalyticsEvent } from "./analytics";
import { installDomGlobals } from "@/test/setup-dom";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    get length() {
      return values.size;
    },
  };
}

function requireCapturedRequest(request: Request | null): Request {
  if (!request) {
    throw new Error("Expected analytics request to be captured");
  }
  return request;
}

afterEach(() => {
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
});

describe("trackAnalyticsEvent", () => {
  test("sends API resource id keys in the analytics payload", async () => {
    const { window } = installDomGlobals();
    const sessionStorage = createMemoryStorage();
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: sessionStorage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "pirate.test", origin: "https://pirate.test" },
    });

    let capturedRequest: Request | null = null;
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        capturedRequest = input instanceof Request ? input : new Request(input, init);
        return Response.json({ accepted: true }, { status: 202 });
      },
    });

    trackAnalyticsEvent({
      eventName: "community_viewed",
      communityId: "cmt_analytics",
      postId: "post_analytics",
      commentId: "cmt_comment",
      listingId: "lst_analytics",
      quoteId: "quo_analytics",
      purchaseId: "pur_analytics",
      verificationSessionId: "ver_analytics",
      properties: { tab: "posts" },
    });

    await Promise.resolve();

    const request = requireCapturedRequest(capturedRequest);
    expect(request.url).toBe("http://127.0.0.1:8787/analytics/events");
    const body = await request.json() as Record<string, unknown>;
    expect(body.community_id).toBe("cmt_analytics");
    expect(body.post_id).toBe("post_analytics");
    expect(body.comment_id).toBe("cmt_comment");
    expect(body.listing_id).toBe("lst_analytics");
    expect(body.quote_id).toBe("quo_analytics");
    expect(body.purchase_id).toBe("pur_analytics");
    expect(body.verification_session_id).toBe("ver_analytics");
    expect("community" in body).toBe(false);
    expect("post" in body).toBe(false);
    expect("id" in body).toBe(false);
  });
});
