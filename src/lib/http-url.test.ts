import { describe, expect, test } from "bun:test";

import { isValidHttpUrl, normalizeHttpUrl } from "./http-url";

describe("HTTP URL normalization", () => {
  test("normalizes explicit and schemeless web URLs", () => {
    expect(normalizeHttpUrl(" https://example.com/story ")).toBe("https://example.com/story");
    expect(normalizeHttpUrl("example.com/story")).toBe("https://example.com/story");
    expect(isValidHttpUrl("http://localhost:5173/submit")).toBe(true);
  });

  test("rejects executable and non-web schemes", () => {
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeHttpUrl("mailto:test@example.com")).toBeNull();
  });
});
