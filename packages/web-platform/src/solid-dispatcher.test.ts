import { describe, expect, test } from "bun:test";
import {
  buildSolidServiceRequest,
  dispatchSolidRequest,
  resolveSolidDispatchPreflight,
  validateSolidRouteAllowlistRecord,
  type SolidRouteAllowlist,
  type SolidService,
} from "./solid-dispatcher";

const effectiveUrl = "https://pirate.sc/privacy?locale=en";
const SOLID_EDGE_KEY = "solid-edge-test-key-with-at-least-32-bytes-long";

function allowlist(value: string | null, calls: string[] = []): SolidRouteAllowlist {
  return {
    async get(key) {
      calls.push(key);
      return value;
    },
  };
}

function service(
  response: Response | Error,
  calls: Request[] = [],
): SolidService {
  return {
    async fetch(input) {
      const request = input instanceof Request ? input : new Request(input);
      calls.push(request);
      if (response instanceof Error) throw response;
      return response;
    },
  };
}

function record(path = "/privacy", enabled = true): string {
  return JSON.stringify({
    version: 1,
    path,
    enabled,
    releaseId: "slice0-release",
  });
}

function dispatchInput(overrides: Partial<Parameters<typeof dispatchSolidRequest>[0]> = {}) {
  return {
    request: new Request(effectiveUrl, {
      method: "GET",
      headers: {
        "x-pirate-hns-trusted-forwarder": "1",
        "x-pirate-hns-host": "crew.hns",
        "x-pirate-hns-community-id": "community-id",
        cookie: "session=secret",
        authorization: "Bearer secret",
        "x-pirate-anonymous-id": "anonymous-secret",
        "x-pirate-session-id": "session-secret",
        "accept-language": "en-US",
      },
    }),
    effectiveUrl,
    surface: "canonical" as const,
    forwardingMetadataPresent: false,
    seamEnabled: false,
    solidEdgeHmacKey: SOLID_EDGE_KEY,
    ...overrides,
  };
}

