import { describe, expect, test } from "bun:test";

import {
  generateRedditFallbackHandle,
  normalizeRedditHandleBase,
} from "./reddit-handle-suggestion";

describe("reddit handle suggestions", () => {
  test("normalizes reddit username input into a handle base", () => {
    expect(normalizeRedditHandleBase("u/Techno_Hippie.pirate")).toBe("techno-hippie");
    expect(normalizeRedditHandleBase("  ")).toBe("reddit");
  });

  test("generates a username plus six-digit fallback handle", () => {
    expect(generateRedditFallbackHandle("technohippie", () => 0.223764)).toBe("technohippie-223764");
  });

  test("keeps fallback handles inside the label length limit", () => {
    const handle = generateRedditFallbackHandle("averyveryveryverylongredditusername", () => 0.1);

    expect(handle).toBe("averyveryveryverylongre-100000");
    expect(handle.length <= 30).toBe(true);
  });
});
