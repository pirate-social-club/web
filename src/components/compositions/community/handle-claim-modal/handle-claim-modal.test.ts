import { describe, expect, test } from "bun:test";

import {
  resolveCommunityHandleSuffix,
  resolveQualifiedCommunityHandle,
} from "./handle-claim-modal";

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

describe("resolveQualifiedCommunityHandle", () => {
  test("appends an HNS suffix to the bare API label", () => {
    expect(resolveQualifiedCommunityHandle("alice", ".dankmeme")).toBe("alice.dankmeme");
  });

  test("does not duplicate an existing suffix", () => {
    expect(resolveQualifiedCommunityHandle("alice@pokemon", "@pokemon")).toBe("alice@pokemon");
  });
});
