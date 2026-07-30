import { afterEach, describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";

import type { StoredSession } from "@/lib/api/session-store";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

const EMBEDDED_ADDRESS = "0x1111111111111111111111111111111111111111";
let exchangeCalls = 0;
let fakeSession: StoredSession;

function makeSession(attached = false): StoredSession {
  return {
    accessToken: "header.payload.signature",
    onboarding: { namespace_verification_status: "not_started" } as StoredSession["onboarding"],
    profile: { primary_wallet_address: attached ? EMBEDDED_ADDRESS : null } as StoredSession["profile"],
    storedAt: new Date().toISOString(),
    user: { id: "usr_bridge" } as StoredSession["user"],
    walletAttachments: attached
      ? [{
          chain_namespace: "eip155:1",
          is_primary: true,
          wallet_address: EMBEDDED_ADDRESS,
          wallet_attachment: "wal_embedded",
        }]
      : [],
  };
}

const fakeApi = {
  auth: {
    sessionExchange: async () => {
      exchangeCalls += 1;
      return {
        access_token: "header.payload.signature",
        onboarding: fakeSession.onboarding,
        profile: fakeSession.profile,
        user: fakeSession.user,
        wallet_attachments: fakeSession.walletAttachments,
      };
    },
  },
  setRefreshAuthCallback: () => undefined,
};

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/lib/api/session-store", () => ({
  getSessionAccessTokenExpiryMs: () => null,
  getAccessToken: () => "pirate-access-token",
  isSessionAccessTokenExpiringSoon: () => false,
  setSessionClearCallback: () => undefined,
  setSession: () => undefined,
  useSessionClearInProgress: () => false,
  useSession: () => fakeSession,
}));

mock.module("@privy-io/react-auth", () => ({
  useAuthorizationSignature: () => ({
    generateAuthorizationSignature: async () => ({ signature: "signature" }),
  }),
  useCreateWallet: () => ({ createWallet: async () => undefined }),
  useMigrateWallets: () => ({ migrate: async () => undefined }),
  useModalStatus: () => ({ isOpen: false }),
  usePrivy: () => ({
    authenticated: true,
    connectWallet: () => undefined,
    getAccessToken: async () => "privy-access-token",
    linkWallet: () => undefined,
    login: () => undefined,
    logout: async () => undefined,
    ready: true,
  }),
}));

mock.module("@/app/router", () => ({
  navigate: () => undefined,
}));

const {
  PrivyAuthBridge,
  buildPrivyAuthorizationRequest,
  resolvePrivyWalletId,
} = await import("./privy-auth-bridge");

const embeddedWallet: PirateConnectedEvmWallet = {
  address: EMBEDDED_ADDRESS,
  connectorType: "embedded",
  getEthereumProvider: async () => null,
  switchChain: async () => undefined,
  walletClientType: "privy",
};

afterEach(() => {
  document.body.replaceChildren();
  exchangeCalls = 0;
  fakeSession = makeSession(false);
});

describe("PrivyAuthBridge embedded wallet recovery", () => {
  test("resolves an embedded wallet id from the authenticated Privy user", () => {
    expect(resolvePrivyWalletId({
      linkedAccounts: [{
        address: EMBEDDED_ADDRESS.toUpperCase(),
        id: "wallet_from_user",
        type: "wallet",
      }],
    }, EMBEDDED_ADDRESS)).toBe("wallet_from_user");
    expect(resolvePrivyWalletId(null, EMBEDDED_ADDRESS, "wallet_explicit")).toBe("wallet_explicit");
  });

  test("binds the Privy request expiry into both the signature payload and relay request", () => {
    const now = 1_800_000_000_000;
    const request = {
      chainId: 8453,
      intentId: `efw_${"b".repeat(32)}`,
      transactionIndex: 0,
      intent: {
        type: "pirate.follow.apply" as const,
        followed: true,
        slot: "server-prepared",
        targetAddress: `0x${"2".repeat(40)}` as `0x${string}`,
      },
      transaction: {
        data: "0x1234" as `0x${string}`,
        to: `0x${"3".repeat(40)}` as `0x${string}`,
      },
      walletAddress: EMBEDDED_ADDRESS as `0x${string}`,
    };
    const authorization = buildPrivyAuthorizationRequest(request, "wallet-id", now);
    expect(authorization.requestExpiry).toBe(String(now + 30 * 60 * 1000));
    expect(authorization.payload.headers["privy-request-expiry"]).toBe(
      authorization.requestExpiry,
    );
  });

  test("performs only the bounded number of silent exchanges", async () => {
    fakeSession = makeSession(false);
    render(
      <PrivyAuthBridge
        connectedWallets={[embeddedWallet]}
        embeddedWalletReconcileDelaysMs={[0, 5, 10]}
      />,
    );

    await waitFor(() => expect(exchangeCalls).toBe(3));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(exchangeCalls).toBe(3);
  });

  test("stops recovery when the refreshed session contains the attachment", async () => {
    fakeSession = makeSession(false);
    const view = render(
      <PrivyAuthBridge
        connectedWallets={[embeddedWallet]}
        embeddedWalletReconcileDelaysMs={[0, 100, 100]}
      />,
    );
    await waitFor(() => expect(exchangeCalls).toBe(1));

    fakeSession = makeSession(true);
    view.rerender(
      <PrivyAuthBridge
        connectedWallets={[embeddedWallet]}
        embeddedWalletReconcileDelaysMs={[0, 100, 100]}
      />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
    });
    expect(exchangeCalls).toBe(1);
  });
});
