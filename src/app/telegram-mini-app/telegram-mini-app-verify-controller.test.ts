import { describe, expect, test } from "bun:test";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";

import {
  initialTelegramVerifyFlowState,
  isDelayedTelegramVerifyScreen,
  telegramVerifyReducer,
} from "./telegram-mini-app-verify-controller";

const eligibility = (status: ApiJoinEligibility["status"]): ApiJoinEligibility => ({
  joinable_now: status === "joinable",
  status,
} as ApiJoinEligibility);

describe("telegramVerifyReducer", () => {
  test("boots into a delayed screen while preserving flow-start context", () => {
    const state = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      startedInThisBrowser: true,
      type: "bootStarted",
    });

    expect(state).toMatchObject({
      launchedVerification: false,
      startedInThisBrowser: true,
      screen: { kind: "booting" },
    });
    expect(isDelayedTelegramVerifyScreen(state.screen)).toBe(true);
  });

  test("stores auto-exchange eligibility without forcing an intermediate screen", () => {
    const booted = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      startedInThisBrowser: false,
      type: "bootStarted",
    });
    const exchanged = telegramVerifyReducer(booted, {
      communityId: "com_cmt_test",
      eligibility: eligibility("already_joined"),
      type: "exchangeResolved",
    });

    expect(exchanged.exchangeCommunityId).toBe("com_cmt_test");
    expect(exchanged.eligibility?.status).toBe("already_joined");
    expect(exchanged.screen).toBe(booted.screen);
  });

  test("exchangeResolved preserves the current non-boot screen", () => {
    const ready = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      href: "https://self.xyz/verify",
      message: "Required: United States nationality",
      provider: "self",
      type: "ready",
    });
    const exchanged = telegramVerifyReducer(ready, {
      communityId: "com_cmt_test",
      eligibility: eligibility("verification_required"),
      type: "exchangeResolved",
    });

    expect(exchanged.screen).toBe(ready.screen);
  });

  test("represents ready and external-started launch states structurally", () => {
    const ready = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      href: "https://self.xyz/verify",
      message: "Required: United States nationality",
      provider: "self",
      type: "ready",
    });
    const external = telegramVerifyReducer(ready, { type: "externalOpened" });

    expect(ready.screen).toEqual({
      href: "https://self.xyz/verify",
      kind: "ready",
      message: "Required: United States nationality",
      provider: "self",
    });
    expect(external.screen).toEqual({
      href: "https://self.xyz/verify",
      kind: "external_started",
      provider: "self",
    });
  });

  test("externalOpened is a no-op outside ready screens", () => {
    const joining = telegramVerifyReducer(initialTelegramVerifyFlowState(), { type: "joining" });
    const next = telegramVerifyReducer(joining, { type: "externalOpened" });

    expect(next).toBe(joining);
  });

  test("tracks joined-in-this-flow only for actual join success", () => {
    const pending = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      result: "pending_request",
      type: "done",
    });
    const joined = telegramVerifyReducer(pending, {
      result: "joined",
      type: "done",
    });

    expect(pending.joinedInThisFlow).toBe(false);
    expect(joined.joinedInThisFlow).toBe(true);
  });

  test("retry clears verification flow flags before rerunning the current eligibility", () => {
    const ready = telegramVerifyReducer(initialTelegramVerifyFlowState(), {
      href: "https://self.xyz/verify",
      message: "Required: United States nationality",
      provider: "self",
      type: "ready",
    });
    const retrying = telegramVerifyReducer(ready, { type: "retry" });

    expect(retrying).toMatchObject({
      launchedVerification: false,
      startedInThisBrowser: false,
      screen: { kind: "booting" },
    });
  });
});
