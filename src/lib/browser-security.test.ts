import { afterEach, describe, expect, test } from "bun:test";

import { browserCanUseCredentials, originCanUseCredentials } from "./browser-security";

const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

describe("browser credential policy", () => {
  test("blocks credentials on plaintext canonical HNS pages", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { hostname: "app.pirate", protocol: "http:" } },
    });
    expect(browserCanUseCredentials()).toBe(false);
  });

  test("keeps credentials on HTTPS and non-HNS pages", () => {
    for (const location of [
      { hostname: "app.pirate", protocol: "https:" },
      { hostname: "king.bitcoin", protocol: "http:" },
      { hostname: "example.com", protocol: "http:" },
    ]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location },
      });
      expect(browserCanUseCredentials()).toBe(true);
    }
  });

  test("keeps credentials on plaintext local development hosts", () => {
    for (const hostname of ["localhost", "127.0.0.1", "foo.localhost"]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { hostname, protocol: "http:" } },
      });
      expect(browserCanUseCredentials()).toBe(true);
    }
  });

  test("shares the same pure policy with server-rendered bootstrap code", () => {
    expect(originCanUseCredentials("http:", "app.pirate")).toBe(false);
    expect(originCanUseCredentials("http:", "agent.clawitzer")).toBe(false);
    expect(originCanUseCredentials("http:", "localhost")).toBe(true);
    expect(originCanUseCredentials("https:", "app.pirate")).toBe(true);
  });
});
