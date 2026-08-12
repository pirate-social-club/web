import { describe, expect, test } from "bun:test";

import {
  initialRewardsCashoutWorkflowState,
  reduceRewardsCashoutWorkflow,
} from "./wallet-rewards-cashout-workflow";

const attempt = { amountCents: 500, idempotencyKey: "wallet-rewards:test" };

describe("wallet rewards cashout workflow", () => {
  test("models submission, settlement, and confirmation", () => {
    const submitting = reduceRewardsCashoutWorkflow(initialRewardsCashoutWorkflowState(null), {
      type: "submission-started",
      amountLabel: "$5.00",
      attempt,
    });
    const broadcast = reduceRewardsCashoutWorkflow(submitting, {
      type: "result-received",
      sheetState: "broadcast",
      amountLabel: "$5.00",
      transactionHash: "0xabc",
      attempt: { ...attempt, cashoutId: "cashout_test" },
    });
    const confirmed = reduceRewardsCashoutWorkflow(broadcast, {
      type: "result-received",
      sheetState: "confirmed",
      amountLabel: "$5.00",
      transactionHash: "0xabc",
      attempt: null,
    });

    expect(submitting).toMatchObject({ sheetState: "reserved", pending: true, attempt });
    expect(broadcast).toMatchObject({ sheetState: "broadcast", pending: false, transactionHash: "0xabc" });
    expect(confirmed).toMatchObject({ sheetState: "confirmed", pending: false, attempt: null });
  });

  test("keeps an ambiguous submission recoverable and blocks a second interpretation", () => {
    const submitting = reduceRewardsCashoutWorkflow(initialRewardsCashoutWorkflowState(null), {
      type: "submission-started",
      amountLabel: "$5.00",
      attempt,
    });
    const review = reduceRewardsCashoutWorkflow(submitting, {
      type: "submission-ambiguous",
      message: "Transfer status is unclear. Do not claim again.",
    });

    expect(review).toMatchObject({
      sheetState: "needs_review",
      pending: false,
      attempt,
      errorMessage: "Transfer status is unclear. Do not claim again.",
    });
  });

  test("terminal failure clears the persisted attempt from workflow state", () => {
    const failed = reduceRewardsCashoutWorkflow(initialRewardsCashoutWorkflowState(attempt), {
      type: "result-received",
      sheetState: "failed",
      amountLabel: "$5.00",
      transactionHash: "0xabc",
      errorMessage: "Transfer failed.",
      attempt: null,
    });

    expect(failed).toEqual({
      sheetState: "failed",
      pending: false,
      amountLabel: "$5.00",
      transactionHash: "0xabc",
      errorMessage: "Transfer failed.",
      attempt: null,
    });
  });
});
