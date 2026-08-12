import type { BoostCampaignSheetProps } from "@/components/compositions/rewards/reward-booster-surfaces";

type NonTerminalFundingStatus = Exclude<
  BoostCampaignSheetProps["state"],
  "failed" | "funding-review"
>;

interface NonTerminalFundingWorkflowState {
  status: NonTerminalFundingStatus;
  busy: boolean;
  errorMessage?: undefined;
  supportReference?: undefined;
  terminalCode: null;
  transactionHash: string | null;
}

interface FailedFundingWorkflowState {
  status: "failed";
  busy: false;
  errorMessage: string;
  supportReference?: undefined;
  terminalCode: null;
  transactionHash: null;
}

interface ReviewFundingWorkflowState {
  status: "funding-review";
  busy: false;
  errorMessage: string;
  supportReference?: string;
  terminalCode: string;
  transactionHash: string;
}

export type BoostFundingWorkflowState =
  | NonTerminalFundingWorkflowState
  | FailedFundingWorkflowState
  | ReviewFundingWorkflowState;

export type BoostFundingWorkflowEvent =
  | { type: "owner-changed" }
  | { type: "show"; status: NonTerminalFundingStatus }
  | { type: "operation-started"; status?: NonTerminalFundingStatus }
  | { type: "confirmation-started" }
  | { type: "operation-finished" }
  | { type: "restart" }
  | { type: "quote-ready"; transactionHash: string | null }
  | { type: "transaction-recorded"; transactionHash: string }
  | { type: "transaction-submitted"; transactionHash: string }
  | { type: "awaiting-finality"; transactionHash?: string }
  | { type: "activated"; transactionHash: string | null }
  | { type: "failed"; message: string }
  | {
    type: "review-required";
    code: string;
    message: string;
    supportReference?: string;
    transactionHash: string;
  }
  | { type: "review-updated"; code: string; message: string };

export const INITIAL_BOOST_FUNDING_WORKFLOW_STATE: BoostFundingWorkflowState = {
  status: "compose",
  busy: false,
  terminalCode: null,
  transactionHash: null,
};

function nonTerminalState(
  status: NonTerminalFundingStatus,
  transactionHash: string | null,
  busy = false,
): NonTerminalFundingWorkflowState {
  return { status, busy, terminalCode: null, transactionHash };
}

export function reduceBoostFundingWorkflow(
  state: BoostFundingWorkflowState,
  event: BoostFundingWorkflowEvent,
): BoostFundingWorkflowState {
  switch (event.type) {
    case "owner-changed":
      return INITIAL_BOOST_FUNDING_WORKFLOW_STATE;
    case "show":
      return nonTerminalState(event.status, state.transactionHash);
    case "operation-started":
      return nonTerminalState(
        event.status ?? (state.status === "failed" || state.status === "funding-review" ? "compose" : state.status),
        state.transactionHash,
        true,
      );
    case "confirmation-started":
      return nonTerminalState(
        state.status === "awaiting-finality" ? "awaiting-finality" : "confirming",
        state.transactionHash,
        true,
      );
    case "operation-finished":
      return state.busy ? { ...state, busy: false } : state;
    case "restart":
      return INITIAL_BOOST_FUNDING_WORKFLOW_STATE;
    case "quote-ready":
      return nonTerminalState("quote", event.transactionHash);
    case "transaction-recorded":
      return state.status === "failed"
        ? state
        : { ...state, transactionHash: event.transactionHash };
    case "transaction-submitted":
      return nonTerminalState("confirming", event.transactionHash, true);
    case "awaiting-finality":
      return nonTerminalState("awaiting-finality", event.transactionHash ?? state.transactionHash);
    case "activated":
      return nonTerminalState("active", event.transactionHash);
    case "failed":
      return {
        status: "failed",
        busy: false,
        errorMessage: event.message,
        terminalCode: null,
        transactionHash: null,
      };
    case "review-required":
      return {
        status: "funding-review",
        busy: false,
        errorMessage: event.message,
        supportReference: event.supportReference,
        terminalCode: event.code,
        transactionHash: event.transactionHash,
      };
    case "review-updated":
      return state.status === "funding-review"
        ? { ...state, errorMessage: event.message, terminalCode: event.code }
        : state;
  }
}
