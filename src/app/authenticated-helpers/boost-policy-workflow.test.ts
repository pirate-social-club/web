import { describe, expect, test } from "bun:test";

import {
  INITIAL_BOOST_POLICY_WORKFLOW_STATE,
  reduceBoostPolicyWorkflow,
} from "./boost-policy-workflow";

describe("boost policy workflow", () => {
  test("models success as an explicit updating transition", () => {
    const updating = reduceBoostPolicyWorkflow(
      INITIAL_BOOST_POLICY_WORKFLOW_STATE,
      { type: "update-started" },
    );

    expect(updating).toEqual({ status: "updating" });
    expect(reduceBoostPolicyWorkflow(updating, { type: "update-succeeded" })).toEqual({
      status: "idle",
    });
  });

  test("retains a reviewed failure message until the next attempt", () => {
    const failed = reduceBoostPolicyWorkflow(
      { status: "updating" },
      { type: "update-failed", message: "Could not update bounty settings." },
    );

    expect(failed).toEqual({
      status: "failed",
      message: "Could not update bounty settings.",
    });
    expect(reduceBoostPolicyWorkflow(failed, { type: "update-started" })).toEqual({
      status: "updating",
    });
    expect(reduceBoostPolicyWorkflow(failed, { type: "owner-changed" })).toEqual({
      status: "idle",
    });
  });
});
