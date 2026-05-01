import { describe, expect, test } from "bun:test";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "./auth-origin";

describe("isCanonicalAuthOrigin", () => {
  test("returns true for pirate.sc", () => {
    expect(isCanonicalAuthOrigin("pirate.sc")).toBe(true);
    expect(isCanonicalAuthOrigin("PIRATE.SC")).toBe(true);
    expect(isCanonicalAuthOrigin("pirate.sc.")).toBe(true);
  });

  test("returns true for www.pirate.sc", () => {
    expect(isCanonicalAuthOrigin("www.pirate.sc")).toBe(true);
  });

  test("returns true for app.pirate", () => {
    expect(isCanonicalAuthOrigin("app.pirate")).toBe(true);
  });

  test("returns true for staging.pirate.sc and subdomains", () => {
    expect(isCanonicalAuthOrigin("staging.pirate.sc")).toBe(true);
    expect(isCanonicalAuthOrigin("dev.staging.pirate.sc")).toBe(true);
  });

  test("returns true for localhost variants", () => {
    expect(isCanonicalAuthOrigin("localhost")).toBe(true);
    expect(isCanonicalAuthOrigin("127.0.0.1")).toBe(true);
    expect(isCanonicalAuthOrigin("web.localhost")).toBe(true);
  });

  test("returns false for HNS roots", () => {
    expect(isCanonicalAuthOrigin("myroot")).toBe(false);
    expect(isCanonicalAuthOrigin("xn--t77hga")).toBe(false);
  });

  test("returns false for profile hosts", () => {
    expect(isCanonicalAuthOrigin("kevin.pirate.sc")).toBe(false);
    expect(isCanonicalAuthOrigin("agent.clawitzer")).toBe(false);
  });

  test("returns false for arbitrary origins", () => {
    expect(isCanonicalAuthOrigin("example.com")).toBe(false);
    expect(isCanonicalAuthOrigin("")).toBe(false);
  });
});

describe("buildCanonicalAuthUrl", () => {
  test("builds URL from explicit path and search", () => {
    expect(buildCanonicalAuthUrl("/c/@space", "?sort=top")).toBe(
      "https://pirate.sc/c/@space?sort=top",
    );
  });

  test("builds URL with defaults when window is undefined", () => {
    expect(buildCanonicalAuthUrl()).toBe("https://pirate.sc/");
  });
});
