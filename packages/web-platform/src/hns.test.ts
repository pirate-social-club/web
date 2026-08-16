import { describe, expect, test } from "bun:test";
import { isLocalHost } from "./hns";

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
