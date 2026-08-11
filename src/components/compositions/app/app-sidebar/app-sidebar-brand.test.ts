import { describe, expect, test } from "bun:test";

import { communityBrandInitial } from "./app-sidebar";

describe("communityBrandInitial", () => {
  test("uses a neutral fallback while community presentation is loading", () => {
    expect(communityBrandInitial(null)).toBe("C");
    expect(communityBrandInitial("   ")).toBe("C");
  });

  test("derives the mark from the community label", () => {
    expect(communityBrandInitial("dankmeme")).toBe("D");
    expect(communityBrandInitial("éclat")).toBe("É");
  });
});
