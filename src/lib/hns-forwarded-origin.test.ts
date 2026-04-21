import { describe, expect, test } from "bun:test";

import { resolveEffectiveRequestUrl } from "./hns-forwarded-origin";

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

  test("ignores non-app forwarded hosts", () => {
    expect(resolveEffectiveRequestUrl(request({
      "cf-connecting-ip": "173.199.93.117",
      "x-pirate-hns-host": "captain.pirate",
    }))).toBe("https://pirate.sc/c/crew?sort=top");
  });
});
