import { describe, expect, test } from "bun:test";

import {
  authenticateHnsForwarderRequest,
  resolveEffectiveRequestUrl,
  resolveForwardedCommunityRouteSegment,
} from "./hns-forwarded-origin";

function request(headers: Record<string, string>): Request {
  return new Request("https://pirate.sc/c/crew?sort=top", { headers });
}

describe("HNS forwarded origin", () => {
  test("uses app.pirate when forwarded by the trusted HNS ingress", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "app.pirate",
    }))).toBe("https://app.pirate/c/crew?sort=top");
  });

  test("ignores forwarded hosts from untrusted clients", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "203.0.113.12",
      "x-pirate-hns-host": "app.pirate",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("uses first-party public HNS hosts when forwarded by the trusted HNS ingress", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "captain.pirate",
    }))).toBe("https://captain.pirate/c/crew?sort=top");
  });

  test("uses imported HNS roots when forwarded by the trusted HNS ingress", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "xn--pokmon-dva",
    }))).toBe("https://xn--pokmon-dva/c/crew?sort=top");
  });

  test("uses imported HNS subdomains when forwarded by the trusted HNS ingress", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "v.xn--pokmon-dva",
    }))).toBe("https://v.xn--pokmon-dva/c/crew?sort=top");
  });

  test("ignores invalid forwarded hostnames", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "bad host",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("does not expand generic forwarded-host beyond app hosts", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-forwarded-host": "xn--pokmon-dva",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("uses resolved imported community ids from trusted HNS ingress", () => {
    expect(resolveForwardedCommunityRouteSegment(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
      "x-pirate-hns-community-route": "xn--pokmon-dva",
    }))).toBe("com_cmt_public_namespace_test");
  });

  test("ignores imported community routes from untrusted clients", () => {
    expect(resolveForwardedCommunityRouteSegment(request({
      "cf-connecting-ip": "203.0.113.12",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    }))).toBe(null);
  });

  test("trusts forwarded HNS headers when the gateway token matches", () => {
    const authenticated = authenticateHnsForwarderRequest(request({
      "x-pirate-hns-forwarder-token": "shared-secret",
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    }), {
      HNS_FORWARDER_AUTH_TOKEN: "shared-secret",
    });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://xn--pokmon-dva/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSegment(authenticated)).toBe("com_cmt_public_namespace_test");
    expect(authenticated.headers.has("x-pirate-hns-forwarder-token")).toBe(false);
  });

  test("strips client-supplied trust markers without a matching gateway token", () => {
    const unauthenticated = authenticateHnsForwarderRequest(request({
      "x-pirate-hns-trusted-forwarder": "1",
      "x-pirate-hns-forwarder-token": "wrong-secret",
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    }), {
      HNS_FORWARDER_AUTH_TOKEN: "shared-secret",
    });

    expect(resolveEffectiveRequestUrl(unauthenticated)).toBe("https://pirate.sc/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSegment(unauthenticated)).toBe(null);
    expect(unauthenticated.headers.has("x-pirate-hns-trusted-forwarder")).toBe(false);
  });
});
