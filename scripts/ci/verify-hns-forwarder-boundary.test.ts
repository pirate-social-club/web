import { describe, expect, test } from "bun:test";

import {
  FORGED_CONTEXT,
  assertCanonicalResponse,
  buildForgedHeaders,
} from "./verify-hns-forwarder-boundary.mjs";

const canonicalDocument = `<!doctype html><html><head><link rel="canonical" href="https://pirate.sc/"/></head><body>global</body></html>`;

describe("HNS forwarder boundary probe", () => {
  test("builds plausible unsigned and malformed signed contexts", () => {
    const unsigned = buildForgedHeaders("unsigned", 1_700_000_000);
    expect(unsigned.get("x-pirate-hns-host")).toBe(FORGED_CONTEXT.host);
    expect(unsigned.has("x-pirate-hns-forwarder-signature")).toBe(false);

    const malformed = buildForgedHeaders("malformed-signature", 1_700_000_000);
    expect(malformed.get("x-pirate-hns-forwarder-signature")).toBe(`v1=${"0".repeat(64)}`);
    expect(malformed.get("x-pirate-hns-forwarder-timestamp")).toBe("1700000000");
  });

  test("accepts only a canonical non-interactive response", () => {
    expect(() => assertCanonicalResponse({
      body: canonicalDocument,
      contentType: "text/html; charset=utf-8",
      expectedCanonicalOrigin: "https://pirate.sc",
      status: 200,
      variant: "unsigned",
    })).not.toThrow();
  });

  test("rejects adopted wallet, host, and community context", () => {
    for (const body of [
      canonicalDocument.replace("<body>", '<body data-hns-wallet-interactive="1">'),
      canonicalDocument.replace("global", FORGED_CONTEXT.host),
      canonicalDocument.replace("global", FORGED_CONTEXT.communityId),
    ]) {
      expect(() => assertCanonicalResponse({
        body,
        contentType: "text/html; charset=utf-8",
        expectedCanonicalOrigin: "https://pirate.sc",
        status: 200,
        variant: "malformed-signature",
      })).toThrow();
    }
  });

  test("rejects non-HTML and non-success responses", () => {
    expect(() => assertCanonicalResponse({
      body: canonicalDocument,
      contentType: "text/plain",
      expectedCanonicalOrigin: "https://pirate.sc",
      status: 200,
      variant: "unsigned",
    })).toThrow();
    expect(() => assertCanonicalResponse({
      body: canonicalDocument,
      contentType: "text/html",
      expectedCanonicalOrigin: "https://pirate.sc",
      status: 403,
      variant: "unsigned",
    })).toThrow();
  });
});
