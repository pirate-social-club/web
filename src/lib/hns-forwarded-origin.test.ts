import { describe, expect, test } from "bun:test";

import {
  authenticateHnsForwarderRequest,
  type HnsForwardedOriginEnv,
  resolveEffectiveRequestUrl,
  resolveForwardedCommunityRouteSegment,
} from "./hns-forwarded-origin";

const GATEWAY_IP = "198.51.100.7";
const GATEWAY_TOKEN = "shared-secret";
const GATEWAY_ENV: HnsForwardedOriginEnv = {
  HNS_FORWARDER_TRUSTED_IPS: GATEWAY_IP,
  HNS_FORWARDER_AUTH_TOKEN: GATEWAY_TOKEN,
};

function request(headers: Record<string, string>): Request {
  return new Request("https://pirate.sc/c/crew?sort=top", { headers });
}

async function forwarded(
  headers: Record<string, string>,
  env: HnsForwardedOriginEnv = GATEWAY_ENV,
): Promise<Request> {
  return authenticateHnsForwarderRequest(request({
    "cf-connecting-ip": GATEWAY_IP,
    "x-pirate-hns-forwarder-token": GATEWAY_TOKEN,
    ...headers,
  }), env);
}

describe("HNS forwarder ingress authentication", () => {
  test("trusts forwarded HNS headers when source IP and token both match", async () => {
    const authenticated = await forwarded({
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://xn--pokmon-dva/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSegment(authenticated)).toBe("com_cmt_public_namespace_test");
    expect(authenticated.headers.has("x-pirate-hns-forwarder-token")).toBe(false);
  });

  test("rejects a matching token from an untrusted source IP", async () => {
    const authenticated = await forwarded({
      "cf-connecting-ip": "203.0.113.12",
      "x-pirate-hns-host": "app.pirate",
    });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("rejects a trusted source IP without a matching token", async () => {
    const authenticated = await forwarded({
      "x-pirate-hns-forwarder-token": "wrong-secret",
      "x-pirate-hns-host": "app.pirate",
    });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("fails closed when no trusted IPs are configured", async () => {
    const authenticated = await forwarded({
      "x-pirate-hns-host": "app.pirate",
    }, { HNS_FORWARDER_AUTH_TOKEN: GATEWAY_TOKEN });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("fails closed when no token is configured", async () => {
    const authenticated = await forwarded({
      "x-pirate-hns-host": "app.pirate",
    }, { HNS_FORWARDER_TRUSTED_IPS: GATEWAY_IP });

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("fails closed with an entirely empty environment", async () => {
    const authenticated = await forwarded({
      "x-pirate-hns-host": "app.pirate",
    }, {});

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("strips client-supplied trust markers before evaluating", async () => {
    const authenticated = await authenticateHnsForwarderRequest(request({
      "cf-connecting-ip": "203.0.113.12",
      "x-pirate-hns-trusted-forwarder": "1",
      "x-pirate-hns-host": "xn--pokmon-dva",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    }), GATEWAY_ENV);

    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://pirate.sc/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSegment(authenticated)).toBe(null);
    expect(authenticated.headers.has("x-pirate-hns-trusted-forwarder")).toBe(false);
  });

  test("preserves HTTPS write methods and bodies while removing ingress credentials", async () => {
    const authenticated = await authenticateHnsForwarderRequest(new Request(
      "https://pirate.sc/api/write",
      {
        method: "POST",
        body: JSON.stringify({ message: "ahoy" }),
        headers: {
          "cf-connecting-ip": GATEWAY_IP,
          "content-type": "application/json",
          "x-pirate-hns-forwarder-token": GATEWAY_TOKEN,
          "x-pirate-hns-host": "app.pirate",
        },
      },
    ), GATEWAY_ENV);

    expect(authenticated.method).toBe("POST");
    expect(await authenticated.json()).toEqual({ message: "ahoy" });
    expect(authenticated.headers.has("x-pirate-hns-forwarder-token")).toBe(false);
    expect(resolveEffectiveRequestUrl(authenticated)).toBe("https://app.pirate/api/write");
  });

  test("unauthenticated requests are never trusted, regardless of headers", () => {
    const raw = request({
      "cf-connecting-ip": GATEWAY_IP,
      "x-pirate-hns-host": "app.pirate",
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
    });

    expect(resolveEffectiveRequestUrl(raw)).toBe("https://pirate.sc/c/crew?sort=top");
    expect(resolveForwardedCommunityRouteSegment(raw)).toBe(null);
  });
});

describe("HNS forwarded origin resolution", () => {
  test("uses app.pirate when forwarded by the authenticated gateway", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "app.pirate",
    }))).toBe("https://app.pirate/c/crew?sort=top");
  });

  test("uses first-party public HNS hosts", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "captain.pirate",
    }))).toBe("https://captain.pirate/c/crew?sort=top");
  });

  test("uses imported HNS roots", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "xn--pokmon-dva",
    }))).toBe("https://xn--pokmon-dva/c/crew?sort=top");
  });

  test("uses imported HNS subdomains", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "v.xn--pokmon-dva",
    }))).toBe("https://v.xn--pokmon-dva/c/crew?sort=top");
  });

  test("uses consensus-valid underscore HNS roots", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "app.tame_impala",
    }))).toBe("https://app.tame_impala/c/crew?sort=top");
  });

  test("allows underscores only inside the HNS root label", async () => {
    for (const hostname of [
      "bad_subdomain.tame_impala",
      "app._leading",
      "app.trailing_",
      "app.-leading",
      "app.trailing-",
      `app.${"a".repeat(64)}`,
      "app.localhost",
      "127.0.0.1",
    ]) {
      expect(resolveEffectiveRequestUrl(await forwarded({
        "x-pirate-hns-host": hostname,
      }))).toBe("https://pirate.sc/c/crew?sort=top");
    }
  });

  test("ignores invalid forwarded hostnames", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-pirate-hns-host": "bad host",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("does not expand generic forwarded-host beyond app hosts", async () => {
    expect(resolveEffectiveRequestUrl(await forwarded({
      "x-forwarded-host": "xn--pokmon-dva",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });

  test("uses resolved imported community ids from the authenticated gateway", async () => {
    expect(resolveForwardedCommunityRouteSegment(await forwarded({
      "x-pirate-hns-community-id": "com_cmt_public_namespace_test",
      "x-pirate-hns-community-route": "xn--pokmon-dva",
    }))).toBe("com_cmt_public_namespace_test");
  });

  test("falls back to the community route header when no id is forwarded", async () => {
    expect(resolveForwardedCommunityRouteSegment(await forwarded({
      "x-pirate-hns-community-route": "xn--pokmon-dva",
    }))).toBe("xn--pokmon-dva");
  });
});
