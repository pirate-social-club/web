import { describe, expect, test } from "bun:test";
import {
  dispatchSolidRequestAtEdge,
  sanitizeSolidDispatchResponse,
  type SolidEdgeEnv,
} from "./lib/solid-edge-dispatcher";

function toggle(path = "/privacy", enabled = true): string {
  return JSON.stringify({ version: 1, path, enabled, releaseId: "worker-fixture" });
}

function request(path: string, method = "GET", headers?: HeadersInit): Request {
  return new Request(`https://pirate.sc${path}`, { method, headers });
}

const SOLID_EDGE_KEY = "solid-edge-test-key-with-at-least-32-bytes-long";

function fixtures(overrides: Partial<SolidEdgeEnv> = {}) {
  let kvCalls = 0;
  let serviceCalls = 0;
  const env: SolidEdgeEnv = {
    SOLID_EDGE_HMAC_KEY: SOLID_EDGE_KEY,
    SOLID_ROUTE_ALLOWLIST: {
      async get() {
        kvCalls += 1;
        return toggle();
      },
    },
    SOLID: {
      async fetch() {
        serviceCalls += 1;
        return new Response("solid", { status: 200 });
      },
    },
    ...overrides,
  };
  return { env, counts: () => ({ kvCalls, serviceCalls }) };
}

