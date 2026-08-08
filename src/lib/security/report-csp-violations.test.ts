import { describe, expect, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";

const { window } = installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const errorLogs: unknown[][] = [];
const warnLogs: unknown[][] = [];

mock.module("@/lib/logger", () => ({
  logger: {
    debug: () => undefined,
    error: (...args: unknown[]) => errorLogs.push(args),
    info: () => undefined,
    warn: (...args: unknown[]) => warnLogs.push(args),
  },
}));

const { reportContentSecurityPolicyViolations } = await import("./report-csp-violations");

reportContentSecurityPolicyViolations();

function dispatchViolation(init: { blockedURI?: string; directive?: string; disposition?: string } = {}) {
  const event = new window.Event("securitypolicyviolation");
  Object.assign(event, {
    blockedURI: init.blockedURI ?? "wss://websocket.self.xyz/websocket",
    disposition: init.disposition ?? "enforce",
    effectiveDirective: init.directive ?? "connect-src",
    violatedDirective: init.directive ?? "connect-src",
  });
  window.document.dispatchEvent(event);
}

function resetLogs() {
  errorLogs.length = 0;
  warnLogs.length = 0;
}

describe("reportContentSecurityPolicyViolations", () => {
  test("logs enforced connect-src violations as errors with host and directive", () => {
    resetLogs();

    dispatchViolation({ blockedURI: "wss://websocket.self.xyz/websocket?sessionId=abc123" });

    expect(errorLogs.length).toBe(1);
    expect(String(errorLogs[0]?.[0])).toContain("[csp]");
    expect(errorLogs[0]?.[1]).toMatchObject({
      blockedURI: "wss://websocket.self.xyz/websocket",
      effectiveDirective: "connect-src",
    });
    expect(warnLogs.length).toBe(0);
  });

  test("strips query strings so tokens never reach the error tracker", () => {
    resetLogs();

    dispatchViolation({
      blockedURI: "https://api.pirate.sc/verification-sessions?token=secret",
      directive: "connect-src",
    });

    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0]?.[1]).toMatchObject({
      blockedURI: "https://api.pirate.sc/verification-sessions",
    });
  });

  test("keeps non-URL blockedURI literals as-is", () => {
    resetLogs();

    dispatchViolation({ blockedURI: "inline", directive: "script-src" });

    expect(warnLogs.length).toBe(1);
    expect(warnLogs[0]?.[1]).toMatchObject({ blockedURI: "inline" });
  });

  test("logs non-connect-src violations as warnings, not errors", () => {
    resetLogs();

    dispatchViolation({ blockedURI: "https://cosmetic.example.com/a.png", directive: "img-src" });

    expect(errorLogs.length).toBe(0);
    expect(warnLogs.length).toBe(1);
  });

  test("dedupes repeats of the same directive and host", () => {
    resetLogs();

    dispatchViolation({ blockedURI: "https://dedupe.example.com/a.png", directive: "img-src" });
    dispatchViolation({ blockedURI: "https://dedupe.example.com/b.png", directive: "img-src" });

    expect(warnLogs.length).toBe(1);
  });

  test("ignores report-only violations", () => {
    resetLogs();

    dispatchViolation({ blockedURI: "https://report-only.example.com/x", disposition: "report" });

    expect(errorLogs.length).toBe(0);
    expect(warnLogs.length).toBe(0);
  });

  test("installation is idempotent", () => {
    resetLogs();

    reportContentSecurityPolicyViolations();
    dispatchViolation({ blockedURI: "https://idem.example.com/", directive: "connect-src" });

    expect(errorLogs.length).toBe(1);
  });
});
