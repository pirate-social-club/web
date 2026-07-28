import { describe, expect, test } from "bun:test";

import { __testOnly } from "./efp-write";

describe("server-prepared EFP writes", () => {
  test("only embedded Privy wallets are sponsorship candidates", () => {
    expect(__testOnly.isEmbeddedPrivyWallet({ walletClientType: "privy" } as never)).toBe(true);
    expect(__testOnly.isEmbeddedPrivyWallet({ walletClientType: "privy-v2" } as never)).toBe(true);
    expect(__testOnly.isEmbeddedPrivyWallet({ walletClientType: "metamask" } as never)).toBe(false);
  });

  test("labels both transactions in a new-list bootstrap", () => {
    const target = "0x2222222222222222222222222222222222222222";
    expect(__testOnly.relayIntent(0, 2, true, target)).toMatchObject({
      type: "pirate.follow.create-list-records",
      followed: true,
      targetAddress: target,
    });
    expect(__testOnly.relayIntent(1, 2, true, target)).toEqual({
      type: "pirate.follow.mint-primary-list",
      slot: "server-prepared",
    });
  });
});
