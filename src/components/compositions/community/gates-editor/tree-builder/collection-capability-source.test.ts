import { describe, expect, test } from "bun:test";

import { replaceEditableFacet } from "./collection-capability-source";

describe("replaceEditableFacet", () => {
  test("moves the value without retaining the old facet key", () => {
    expect(replaceEditableFacet(
      { category: "Trading Cards", franchise: "Pokemon" },
      { category: "Trading Cards" },
      "franchise",
      "grade",
    )).toEqual({ category: "Trading Cards", grade: "Pokemon" });
  });
});
