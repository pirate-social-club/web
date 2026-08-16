import { describe, expect, test } from "bun:test";
import { buildSolidContentSecurityPolicy } from "./csp";

const localApiOrigin = "http://127.0.0.1:8787";

describe("Solid CSP local API allowance", () => {
  test("excludes the local API origin for non-local requests", () => {
    const policy = buildSolidContentSecurityPolicy({ nonce: "test-nonce" });

    expect(policy).not.toContain(localApiOrigin);
  });

  test("includes the local API origin when local hosting opts in", () => {
    const policy = buildSolidContentSecurityPolicy({
      nonce: "test-nonce",
      allowLocalApiOrigin: true,
    });

    expect(policy).toContain(localApiOrigin);
  });
});

describe("Solid CSP perimeter policy", () => {
  test("covers every independently applicable resource directive", () => {
    const policy = buildSolidContentSecurityPolicy({ nonce: "nonce-value" });

    for (const directive of [
      "script-src 'self' 'nonce-nonce-value' 'strict-dynamic'",
      "connect-src 'self' https://api.pirate.sc https://api-staging.pirate.sc",
      "img-src 'self' data: https:",
      "media-src 'self' https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ]) {
      expect(policy).toContain(directive);
    }
  });
});
