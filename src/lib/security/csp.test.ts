import { describe, expect, test } from "bun:test";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  CSP_HEADER,
  CSP_REPORT_ONLY_HEADER,
} from "./csp";

function expectMatch(value: string, pattern: RegExp) {
  if (!pattern.test(value)) {
    throw new Error(`Expected ${JSON.stringify(value)} to match ${pattern}`);
  }
}

function expectNoMatch(value: string, pattern: RegExp) {
  if (pattern.test(value)) {
    throw new Error(`Expected ${JSON.stringify(value)} not to match ${pattern}`);
  }
}

describe("Content Security Policy", () => {
  test("builds the required directives", () => {
    const csp = buildContentSecurityPolicy("abc123");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("frame-src");
  });

  test("places the nonce only in script-src", () => {
    const csp = buildContentSecurityPolicy("abc123");

    expectMatch(csp, /script-src[^;]*'nonce-abc123'/);
    expectNoMatch(csp, /default-src[^;]*'nonce-abc123'/);
    expectNoMatch(csp, /style-src[^;]*'nonce-abc123'/);
  });

  test("sets the enforcement header in non-dev mode", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, "nonce", { dev: false, reportOnly: false });

    expect(headers.get(CSP_HEADER)?.includes("'nonce-nonce'")).toBe(true);
    expect(headers.get(CSP_REPORT_ONLY_HEADER)).toBeNull();
  });

  test("sets the report-only header in report-only mode", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, "nonce", { dev: false, reportOnly: true });

    expect(headers.get(CSP_HEADER)).toBeNull();
    expect(headers.get(CSP_REPORT_ONLY_HEADER)?.includes("'nonce-nonce'")).toBe(true);
  });

  test("sets no headers in dev mode", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, "nonce", { dev: true, reportOnly: false });

    expect(headers.get(CSP_HEADER)).toBeNull();
    expect(headers.get(CSP_REPORT_ONLY_HEADER)).toBeNull();
    expect(headers.get("X-Content-Type-Options")).toBeNull();
    expect(headers.get("X-Frame-Options")).toBeNull();
  });

  test("sets additional security headers in non-dev mode", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, "nonce", { dev: false, reportOnly: false });

    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });
});
