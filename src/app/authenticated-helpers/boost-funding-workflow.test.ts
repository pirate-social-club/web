import { describe, expect, test } from "bun:test";

import {
  INITIAL_BOOST_FUNDING_WORKFLOW_STATE,
  reduceBoostFundingWorkflow,
} from "./boost-funding-workflow";

describe("boost funding workflow", () => {
  test("moves from quote preparation through finality and activation", () => {
    const preparing = reduceBoostFundingWorkflow(INITIAL_BOOST_FUNDING_WORKFLOW_STATE, {
      type: "operation-started",
    });
    expect(preparing).toEqual({
      status: "compose",
      busy: true,
      terminalCode: null,
      transactionHash: null,
    });

    const quoted = reduceBoostFundingWorkflow(preparing, {
      type: "quote-ready",
      transactionHash: null,
    });
    const submitted = reduceBoostFundingWorkflow(quoted, {
      type: "transaction-submitted",
      transactionHash: "0xabc",
    });
    const awaiting = reduceBoostFundingWorkflow(submitted, { type: "awaiting-finality" });
    const active = reduceBoostFundingWorkflow(awaiting, {
      type: "activated",
      transactionHash: "0xabc",
    });

    expect(quoted.status).toBe("quote");
    expect(submitted).toMatchObject({ status: "confirming", busy: true, transactionHash: "0xabc" });
    expect(awaiting).toMatchObject({ status: "awaiting-finality", busy: false, transactionHash: "0xabc" });
    expect(active).toMatchObject({ status: "active", busy: false, transactionHash: "0xabc" });
  });

  test("terminal review carries the evidence needed to prevent another send", () => {
    const review = reduceBoostFundingWorkflow(INITIAL_BOOST_FUNDING_WORKFLOW_STATE, {
      type: "review-required",
      code: "funding_operator_incident",
      message: "Funding needs support review.",
      supportReference: "rfq_test / req_test",
      transactionHash: "0xabc",
    });

    expect(review).toEqual({
      status: "funding-review",
      busy: false,
      errorMessage: "Funding needs support review.",
      supportReference: "rfq_test / req_test",
      terminalCode: "funding_operator_incident",
      transactionHash: "0xabc",
    });
  });

  test("changing owner atomically clears transaction and terminal state", () => {
    const review = reduceBoostFundingWorkflow(INITIAL_BOOST_FUNDING_WORKFLOW_STATE, {
      type: "review-required",
      code: "funding_failed",
      message: "Start again.",
      transactionHash: "0xabc",
    });

    expect(reduceBoostFundingWorkflow(review, { type: "owner-changed" })).toEqual(
      INITIAL_BOOST_FUNDING_WORKFLOW_STATE,
    );
  });
});
