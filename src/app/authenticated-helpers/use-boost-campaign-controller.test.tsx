import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiError } from "@/lib/api/client";

installDomGlobals();

const calls = { confirm: 0, create: 0, quote: 0, transfer: 0 };
const createKeys: string[] = [];
const quoteKeys: string[] = [];
let connectedWallets: Array<{ address: string }> = [];
let campaignStatus = "draft";
let confirmStatus = "confirmed";
let confirmError: unknown = null;
let createError: unknown = null;
let quoteError: unknown = null;
let postEligible = true;
let firstQuoteExpired = false;

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
  funded_cents: 0,
  reserved_cents: 0,
  credited_cents: 0,
  paid_cents: 0,
  refunded_cents: 0,
  remaining_cents: 1000,
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
    getSongOwnerPolicy: async () => ({ third_party_rewards: "allowed" }),
    updateSongOwnerPolicy: async (_community: string, _post: string, input: { third_party_rewards: string }) => ({
      third_party_rewards: input.third_party_rewards,
    }),
    createCampaign: async (body: { idempotency_key: string }) => {
      calls.create += 1;
      createKeys.push(body.idempotency_key);
      if (createError) throw createError;
      return campaign();
    },
    getCampaign: async () => campaign(),
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
    onSubmitted?.("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  },
}));

const { useBoostCampaignController } = await import("./use-boost-campaign-controller");

function input() {
  return {
    activePublicOffer: false,
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
  calls.create = 0;
  calls.quote = 0;
  calls.transfer = 0;
  createKeys.length = 0;
  quoteKeys.length = 0;
  campaignStatus = "draft";
  confirmStatus = "confirmed";
  confirmError = null;
  createError = null;
  quoteError = null;
  postEligible = true;
  firstQuoteExpired = false;
  connectedWallets = [];
  localStorage.clear();
});

describe("useBoostCampaignController", () => {
  test("hides Boost when the running campaign allowlist excludes the post", async () => {
    postEligible = false;
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(false));
    expect(view.result.current.canManagePolicy).toBe(false);
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

  test("keeps Boost discoverable while explaining that an active campaign blocks another", async () => {
    const view = renderHook(() => useBoostCampaignController({ ...input(), activePublicOffer: true }));
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
  });

  test("retries confirmation after an ambiguous error without sending twice", async () => {
    connectedWallets = [{ address: "0x2222222222222222222222222222222222222222" }];
    confirmError = new Error("confirmation timed out");
    const view = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(view.result.current.canBoost).toBe(true));
    act(() => view.result.current.openBoost());
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("quote"));
    act(() => view.result.current.sheetProps.onConfirm?.());
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("failed"));
    expect(view.result.current.sheetProps.retryLabel).toBe("Retry confirmation");
    expect(calls.transfer).toBe(1);

    confirmError = null;
    act(() => view.result.current.sheetProps.onRetry?.());
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
    await waitFor(() => expect(view.result.current.sheetProps.state).toBe("failed"));

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
    await waitFor(() => expect(firstView.result.current.sheetProps.state).toBe("failed"));
    firstView.unmount();

    confirmError = null;
    const restoredView = renderHook(() => useBoostCampaignController(input()));
    await waitFor(() => expect(restoredView.result.current.sheetProps.retryLabel).toBe("Retry confirmation"));
    act(() => restoredView.result.current.openBoost());
    act(() => restoredView.result.current.sheetProps.onRetry?.());
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
    expect(calls.confirm).toBe(1);
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
});
