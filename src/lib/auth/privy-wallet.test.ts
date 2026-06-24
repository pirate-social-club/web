import { describe, expect, test } from "bun:test";

import {
  findPirateEmbeddedEvmWallet,
  isPirateEmbeddedEvmWallet,
  normalizePirateConnectedEvmWallet,
} from "./privy-wallet";

function wallet(overrides: Record<string, unknown> = {}) {
  return {
    address: "0x1111111111111111111111111111111111111111",
    connectorType: "embedded",
    getEthereumProvider: async () => null,
    switchChain: async () => undefined,
    walletClientType: "privy",
    ...overrides,
  };
}

describe("Privy wallet normalization", () => {
  test("preserves connector metadata and recognizes only embedded Privy wallets", () => {
    const embedded = normalizePirateConnectedEvmWallet(wallet());
    expect(embedded?.connectorType).toBe("embedded");
    expect(isPirateEmbeddedEvmWallet(embedded!)).toBe(true);

    const metamask = normalizePirateConnectedEvmWallet(wallet({
      connectorType: "injected",
      walletClientType: "metamask",
    }));
    expect(isPirateEmbeddedEvmWallet(metamask!)).toBe(false);

    const privyNonEmbedded = normalizePirateConnectedEvmWallet(wallet({
      connectorType: "smart_wallet",
    }));
    expect(isPirateEmbeddedEvmWallet(privyNonEmbedded!)).toBe(false);
    expect(findPirateEmbeddedEvmWallet([metamask!, embedded!])?.address).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(findPirateEmbeddedEvmWallet([metamask!, privyNonEmbedded!])).toBeNull();
  });
});
