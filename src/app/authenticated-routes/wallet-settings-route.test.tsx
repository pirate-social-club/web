import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";

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
let fakeVeryOnVerified: (() => Promise<void> | void) | undefined;
let veryStartedWithoutPirateModal = false;
const fakeStartSelfVerification = mock(async () => ({ started: true }));
const fakeStartVeryVerification = mock(async () => {
  veryStartedWithoutPirateModal = !document.body.textContent?.includes("Verify identity");
  return { started: true };
});
const fakeStartZkPassportVerification = mock(async () => ({ started: true }));
const fakeToastError = mock(() => undefined);
const fakeToastInfo = mock(() => undefined);
const fakeToastSuccess = mock(() => undefined);
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
mock.module("@/components/primitives/sonner", () => ({
  toast: {
    error: fakeToastError,
    info: fakeToastInfo,
    success: fakeToastSuccess,
  },
}));
mock.module("@/lib/verification/use-self-verification", () => ({
  useSelfVerification: () => ({
    handleModalOpenChange: () => undefined,
    handleSelfQrError: () => undefined,
    handleSelfQrSuccess: () => undefined,
    selfError: null,
    selfLoading: false,
    selfModalOpen: false,
    selfPrompt: null,
    startVerification: fakeStartSelfVerification,
  }),
}));
mock.module("@/lib/verification/use-very-verification", () => ({
  useVeryVerification: (input: { onVerified?: () => Promise<void> | void }) => {
    fakeVeryOnVerified = input.onVerified;
    return {
      startVerification: fakeStartVeryVerification,
      verificationError: null,
      verificationLoading: false,
    };
  },
}));
mock.module("@/lib/verification/use-zkpassport-verification", () => ({
  useZkPassportVerification: () => ({
    checkPendingVerification: async () => undefined,
    clearPendingVerification: () => undefined,
    startVerification: fakeStartZkPassportVerification,
    verificationError: null,
    verificationHref: null,
    verificationLoading: false,
  }),
}));
mock.module("@/components/compositions/wallet/wallet-hub/wallet-hub", () => ({
  WalletHub: ({ rewardsSummary }: {
    rewardsSummary?: {
      actionDisabled?: boolean;
      actionLabel: string;
      amountLabel: string;
      assetLabel: string;
      onAction?: () => void;
      supportingLabel?: string;
    };
  }) => (
    <div data-testid="wallet-hub">
      {rewardsSummary ? (
        <section>
          <div>Bounties</div>
          <div>{rewardsSummary.amountLabel}</div>
          <button disabled={rewardsSummary.actionDisabled} onClick={rewardsSummary.onAction} type="button">
            {rewardsSummary.actionLabel}
          </button>
          <div data-label={rewardsSummary.supportingLabel} data-testid="rewards-supporting-label" />
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
  window.localStorage.clear();
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
  fakeVeryOnVerified = undefined;
  veryStartedWithoutPirateModal = false;
  fakeStartSelfVerification.mockClear();
  fakeStartVeryVerification.mockClear();
  fakeStartZkPassportVerification.mockClear();
  fakeToastError.mockClear();
  fakeToastInfo.mockClear();
  fakeToastSuccess.mockClear();
  fakeApi = {
    rewards: {
      cashOut: mock(async () => ({
        chain_id: 84532,
        payout: {
          id: "rpe_test",
          chain_id: 84532,
          amount_cents: 120,
          recipient_address: "0x9000000000000000000000000000000000000009",
          status: "confirmed",
          settlement_stage: "confirmed",
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      })),
      getCashout: mock(async () => ({
        chain_id: 84532,
        payout: {
          id: "rpe_test",
          chain_id: 84532,
          amount_cents: 120,
          recipient_address: "0x1000000000000000000000000000000000000001",
          status: "confirmed",
          settlement_stage: "confirmed",
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      })),
      getSummary: mock(async () => ({
        chain_id: 84532,
        balance_cents: 120,
        today_earned_cents: 30,
        recent_events: [],
        recent_qualifications: [],
        pending_verification: {
          count: 0,
          conditional_cents: 0,
          earliest_expires_at: null,
          provider_requirements: [],
        },
        cashout: {
          eligible: true,
          min_cents: 100,
          verification_state: "verified",
          verification_provider: "self",
        },
        latest_in_flight_cashout: null,
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
      expect(view.getByText("Bounties")).toBeTruthy();
      expect(view.getAllByText("$1.20").length).toBeGreaterThan(0);
      expect(view.queryByText("Test bounties — no cash value")).toBeNull();
    });
  });

  test("recovers a submitted cashout from the rewards summary after a lost POST response", async () => {
    fakeApi.rewards.getSummary.mockImplementationOnce(async () => ({
      chain_id: 84532,
      balance_cents: 20,
      today_earned_cents: 30,
      recent_events: [],
      recent_qualifications: [],
      pending_verification: {
        count: 0,
        conditional_cents: 0,
        earliest_expires_at: null,
        provider_requirements: [],
      },
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "verified" as const,
        verification_provider: "self" as const,
      },
      latest_in_flight_cashout: {
        id: "rpe_recovered",
        chain_id: 84532,
        amount_cents: 100,
        recipient_address: "0x8000000000000000000000000000000000000008",
        status: "submitted" as const,
        settlement_stage: "signed" as const,
        settlement_ref: "0xrecovering",
        failure_reason: null,
      },
    }));

    render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(fakeApi.rewards.getCashout).toHaveBeenCalledWith("rpe_recovered");
      expect(fakeApi.rewards.getSummary.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(window.localStorage.getItem("pirate_rewards_cashout_attempt")).toBeNull();
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
      expect(view.getByText("Claim $1.20")).toBeTruthy();
    });
    fireEvent.click(view.getByText("Claim $1.20"));

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
      expect(view.getByText("$1.20 is in your wallet 🎉")).toBeTruthy();
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
          settlement_stage: "confirmed" as const,
          settlement_ref: "0xrewardtx",
          failure_reason: null,
        },
        balance_cents: 0,
      }));
    const view = render(<CurrentUserWalletPage />);
    await waitFor(() => expect(view.getByText("Claim $1.20")).toBeTruthy());

    fireEvent.click(view.getByText("Claim $1.20"));
    await waitFor(() => expect(view.getByText("Transfer failed")).toBeTruthy());
    fireEvent.click(view.getByText("Close"));

    fireEvent.click(view.getByText("Claim $1.20"));
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
        settlement_stage: "failed" as const,
        settlement_ref: null,
        failure_reason: "Transfer replaced before confirmation.",
      },
      balance_cents: 120,
    }));
    const view = render(<CurrentUserWalletPage />);
    await waitFor(() => expect(view.getByText("Claim $1.20")).toBeTruthy());

    fireEvent.click(view.getByText("Claim $1.20"));

    await waitFor(() => {
      expect(view.getByText("Transfer failed")).toBeTruthy();
      expect(view.getByText("Transfer replaced before confirmation.")).toBeTruthy();
    });
    expect(view.queryByText("Pending")).toBeNull();
  });

  test("offers only required providers and shows the amount each unlocks", async () => {
    fakeApi.rewards.getSummary = mock(async () => ({
      chain_id: 84532,
      balance_cents: 0,
      today_earned_cents: 0,
      recent_events: [],
      recent_qualifications: [],
      pending_verification: {
        count: 2,
        conditional_cents: 100,
        earliest_expires_at: 1_774_521_600,
        provider_requirements: [
          { provider: "self" as const, count: 1, conditional_cents: 40, earliest_expires_at: 1_774_521_600 },
          { provider: "zkpassport" as const, count: 1, conditional_cents: 60, earliest_expires_at: 1_774_521_600 },
        ],
      },
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "unverified",
        verification_provider: "self",
      },
      latest_in_flight_cashout: null,
    }));
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(view.getByText("$1.00")).toBeTruthy();
      expect(view.getByText("Claim")).toBeTruthy();
    });
    expect(view.queryByText("Verify with Self to earn and transfer.")).toBeNull();
    fireEvent.click(view.getByText("Claim"));

    expect(view.getByText("Verify identity")).toBeTruthy();
    expect(view.getByText("Self")).toBeTruthy();
    expect(view.getByText("ZKPassport")).toBeTruthy();
    expect(view.queryByText("Very")).toBeNull();
    expect(view.getByText("Unlocks $0.40")).toBeTruthy();
    expect(view.getByText("Unlocks $0.60")).toBeTruthy();
  });

  test("launches a pending Very bounty directly and settles verification only once", async () => {
    const pendingSummary = {
      chain_id: 84532,
      balance_cents: 0,
      today_earned_cents: 0,
      recent_events: [],
      recent_qualifications: [],
      pending_verification: {
        count: 1,
        conditional_cents: 100,
        earliest_expires_at: 1_774_521_600,
        provider_requirements: [{
          provider: "very" as const,
          count: 1,
          conditional_cents: 100,
          earliest_expires_at: 1_774_521_600,
        }],
      },
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "unverified" as const,
        verification_provider: null,
      },
      latest_in_flight_cashout: null,
    };
    const creditedSummary = {
      ...pendingSummary,
      balance_cents: 100,
      pending_verification: {
        count: 0,
        conditional_cents: 0,
        earliest_expires_at: null,
        provider_requirements: [],
      },
      cashout: {
        ...pendingSummary.cashout,
        eligible: true,
        verification_state: "verified" as const,
        verification_provider: "very" as const,
      },
    };
    let summaryRequest = 0;
    let resolveCreditRefresh: ((summary: typeof creditedSummary) => void) | undefined;
    fakeApi.rewards.getSummary = mock(() => {
      summaryRequest += 1;
      if (summaryRequest === 1) return Promise.resolve(pendingSummary);
      if (summaryRequest === 2) {
        return new Promise<typeof creditedSummary>((resolve) => {
          resolveCreditRefresh = resolve;
        });
      }
      return Promise.resolve(creditedSummary);
    });
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => expect(view.getByText("Claim")).toBeTruthy());
    fireEvent.click(view.getByText("Claim"));

    await waitFor(() => expect(fakeStartVeryVerification).toHaveBeenCalledTimes(1));
    expect(veryStartedWithoutPirateModal).toBe(true);
    expect(view.queryByText("Verify identity")).toBeNull();
    expect(view.queryByText("Self")).toBeNull();
    expect(view.queryByText("ZKPassport")).toBeNull();
    expect(view.queryByText(/Self app/u)).toBeNull();

    await act(async () => {
      await fakeVeryOnVerified?.();
      await fakeVeryOnVerified?.();
    });

    await waitFor(() => {
      expect(view.getByTestId("rewards-supporting-label").getAttribute("data-label"))
        .toBe("Getting your $1.00 bounty ready.");
      expect(resolveCreditRefresh).toBeDefined();
    });
    expect(fakeToastSuccess).toHaveBeenCalledTimes(1);
    expect(fakeToastSuccess).toHaveBeenCalledWith("Identity verified.");
    expect(fakeToastInfo).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreditRefresh?.(creditedSummary);
    });

    await waitFor(() => expect(view.getByText("Claim $1.00")).toBeTruthy());
    expect(fakeApi.rewards.cashOut).not.toHaveBeenCalled();
    expect(fakeToastSuccess).toHaveBeenCalledTimes(1);
    expect(fakeToastInfo).not.toHaveBeenCalled();
  });

  test("keeps Claim as the re-verification entry point for a credited balance", async () => {
    fakeApi.rewards.getSummary = mock(async () => ({
      chain_id: 8453,
      balance_cents: 100,
      today_earned_cents: 100,
      recent_events: [],
      recent_qualifications: [],
      pending_verification: {
        count: 0,
        conditional_cents: 0,
        earliest_expires_at: null,
        provider_requirements: [],
      },
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "unverified",
        verification_provider: "self",
      },
      latest_in_flight_cashout: null,
    }));
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => expect(view.getByText("$1.00")).toBeTruthy());
    expect(view.queryByText("Verify to transfer your bounty.")).toBeNull();
    fireEvent.click(view.getByText("Claim"));

    expect(view.getByText("Verify identity")).toBeTruthy();
    expect(view.getByText("Self")).toBeTruthy();
    expect(view.getByText("Very")).toBeTruthy();
    expect(view.getByText("ZKPassport")).toBeTruthy();
  });

  test("explains how a verified user can reach the claim minimum", async () => {
    fakeApi.rewards.getSummary = mock(async () => ({
      chain_id: 84532,
      balance_cents: 0,
      today_earned_cents: 0,
      recent_events: [],
      recent_qualifications: [],
      pending_verification: {
        count: 0,
        conditional_cents: 0,
        earliest_expires_at: null,
        provider_requirements: [],
      },
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_state: "verified",
        verification_provider: "self",
      },
      latest_in_flight_cashout: null,
    }));
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => expect(view.getByText("$0.00")).toBeTruthy());
    expect(view.queryByText("Earn $1.00 more to claim.")).toBeNull();
    expect(view.getByText("Claim").closest("button")?.disabled).toBe(true);
  });

  test("does not request or render rewards when the flag is disabled", async () => {
    import.meta.env.VITE_REWARDS_ENABLED = "false";
    const view = render(<CurrentUserWalletPage />);

    await waitFor(() => {
      expect(fakeApi.royalties.listClaimable).toHaveBeenCalled();
    });
    expect(fakeApi.rewards.getSummary).not.toHaveBeenCalled();
    expect(view.queryByText("Bounties")).toBeNull();
  });
});
