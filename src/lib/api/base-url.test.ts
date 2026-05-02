import { describe, expect, test } from "bun:test";

import { resolveApiBaseUrl, resolveApiUrl } from "./base-url";

describe("resolveApiBaseUrl", () => {
  function withBrowserHostname(hostname: string, run: () => void, origin = `https://${hostname}`) {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { hostname, origin } },
    });
    try {
      run();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }

  test("uses local API for localhost hosts", () => {
    expect(resolveApiBaseUrl("localhost")).toBe("http://127.0.0.1:8787");
    expect(resolveApiBaseUrl("captain.localhost")).toBe("http://127.0.0.1:8787");
    expect(resolveApiBaseUrl("127.0.0.1")).toBe("http://127.0.0.1:8787");
  });

  test("uses staging API for staging pirate hosts", () => {
    expect(resolveApiBaseUrl("staging.pirate.sc")).toBe("https://api-staging.pirate.sc");
    expect(resolveApiBaseUrl("captain.staging.pirate.sc")).toBe("https://api-staging.pirate.sc");
  });

  test("uses production API for pirate hosts", () => {
    expect(resolveApiBaseUrl("pirate.sc")).toBe("https://api.pirate.sc");
    expect(resolveApiBaseUrl("www.pirate.sc")).toBe("https://api.pirate.sc");
    expect(resolveApiBaseUrl("captain.pirate.sc")).toBe("https://api.pirate.sc");
  });

  test("prefers the browser host when SSR passes a local host in production", () => {
    withBrowserHostname("pirate.sc", () => {
      expect(resolveApiBaseUrl("127.0.0.1")).toBe("https://api.pirate.sc");
    });
  });

  test("does not use bare HNS community roots as API origins", () => {
    const originalAppEnv = import.meta.env.VITE_PIRATE_APP_ENV;
    import.meta.env.VITE_PIRATE_APP_ENV = "prod";
    try {
      withBrowserHostname("dankmeme", () => {
        expect(resolveApiBaseUrl()).toBe("https://api.pirate.sc");
      });
    } finally {
      import.meta.env.VITE_PIRATE_APP_ENV = originalAppEnv;
    }
  });

  test("uses the production API for HNS app hosts", () => {
    const originalAppEnv = import.meta.env.VITE_PIRATE_APP_ENV;
    import.meta.env.VITE_PIRATE_APP_ENV = "prod";
    try {
      expect(resolveApiBaseUrl("app.pirate")).toBe("https://api.pirate.sc");
    } finally {
      import.meta.env.VITE_PIRATE_APP_ENV = originalAppEnv;
    }
  });

  test("joins relative paths against the resolved API origin", () => {
    expect(resolveApiUrl("/public-profiles/captain", "captain.pirate.sc")).toBe(
      "https://api.pirate.sc/public-profiles/captain",
    );
    expect(resolveApiUrl("/profiles/me", "captain.staging.pirate.sc")).toBe(
      "https://api-staging.pirate.sc/profiles/me",
    );
    expect(resolveApiUrl("http://example.com/test", "pirate.sc")).toBe("http://example.com/test");
  });
});
