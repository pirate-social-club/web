import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import {
  authenticateHnsForwarderRequest,
  resolveEffectiveRequestUrl,
  resolveForwardedCommunityRouteSegment,
  resolveForwardedCommunityRouteSlug,
  resolveForwardedWalletInteractive,
  type HnsForwardedOriginEnv,
} from "./hns-forwarded-origin";

const FORWARDER_HMAC_KEY = "test-forwarder-hmac-key-with-32-bytes";
const PREVIOUS_FORWARDER_HMAC_KEY = "previous-forwarder-hmac-key-32-bytes";
const TIMESTAMP_SECONDS = 1_770_000_000;
const NOW_MS = TIMESTAMP_SECONDS * 1_000;
const env: HnsForwardedOriginEnv = {
  HNS_FORWARDER_HMAC_KEY: FORWARDER_HMAC_KEY,
};

function request(headers: Record<string, string>): Request {
  return new Request("https://pirate.sc/c/crew?sort=top", { headers });
}

function canonicalForwarderContext(input: {
  headers: Headers;
  host: string;
  method?: string;
  timestamp: string;
}): string {
  return JSON.stringify([
    "pirate-hns-forwarder-v1",
    input.timestamp,
    input.method ?? "GET",
    input.host,
    "/c/crew?sort=top",
    input.headers.get("x-pirate-hns-root") ?? "",
    input.headers.get("x-pirate-hns-community-id") ?? "",
    input.headers.get("x-pirate-hns-community-route") ?? "",
    input.headers.get("x-pirate-hns-subdomain") ?? "",
  ]);
}

function signedRequest(
  forwardedHeaders: Record<string, string>,
  options: { secret?: string; timestamp?: number } = {},
): Request {
  const timestamp = String(options.timestamp ?? TIMESTAMP_SECONDS);
  const headers = new Headers({
    "cf-connecting-ip": "94.103.168.161",
    ...forwardedHeaders,
    "x-pirate-hns-forwarder-path": "/c/crew?sort=top",
    "x-pirate-hns-forwarder-timestamp": timestamp,
  });
  const host = headers.get("x-pirate-hns-host") ?? "";
  const signature = createHmac("sha256", options.secret ?? FORWARDER_HMAC_KEY)
    .update(canonicalForwarderContext({ headers, host, timestamp }))
    .digest("hex");
  headers.set("x-pirate-hns-forwarder-signature", `v1=${signature}`);
  return new Request("https://pirate.sc/c/crew?sort=top", { headers });
}

async function authenticate(
  input: Request,
  authenticationEnv: HnsForwardedOriginEnv = env,
  nowMs: number = NOW_MS,
) {
  return authenticateHnsForwarderRequest(input, authenticationEnv, nowMs);
}

