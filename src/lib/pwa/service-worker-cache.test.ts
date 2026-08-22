import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type FakeRequest = {
  method: string;
  mode: string;
  url: string;
};

class FakeResponse {
  constructor(
    readonly body: string,
    readonly status = 200,
    readonly contentType: string | null = null,
  ) {}

  readonly headers = {
    get: (name: string) => name.toLowerCase() === "content-type" ? this.contentType : null,
  };

  clone() {
    return new FakeResponse(this.body, this.status, this.contentType);
  }

  async json() {
    return JSON.parse(this.body);
  }
}

type CacheEntry = { request: FakeRequest; response: FakeResponse };

function createHarness() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const stores = new Map<string, Map<string, CacheEntry>>();
  const assetContentType = (url: string) => {
    const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
    if (extension === "js") return "application/javascript";
    if (extension === "css") return "text/css";
    if (extension === "wasm") return "application/wasm";
    if (["woff", "woff2", "ttf"].includes(extension ?? "")) return "font/woff2";
    return "image/svg+xml";
  };
  let fetcher = async (request: FakeRequest) => new FakeResponse(
    `network:${request.url}`,
    200,
    assetContentType(request.url),
  );
  let rejectCacheWrites = false;

  const cacheFor = (name: string) => {
    let entries = stores.get(name);
    if (!entries) {
      entries = new Map();
      stores.set(name, entries);
    }
    const requestUrl = (request: FakeRequest | string) =>
      typeof request === "string" ? new URL(request, "https://pirate.sc").href : request.url;
    return {
      match: async (request: FakeRequest | string) => entries?.get(requestUrl(request))?.response,
      put: async (request: FakeRequest | string, response: FakeResponse) => {
        if (rejectCacheWrites) throw new Error("quota exhausted");
        const url = requestUrl(request);
        entries?.set(url, {
          request: typeof request === "string" ? { method: "GET", mode: "cors", url } : request,
          response,
        });
      },
      keys: async () => [...(entries?.values() ?? [])].map(({ request }) => request),
      delete: async (request: FakeRequest) => entries?.delete(request.url) ?? false,
    };
  };

  const caches = {
    open: async (name: string) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const self = {
    addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) => {
      listeners.set(type, listener);
    },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const source = readFileSync(join(import.meta.dir, "../../../public/sw.js"), "utf8")
    .replace('"__PIRATE_ASSET_MANIFEST__"', JSON.stringify([
      "/assets/current.js",
      "/assets/shared.js",
    ]));
  new Function("self", "caches", "fetch", "Response", source)(
    self,
    caches,
    (request: FakeRequest) => fetcher(request),
    FakeResponse,
  );

  return {
    stores,
    async activate() {
      const listener = listeners.get("activate");
      if (!listener) throw new Error("activate listener was not registered");
      const waits: Promise<unknown>[] = [];
      listener({
        waitUntil(value: Promise<unknown>) {
          waits.push(value);
        },
      });
      await Promise.all(waits);
    },
    setFetcher(next: typeof fetcher) {
      fetcher = next;
    },
    setRejectCacheWrites(value: boolean) {
      rejectCacheWrites = value;
    },
    async fetch(url: string) {
      const listener = listeners.get("fetch");
      if (!listener) throw new Error("fetch listener was not registered");
      const waits: Promise<unknown>[] = [];
      let responsePromise: Promise<FakeResponse> | undefined;
      const request = { method: "GET", mode: "cors", url };
      listener({
        request,
        respondWith(value: Promise<FakeResponse>) {
          responsePromise = value;
        },
        waitUntil(value: Promise<unknown>) {
          waits.push(value);
        },
      });
      if (!responsePromise) throw new Error("fetch was not handled");
      const response = await responsePromise;
      await Promise.all(waits);
      return response;
    },
  };
}

