import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

export type TelegramVerifyLaunchProvider = "self" | "very" | "zkpassport";
export type DeferredTelegramVerifyLaunchProvider = Exclude<TelegramVerifyLaunchProvider, "very">;

export type PendingTelegramVerificationLaunch = {
  href: string;
  provider: DeferredTelegramVerifyLaunchProvider;
};

export type TelegramVerifyDoneResult = "already_member" | "joined" | "pending_request";

export type TelegramVerifyScreenState =
  | { kind: "idle" }
  | { kind: "booting" }
  | { kind: "preparing"; provider: TelegramVerifyLaunchProvider }
  | { href: string; kind: "ready"; message: string; provider: DeferredTelegramVerifyLaunchProvider }
  | { href: string; kind: "external_started"; provider: DeferredTelegramVerifyLaunchProvider }
  | { kind: "checking" }
  | { kind: "joining" }
  | { kind: "done"; result: TelegramVerifyDoneResult }
  | { canRetry: boolean; kind: "blocked"; message: string }
  | { canRetry: boolean; kind: "error"; message: string };

export type TelegramVerifyFlowState = {
  eligibility: ApiJoinEligibility | null;
  exchangeCommunityId: string | null;
  joinedInThisFlow: boolean;
  launchedVerification: boolean;
  startedInThisBrowser: boolean;
  screen: TelegramVerifyScreenState;
};

export type TelegramVerifyFlowAction =
  | { type: "bootStarted"; startedInThisBrowser: boolean }
  | { communityId: string; eligibility: ApiJoinEligibility; type: "exchangeResolved" }
  | { eligibility: ApiJoinEligibility; type: "eligibilityUpdated" }
  | { provider: TelegramVerifyLaunchProvider; type: "preparing" }
  | { href: string; message: string; provider: DeferredTelegramVerifyLaunchProvider; type: "ready" }
  | { type: "externalOpened" }
  | { type: "checking" }
  | { type: "joining" }
  | { result: TelegramVerifyDoneResult; type: "done" }
  | { canRetry: boolean; message: string; type: "blocked" }
  | { canRetry: boolean; message: string; type: "error" }
  | { type: "retry" };

export function initialTelegramVerifyFlowState(): TelegramVerifyFlowState {
  return {
    eligibility: null,
    exchangeCommunityId: null,
    joinedInThisFlow: false,
    launchedVerification: false,
    startedInThisBrowser: false,
    screen: { kind: "idle" },
  };
}

export function isDelayedTelegramVerifyScreen(screen: TelegramVerifyScreenState): boolean {
  return telegramVerifyScreenCommitDelayMs(screen) !== null;
}

export function telegramVerifyScreenCommitDelayMs(screen: TelegramVerifyScreenState): number | null {
  switch (screen.kind) {
    case "booting":
      return 300;
    case "preparing":
      return 700;
    case "external_started":
      return 1200;
    default:
      return null;
  }
}

export function telegramVerifyReducer(
  state: TelegramVerifyFlowState,
  action: TelegramVerifyFlowAction,
): TelegramVerifyFlowState {
  switch (action.type) {
    case "bootStarted":
      return {
        ...state,
        eligibility: null,
        exchangeCommunityId: null,
        joinedInThisFlow: false,
        launchedVerification: false,
        startedInThisBrowser: action.startedInThisBrowser,
        screen: { kind: "booting" },
      };
    case "exchangeResolved":
      return {
        ...state,
        eligibility: action.eligibility,
        exchangeCommunityId: action.communityId,
      };
    case "eligibilityUpdated":
      return {
        ...state,
        eligibility: action.eligibility,
      };
    case "preparing":
      return {
        ...state,
        launchedVerification: true,
        startedInThisBrowser: true,
        screen: { kind: "preparing", provider: action.provider },
      };
    case "ready":
      return {
        ...state,
        launchedVerification: true,
        startedInThisBrowser: true,
        screen: {
          href: action.href,
          kind: "ready",
          message: action.message,
          provider: action.provider,
        },
      };
    case "externalOpened":
      if (state.screen.kind !== "ready") {
        return state;
      }
      return {
        ...state,
        launchedVerification: true,
        startedInThisBrowser: true,
        screen: {
          href: state.screen.href,
          kind: "external_started",
          provider: state.screen.provider,
        },
      };
    case "checking":
      return {
        ...state,
        screen: { kind: "checking" },
      };
    case "joining":
      return {
        ...state,
        screen: { kind: "joining" },
      };
    case "done":
      return {
        ...state,
        joinedInThisFlow: action.result === "joined" || state.joinedInThisFlow,
        launchedVerification: false,
        startedInThisBrowser: false,
        screen: { kind: "done", result: action.result },
      };
    case "blocked":
      return {
        ...state,
        launchedVerification: false,
        startedInThisBrowser: false,
        screen: {
          canRetry: action.canRetry,
          kind: "blocked",
          message: action.message,
        },
      };
    case "error":
      return {
        ...state,
        launchedVerification: false,
        startedInThisBrowser: false,
        screen: {
          canRetry: action.canRetry,
          kind: "error",
          message: action.message,
        },
      };
    case "retry":
      return {
        ...state,
        launchedVerification: false,
        startedInThisBrowser: false,
        screen: { kind: "booting" },
      };
  }
}
