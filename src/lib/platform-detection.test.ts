import { describe, expect, test } from "bun:test";

import {
  isAndroidUserAgent,
  isMobileDevice,
} from "./platform-detection";

describe("platform detection", () => {
  test("detects Android independently of viewport size", () => {
    expect(isAndroidUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36")).toBe(true);
    expect(isAndroidUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe(false);
    expect(isAndroidUserAgent(null)).toBe(false);
  });

  test("detects common same-device verification targets", () => {
    expect(isMobileDevice({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
    })).toBe(true);
    expect(isMobileDevice({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    })).toBe(true);
    expect(isMobileDevice({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      userAgentDataMobile: true,
    })).toBe(true);
    expect(isMobileDevice({
      coarsePointer: true,
      hoverNone: true,
      userAgent: "Mozilla/5.0",
    })).toBe(true);
  });

  test("does not classify ordinary desktop browsers as mobile devices", () => {
    expect(isMobileDevice({
      maxTouchPoints: 0,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    })).toBe(false);
    expect(isMobileDevice({
      maxTouchPoints: 10,
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
    })).toBe(false);
  });
});
