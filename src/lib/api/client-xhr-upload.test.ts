import { afterEach, describe, expect, test } from "bun:test";

import { xhrUploadFetch } from "./client-xhr-upload";

type ProgressHandler = (event: { lengthComputable: boolean; loaded: number; total: number }) => void;

class FakeXHR {
  static last: FakeXHR | null = null;
  method = "";
  url = "";
  responseType = "";
  status = 0;
  statusText = "";
  responseText = "";
  requestHeaders: Record<string, string> = {};
  upload: { onprogress?: ProgressHandler } = {};
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  sentBody: unknown = undefined;
  // Test knobs
  progressEvents: Array<{ loaded: number; total: number }> = [{ loaded: 5, total: 10 }, { loaded: 10, total: 10 }];
  responseStatus = 200;
  responseBody = JSON.stringify({ ok: true });

  constructor() {
    FakeXHR.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }
  getAllResponseHeaders() {
    return "content-type: application/json\r\nx-thing: yes\r\n";
  }
  send(body: unknown) {
    this.sentBody = body;
    for (const e of this.progressEvents) this.upload.onprogress?.({ lengthComputable: true, ...e });
    this.status = this.responseStatus;
    this.statusText = "OK";
    this.responseText = this.responseBody;
    this.onload?.();
  }
}

const originalXHR = globalThis.XMLHttpRequest;
afterEach(() => {
  globalThis.XMLHttpRequest = originalXHR;
});

describe("xhrUploadFetch", () => {
  test("reports byte-progress fractions and returns a parseable Response", async () => {
    globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
    const fractions: number[] = [];

    const res = await xhrUploadFetch(
      "https://api.test/community-media",
      { method: "POST", headers: new Headers({ authorization: "Bearer t" }), body: "x" },
      (f) => fractions.push(f),
    );

    expect(fractions).toEqual([0.5, 1]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual({ ok: true });
    expect(FakeXHR.last?.requestHeaders.authorization).toBe("Bearer t");
  });

  test("does not set Content-Type for FormData bodies (browser owns the boundary)", async () => {
    globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
    const body = new FormData();
    body.set("kind", "post_image");

    await xhrUploadFetch(
      "https://api.test/community-media",
      { method: "POST", headers: new Headers({ "content-type": "multipart/form-data", "x-keep": "1" }), body },
      () => {},
    );

    expect(FakeXHR.last?.requestHeaders["content-type"]).toBeUndefined();
    expect(FakeXHR.last?.requestHeaders["x-keep"]).toBe("1");
  });

  test("rejects when the request fails at the network layer (status 0)", async () => {
    class ZeroXHR extends FakeXHR {
      responseStatus = 0;
    }
    globalThis.XMLHttpRequest = ZeroXHR as unknown as typeof XMLHttpRequest;

    let threw = false;
    try {
      await xhrUploadFetch("https://api.test/x", { method: "POST", headers: new Headers(), body: "x" }, () => {});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
