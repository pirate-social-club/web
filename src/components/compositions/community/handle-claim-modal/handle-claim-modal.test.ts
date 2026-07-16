import { describe, expect, test } from "bun:test";

import { resolveCommunityHandleSuffix } from "./handle-claim-modal";

describe("resolveCommunityHandleSuffix", () => {
  test("renders HNS names with a dot suffix", () => {
    expect(resolveCommunityHandleSuffix("pirate", "c/pirate")).toBe(".pirate");
    expect(resolveCommunityHandleSuffix("charizard", "/c/charizard/")).toBe(".charizard");
  });

  test("renders Spaces names with an at suffix", () => {
    expect(resolveCommunityHandleSuffix("pirate", "c/@pirate")).toBe("@pirate");
    expect(resolveCommunityHandleSuffix("pokemon", "/c/@pokemon/")).toBe("@pokemon");
  });
});
