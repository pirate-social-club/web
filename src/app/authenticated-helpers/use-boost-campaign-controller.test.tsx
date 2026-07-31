import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiError } from "@/lib/api/client";

installDomGlobals();

const calls = { campaignRead: 0, confirm: 0, create: 0, quote: 0, transfer: 0 };
const createKeys: string[] = [];
const quoteKeys: string[] = [];
let connectedWallets: Array<{ address: string }> = [];
let reconnectEthereumWallet: (() => void) | null = null;
let reconnectCalls = 0;
let campaignStatus = "draft";
let confirmStatus = "confirmed";
let confirmError: unknown = null;
let createError: unknown = null;
let getCampaignError: unknown = null;
let quoteError: unknown = null;
let transferError: unknown = null;
let transferFailAfterSubmit = false;
let postEligible = true;
let firstQuoteExpired = false;
let policyError: unknown = null;
let policyBlocked = false;

const campaign = () => ({
  id: "rcp_test",
  object: "reward_campaign",
  rewarder: "usr_test",
  community: "com_test",
  post: "pst_test",
  song_artifact_bundle: "sab_test",
  song_owner: "usr_owner",
  status: campaignStatus,
  eligible_activity: "karaoke",
  min_score_bps: 7000,
  daily_reward_cents: 100,
  milestone_7_cents: 0,
  milestone_30_cents: 0,
  reward_period_cap_cents: 100,
  budget_cents: 1000,
  funded_cents: ["active", "exhausted"].includes(campaignStatus) ? 1000 : 0,
  reserved_cents: 0,
  credited_cents: 0,
  paid_cents: 0,
  refunded_cents: 0,
  remaining_cents: 1000,
  funding_tx_hash: ["active", "exhausted"].includes(campaignStatus)
    ? "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    : null,
  starts_at: 1,
  ends_at: 2,
  created: 1,
});

const quote = () => ({
  id: `rfq_${calls.quote}`,
  object: "reward_campaign_funding_quote",
  campaign: "rcp_test",
  funder: "usr_test",
  chain_id: 84532,
  token_address: "0x1111111111111111111111111111111111111111",
  amount_cents: 1000,
  amount_atomic: "10000000",
  sender_address: "0x2222222222222222222222222222222222222222",
  treasury_address: "0x3333333333333333333333333333333333333333",
  status: "quoted",
  expires_at: Math.floor(Date.now() / 1000) + (firstQuoteExpired && calls.quote === 1 ? -1 : 900),
  created: 1,
});

