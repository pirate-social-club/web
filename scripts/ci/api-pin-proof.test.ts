import { describe, expect, test } from "bun:test";

import { findSuccessfulApiMainPush } from "./api-pin-proof.mjs";

const successfulSuite = {
  branch: { name: "main" },
  conclusion: "SUCCESS",
  workflowRun: {
    event: "push",
    url: "https://example.test/api-ci/1",
    workflow: { name: "api-ci" },
  },
};

describe("durable API pin proof", () => {
  test("accepts a successful api-ci push on main", () => {
    expect(findSuccessfulApiMainPush([successfulSuite])).toBe(successfulSuite);
  });

  test("rejects merge-group-only proof after the commit lands", () => {
    expect(findSuccessfulApiMainPush([
      {
        ...successfulSuite,
        workflowRun: { ...successfulSuite.workflowRun, event: "merge_group" },
      },
    ])).toBeUndefined();
  });

  test("rejects failed, non-main, and unrelated workflow runs", () => {
    expect(findSuccessfulApiMainPush([
      { ...successfulSuite, conclusion: "FAILURE" },
      { ...successfulSuite, branch: { name: "release/test" } },
      {
        ...successfulSuite,
        workflowRun: {
          ...successfulSuite.workflowRun,
          workflow: { name: "other-workflow" },
        },
      },
    ])).toBeUndefined();
  });
});