describe("service worker static caching", () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  test("reuses a previously fetched root-served static file when offline", async () => {
    const url = "https://pirate.sc/favicon.ico";
    expect((await harness.fetch(url)).body).toBe(`network:${url}`);

    harness.setFetcher(async () => {
      throw new Error("offline");
    });
    expect((await harness.fetch(url)).body).toBe(`network:${url}`);
  });

  test("bounds runtime static files while preserving recent offline entries", async () => {
    for (let index = 0; index < 68; index += 1) {
      await harness.fetch(`https://pirate.sc/mascots/mascot-${index}.svg`);
    }
    const runtime = harness.stores.get("pirate-pwa-runtime-v3");
    expect(runtime?.size).toBe(64);
    expect(runtime?.has("https://pirate.sc/mascots/mascot-0.svg")).toBe(false);

    harness.setFetcher(async () => {
      throw new Error("offline");
    });
    expect((await harness.fetch("https://pirate.sc/mascots/mascot-67.svg")).status).toBe(200);
  });

  test("serves immutable assets cache-first without an undersized count cap", async () => {
    for (let index = 0; index < 644; index += 1) {
      await harness.fetch(`https://pirate.sc/assets/chunk-${index}.js`);
    }
    const immutable = [...harness.stores.entries()]
      .find(([name]) => name === "pirate-pwa-assets-v5")?.[1];
    expect(immutable?.size).toBe(644);
    expect(immutable?.has("https://pirate.sc/assets/chunk-0.js")).toBe(true);

    let networkCalls = 0;
    harness.setFetcher(async () => {
      networkCalls += 1;
      throw new Error("immutable assets should be served from cache");
    });
    expect((await harness.fetch("https://pirate.sc/assets/chunk-643.js")).status).toBe(200);
    expect(networkCalls).toBe(0);
  });

  test("activation copies the old release cohort forward before deleting it", async () => {
    harness.stores.set("pirate-pwa-assets-v3", new Map());
    harness.stores.set("pirate-pwa-assets-v4-older-release", new Map([
      ["https://pirate.sc/assets/legacy.js", {
        request: { method: "GET", mode: "cors", url: "https://pirate.sc/assets/legacy.js" },
        response: new FakeResponse("old-legacy"),
      }],
    ]));
    harness.stores.set("pirate-pwa-runtime-v3", new Map());
    harness.stores.set("unrelated-cache", new Map());

    await harness.activate();

    const names = [...harness.stores.keys()];
    expect(names).toContain("pirate-pwa-runtime-v3");
    expect(names).toContain("unrelated-cache");
    expect(names).toContain("pirate-pwa-assets-v5");
    expect(names).not.toContain("pirate-pwa-assets-v3");
    expect(names).not.toContain("pirate-pwa-assets-v4-older-release");
    expect(harness.stores.get("pirate-pwa-assets-v5")?.has("https://pirate.sc/assets/legacy.js")).toBe(true);
  });

  test("retains current and previous manifests while pruning older assets", async () => {
    const entries = new Map<string, CacheEntry>();
    const add = (url: string, body: string) => entries.set(url, {
      request: { method: "GET", mode: "cors", url },
      response: new FakeResponse(body),
    });
    add("https://pirate.sc/__pirate_asset_manifest__", JSON.stringify([
      "/assets/previous.js",
      "/assets/shared.js",
    ]));
    add("https://pirate.sc/assets/previous.js", "previous");
    add("https://pirate.sc/assets/shared.js", "shared");
    add("https://pirate.sc/assets/current.js", "current");
    add("https://pirate.sc/assets/stale.js", "stale");
    harness.stores.set("pirate-pwa-assets-v5", entries);

    await harness.activate();

    expect(entries.has("https://pirate.sc/assets/previous.js")).toBe(true);
    expect(entries.has("https://pirate.sc/assets/shared.js")).toBe(true);
    expect(entries.has("https://pirate.sc/assets/current.js")).toBe(true);
    expect(entries.has("https://pirate.sc/assets/stale.js")).toBe(false);
  });

  test("does not reject a successful response when a cache write fails", async () => {
    harness.setRejectCacheWrites(true);
    const response = await harness.fetch("https://pirate.sc/assets/quota.js");
    expect(response.status).toBe(200);
  });

  test("does not cache an HTML fallback for a missing JavaScript module", async () => {
    const url = "https://pirate.sc/assets/missing.js";
    harness.setFetcher(async () => new FakeResponse("<html>fallback</html>", 200, "text/html"));

    expect((await harness.fetch(url)).body).toBe("<html>fallback</html>");
    expect(harness.stores.get("pirate-pwa-assets-v5")?.has(url)).toBe(false);
  });
});
