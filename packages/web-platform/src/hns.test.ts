import { describe, expect, test } from "bun:test";
import { classifyHost, isLocalHost } from "./hns";

describe("local host classification", () => {
  test("recognizes exact local hosts and localhost subdomains", () => {
    for (const hostname of ["localhost", "127.0.0.1", "127.0.0.2", "preview.localhost"]) {
      expect(isLocalHost(hostname)).toBe(true);
    }
  });

  test("does not classify public hosts as local", () => {
    expect(isLocalHost("pirate.sc")).toBe(false);
    expect(isLocalHost("preview.pirate.sc")).toBe(false);
  });
});

describe("perimeter host classification", () => {
  test("does not turn an unrecognized host into the canonical surface", () => {
    for (const host of ["evil.example", "bad host", "pirate.sc.example"]) {
      expect(classifyHost(host)).toBe("unknown");
    }
  });

  test("accepts only the declared canonical and HNS host shapes", () => {
    expect(classifyHost("pirate.sc")).toBe("canonical");
    expect(classifyHost("app.crew.hns")).toBe("sovereign-app");
    expect(classifyHost("crew.hns")).toBe("sovereign-apex");
    expect(classifyHost("crew..hns")).toBe("unknown");
  });
});
