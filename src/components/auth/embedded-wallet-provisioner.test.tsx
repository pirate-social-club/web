import { afterEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import * as React from "react";

import type { StoredSession } from "@/lib/api/session-store";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { installDomGlobals } from "@/test/setup-dom";
import {
  EmbeddedWalletProvisioner,
  getEmbeddedWalletProvisionKey,
} from "./embedded-wallet-provisioner";

installDomGlobals();

const EMBEDDED_ADDRESS = "0x1111111111111111111111111111111111111111";
const EXTERNAL_ADDRESS = "0x2222222222222222222222222222222222222222";

function embeddedWallet(): PirateConnectedEvmWallet {
  return {
    address: EMBEDDED_ADDRESS,
    connectorType: "embedded",
    getEthereumProvider: async () => null,
    switchChain: async () => undefined,
    walletClientType: "privy",
  };
}

function externalWallet(): PirateConnectedEvmWallet {
  return {
    address: EXTERNAL_ADDRESS,
    connectorType: "injected",
    getEthereumProvider: async () => null,
    switchChain: async () => undefined,
    walletClientType: "metamask",
  };
}

function session(userId = "usr_test"): StoredSession {
  return {
    accessToken: "header.payload.signature",
    onboarding: {} as StoredSession["onboarding"],
    profile: { primary_wallet_address: null } as StoredSession["profile"],
    storedAt: new Date().toISOString(),
    user: { id: userId } as StoredSession["user"],
    walletAttachments: [],
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("embedded wallet provisioning", () => {
  test("keys an authenticated user who has no embedded wallet", () => {
    // No wallets at all → provision.
    expect(getEmbeddedWalletProvisionKey(session(), [])).toBe("usr_test");
    // Only an external wallet → still provision (external is never the embedded identity wallet).
    expect(getEmbeddedWalletProvisionKey(session(), [externalWallet()])).toBe("usr_test");
    // Already has an embedded wallet → do not provision.
    expect(getEmbeddedWalletProvisionKey(session(), [embeddedWallet()])).toBeNull();
    // No session → do not provision.
    expect(getEmbeddedWalletProvisionKey(null, [])).toBeNull();
  });

  test("provisions with bounded retries and never exceeds the budget", async () => {
    let attempts = 0;
    render(
      <EmbeddedWalletProvisioner
        connectedWallets={[]}
        delaysMs={[0, 5, 10]}
        enabled
        onProvision={async () => {
          attempts += 1;
          return false; // keep failing to exercise the full bounded retry budget
        }}
        session={session()}
      />,
    );

    await waitFor(() => expect(attempts).toBe(3));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(attempts).toBe(3);
  });

  test("stops once an embedded wallet appears and resets for a different user", async () => {
    let attempts = 0;
    const props = {
      delaysMs: [0, 100, 100] as const,
      enabled: true,
      onProvision: async () => {
        attempts += 1;
        return false;
      },
    };
    const view = render(
      <EmbeddedWalletProvisioner {...props} connectedWallets={[]} session={session()} />,
    );

    await waitFor(() => expect(attempts).toBe(1));
    // Embedded wallet now exists → provisioning must stop.
    view.rerender(
      <EmbeddedWalletProvisioner {...props} connectedWallets={[embeddedWallet()]} session={session()} />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(attempts).toBe(1);

    // A different user without a wallet → provision again.
    view.rerender(
      <EmbeddedWalletProvisioner {...props} connectedWallets={[]} session={session("usr_other")} />,
    );
    await waitFor(() => expect(attempts).toBe(2));
  });

  test("does not provision when disabled", async () => {
    let attempts = 0;
    render(
      <EmbeddedWalletProvisioner
        connectedWallets={[]}
        delaysMs={[0, 5, 10]}
        enabled={false}
        onProvision={async () => {
          attempts += 1;
          return false;
        }}
        session={session()}
      />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(attempts).toBe(0);
  });
});
