import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
  authenticateHnsForwarderRequest,
  resolveEffectiveRequestUrl,
  resolveForwardedCommunityRouteSlug,
} from "./hns";

const KEY = "test-forwarder-hmac-key-with-32-bytes";
const IP = "94.103.168.161";
const TIMESTAMP = 1_770_000_000;
const requestUrl = "https://pirate.sc/c/crew?sort=top";

function signedRequest(overrides: Record<string, string> = {}, timestamp = TIMESTAMP): Request {
  const headers = new Headers({
    "cf-connecting-ip": IP,
    "x-pirate-hns-host": "crew.hns",
    "x-pirate-hns-root": "crew",
    "x-pirate-hns-community-id": "com_crew",
    "x-pirate-hns-community-route": "crew",
    "x-pirate-hns-forwarder-path": "/c/crew?sort=top",
    "x-pirate-hns-forwarder-timestamp": String(timestamp),
    ...overrides,
  });
  const canonical = JSON.stringify([
    "pirate-hns-forwarder-v1",
    String(timestamp),
    "GET",
    headers.get("x-pirate-hns-host"),
    "/c/crew?sort=top",
    headers.get("x-pirate-hns-root"),
    headers.get("x-pirate-hns-community-id"),
    headers.get("x-pirate-hns-community-route"),
    "",
  ]);
  const signature = createHmac("sha256", KEY).update(canonical).digest("hex");
  headers.set("x-pirate-hns-forwarder-signature", `v1=${signature}`);
  return new Request(requestUrl, { headers });
}

describe("Solid HNS forwarding boundary", () => {
  test("accepts the verified React-compatible envelope and confines its community", async () => {
    const result = await authenticateHnsForwarderRequest(
      signedRequest(),
      { HNS_FORWARDER_HMAC_KEY: KEY },
      TIMESTAMP * 1_000,
    );

    expect(result.rejection).toBeNull();
    expect(resolveEffectiveRequestUrl(result.request)).toBe("https://crew.hns/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSlug(result.request)).toBe("crew");
  });

  test("strips client-supplied markers and never grants trust", async () => {
    const result = await authenticateHnsForwarderRequest(new Request(requestUrl, {
      headers: {
        "x-pirate-hns-trusted-forwarder": "1",
        "x-pirate-hns-host": "crew.hns",
        "x-pirate-hns-community-route": "other-community",
        "x-pirate-hns-wallet-interactive": "1",
      },
    }));

    expect(result.rejection).toBeNull();
    expect(result.request.headers.has("x-pirate-hns-trusted-forwarder")).toBe(false);
    expect(resolveEffectiveRequestUrl(result.request)).toBe(requestUrl);
    expect(resolveForwardedCommunityRouteSlug(result.request)).toBeNull();
  });

  test("rejects a trusted-source envelope with a bad path, signature, or replay window", async () => {
    const badPath = signedRequest();
    badPath.headers.set("x-pirate-hns-forwarder-path", "/settings");
    const badSignature = signedRequest();
    badSignature.headers.set("x-pirate-hns-forwarder-signature", "v1=" + "0".repeat(64));
    const stale = signedRequest({}, TIMESTAMP - 301);

    for (const input of [badPath, badSignature, stale]) {
      const result = await authenticateHnsForwarderRequest(
        input,
        { HNS_FORWARDER_HMAC_KEY: KEY },
        TIMESTAMP * 1_000,
      );
      expect(result.rejection).toBe("authentication");
      expect(resolveEffectiveRequestUrl(result.request)).toBe(requestUrl);
    }
  });
});