describe("HNS forwarded origin", () => {
  test("uses signed app.pirate context from the trusted HNS ingress", async () => {
    const result = await authenticate(signedRequest({ "x-pirate-hns-host": "app.pirate" }));
    expect(result.rejection).toBe(null);
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://app.pirate/c/crew?sort=top");
  });

  test("ignores forwarded hosts from untrusted clients", async () => {
    const input = signedRequest({ "x-pirate-hns-host": "app.pirate" });
    input.headers.set("cf-connecting-ip", "203.0.113.12");
    const result = await authenticate(input);
    expect(result.rejection).toBe(null);
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("uses signed first-party profiles, imported roots, and imported subdomains", async () => {
    for (const host of ["captain.pirate", "xn--pokmon-dva", "v.xn--pokmon-dva"]) {
      const result = await authenticate(signedRequest({ "x-pirate-hns-host": host }));
      expect(result.rejection).toBe(null);
      expect(resolveEffectiveRequestUrl(result.request)).toBe(`https://${host}/c/crew?sort=top`);
    }
  });

  test("rejects invalid forwarded hostnames from the trusted ingress", async () => {
    const result = await authenticate(signedRequest({ "x-pirate-hns-host": "bad host" }));
    expect(result.rejection).toBe("authentication");
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("does not expand generic forwarded-host beyond signed HNS context", async () => {
    const result = await authenticate(request({
      "cf-connecting-ip": "94.103.168.161",
      "x-forwarded-host": "xn--pokmon-dva",
    }));
    expect(result.rejection).toBe(null);
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("uses the resolved imported community id from signed context", async () => {
    const result = await authenticate(signedRequest({
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-root": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
      "x-pirate-hns-community-route": "xn--pokmon-dva",
      "x-pirate-hns-wallet-interactive": "1",
    }));
    expect(result.rejection).toBe(null);
    expect(resolveForwardedCommunityRouteSegment(result.request)).toBe("com_cmt_public_namespace_test");
    expect(resolveForwardedCommunityRouteSlug(result.request)).toBe("xn--pokmon-dva");
    expect(resolveForwardedWalletInteractive(result.request)).toBe(true);
  });

  test("matches the gateway's fixed interoperability vector", async () => {
    const input = signedRequest({
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-root": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
      "x-pirate-hns-community-route": "xn--pokmon-dva",
    });
    expect(input.headers.get("x-pirate-hns-forwarder-signature")).toBe(
      "v1=e42b921d8029a9067fcc230b039d8513727ca88ad2b0253a39263b220154b9a3",
    );
    expect((await authenticate(input)).rejection).toBe(null);
  });

  test("accepts the legacy token from a trusted source during rollout", async () => {
    const result = await authenticate(request({
      "cf-connecting-ip": "94.103.168.161",
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-forwarder-token": "legacy-rollout-token",
    }), { HNS_FORWARDER_AUTH_TOKEN: "legacy-rollout-token" });
    expect(result.rejection).toBe(null);
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://xn--pokmon-dva/c/crew?sort=top");
  });

  test("rejects path normalization differences", async () => {
    const input = signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" });
    input.headers.set("x-pirate-hns-forwarder-path", "/c/crew/?sort=top");
    expect((await authenticate(input)).rejection).toBe("authentication");
  });

  test("rejects a valid captured envelope replayed against a different request path", async () => {
    const captured = signedRequest({
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-forwarder-token": "legacy-rollout-token",
    });
    const replay = new Request("https://pirate.sc/settings", { headers: captured.headers });
    expect((await authenticate(replay, {
      HNS_FORWARDER_AUTH_TOKEN: "legacy-rollout-token",
      HNS_FORWARDER_HMAC_KEY: FORWARDER_HMAC_KEY,
    })).rejection).toBe("authentication");
  });

  test("rejects a missing, malformed, or mismatched signature from the trusted ingress", async () => {
    const missing = signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" });
    missing.headers.delete("x-pirate-hns-forwarder-signature");
    const malformed = signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" });
    malformed.headers.set("x-pirate-hns-forwarder-signature", "v1=not-hex");
    const mismatched = signedRequest(
      { "x-pirate-hns-host": "xn--pokmon-dva" },
      { secret: "different-forwarder-hmac-key-32-bytes" },
    );

    for (const input of [missing, malformed, mismatched]) {
      const result = await authenticate(input);
      expect(result.rejection).toBe("authentication");
      expect(resolveEffectiveRequestUrl(result.request)).toBe("https://pirate.sc/c/crew?sort=top");
    }
  });

  test("rejects stale and future signatures outside the replay window", async () => {
    for (const timestamp of [TIMESTAMP_SECONDS - 301, TIMESTAMP_SECONDS + 301]) {
      const result = await authenticate(
        signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" }, { timestamp }),
      );
      expect(result.rejection).toBe("authentication");
    }

    for (const timestamp of [TIMESTAMP_SECONDS - 300, TIMESTAMP_SECONDS + 300]) {
      const result = await authenticate(
        signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" }, { timestamp }),
      );
      expect(result.rejection).toBe(null);
    }
  });

  test("accepts the previous HMAC key during rotation", async () => {
    const result = await authenticate(
      signedRequest(
        { "x-pirate-hns-host": "xn--pokmon-dva" },
        { secret: PREVIOUS_FORWARDER_HMAC_KEY },
      ),
      {
        HNS_FORWARDER_HMAC_KEY: FORWARDER_HMAC_KEY,
        HNS_FORWARDER_HMAC_PREVIOUS_KEY: PREVIOUS_FORWARDER_HMAC_KEY,
      },
    );
    expect(result.rejection).toBe(null);
  });

  test("fails closed when the HMAC configuration is missing or invalid", async () => {
    const input = signedRequest({ "x-pirate-hns-host": "xn--pokmon-dva" });
    for (const authenticationEnv of [
      {},
      { HNS_FORWARDER_HMAC_KEY: "too-short" },
      {
        HNS_FORWARDER_HMAC_KEY: FORWARDER_HMAC_KEY,
        HNS_FORWARDER_HMAC_PREVIOUS_KEY: "too-short",
      },
    ]) {
      const result = await authenticate(input, authenticationEnv);
      expect(result.rejection).toBe("configuration");
    }
  });

  test("strips client-supplied trust and legacy token headers", async () => {
    const input = signedRequest({
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-trusted-forwarder": "1",
      "x-pirate-hns-forwarder-token": "legacy-secret",
      "x-pirate-hns-wallet-interactive": "1",
    });
    input.headers.set("x-pirate-hns-forwarder-signature", "v1=".padEnd(67, "0"));
    const result = await authenticate(input);
    expect(result.rejection).toBe("authentication");
    expect(result.request.headers.has("x-pirate-hns-trusted-forwarder")).toBe(false);
    expect(result.request.headers.has("x-pirate-hns-forwarder-token")).toBe(false);
    expect(result.request.headers.has("x-pirate-hns-forwarder-signature")).toBe(false);
    expect(result.request.headers.has("x-pirate-hns-forwarder-timestamp")).toBe(false);
    expect(result.request.headers.has("x-pirate-hns-forwarder-path")).toBe(false);
    expect(resolveForwardedWalletInteractive(result.request)).toBe(false);
  });
});
