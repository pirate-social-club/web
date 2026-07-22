import { describe, expect, test } from "bun:test";
import { base, baseSepolia } from "viem/chains";

import { resolvePrivyBaseChains } from "./privy-provider";

describe("resolvePrivyBaseChains", () => {
  test("allows Base Sepolia alongside Base mainnet for testnet reward funding", () => {
    expect(resolvePrivyBaseChains(base).map((chain) => chain.id)).toEqual([
      base.id,
      baseSepolia.id,
    ]);
  });

  test("does not duplicate Base Sepolia outside production", () => {
    expect(resolvePrivyBaseChains(baseSepolia).map((chain) => chain.id)).toEqual([
      baseSepolia.id,
    ]);
  });
});
