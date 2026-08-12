import type { CashoutSheetState } from "@/components/compositions/rewards/reward-surfaces";

const REWARDS_CASHOUT_ATTEMPT_KEY = "pirate_rewards_cashout_attempt";

export interface RewardsCashoutAttempt {
  amountCents: number;
  cashoutId?: string;
  idempotencyKey: string;
}

interface ActiveRewardsCashoutState {
  sheetState: Exclude<CashoutSheetState, "confirmed" | "failed">;
  pending: boolean;
  amountLabel: string;
  transactionHash: string | null;
  errorMessage: string | null;
  attempt: RewardsCashoutAttempt | null;
}

interface ConfirmedRewardsCashoutState {
  sheetState: "confirmed";
  pending: false;
  amountLabel: string;
  transactionHash: string | null;
  errorMessage: null;
  attempt: null;
}

interface FailedRewardsCashoutState {
  sheetState: "failed";
  pending: false;
  amountLabel: string;
  transactionHash: string | null;
  errorMessage: string;
  attempt: null;
}

export type RewardsCashoutWorkflowState =
  | ActiveRewardsCashoutState
  | ConfirmedRewardsCashoutState
  | FailedRewardsCashoutState;

export type RewardsCashoutWorkflowEvent =
  | { type: "submission-started"; amountLabel: string; attempt: RewardsCashoutAttempt }
  | {
    type: "result-received";
    sheetState: CashoutSheetState;
    amountLabel: string;
    transactionHash: string | null;
    errorMessage?: string;
    attempt: RewardsCashoutAttempt | null;
  }
  | { type: "submission-ambiguous"; message: string }
  | { type: "operation-finished" }
  | { type: "clear-message" }
  | { type: "poll-message"; message: string };

export function loadRewardsCashoutAttempt(): RewardsCashoutAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REWARDS_CASHOUT_ATTEMPT_KEY) ?? "null") as Partial<RewardsCashoutAttempt> | null;
    if (!parsed || !Number.isSafeInteger(parsed.amountCents) || Number(parsed.amountCents) <= 0 || typeof parsed.idempotencyKey !== "string") return null;
    return {
      amountCents: Number(parsed.amountCents),
      cashoutId: typeof parsed.cashoutId === "string" ? parsed.cashoutId : undefined,
      idempotencyKey: parsed.idempotencyKey,
    };
  } catch {
    return null;
  }
}

export function storeRewardsCashoutAttempt(attempt: RewardsCashoutAttempt | null): void {
  if (typeof window === "undefined") return;
  if (attempt) window.localStorage.setItem(REWARDS_CASHOUT_ATTEMPT_KEY, JSON.stringify(attempt));
  else window.localStorage.removeItem(REWARDS_CASHOUT_ATTEMPT_KEY);
}

export function initialRewardsCashoutWorkflowState(
  attempt = loadRewardsCashoutAttempt(),
): RewardsCashoutWorkflowState {
  return {
    sheetState: "reserved",
    pending: false,
    amountLabel: "$0.00",
    transactionHash: null,
    errorMessage: null,
    attempt,
  };
}

export function reduceRewardsCashoutWorkflow(
  state: RewardsCashoutWorkflowState,
  event: RewardsCashoutWorkflowEvent,
): RewardsCashoutWorkflowState {
  switch (event.type) {
    case "submission-started":
      return {
        sheetState: "reserved",
        pending: true,
        amountLabel: event.amountLabel,
        transactionHash: null,
        errorMessage: null,
        attempt: event.attempt,
      };
    case "result-received": {
      const common = {
        amountLabel: event.amountLabel,
        transactionHash: event.transactionHash,
      };
      if (event.sheetState === "confirmed") {
        return { ...common, sheetState: "confirmed", pending: false, errorMessage: null, attempt: null };
      }
      if (event.sheetState === "failed") {
        return {
          ...common,
          sheetState: "failed",
          pending: false,
          errorMessage: event.errorMessage ?? "The bounty transfer failed. Your bounty balance is available to try again.",
          attempt: null,
        };
      }
      return {
        ...common,
        sheetState: event.sheetState,
        pending: false,
        errorMessage: event.errorMessage ?? null,
        attempt: event.attempt,
      };
    }
    case "submission-ambiguous":
      return { ...state, sheetState: "needs_review", pending: false, errorMessage: event.message };
    case "operation-finished":
      return state.pending ? { ...state, pending: false } : state;
    case "clear-message":
      return state.sheetState === "failed" || state.errorMessage === null
        ? state
        : { ...state, errorMessage: null };
    case "poll-message":
      return state.sheetState === "confirmed" || state.sheetState === "failed"
        ? state
        : { ...state, errorMessage: event.message };
  }
}
