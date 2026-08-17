import { describe, expect, test } from "bun:test";
import {
  sanitizeSolidResponse,
  signSolidEdgeRequest,
  verifySolidEdgeRequest,
  SOLID_EDGE_MAX_BODY_BYTES,
  SOLID_EDGE_SIGNATURE_HEADER,
  SOLID_EDGE_TIMESTAMP_HEADER,
} from "./solid-edge-auth";

const NOW_MS = 1_700_000_000_000;
const KEY = "solid-edge-test-key-with-at-least-32-bytes-long";

function baseRequest(init?: RequestInit): Request {
  return new Request("https://crew.hns/u/alice.pirate?lang=en%2Dus", {
    ...init,
    headers: {
      "x-pirate-hns-trusted-forwarder": "1",
      "x-pirate-hns-host": "crew.hns",
      "x-pirate-hns-root": "crew",
      "x-pirate-hns-community-id": "community-1",
      "x-pirate-hns-community-route": "crew",
      "x-pirate-hns-subdomain": "app",
      "x-pirate-hns-wallet-interactive": "0",
      ...(init?.headers ?? {}),
    },
  });
}

async function signed(request = baseRequest(), nowMs = NOW_MS): Promise<Request> {
  return signSolidEdgeRequest({ request, key: KEY, nowMs });
}

