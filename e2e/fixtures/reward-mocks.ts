import type { Page, Route } from "@playwright/test";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

type RewardPayoutFixture = {
  id: string;
  amount_cents: number;
  recipient_address: string;
  status: "submitted" | "confirmed" | "failed";
  settlement_stage?: "reserved" | "signed" | "broadcast" | "needs_review" | "confirmed" | "failed";
  settlement_ref: string | null;
  failure_reason: string | null;
};

function payoutResponse(payout: RewardPayoutFixture) {
  const settlementStage = payout.settlement_stage ?? (
    payout.status === "confirmed"
      ? "confirmed"
      : payout.status === "failed"
        ? "failed"
        : payout.settlement_ref
          ? "broadcast"
          : "reserved"
  );
  return { ...payout, settlement_stage: settlementStage };
}

export type RewardMockState = {
  balanceCents: number;
  cashoutKeys: string[];
  failFirstCashoutRequest: boolean;
  latestInFlight: RewardPayoutFixture | null;
  payout: RewardPayoutFixture;
  statusReads: number;
  submittedReadsBeforeTerminal: number;
};

export function createRewardMockState(overrides: Partial<RewardMockState> = {}): RewardMockState {
  return {
    balanceCents: 120,
    cashoutKeys: [],
    failFirstCashoutRequest: false,
    latestInFlight: null,
    payout: {
      id: "rpe_browser_reward",
      amount_cents: 120,
      recipient_address: "0x9000000000000000000000000000000000000009",
      status: "confirmed",
      settlement_ref: "0xbrowserreward",
      failure_reason: null,
    },
    statusReads: 0,
    submittedReadsBeforeTerminal: 0,
    ...overrides,
  };
}

function summary(state: RewardMockState) {
  const inFlight = state.latestInFlight?.status === "submitted"
    ? payoutResponse(state.latestInFlight)
    : null;
  return {
    chain_id: 84532,
    balance_cents: state.balanceCents,
    today_earned_cents: 30,
    recent_events: [],
    cashout: {
      eligible: state.balanceCents >= 100 && !inFlight,
      min_cents: 100,
      verification_state: "verified",
      verification_provider: "self",
    },
    pending_verification: {
      count: 0,
      conditional_cents: 0,
      earliest_expires_at: null,
      provider_requirements: [],
    },
    latest_in_flight_cashout: inFlight,
  };
}

function cashoutResponse(state: RewardMockState) {
  return {
    chain_id: 84532,
    payout: payoutResponse(state.payout),
    balance_cents: state.payout.status === "submitted" ? Math.max(0, state.balanceCents - state.payout.amount_cents) : state.balanceCents,
  };
}

async function fulfillRewardRoute(route: Route, state: RewardMockState): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();

  if (method === "GET" && url.pathname === "/me/rewards") {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(summary(state)), status: 200 });
    return;
  }

  if (method === "POST" && url.pathname === "/me/rewards/cashouts") {
    const body = request.postDataJSON() as { idempotency_key?: string } | null;
    state.cashoutKeys.push(String(body?.idempotency_key ?? ""));
    if (state.failFirstCashoutRequest && state.cashoutKeys.length === 1) {
      await route.abort("connectionfailed");
      return;
    }
    if (state.payout.status === "submitted") state.latestInFlight = state.payout;
    else if (state.payout.status === "confirmed") state.balanceCents = 0;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(cashoutResponse(state)), status: 202 });
    return;
  }

  if (method === "GET" && url.pathname === `/me/rewards/cashouts/${state.payout.id}`) {
    state.statusReads += 1;
    if (state.payout.status === "submitted" && state.statusReads > state.submittedReadsBeforeTerminal) {
      state.payout = {
        ...state.payout,
        status: "confirmed",
        settlement_ref: "0xbrowserrewardconfirmed",
      };
      state.latestInFlight = null;
      state.balanceCents = Math.max(0, state.balanceCents - state.payout.amount_cents);
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(cashoutResponse(state)), status: 200 });
    return;
  }

  await route.fallback();
}

export async function installRewardApiMocks(page: Page, state: RewardMockState): Promise<void> {
  await page.route(pirateApiPattern, (route) => fulfillRewardRoute(route, state));
}
