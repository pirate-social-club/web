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
    expect(csp).toContain("https://assistant.pirate.sc");
    expect(csp).toContain("https://assistant-staging.pirate.sc");
    expect(csp).toContain("https://*.agora.io");
    expect(csp).toContain("wss://*.agora.io");
    expect(csp).toContain("https://*.sd-rtn.com");
    expect(csp).toContain("wss://*.sd-rtn.com");
    expect(csp).toContain("https://api.coingecko.com");
    expect(csp).not.toContain("https://efp.pirate.sc");
    expect(csp).not.toContain("https://efp-staging.pirate.sc");
    expect(csp).not.toContain("api.ethfollow.xyz");
    expect(csp).toContain("https://s3.filebase.com");
    expect(csp).toContain("frame-src");
  });

  test("allows wss:// to the API hosts for the karaoke scoring WebSocket", () => {
    const csp = buildContentSecurityPolicy("abc123");

    // The karaoke scoring WebSocket connects to the API over wss://. An https://
    // connect-src source does NOT authorize wss://, so these must be explicit
    // (regression guard for the silent CSP block of live scoring).
    expect(csp).toContain("wss://api.pirate.sc");
    expect(csp).toContain("wss://api-staging.pirate.sc");
    // The `.pirate` HNS host — boundary-matched so it isn't satisfied by `.pirate.sc`.
    expectMatch(csp, /wss:\/\/api\.pirate(\s|$)/);
  });

  test("allows the identity verification provider hosts", () => {
    const csp = buildContentSecurityPolicy("abc123");

    // The Self QR SDK reaches its relay (wss://websocket.self.xyz) over
    // socket.io and only console.errors transport failures — a missing
    // connect-src entry hangs verification on an infinite spinner with no
    // user-visible error (production incident 2026-07). Very hosts are listed
    // too so a future provider swap can't silently drop either side.
    expect(csp).toContain("https://self.xyz");
    expect(csp).toContain("https://*.self.xyz");
    expect(csp).toContain("wss://*.self.xyz");
    expect(csp).toContain("https://api.very.org");
    expect(csp).toContain("https://verify.very.org");
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
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(self), geolocation=()");
  });

  test("allows Telegram framing and bridge script only for Mini App documents", () => {
    const headers = new Headers();

    applySecurityHeaders(headers, "nonce", {
      dev: false,
      reportOnly: false,
      telegramMiniApp: true,
    });

    const csp = headers.get(CSP_HEADER) ?? "";
    expect(csp).toContain("script-src 'self' 'nonce-nonce'");
    expect(csp).toContain("https://telegram.org");
    expect(csp).toContain("frame-ancestors https://web.telegram.org");
    expect(csp).not.toContain("frame-ancestors 'none'");
    expect(headers.get("X-Frame-Options")).toBeNull();
  });

  test("does not allow Telegram framing or scripts on regular documents", () => {
    const csp = buildContentSecurityPolicy("abc123");

    expect(csp).not.toContain("https://telegram.org");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
