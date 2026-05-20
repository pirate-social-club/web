import { describe, expect, test } from "bun:test";

import { isAndroidUserAgent } from "./platform-detection";

describe("platform detection", () => {
  test("detects Android independently of viewport size", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36")).toBe(true);
    expect(isAndroidUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe(false);
    expect(isAndroidUserAgent(null)).toBe(false);
  });
});
