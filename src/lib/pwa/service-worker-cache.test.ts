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
  ) {}

  clone() {
    return new FakeResponse(this.body, this.status);
  }
}

type CacheEntry = { request: FakeRequest; response: FakeResponse };

function createHarness() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const stores = new Map<string, Map<string, CacheEntry>>();
  let fetcher = async (request: FakeRequest) => new FakeResponse(`network:${request.url}`);
  let rejectCacheWrites = false;

  const cacheFor = (name: string) => {
    let entries = stores.get(name);
    if (!entries) {
      entries = new Map();
      stores.set(name, entries);
    }
    return {
      match: async (request: FakeRequest) => entries?.get(request.url)?.response,
      put: async (request: FakeRequest, response: FakeResponse) => {
        if (rejectCacheWrites) throw new Error("quota exhausted");
        entries?.set(request.url, { request, response });
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
  const source = readFileSync(join(import.meta.dir, "../../../public/sw.js"), "utf8");
  new Function("self", "caches", "fetch", source)(
    self,
    caches,
    (request: FakeRequest) => fetcher(request),
  );

  return {
    stores,
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

  test("serves immutable assets cache-first and bounds old content hashes", async () => {
    for (let index = 0; index < 260; index += 1) {
      await harness.fetch(`https://pirate.sc/assets/chunk-${index}.js`);
    }
    const immutable = harness.stores.get("pirate-pwa-assets-v3");
    expect(immutable?.size).toBe(256);
    expect(immutable?.has("https://pirate.sc/assets/chunk-0.js")).toBe(false);

    let networkCalls = 0;
    harness.setFetcher(async () => {
      networkCalls += 1;
      throw new Error("immutable assets should be served from cache");
    });
    expect((await harness.fetch("https://pirate.sc/assets/chunk-259.js")).status).toBe(200);
    expect(networkCalls).toBe(0);
  });

  test("does not reject a successful response when a cache write fails", async () => {
    harness.setRejectCacheWrites(true);
    const response = await harness.fetch("https://pirate.sc/assets/quota.js");
    expect(response.status).toBe(200);
  });
});