describe("React Worker Solid dispatch boundary", () => {
  test("keeps direct endpoints and unsupported methods on React without I/O", async () => {
    for (const path of ["/__version", "/.well-known/http-message-signatures-directory", "/assets/app.js", "/favicon.ico", "/site.webmanifest"]) {
      const fixture = fixtures();
      const result = await dispatchSolidRequestAtEdge(
        request(path),
        `https://pirate.sc${path}`,
        fixture.env,
      );
      expect(result.kind).toBe("react");
      expect(fixture.counts()).toEqual({ kvCalls: 0, serviceCalls: 0 });
    }

    const fixture = fixtures();
    const result = await dispatchSolidRequestAtEdge(
      request("/privacy", "POST"),
      "https://pirate.sc/privacy",
      fixture.env,
    );
    expect(result).toEqual({ kind: "react", reason: "unsupported-method" });
    expect(fixture.counts()).toEqual({ kvCalls: 0, serviceCalls: 0 });
  });

  test("settles unknown-host and sovereign metadata rejection before KV", async () => {
    const unknown = fixtures();
    const unknownResult = await dispatchSolidRequestAtEdge(
      request("/privacy"),
      "https://evil.example/privacy",
      unknown.env,
    );
    expect(unknownResult.kind).toBe("response");
    expect((unknownResult as { reason: string }).reason).toBe("unknown-host");
    expect(unknown.counts()).toEqual({ kvCalls: 0, serviceCalls: 0 });

    const sovereign = fixtures();
    const sovereignResult = await dispatchSolidRequestAtEdge(
      request("/privacy"),
      "https://crew.hns/privacy",
      sovereign.env,
    );
    expect(sovereignResult.kind).toBe("response");
    expect((sovereignResult as { reason: string }).reason).toBe("forwarding-metadata-required");
    expect(sovereign.counts()).toEqual({ kvCalls: 0, serviceCalls: 0 });

    const missing = await dispatchSolidRequestAtEdge(
      request("/privacy"),
      "https://evil.example/privacy",
      {},
    );
    expect(missing).toEqual({ kind: "react", reason: "solid-capability-missing" });
  });

  test("sanitizes every public dispatcher rejection while preserving denial semantics", async () => {
    const cases = [
      {
        name: "unknown host",
        request: request("/privacy"),
        effectiveUrl: "https://evil.example/privacy",
        reason: "unknown-host",
      },
      {
        name: "missing HNS metadata",
        request: request("/privacy"),
        effectiveUrl: "https://crew.hns/privacy",
        reason: "forwarding-metadata-required",
      },
      {
        name: "invalid HNS metadata",
        request: request("/privacy", "GET", {
          "x-pirate-hns-trusted-forwarder": "0",
          "x-pirate-hns-community-id": "crew-id",
        }),
        effectiveUrl: "https://crew.hns/privacy",
        reason: "forwarding-metadata-required",
      },
    ] as const;

    for (const input of cases) {
      const result = await dispatchSolidRequestAtEdge(input.request, input.effectiveUrl, fixtures().env);
      const publicResult = sanitizeSolidDispatchResponse(result);
      expect(publicResult.kind, input.name).toBe("response");
      expect((publicResult as { reason: string }).reason, input.name).toBe(input.reason);
      const response = (publicResult as { response: Response }).response;
      expect(response.status, input.name).toBe(404);
      expect(response.headers.get("cache-control"), input.name).toBe("no-store");
      expect(response.headers.get("content-type"), input.name).toBe("text/plain; charset=utf-8");
      for (const header of [
        "x-solid-route-outcome",
        "x-seam-host-surface",
        "x-pirate-solid-edge-debug",
        "x-internal-trace",
        "set-cookie",
        "connection",
        "transfer-encoding",
      ]) {
        expect(response.headers.has(header), `${input.name}: ${header}`).toBe(false);
      }
    }
  });

  test("keeps a public redirect response intact while sanitizing its headers", () => {
    const response = sanitizeSolidDispatchResponse({
      kind: "response",
      reason: "sovereign-redirect",
      response: Response.redirect("https://app.crew.hns/", 307),
    });
    expect(response.kind).toBe("response");
    expect(response.response.status).toBe(307);
    expect(response.response.headers.get("location")).toBe("https://app.crew.hns/");
    expect(response.response.headers.has("x-solid-route-outcome")).toBe(false);
  });

  test("strips credentials while retaining authenticated HNS context and query", async () => {
    let forwarded: Request | null = null;
    const fixture = fixtures({
      SOLID_ROUTE_ALLOWLIST: {
        async get() {
          return toggle("/privacy");
        },
      },
      SOLID: {
        async fetch(input) {
          forwarded = input instanceof Request ? input : new Request(input);
          return new Response("solid", { status: 200 });
        },
      },
    });
    const result = await dispatchSolidRequestAtEdge(
      request("/privacy?lang=en", "GET", {
        "x-pirate-hns-trusted-forwarder": "1",
        "x-pirate-hns-host": "crew.hns",
        "x-pirate-hns-community-id": "crew-id",
        cookie: "session=secret",
        authorization: "Bearer secret",
        "x-pirate-session-id": "session-secret",
      }),
      "https://crew.hns/privacy?lang=en",
      fixture.env,
    );
    expect(result.kind).toBe("solid");
    expect(forwarded?.url).toBe("https://crew.hns/privacy?lang=en");
    expect(forwarded?.headers.get("x-pirate-hns-trusted-forwarder")).toBe("1");
    expect(forwarded?.headers.get("x-pirate-hns-community-id")).toBe("crew-id");
    expect(forwarded?.headers.has("cookie")).toBe(false);
    expect(forwarded?.headers.has("authorization")).toBe(false);
    expect(forwarded?.headers.has("x-pirate-session-id")).toBe(false);
  });

  test("returns a Solid 5xx without invoking React fallback", async () => {
    let serviceCalls = 0;
    const fixture = fixtures({
      SOLID_ROUTE_ALLOWLIST: {
        async get() {
          return toggle("/robots.txt");
        },
      },
      SOLID: {
        async fetch() {
          serviceCalls += 1;
          return new Response("solid failure", { status: 503 });
        },
      },
    });
    const result = await dispatchSolidRequestAtEdge(
      request("/robots.txt"),
      "https://pirate.sc/robots.txt",
      fixture.env,
    );
    expect(result.kind).toBe("solid");
    expect((result as { response: Response }).response.status).toBe(503);
    expect(serviceCalls).toBe(1);
  });

  test("dispatches a canonical profile through the dynamic template toggle", async () => {
    const kvKeys: string[] = [];
    let forwarded: Request | null = null;
    const fixture = fixtures({
      SOLID_ROUTE_ALLOWLIST: {
        async get(key) {
          kvKeys.push(key);
          return toggle("/u/:handle");
        },
      },
      SOLID: {
        async fetch(input) {
          forwarded = input instanceof Request ? input : new Request(input);
          return new Response("profile", { status: 200 });
        },
      },
    });
    const result = await dispatchSolidRequestAtEdge(
      request("/u/alice.pirate?locale=en"),
      "https://pirate.sc/u/alice.pirate?locale=en",
      fixture.env,
    );

    expect(result.kind).toBe("solid");
    expect(kvKeys).toEqual(["v1:/u/:handle"]);
    expect(forwarded?.url).toBe("https://pirate.sc/u/alice.pirate?locale=en");
  });
});
