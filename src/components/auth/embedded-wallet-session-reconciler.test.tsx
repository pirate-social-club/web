import { afterEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";

import type { StoredSession } from "@/lib/api/session-store";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { installDomGlobals } from "@/test/setup-dom";
import {
  EmbeddedWalletSessionReconciler,
  getEmbeddedWalletReconcileKey,
} from "./embedded-wallet-session-reconciler";

installDomGlobals();

const EMBEDDED_ADDRESS = "0x1111111111111111111111111111111111111111";
const EXTERNAL_ADDRESS = "0x2222222222222222222222222222222222222222";

function connectedWallet({
  address = EMBEDDED_ADDRESS,
  connectorType = "embedded",
  walletClientType = "privy",
}: {
  address?: `0x${string}`;
  connectorType?: string;
  walletClientType?: string;
} = {}): PirateConnectedEvmWallet {
  return {
    address,
    connectorType,
    getEthereumProvider: async () => null,
    switchChain: async () => undefined,
    walletClientType,
  };
}

function session({
  attachedAddress,
  userId = "usr_test",
}: {
  attachedAddress?: string;
  userId?: string;
} = {}): StoredSession {
  return {
    accessToken: "header.payload.signature",
    onboarding: {} as StoredSession["onboarding"],
    profile: { primary_wallet_address: attachedAddress ?? null } as StoredSession["profile"],
    storedAt: new Date().toISOString(),
    user: { id: userId } as StoredSession["user"],
    walletAttachments: attachedAddress
      ? [{
          chain_namespace: "eip155:1",
          is_primary: true,
          wallet_address: attachedAddress,
          wallet_attachment: "wal_test",
        }]
      : [],
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("embedded wallet session reconciliation", () => {
  test("keys only an unattached embedded Privy wallet", () => {
    expect(getEmbeddedWalletReconcileKey(
      session(),
      [connectedWallet()],
    )).toBe(`usr_test:${EMBEDDED_ADDRESS}`);

    expect(getEmbeddedWalletReconcileKey(
      session(),
      [connectedWallet({
        address: EXTERNAL_ADDRESS,
        connectorType: "injected",
        walletClientType: "metamask",
      })],
    )).toBeNull();

    expect(getEmbeddedWalletReconcileKey(
      session({ attachedAddress: EMBEDDED_ADDRESS }),
      [connectedWallet()],
    )).toBeNull();
  });

  test("runs immediately, retries with bounded timers, and never exceeds the budget", async () => {
    let attempts = 0;
    render(
      <EmbeddedWalletSessionReconciler
        connectedWallets={[connectedWallet()]}
        delaysMs={[0, 5, 10]}
        enabled
        onReconcile={async () => {
          attempts += 1;
          return true;
        }}
        session={session()}
      />,
    );

    await waitFor(() => expect(attempts).toBe(3));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(attempts).toBe(3);
  });

  test("stops after the wallet becomes attached and resets for a different user", async () => {
    let attempts = 0;
    const props = {
      connectedWallets: [connectedWallet()],
      delaysMs: [0, 100, 100] as const,
      enabled: true,
      onReconcile: async () => {
        attempts += 1;
        return true;
      },
    };
    const view = render(
      <EmbeddedWalletSessionReconciler {...props} session={session()} />,
    );

    await waitFor(() => expect(attempts).toBe(1));
    view.rerender(
      <EmbeddedWalletSessionReconciler
        {...props}
        session={session({ attachedAddress: EMBEDDED_ADDRESS })}
      />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(attempts).toBe(1);

    view.rerender(
      <EmbeddedWalletSessionReconciler
        {...props}
        session={session({ userId: "usr_other" })}
      />,
    );
    await waitFor(() => expect(attempts).toBe(2));
  });

  test("cancels pending retries on unmount", async () => {
    let attempts = 0;
    const view = render(
      <EmbeddedWalletSessionReconciler
        connectedWallets={[connectedWallet()]}
        delaysMs={[0, 100, 100]}
        enabled
        onReconcile={async () => {
          attempts += 1;
          return true;
        }}
        session={session()}
      />,
    );

    await waitFor(() => expect(attempts).toBe(1));
    view.unmount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(attempts).toBe(1);
  });
});
