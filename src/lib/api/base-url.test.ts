import { describe, expect, test } from "bun:test";

import { resolveApiBaseUrl, resolveApiUrl } from "./base-url";

describe("resolveApiBaseUrl", () => {
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
