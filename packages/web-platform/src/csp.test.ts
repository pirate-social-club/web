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
