import { describe, expect, test } from "bun:test";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";

import {
  DEFAULT_STORY_CHECKOUT_ROUTE,
  findConnectedFundingWallet,
} from "./routed-checkout";

function createWallet(address: `0x${string}`): PirateConnectedEvmWallet {
  return {
    address,
    getEthereumProvider: async () => ({}),
    switchChain: async () => undefined,
  };
}

describe("routed checkout helpers", () => {
  test("prefers the connected primary wallet when available", () => {
    const fallback = createWallet("0x1111111111111111111111111111111111111111");
    const primary = createWallet("0x2222222222222222222222222222222222222222");

    expect(findConnectedFundingWallet({
      connectedWallets: [fallback, primary],
      primaryWalletAddress: "0x2222222222222222222222222222222222222222",
    })).toBe(primary);
  });

  test("falls back to the first connected wallet when no primary is set", () => {
    const first = createWallet("0x1111111111111111111111111111111111111111");
    const second = createWallet("0x2222222222222222222222222222222222222222");

    expect(findConnectedFundingWallet({
      connectedWallets: [first, second],
      primaryWalletAddress: null,
    })).toBe(first);
  });

  test("does not choose an arbitrary wallet when the primary is disconnected", () => {
    const connected = createWallet("0x1111111111111111111111111111111111111111");

    expect(findConnectedFundingWallet({
      connectedWallets: [connected],
      primaryWalletAddress: "0x2222222222222222222222222222222222222222",
    })).toBeNull();
  });

  test("builds the default checkout quote route for USDC on an EVM source chain", () => {
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.client_estimated_hop_count).toBe(1);
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.client_estimated_slippage_bps).toBe(0);
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.funding_asset?.asset_symbol).toBe("USDC");
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.funding_asset?.chain_namespace).toBe("eip155");
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.route_provider).toBe("pirate_checkout");
    expect(DEFAULT_STORY_CHECKOUT_ROUTE.source_chain?.chain_namespace).toBe("eip155");
  });
});