describe("versioned Solid route allowlist records", () => {
  test("requires version, exact path, enabled state, and release ID", () => {
    expect(validateSolidRouteAllowlistRecord(record(), "/privacy")).toEqual({
      ok: true,
      record: {
        version: 1,
        path: "/privacy",
        enabled: true,
        releaseId: "slice0-release",
      },
    });
    expect(validateSolidRouteAllowlistRecord("{}", "/privacy")).toEqual({ ok: false, reason: "malformed" });
    expect(validateSolidRouteAllowlistRecord("not-json", "/privacy")).toEqual({ ok: false, reason: "malformed" });
    expect(validateSolidRouteAllowlistRecord(`${record().slice(0, -1)},"extra":true}`, "/privacy")).toEqual({ ok: false, reason: "malformed" });
    expect(validateSolidRouteAllowlistRecord(record("/robots.txt"), "/privacy")).toEqual({ ok: false, reason: "path-mismatch" });
    expect(validateSolidRouteAllowlistRecord(record("/privacy", false), "/privacy")).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("Solid edge dispatcher preflight", () => {
  test("does not touch capabilities before rejecting unknown hosts, HNS metadata, or methods", () => {
    const cases = [
      { surface: "unknown" as const, forwardingMetadataPresent: false, method: "GET", reason: "unknown-host" },
      { surface: "sovereign-apex" as const, forwardingMetadataPresent: false, method: "GET", reason: "forwarding-metadata-required" },
      { surface: "canonical" as const, forwardingMetadataPresent: false, method: "POST", reason: "unsupported-method" },
    ];
    for (const input of cases) {
      const result = resolveSolidDispatchPreflight({
        pathname: "/privacy",
        capabilitiesAvailable: true,
        seamEnabled: false,
        effectiveUrl,
        ...input,
      });
      if (input.reason === "unsupported-method") {
        expect(result).toEqual({ kind: "react", reason: input.reason });
      } else {
        expect(result.kind).toBe("response");
        expect((result as { reason: string }).reason).toBe(input.reason);
      }
    }
  });

  test("keeps capabilities optional and fail-closed", () => {
    expect(resolveSolidDispatchPreflight({
      pathname: "/privacy",
      method: "GET",
      surface: "canonical",
      forwardingMetadataPresent: false,
      seamEnabled: false,
      capabilitiesAvailable: false,
      effectiveUrl,
    })).toEqual({ kind: "react", reason: "solid-capability-missing" });
  });

  test("resolves one safe profile segment to the dynamic route contract", () => {
    expect(resolveSolidDispatchPreflight({
      pathname: "/u/alice.pirate",
      method: "GET",
      surface: "canonical",
      forwardingMetadataPresent: false,
      seamEnabled: false,
      capabilitiesAvailable: true,
      effectiveUrl: "https://pirate.sc/u/alice.pirate",
    })).toMatchObject({
      kind: "dispatch",
      routeId: "v1:/u/:handle",
      route: { path: "/u/:handle" },
    });
  });
});

describe("Solid edge dispatch I/O and request boundary", () => {
  test("dispatches only after a valid toggle and strips identity/session headers", async () => {
    const allowlistCalls: string[] = [];
    const serviceCalls: Request[] = [];
    const result = await dispatchSolidRequest(dispatchInput({
      routeAllowlist: allowlist(record(), allowlistCalls),
      solidService: service(new Response("solid", { status: 200 }), serviceCalls),
    }));

    expect(result.kind).toBe("solid");
    expect(allowlistCalls).toEqual(["v1:/privacy"]);
    expect(serviceCalls).toHaveLength(1);
    const forwarded = serviceCalls[0]!;
    expect(forwarded.url).toBe(effectiveUrl);
    expect(forwarded.method).toBe("GET");
    expect(forwarded.headers.get("accept-language")).toBe("en-US");
    expect(forwarded.headers.get("x-pirate-hns-trusted-forwarder")).toBe("1");
    for (const header of ["cookie", "authorization", "x-pirate-anonymous-id", "x-pirate-session-id"]) {
      expect(forwarded.headers.has(header)).toBe(false);
    }
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(forwarded.signal.aborted).toBe(false);
  });

  test("uses one template allowlist record for safe public-profile paths", async () => {
    const allowlistCalls: string[] = [];
    const serviceCalls: Request[] = [];
    const profileUrl = "https://pirate.sc/u/alice.pirate?locale=en";
    const result = await dispatchSolidRequest(dispatchInput({
      request: new Request(profileUrl),
      effectiveUrl: profileUrl,
      routeAllowlist: allowlist(record("/u/:handle"), allowlistCalls),
      solidService: service(new Response("profile", { status: 200 }), serviceCalls),
    }));

    expect(result.kind).toBe("solid");
    expect(allowlistCalls).toEqual(["v1:/u/:handle"]);
    expect(serviceCalls).toHaveLength(1);
    expect(serviceCalls[0]?.url).toBe(profileUrl);
  });

  test("falls back to React for every toggle failure without service I/O", async () => {
    const failures: Array<{ value: string | null; error?: boolean; expected: string }> = [
      { value: null, expected: "allowlist-record-missing" },
      { value: record("/privacy", false), expected: "allowlist-record-disabled" },
      { value: "not-json", expected: "allowlist-record-malformed" },
      { value: record("/robots.txt"), expected: "allowlist-record-path-mismatch" },
      { value: "", error: true, expected: "allowlist-error" },
    ];
    for (const failure of failures) {
      const serviceCalls: Request[] = [];
      const routeAllowlist: SolidRouteAllowlist = failure.error
        ? { async get() { throw new Error("KV unavailable"); } }
        : allowlist(failure.value);
      const result = await dispatchSolidRequest(dispatchInput({
        routeAllowlist,
        solidService: service(new Response("should-not-run"), serviceCalls),
      }));
      expect(result).toEqual({ kind: "react", reason: failure.expected });
      expect(serviceCalls).toHaveLength(0);
    }
  });

  test("falls back on a service exception but never falls back after a Solid 5xx", async () => {
    const exceptionCalls: Request[] = [];
    expect(await dispatchSolidRequest(dispatchInput({
      routeAllowlist: allowlist(record()),
      solidService: service(new Error("binding unavailable"), exceptionCalls),
    })).then(result => result.kind === "react" ? result.reason : null)).toBe("solid-service-error");
    expect(exceptionCalls).toHaveLength(1);

    const fiveHundredCalls: Request[] = [];
    const fiveHundred = await dispatchSolidRequest(dispatchInput({
      routeAllowlist: allowlist(record()),
      solidService: service(new Response("solid failure", { status: 503 }), fiveHundredCalls),
    }));
    expect(fiveHundred.kind).toBe("solid");
    expect((fiveHundred as { response: Response }).response.status).toBe(503);
    expect(fiveHundredCalls).toHaveLength(1);
  });

  test("times out a hanging KV read and never starts the Solid service", async () => {
    let serviceCalls = 0;
    let lateRejected = false;
    const result = await dispatchSolidRequest(dispatchInput({
      timeoutMs: 1,
      routeAllowlist: {
        async get() {
          return await new Promise<string | null>((_resolve, reject) => {
            setTimeout(() => {
              lateRejected = true;
              reject(new Error("late KV failure"));
            }, 5);
          });
        },
      },
      solidService: {
        async fetch() {
          serviceCalls += 1;
          return new Response("should-not-run");
        },
      },
    }));
    expect(result).toEqual({ kind: "react", reason: "allowlist-timeout" });
    expect(serviceCalls).toBe(0);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(lateRejected).toBe(true);
  });

  test("propagates caller abort through a hanging KV read and distinguishes it from timeout", async () => {
    const controller = new AbortController();
    let serviceCalls = 0;
    const resultPromise = dispatchSolidRequest(dispatchInput({
      request: new Request(effectiveUrl, { signal: controller.signal }),
      timeoutMs: 100,
      routeAllowlist: {
        async get() {
          return await new Promise<string | null>(() => {});
        },
      },
      solidService: {
        async fetch() {
          serviceCalls += 1;
          return new Response("should-not-run");
        },
      },
    }));
    await new Promise(resolve => setTimeout(resolve, 1));
    controller.abort();
    expect(await resultPromise).toEqual({ kind: "react", reason: "allowlist-aborted" });
    expect(serviceCalls).toBe(0);
  });

  test("aborts and times out a hanging Solid service", async () => {
    let serviceAborted = false;
    const result = await dispatchSolidRequest(dispatchInput({
      timeoutMs: 1,
      routeAllowlist: allowlist(record()),
      solidService: {
        async fetch(input) {
          const request = input instanceof Request ? input : new Request(input);
          return await new Promise<Response>((_resolve, reject) => {
            if (request.signal.aborted) {
              serviceAborted = true;
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }
            request.signal.addEventListener("abort", () => {
              serviceAborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            }, { once: true });
          });
        },
      },
    }));
    expect(result).toEqual({ kind: "react", reason: "solid-service-timeout" });
    expect(serviceAborted).toBe(true);
  });

  test("distinguishes caller abort during Solid service from timeout", async () => {
    const controller = new AbortController();
    let serviceAborted = false;
    const resultPromise = dispatchSolidRequest(dispatchInput({
      request: new Request(effectiveUrl, { signal: controller.signal }),
      timeoutMs: 100,
      routeAllowlist: allowlist(record()),
      solidService: {
        async fetch(input) {
          const request = input instanceof Request ? input : new Request(input);
          return await new Promise<Response>((_resolve, reject) => {
            request.signal.addEventListener("abort", () => {
              serviceAborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            }, { once: true });
          });
        },
      },
    }));
    await new Promise(resolve => setTimeout(resolve, 1));
    controller.abort();
    expect(await resultPromise).toEqual({ kind: "react", reason: "solid-service-aborted" });
    expect(serviceAborted).toBe(true);
  });

  test("does not schedule service I/O for an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    let kvCalls = 0;
    let serviceCalls = 0;
    const result = await dispatchSolidRequest(dispatchInput({
      request: new Request(effectiveUrl, { signal: controller.signal }),
      routeAllowlist: {
        async get() {
          kvCalls += 1;
          return record();
        },
      },
      solidService: {
        async fetch() {
          serviceCalls += 1;
          return new Response("should-not-run");
        },
      },
    }));
    expect(result).toEqual({ kind: "react", reason: "allowlist-aborted" });
    expect(kvCalls).toBe(0);
    expect(serviceCalls).toBe(0);
  });

  test("keeps non-Slice routes on React with zero capability I/O", async () => {
    let kvCalls = 0;
    let serviceCalls = 0;
    const result = await dispatchSolidRequest({
      ...dispatchInput(),
      effectiveUrl: "https://pirate.sc/",
      routeAllowlist: { async get() { kvCalls += 1; return record(); } },
      solidService: { async fetch() { serviceCalls += 1; return new Response("bad"); } },
    });
    expect(result).toEqual({ kind: "react", reason: "route-not-dispatchable" });
    expect(kvCalls).toBe(0);
    expect(serviceCalls).toBe(0);
  });
});

describe("Solid service request construction", () => {
  test("preserves method, query, body, and sanitized HNS context", async () => {
    const source = new Request("https://pirate.sc/privacy?x=1", {
      method: "POST",
      body: "payload",
      headers: {
        "x-pirate-hns-host": "crew.hns",
        cookie: "secret",
        authorization: "secret",
      },
    });
    const request = buildSolidServiceRequest(source, "https://crew.hns/privacy?x=1");
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://crew.hns/privacy?x=1");
    expect(request.headers.get("host")).toBe("crew.hns");
    expect(await request.text()).toBe("payload");
    expect(request.headers.get("x-pirate-hns-host")).toBe("crew.hns");
    expect(request.headers.has("cookie")).toBe(false);
    expect(request.headers.has("authorization")).toBe(false);
  });
});
