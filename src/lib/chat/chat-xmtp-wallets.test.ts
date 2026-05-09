import { describe, expect, test } from "bun:test";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import type { StoredSession } from "@/lib/api/session-store";

import {
  getSessionWalletAddress,
  getSessionWalletAddresses,
  resolveXmtpSignerWallet,
  resolveXmtpWalletAddress,
} from "./chat-xmtp-wallets";

const primaryWallet = "0x1111111111111111111111111111111111111111";
const attachedWallet = "0x2222222222222222222222222222222222222222";
const unrelatedWallet = "0x3333333333333333333333333333333333333333";

function makeSession(): StoredSession {
  return {
    accessToken: "test-token",
    onboarding: null,
    profile: {
      primary_wallet_address: primaryWallet,
    },
    storedAt: new Date(0).toISOString(),
    user: {
      id: "usr_test",
      primary_wallet_attachment: "wal_primary",
    },
    walletAttachments: [
      {
        chain_namespace: "eip155:1",
        id: "wal_attached",
        is_primary: false,
        wallet_address: attachedWallet,
      },
    ],
  } as unknown as StoredSession;
}

function makeWallet(address: string): PirateConnectedEvmWallet {
  return {
    address,
    getEthereumProvider: async () => ({}),
    switchChain: async () => undefined,
    walletClientType: "embedded",
  } as PirateConnectedEvmWallet;
}

describe("chat XMTP wallet selection", () => {
  test("keeps the primary wallet as the default XMTP wallet", () => {
    const session = makeSession();

    expect(getSessionWalletAddress(session)).toBe(primaryWallet);
    expect(getSessionWalletAddresses(session)).toEqual([primaryWallet, attachedWallet]);
    expect(resolveXmtpWalletAddress(session, null)).toBe(primaryWallet);
  });

  test("uses a connected attached wallet when the primary wallet is not connected", () => {
    const session = makeSession();
    const signerWallet = makeWallet(attachedWallet);

    expect(resolveXmtpSignerWallet(session, [signerWallet])).toBe(signerWallet);
    expect(resolveXmtpWalletAddress(session, signerWallet)).toBe(attachedWallet);
  });

  test("refuses unrelated connected wallets", () => {
    const session = makeSession();
    const signerWallet = makeWallet(unrelatedWallet);

    expect(resolveXmtpSignerWallet(session, [signerWallet])).toBeNull();
    expect(resolveXmtpWalletAddress(session, signerWallet)).toBe(primaryWallet);
  });
});
