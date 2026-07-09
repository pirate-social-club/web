import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

const { window } = installDomGlobals();
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://app.test/wallet"),
});
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});
Object.defineProperty(globalThis, "matchMedia", {
  configurable: true,
  value: window.matchMedia,
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
    marginLeft: "0px",
    marginRight: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
  }),
});
Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: window.getComputedStyle,
});
class TestMutationObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, "MutationObserver", {
  configurable: true,
  value: TestMutationObserver,
});
Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  value: window.localStorage,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: window.sessionStorage,
});

let fakeApi: {
  rewards: {
    cashOut: ReturnType<typeof mock>;
    getCashout: ReturnType<typeof mock>;
    getSummary: ReturnType<typeof mock>;
  };
  royalties: {
    listClaimable: ReturnType<typeof mock>;
  };
  users: {
    setIdentityWallet: ReturnType<typeof mock>;
  };
};

let fakeSession: unknown = null;
let fakePrivyRuntime: {
  configured: boolean;
  connect: (() => void) | null;
  getPrivyAccessToken: (() => Promise<string | null>) | null;
};
let fakeConnectedWallets: Array<{
  address: `0x${string}`;
  connectorType: string;
  getEthereumProvider: () => Promise<unknown>;
  switchChain: () => Promise<void>;
  walletClientType: string;
}> = [];
const originalRewardsFlag = import.meta.env.VITE_REWARDS_ENABLED;

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/logger", () => ({
  logger: {
    debug: () => undefined,
    warn: () => undefined,
  },
}));
mock.module("@/lib/price-cache", () => ({
  fetchCachedPrices: async () => ({}),
}));
mock.module("@/lib/api/session-store", () => ({
  getAccessToken: () => null,
  updateSessionIdentityWallet: () => undefined,
  updateSessionOnboarding: () => undefined,
  useSession: () => fakeSession,
}));
mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => fakePrivyRuntime,
  usePiratePrivyWallets: () => ({ connectedWallets: fakeConnectedWallets, walletsReady: true }),
}));
mock.module("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: async () => undefined }),
}));
mock.module("@/components/compositions/wallet/wallet-hub/wallet-hub", () => ({
  WalletHub: ({ rewardsSummary }: {
    rewardsSummary?: {
      actionDisabled?: boolean;
      actionLabel: string;
      amountLabel: string;
      onAction?: () => void;
      supportingLabel?: string;
    };
  }) => (
    <div data-testid="wallet-hub">
      {rewardsSummary ? (
        <section>
          <div>Rewards</div>
          <div>{rewardsSummary.amountLabel}</div>
          {rewardsSummary.supportingLabel ? <div>{rewardsSummary.supportingLabel}</div> : null}
          <button disabled={rewardsSummary.actionDisabled} onClick={rewardsSummary.onAction} type="button">
            {rewardsSummary.actionLabel}
          </button>
        </section>
      ) : null}
    </div>
  ),
}));
mock.module("@/components/compositions/wallet/identity-wallet-section/identity-wallet-section", () => ({
  IdentityWalletSection: () => <div data-testid="identity-wallet-section" />,
}));
mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => <p className={className}>{children}</p>,
  ModalFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  ModalHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { CurrentUserWalletPage } = await import("./wallet-settings-route");