describe("React to Solid edge authentication", () => {
  test("signs and verifies exact URL, query, method, and HNS context, then strips auth headers", async () => {
    const signedRequest = await signed();
    expect(signedRequest.headers.get(SOLID_EDGE_TIMESTAMP_HEADER)).toBe("1700000000");
    expect(signedRequest.headers.get(SOLID_EDGE_SIGNATURE_HEADER)).toMatch(/^v1=[A-Za-z0-9_-]{43}$/u);

    const result = await verifySolidEdgeRequest({
      request: signedRequest,
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.url).toBe("https://crew.hns/u/alice.pirate?lang=en%2Dus");
      expect(result.request.headers.has(SOLID_EDGE_SIGNATURE_HEADER)).toBe(false);
      expect(result.request.headers.has(SOLID_EDGE_TIMESTAMP_HEADER)).toBe(false);
      expect(result.request.headers.get("x-pirate-hns-community-id")).toBe("community-1");
    }
  });

  test("fails closed for method, host/path/query, and HNS-context tampering", async () => {
    const original = await signed();
    const tampered = [
      new Request(original, { method: "POST", body: "" }),
      new Request("https://evil.example/u/alice.pirate?lang=en%2Dus", { headers: original.headers }),
      new Request("https://crew.hns/u/bob.pirate?lang=en%2Dus", { headers: original.headers }),
      new Request("https://crew.hns/u/alice.pirate?lang=zh", { headers: original.headers }),
      new Request(original, { headers: { ...Object.fromEntries(original.headers), "x-pirate-hns-community-id": "other" } }),
    ];
    for (const request of tampered) {
      await expect(verifySolidEdgeRequest({ request, SOLID_EDGE_HMAC_KEY: KEY, nowMs: NOW_MS }))
        .resolves.toMatchObject({ ok: false, reason: "signature-mismatch" });
    }
  });

  test("binds a body digest and rejects body changes and oversized bodies", async () => {
    const original = await signed(baseRequest({ method: "POST", body: "payload" }));
    const changed = new Request(original.url, {
      method: "POST",
      body: "tampered",
      headers: original.headers,
    });
    await expect(verifySolidEdgeRequest({ request: changed, SOLID_EDGE_HMAC_KEY: KEY, nowMs: NOW_MS }))
      .resolves.toMatchObject({ ok: false, reason: "signature-mismatch" });

    await expect(signSolidEdgeRequest({
      request: baseRequest({ method: "POST", body: "x".repeat(SOLID_EDGE_MAX_BODY_BYTES + 1) }),
      key: KEY,
      nowMs: NOW_MS,
    })).rejects.toThrow("too large");
  });

  test("enforces bounded timestamps and rejects malformed base64/hex signatures", async () => {
    const original = await signed();
    await expect(verifySolidEdgeRequest({
      request: original,
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS + 301_000,
    })).resolves.toMatchObject({ ok: false, reason: "stale-signature" });
    await expect(verifySolidEdgeRequest({
      request: original,
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS - 301_000,
    })).resolves.toMatchObject({ ok: false, reason: "stale-signature" });

    for (const signature of ["v1=not-base64!", `v1=${"a".repeat(64)}`, "v2=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"]) {
      const headers = new Headers(original.headers);
      headers.set(SOLID_EDGE_SIGNATURE_HEADER, signature);
      await expect(verifySolidEdgeRequest({
        request: new Request(original, { headers }),
        SOLID_EDGE_HMAC_KEY: KEY,
        nowMs: NOW_MS,
      })).resolves.toMatchObject({ ok: false, reason: "malformed-signature" });
    }
    const malformedTimestamp = new Headers(original.headers);
    malformedTimestamp.set(SOLID_EDGE_TIMESTAMP_HEADER, "1700000000.0");
    await expect(verifySolidEdgeRequest({
      request: new Request(original, { headers: malformedTimestamp }),
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS,
    })).resolves.toMatchObject({ ok: false, reason: "malformed-timestamp" });
  });

  test("rejects duplicate and comma-delimited auth metadata instead of choosing the first value", async () => {
    const original = await signed();
    const duplicateSignature = new Headers(original.headers);
    duplicateSignature.append(SOLID_EDGE_SIGNATURE_HEADER, original.headers.get(SOLID_EDGE_SIGNATURE_HEADER)!);
    await expect(verifySolidEdgeRequest({
      request: new Request(original, { headers: duplicateSignature }),
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS,
    })).resolves.toMatchObject({ ok: false, reason: "duplicate-header" });

    const commaTimestamp = new Headers(original.headers);
    commaTimestamp.set(SOLID_EDGE_TIMESTAMP_HEADER, "1700000000, 1700000000");
    await expect(verifySolidEdgeRequest({
      request: new Request(original, { headers: commaTimestamp }),
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS,
    })).resolves.toMatchObject({ ok: false, reason: "duplicate-header" });
  });

  test("rejects missing/short keys and already-aborted requests before verification work", async () => {
    const original = await signed();
    await expect(verifySolidEdgeRequest({ request: original, nowMs: NOW_MS }))
      .resolves.toMatchObject({ ok: false, reason: "configuration" });

    const controller = new AbortController();
    controller.abort();
    await expect(verifySolidEdgeRequest({
      request: new Request(original, { signal: controller.signal }),
      SOLID_EDGE_HMAC_KEY: KEY,
      nowMs: NOW_MS,
    })).resolves.toMatchObject({ ok: false, reason: "aborted" });
  });
});

describe("Solid response boundary", () => {
  test("strips cookies, hop-by-hop, and private boundary headers while preserving safe response data", async () => {
    const response = sanitizeSolidResponse(new Response("rendered", {
      status: 201,
      headers: {
        "cache-control": "public, max-age=30",
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff",
        "connection": "keep-alive",
        "set-cookie": "session=secret; Secure",
        "x-solid-release-id": "private-release",
        "x-pirate-solid-edge-debug": "private-debug",
        "x-internal-trace": "private-trace",
        "x-seam-host-surface": "sovereign-app",
        "x-seam-release": "private-release",
      },
    }));
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("rendered");
    expect(response.headers.get("cache-control")).toBe("public, max-age=30");
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    for (const name of ["connection", "set-cookie", "x-solid-release-id", "x-pirate-solid-edge-debug", "x-internal-trace", "x-seam-host-surface", "x-seam-release"]) {
      expect(response.headers.has(name)).toBe(false);
    }
  });
});