const fakeApi = {
  rewards: {
    getCampaignCapabilities: async (_postId: string) => ({
      enabled: true,
      post_eligible: postEligible,
      min_budget_cents: 100,
      max_budget_cents: 10_000,
      max_reward_cents: 500,
      min_duration_seconds: 3600,
      max_duration_seconds: 2_592_000,
      default_duration_seconds: 604_800,
      eligible_activities: ["study", "karaoke", "either"],
      chain_id: 84532,
      token_address: "0x1111111111111111111111111111111111111111",
    }),
    getSongOwnerPolicy: async () => {
      if (policyError) throw policyError;
      return { third_party_rewards: policyBlocked ? "blocked" : "allowed" };
    },
    updateSongOwnerPolicy: async (_community: string, _post: string, input: { third_party_rewards: string }) => ({
      third_party_rewards: input.third_party_rewards,
    }),
    createCampaign: async (body: { idempotency_key: string }) => {
      calls.create += 1;
      createKeys.push(body.idempotency_key);
      if (createError) throw createError;
      return campaign();
    },
    getCampaign: async () => {
      calls.campaignRead += 1;
      if (getCampaignError) throw getCampaignError;
      return campaign();
    },
    createFundingQuote: async (_campaignId: string, body: { idempotency_key: string }) => {
      calls.quote += 1;
      quoteKeys.push(body.idempotency_key);
      if (quoteError) throw quoteError;
      return quote();
    },
    confirmFundingQuote: async () => {
      calls.confirm += 1;
      if (confirmError) throw confirmError;
      if (confirmStatus === "confirmed") campaignStatus = "active";
      return { ...quote(), status: confirmStatus };
    },
  },
};

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({ reconnectEthereumWallet }),
  usePiratePrivyWallets: () => ({ connectedWallets, walletsReady: true }),
}));
mock.module("@/lib/commerce/routed-checkout", () => ({
  findConnectedFundingWallet: ({ connectedWallets: wallets, primaryWalletAddress }: {
    connectedWallets: Array<{ address: string }>;
    primaryWalletAddress?: string;
  }) => wallets.find((wallet) => wallet.address.toLowerCase() === primaryWalletAddress?.toLowerCase()) ?? null,
  resolveRewardFundingTransferInput: () => ({ amountAtomic: 10000000n }),
  executeUsdcTransfer: async ({ onSubmitted }: { onSubmitted?: (hash: string) => void }) => {
    calls.transfer += 1;
    if (transferError) {
      if (transferFailAfterSubmit) {
        onSubmitted?.("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      }
      throw transferError;
    }
    onSubmitted?.("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  },
}));

const {
  boostFundingErrorMessage,
  classifyBoostFundingError,
  useBoostCampaignController,
  useBoostMenuEligibility,
} = await import("./use-boost-campaign-controller");

test("turns wallet chain mismatch internals into actionable funding copy", () => {
  const error = new Error(
    "The current chain of the wallet (id: 8453) does not match the target chain for the transaction (id: 84532 – Base Sepolia). Contract Call: transfer(...)",
  );

  expect(boostFundingErrorMessage(error, "Could not submit reward funding.", { networkLabel: "Base Sepolia" })).toBe(
    "Switch your wallet to Base Sepolia, then try again. No payment was sent.",
  );
  expect(boostFundingErrorMessage(error, "Could not submit reward funding.")).toBe(
    "Switch your wallet to the required network, then try again. No payment was sent.",
  );
});

test("distinguishes gas-fee failures from USDC balance failures", () => {
  const gasError = new Error(
    "The total cost (gas * gasFee + value) of executing this transaction exceeds the balance of the account.",
  );
  expect(classifyBoostFundingError(gasError)).toBe("insufficient-gas");
  expect(boostFundingErrorMessage(gasError, "fallback")).toBe(
    "Your wallet does not have enough ETH for network fees. No payment was sent.",
  );
  expect(classifyBoostFundingError(new Error("insufficient funds for gas * price + value"))).toBe("insufficient-gas");

  expect(classifyBoostFundingError(new Error("transfer amount exceeds balance"))).toBe("insufficient-usdc");
  expect(boostFundingErrorMessage(new Error("transfer amount exceeds balance"), "fallback")).toBe(
    "Your wallet does not have enough USDC to fund this boost. No payment was sent.",
  );
});

test("classifies wallet and transport failures into actionable funding copy", () => {
  expect(classifyBoostFundingError(new Error("User rejected the request."))).toBe("user-rejected");
  expect(boostFundingErrorMessage(new Error("User rejected the request."), "fallback")).toBe(
    "You canceled the payment in your wallet. No payment was sent.",
  );

  expect(classifyBoostFundingError(new Error("wallet is not connected"))).toBe("wallet-unavailable");
  expect(boostFundingErrorMessage(new Error("wallet is not connected"), "fallback")).toBe(
    "Your wallet is not connected. Reconnect your Pirate Wallet, then try again. No payment was sent.",
  );

  expect(classifyBoostFundingError(new Error("HTTP request failed."))).toBe("rpc-failure");
  expect(boostFundingErrorMessage(new Error("HTTP request failed."), "fallback")).toBe(
    "The network did not respond. No payment was sent; try again.",
  );
  expect(boostFundingErrorMessage(new Error("HTTP request failed."), "fallback", { submitted: true })).toBe(
    "The network did not respond after your transfer was sent. Check status; do not send again.",
  );
});

test("hides unknown wallet internals behind the fallback instead of leaking them", () => {
  const verbose = new Error(
    "Contract Call: transfer(address,uint256) args: (0xabc, 10000000) Docs: https://viem.sh/docs/contract/writeContract",
  );
  expect(boostFundingErrorMessage(verbose, "Could not submit reward funding.")).toBe(
    "Could not submit reward funding.",
  );
  expect(classifyBoostFundingError(verbose)).toBe("unknown");

  // Server-vetted API error copy may still pass through.
  expect(
    boostFundingErrorMessage(new ApiError("conflict", "This song already has a live boost.", 409), "fallback"),
  ).toContain("already has a live boost");
});

function input() {
  return {
    activeCampaignId: null,
    authenticated: true,
    communityId: "com_test",
    postId: "pst_test",
    requestAuth: () => undefined,
    song: true,
    viewerIsAuthor: false,
  };
}

beforeEach(() => {
  calls.confirm = 0;
  calls.campaignRead = 0;
  calls.create = 0;
  calls.quote = 0;
  calls.transfer = 0;
  createKeys.length = 0;
  quoteKeys.length = 0;
  campaignStatus = "draft";
  confirmStatus = "confirmed";
  confirmError = null;
  createError = null;
  getCampaignError = null;
  quoteError = null;
  transferError = null;
  transferFailAfterSubmit = false;
  postEligible = true;
  firstQuoteExpired = false;
  policyError = null;
  policyBlocked = false;
  connectedWallets = [];
  reconnectEthereumWallet = null;
  reconnectCalls = 0;
  localStorage.clear();
});

describe("useBoostCampaignController", () => {
  test("hides Boost when the running campaign allowlist excludes the post", async () => {
    postEligible = false;
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(false));
    expect(view.result.current.canManagePolicy).toBe(false);
  });

  test("keeps Boost available when the advisory song-owner policy fetch fails", async () => {
    policyError = new ApiError("internal_error", "policy backend down", 500);
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    expect(view.result.current.sheetProps.eligibleActivities).toEqual(["study", "karaoke", "either"]);
    // The failed read fails open: policy state degrades to the allowed default.
    await waitFor(() => expect(view.result.current.policySheetProps.allowThirdPartyRewards).toBe(true));
    act(() => view.result.current.openBoost());
    expect(view.result.current.sheetProps.open).toBe(true);
    expect(view.result.current.sheetProps.state).toBe("compose");
  });

  test("restores the allowed default when a policy fetch fails after a blocked read", async () => {
    policyBlocked = true;
    const view = renderHook(
      (props: ReturnType<typeof input>) => useBoostCampaignController(props),
      { initialProps: input() },
    );
    await waitFor(() => expect(view.result.current.policySheetProps.allowThirdPartyRewards).toBe(false));

    policyBlocked = false;
    policyError = new ApiError("internal_error", "policy backend down", 500);
    view.rerender({ ...input(), postId: "pst_test_2" });
    // A stale blocked state must not survive a failed re-read: policyAllowed is
    // sticky and also gates the funding confirm CTA via thirdPartyBlocked.
    await waitFor(() => expect(view.result.current.policySheetProps.allowThirdPartyRewards).toBe(true));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
  });

  test("creates once and re-quotes the existing draft campaign", async () => {
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => {
      view.result.current.sheetProps.onConfirm?.();
      view.result.current.sheetProps.onConfirm?.();
    });
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(calls.create).toBe(1);
    expect(calls.quote).toBe(1);

    await act(async () => view.result.current.sheetProps.onRetry?.());
    await waitFor(() => expect(calls.quote).toBe(2));
    expect(calls.create).toBe(1);
  });

  test("silently replaces an expired pre-transfer quote", async () => {
    firstQuoteExpired = true;
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());

    await waitFor(() => expect(calls.quote).toBe(2));
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(calls.create).toBe(1);
    expect(view.result.current.sheetProps.retryLabel).toBe("Start again");
  });

  test("blocks a quote when its pinned sender wallet is not connected", async () => {
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => {
      view.result.current.sheetProps.onConfirm?.();
      view.result.current.sheetProps.onConfirm?.();
    });
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(view.result.current.sheetProps.walletMismatch).toBe(true);
  });

  test("exposes wallet recovery when the pinned wallet is missing entirely", async () => {
    reconnectEthereumWallet = () => { reconnectCalls += 1; };
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));

    expect(view.result.current.sheetProps.walletMismatch).toBe(true);
    expect(view.result.current.sheetProps.walletMismatchReason).toBe("no-wallet");
    expect(view.result.current.sheetProps.dailyRewardDisplayLabel).toBe("$1.00");
    act(() => view.result.current.sheetProps.onConnectWallet?.());
    expect(reconnectCalls).toBe(1);
  });

  test("distinguishes a different connected wallet from a missing wallet", async () => {
    connectedWallets = [{ address: "0x9999999999999999999999999999999999999999" }];
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));

    expect(view.result.current.sheetProps.walletMismatch).toBe(true);
    expect(view.result.current.sheetProps.walletMismatchReason).toBe("different-wallet");
  });

  test("treats a pre-submission transport failure as safe to start again", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    transferError = new Error("HTTP request failed.");
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("failed"));

    expect(view.result.current.sheetProps.errorMessage).toBe(
      "The network did not respond. No payment was sent; try again.",
    );
    expect(view.result.current.sheetProps.retryLabel).toBe("Start again");
  });

  test("keeps a post-submission transport failure awaiting finality and never re-sends", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    transferError = new Error("HTTP request failed.");
    transferFailAfterSubmit = true;
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));

    expect(view.result.current.sheetProps.errorMessage).toBeUndefined();
    expect(calls.transfer).toBe(1);
    act(() => view.result.current.sheetProps.onRefresh?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(calls.transfer).toBe(1);
  });

  test("keeps Boost discoverable while explaining that an active campaign blocks another", async () => {
    const view = renderHook(() => useBoostCampaignController({ ...input(), activeCampaignId: "rcp_active" }));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    expect(view.result.current.sheetProps.planProblem).toContain("already has a live boost");
    view.result.current.sheetProps.onConfirm?.();
    expect(calls.create).toBe(0);
  });

  test("sends from the pinned wallet, confirms the hash, and reaches active", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => {
      view.result.current.sheetProps.onConfirm?.();
      view.result.current.sheetProps.onConfirm?.();
    });
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => {
      view.result.current.sheetProps.onConfirm?.();
      view.result.current.sheetProps.onConfirm?.();
    });
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(calls.transfer).toBe(1);
    expect(calls.confirm).toBe(1);
    act(() => view.result.current.sheetProps.onOpenChange?.(false));
    act(() => view.result.current.openBoost());
    expect(view.result.current.sheetProps.state).toBe("active");
    expect(calls.transfer).toBe(1);
  });

  test("keeps an ambiguous confirmation awaiting finality without sending twice", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmError = new Error("confirmation timed out");
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));
    expect(calls.transfer).toBe(1);

    confirmError = null;
    act(() => view.result.current.sheetProps.onRefresh?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(calls.transfer).toBe(1);
    expect(calls.confirm).toBe(2);
  });

  test("checks a submitted receipt again instead of only polling an unchanged campaign", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmError = new Error("confirmation timed out");
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));

    confirmError = null;
    act(() => view.result.current.sheetProps.onRefresh?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(calls.transfer).toBe(1);
    expect(calls.confirm).toBe(2);
  });

  test("recovers a submitted transfer after reload and only retries confirmation", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmError = new Error("confirmation timed out");
    const firstView = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(firstView.result.current.canBoost).toBe(true));
    act(() => firstView.result.current.openBoost());
    act(() => firstView.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(firstView.result.current.sheetProps.state).toBe("quote"));
    act(() => firstView.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(firstView.result.current.sheetProps.state).toBe("awaiting-finality"));
    firstView.unmount();

    confirmError = null;
    const restoredView = renderHook(() => useBoostCampaignController(input()));
    // Recovery confirms the persisted hash immediately; no sheet interaction.
    await waitFor(() => expect(restoredView.result.current.sheetProps.state).toBe("active"));
    expect(calls.transfer).toBe(1);
    expect(calls.confirm).toBe(2);
  });

  test("reuses persisted create and quote idempotency keys after lost responses", async () => {
    createError = new Error("response lost");
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("failed"));
    createError = null;
    quoteError = new Error("quote response lost");
    act(() => view.result.current.sheetProps.onRetry?.());
    await waitFor(() => expect(calls.quote).toBe(1));
    expect(createKeys[1]).toBe(createKeys[0]);

    quoteError = null;
    act(() => view.result.current.sheetProps.onRetry?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(quoteKeys[1]).toBe(quoteKeys[0]);
  });

  test("terminal funding errors stop confirmation retry and survive reload as support review", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmError = new ApiError("funding_quote_expired", "mined too late", 409);
    const firstView = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(firstView.result.current.canBoost).toBe(true));
    act(() => firstView.result.current.openBoost());
    act(() => firstView.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(firstView.result.current.sheetProps.state).toBe("quote"));
    act(() => firstView.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(firstView.result.current.sheetProps.state).toBe("funding-review"));
    expect(firstView.result.current.sheetProps.onRetry).toBeDefined();
    expect(firstView.result.current.sheetProps.supportReference).toStartWith("rfq_");
    expect(localStorage.getItem("pirate_reward_pending_funding:com_test:pst_test")).toBeNull();
    expect(calls.confirm).toBe(1);
    firstView.unmount();

    const restoredView = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(restoredView.result.current.sheetProps.state).toBe("funding-review"));
    act(() => restoredView.result.current.openBoost());
    expect(restoredView.result.current.sheetProps.state).toBe("funding-review");
    expect(calls.confirm).toBe(2);
  });

  test("refund-pending confirmation becomes terminal support review without activation polling", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmStatus = "refund_pending";
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("funding-review"));

    expect(view.result.current.sheetProps.errorMessage).toContain("refund is pending");
    expect(view.result.current.sheetProps.supportReference).toStartWith("rfq_");
    expect(localStorage.getItem("pirate_reward_pending_funding:com_test:pst_test")).toBeNull();
    expect(calls.confirm).toBe(1);
  });

  test("a safe-block wait remains neutral after one confirmation request", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmStatus = "confirming";
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));

    expect(calls.confirm).toBe(1);
    expect(calls.transfer).toBe(1);
    expect(view.result.current.sheetProps.errorMessage).toBeUndefined();
  });

  test("automatically rechecks recovered finality after the submitted-funding sheet closes", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmStatus = "confirming";
    let activated = 0;
    const view = renderHook(() => useBoostCampaignController({
      ...input(),
      onCampaignActivated: () => { activated += 1; },
    }));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    let poll: (() => void) | undefined;
    const originalSetInterval = window.setInterval;
    window.setInterval = ((callback: TimerHandler, delay?: number) => {
      if (delay === 10_000) {
        poll = callback as () => void;
        return 1;
      }
      return originalSetInterval(callback, delay);
    }) as typeof window.setInterval;
    try {
      act(() => view.result.current.sheetProps.onConfirm?.());
      await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));
      expect(poll).toBeDefined();
      act(() => view.result.current.sheetProps.onOpenChange?.(false));
      confirmStatus = "confirmed";
      await act(async () => poll?.());
      await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    } finally {
      window.setInterval = originalSetInterval;
    }

    expect(calls.transfer).toBe(1);
    expect(calls.confirm).toBe(2);
    expect(activated).toBe(1);
  });

  test("a transient exhausted read remains pending instead of becoming a failure", async () => {
    campaignStatus = "exhausted";
    localStorage.setItem("pirate_reward_campaign:com_test:pst_test", "rcp_test");
    const view = renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.sheetProps.onRefresh?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("awaiting-finality"));
    expect(view.result.current.sheetProps.errorMessage).toBeUndefined();
  });

  test("a verified failed hash becomes review and starts over with a fresh quote", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmStatus = "failed";
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("funding-review"));

    expect(view.result.current.sheetProps.canRestartFunding).toBe(true);
    expect(view.result.current.sheetProps.errorMessage).toContain("failed on-chain");
    expect(calls.confirm).toBe(1);
    expect(calls.transfer).toBe(1);

    act(() => view.result.current.sheetProps.onRetry?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(calls.quote).toBe(2);
    expect(calls.confirm).toBe(1);
    expect(calls.transfer).toBe(1);
  });

  test("an operator incident is terminal and never offers confirmation retry", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmStatus = "operator_incident";
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("funding-review"));

    expect(view.result.current.sheetProps.canRestartFunding).toBe(false);
    expect(view.result.current.sheetProps.errorMessage).toContain("support review");
    expect(calls.confirm).toBe(1);
  });

  test("rehydrates the funding transaction from the server campaign resource", async () => {
    campaignStatus = "active";
    localStorage.setItem("pirate_reward_campaign:com_test:pst_test", "rcp_test");
    const view = renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(view.result.current.sheetProps.explorerTxUrl).toContain(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  test("server activation clears a stale terminal browser record", async () => {
    campaignStatus = "active";
    localStorage.setItem("pirate_reward_terminal_funding:com_test:pst_test", JSON.stringify({
      campaignId: "rcp_test",
      code: "funding_failed",
      fundingId: "rfq_stale",
      message: "stale",
      quoteId: "rfq_stale",
      transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }));
    const view = renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("active"));
    expect(localStorage.getItem("pirate_reward_terminal_funding:com_test:pst_test")).toBeNull();
    expect(calls.confirm).toBe(0);
  });

  test("a transient campaign hydration failure preserves every recovery record", async () => {
    const pendingKey = "pirate_reward_pending_funding:com_test:pst_test";
    const campaignKey = "pirate_reward_campaign:com_test:pst_test";
    const terminalKey = "pirate_reward_terminal_funding:com_test:pst_test";
    localStorage.setItem(campaignKey, "rcp_test");
    localStorage.setItem(pendingKey, JSON.stringify({
      campaignId: "rcp_test",
      quote: quote(),
      transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }));
    const terminalState = JSON.stringify({
      campaignId: "rcp_test",
      code: "funding_operator_incident",
      fundingId: "rfq_test",
      message: "support review",
      quoteId: "rfq_test",
      transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    localStorage.setItem(terminalKey, terminalState);
    getCampaignError = new ApiError("provider_unavailable", "offline", 503);

    renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(calls.campaignRead).toBe(1));
    expect(localStorage.getItem(campaignKey)).toBe("rcp_test");
    expect(localStorage.getItem(pendingKey)).not.toBeNull();
    expect(localStorage.getItem(terminalKey)).toBe(terminalState);
  });

  test("a missing stored campaign clears stale recovery records", async () => {
    const pendingKey = "pirate_reward_pending_funding:com_test:pst_test";
    const campaignKey = "pirate_reward_campaign:com_test:pst_test";
    const terminalKey = "pirate_reward_terminal_funding:com_test:pst_test";
    localStorage.setItem(campaignKey, "rcp_missing");
    localStorage.setItem(pendingKey, "pending-state");
    localStorage.setItem(terminalKey, "terminal-state");
    getCampaignError = new ApiError("not_found", "missing", 404);

    renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(localStorage.getItem(campaignKey)).toBeNull());
    expect(localStorage.getItem(pendingKey)).toBeNull();
    expect(localStorage.getItem(terminalKey)).toBeNull();
  });

  test("an ended campaign does not prevent funding a new campaign", async () => {
    campaignStatus = "ended";
    localStorage.setItem("pirate_reward_campaign:com_test:pst_test", "rcp_ended");
    const view = renderHook(() => useBoostCampaignController(input()));

    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());

    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    expect(calls.create).toBe(1);
    expect(calls.quote).toBe(1);
  });
});

describe("useBoostMenuEligibility", () => {
  test("exposes only capability-eligible song post ids", async () => {
    const view = renderHook(() => useBoostMenuEligibility({
      authenticated: true,
      postIds: ["post_one", "post_two"],
    }));

    await waitFor(() => expect([...view.result.current]).toEqual(["post_one", "post_two"]));
  });

  test("does not load or expose menu eligibility while signed out", () => {
    const view = renderHook(() => useBoostMenuEligibility({
      authenticated: false,
      postIds: ["post_one"],
    }));

    expect([...view.result.current]).toEqual([]);
  });
});