beforeEach(() => {
  window.sessionStorage.clear();
  import.meta.env.VITE_REWARDS_ENABLED = "true";
  fakeSession = {
    profile: {
      primary_wallet_address: null,
    },
    walletAttachments: [],
  };
  fakePrivyRuntime = {
    configured: true,
    connect: null,
    getPrivyAccessToken: null,
  };
  fakeConnectedWallets = [];
  fakeApi = {
    rewards: {
      cashOut: mock(async () => ({
        payout: {
          id: "rpe_test",
          amount_cents: 120,
          recipient_address: "0x1000000000000000000000000000000000000001",
          status: "confirmed",
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      })),
      getCashout: mock(async () => ({
        payout: {
          id: "rpe_test",
          amount_cents: 120,
          recipient_address: "0x1000000000000000000000000000000000000001",
          status: "confirmed",
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      })),
      getSummary: mock(async () => ({
        balance_cents: 120,
        today_earned_cents: 30,
        recent_events: [],
        cashout: {
          eligible: true,
          min_cents: 100,
          verification_state: "verified",
        },
      })),
    },
    royalties: {
      listClaimable: mock(async () => ({
        items: [],
        total_claimable_wip_wei: "0",
        checked_at: 0,
      })),
    },
    users: {
      setIdentityWallet: mock(async () => ({})),
    },
  };
});

afterEach(() => {
  cleanup();
  if (originalRewardsFlag === undefined) {
    delete import.meta.env.VITE_REWARDS_ENABLED;
  } else {
    import.meta.env.VITE_REWARDS_ENABLED = originalRewardsFlag;
  }
});

describe("CurrentUserWalletPage rewards", () => {
  test("loads and renders the rewards summary when the flag is enabled", async () => {
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(fakeApi.rewards.getSummary).toHaveBeenCalled();
      expect(view.getByText("Rewards")).toBeTruthy();
      expect(view.getAllByText("$1.20").length).toBeGreaterThan(0);
    });
  });

  test("reward claim posts the available balance and refreshes rewards", async () => {
    const walletAddress = "0x1000000000000000000000000000000000000001" as const;
    fakePrivyRuntime.getPrivyAccessToken = mock(async () => "privy-rewards-token");
    fakeConnectedWallets = [
      {
        address: walletAddress,
        connectorType: "embedded",
        getEthereumProvider: async () => ({}),
        switchChain: async () => undefined,
        walletClientType: "privy",
      },
    ];
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(view.getByText("Claim")).toBeTruthy();
    });
    fireEvent.click(view.getByText("Claim"));
    expect(view.getByText("Claim rewards")).toBeTruthy();
    expect(view.getByDisplayValue("$1.20")).toBeTruthy();
    fireEvent.click(view.getByText("Continue"));
    expect(view.getByText("Confirm claim")).toBeTruthy();
    fireEvent.click(view.getByText("Confirm claim"));

    await waitFor(() => {
      expect(fakeApi.rewards.cashOut).toHaveBeenCalled();
    });
    const payload = fakeApi.rewards.cashOut.mock.calls[0]?.[0] as {
      amount_cents: number;
      idempotency_key: string;
      wallet_proof?: {
        type: "privy_access_token";
        privy_access_token: string;
        wallet_address?: string | null;
      } | null;
    };
    expect(payload.amount_cents).toBe(120);
    expect(payload.idempotency_key.startsWith("wallet-rewards:")).toBe(true);
    expect(payload.wallet_proof).toEqual({
      type: "privy_access_token",
      privy_access_token: "privy-rewards-token",
      wallet_address: walletAddress,
    });
    await waitFor(() => {
      expect(view.getByText("Claim complete")).toBeTruthy();
    });
    await waitFor(() => {
      expect(fakeApi.rewards.getSummary.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("reuses the same cashout idempotency key after an ambiguous request failure", async () => {
    fakeApi.rewards.cashOut
      .mockImplementationOnce(async () => { throw new Error("connection lost"); })
      .mockImplementationOnce(async () => ({
        payout: {
          id: "rpe_retry",
          amount_cents: 120,
          recipient_address: "0x1000000000000000000000000000000000000001",
          status: "confirmed" as const,
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      }));
    const view = render(<CurrentUserWalletPage />);
    await waitFor(() => expect(view.getByText("Claim")).toBeTruthy());

    fireEvent.click(view.getByText("Claim"));
    fireEvent.click(view.getByText("Continue"));
    fireEvent.click(view.getByText("Confirm claim"));
    await waitFor(() => expect(view.getByText("Transfer failed")).toBeTruthy());
    fireEvent.click(view.getByText("Close"));

    fireEvent.click(view.getByText("Claim"));
    fireEvent.click(view.getByText("Continue"));
    fireEvent.click(view.getByText("Confirm claim"));
    await waitFor(() => expect(fakeApi.rewards.cashOut.mock.calls).toHaveLength(2));

    expect(fakeApi.rewards.cashOut.mock.calls[0]?.[0].idempotency_key)
      .toBe(fakeApi.rewards.cashOut.mock.calls[1]?.[0].idempotency_key);
  });

  test("renders the server failure reason instead of treating a failed payout as pending", async () => {
    fakeApi.rewards.cashOut = mock(async () => ({
      payout: {
        id: "rpe_failed",
        amount_cents: 120,
        recipient_address: "0x1000000000000000000000000000000000000001",
        status: "failed" as const,
        settlement_ref: null,
        failure_reason: "Transfer replaced before confirmation.",
      },
      balance_cents: 120,
    }));
    const view = render(<CurrentUserWalletPage />);
    await waitFor(() => expect(view.getByText("Claim")).toBeTruthy());

    fireEvent.click(view.getByText("Claim"));
    fireEvent.click(view.getByText("Continue"));
    fireEvent.click(view.getByText("Confirm claim"));

    await waitFor(() => {
      expect(view.getByText("Transfer failed")).toBeTruthy();
      expect(view.getByText("Transfer replaced before confirmation.")).toBeTruthy();
    });
    expect(view.queryByText("Pending")).toBeNull();
  });

  test("opens the rewards verification provider sheet when claim needs verification", async () => {
    fakeApi.rewards.getSummary = mock(async () => ({
      balance_cents: 120,
      today_earned_cents: 30,
      recent_events: [],
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "unverified",
      },
    }));
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(view.getByText("Verify")).toBeTruthy();
    });
    fireEvent.click(view.getByText("Verify"));

    expect(view.getByText("Verify once")).toBeTruthy();
    expect(view.getByText("Self")).toBeTruthy();
    expect(view.getByText("Very")).toBeTruthy();
    expect(view.getByText("ZKPassport")).toBeTruthy();
  });

  test("does not request or render rewards when the flag is disabled", async () => {
    import.meta.env.VITE_REWARDS_ENABLED = "false";
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(fakeApi.royalties.listClaimable).toHaveBeenCalled();
    });
    expect(fakeApi.rewards.getSummary).not.toHaveBeenCalled();
    expect(view.queryByText("Rewards")).toBeNull();
  });
});
