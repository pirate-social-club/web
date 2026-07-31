import { describe, expect, test } from "bun:test";

import {
  AttemptLedger,
  IllegalTransitionError,
  classifyJob,
  ingestRun,
} from "./ingestion.mjs";

const ID = { candidateId: "shc_a", gateId: "typecheck", gateVersion: 1 };

describe("four-way gate ingestion", () => {
  test("classifies each observed job state distinctly", () => {
    expect(classifyJob({ conclusion: "success" })).toEqual({ kind: "attempt", result: "pass" });
    expect(classifyJob({ conclusion: "failure" })).toEqual({ kind: "attempt", result: "fail" });
    expect(classifyJob({ conclusion: "cancelled" })).toEqual({ kind: "attempt", result: "inconclusive" });
    expect(classifyJob({ conclusion: "timed_out" })).toEqual({ kind: "attempt", result: "inconclusive" });
    expect(classifyJob({ conclusion: "skipped" })).toMatchObject({ kind: "observation", observation: "skipped" });
    expect(classifyJob(null)).toMatchObject({ kind: "observation", observation: "absent" });
  });

  // The shape that motivated the correction: one gate fails, the rest skip.
  // Recording nine failures would make every gate look flaky whenever any failed.
  test("a failure with downstream skips produces ONE attempt and N observations", () => {
    const ledger = new AttemptLedger();
    const gatePolicy = [
      { id: "schema", version: 1, jobName: "Community schema gate (staging fleet)" },
      { id: "staging", version: 1, jobName: "Deploy staging" },
      { id: "contract", version: 1, jobName: "API staging contract gate" },
      { id: "prod", version: 1, jobName: "Deploy production" },
    ];
    const run = {
      id: 1,
      jobs: [
        { name: "Community schema gate (staging fleet)", conclusion: "failure" },
        { name: "Deploy staging", conclusion: "skipped" },
        { name: "API staging contract gate", conclusion: "skipped" },
        { name: "Deploy production", conclusion: "skipped" },
      ],
    };
    const result = ingestRun({ run, gatePolicy, ledger, candidateId: "shc_a" });
    expect(result.attempts).toHaveLength(1);
    expect(result.observations).toHaveLength(3);
    expect(result.attempts[0].result).toBe("fail");
    // And the skipped gates carry no flakiness signal at all.
    for (const gate of ["staging", "contract", "prod"]) {
      expect(ledger.flakinessTransitions({ candidateId: "shc_a", gateId: gate, gateVersion: 1 })).toBe(0);
      expect(ledger.isSatisfied({ candidateId: "shc_a", gateId: gate, gateVersion: 1 })).toBe(false);
    }
  });
});

describe("attempt lifecycle", () => {
  test("inconclusive is terminal, leaves the gate unsatisfied, and permits a retry", () => {
    const ledger = new AttemptLedger();
    const first = ledger.startAttempt(ID);
    ledger.recordTerminal(ID, first, "inconclusive");
    expect(ledger.isSatisfied(ID)).toBe(false);
    // Marker released: a retry can start immediately.
    const second = ledger.startAttempt(ID);
    expect(second).toBe(first + 1);
    ledger.recordTerminal(ID, second, "pass");
    expect(ledger.isSatisfied(ID)).toBe(true);
    // A cancellation says something about the run, not the gate.
    expect(ledger.flakinessTransitions(ID)).toBe(0);
  });

  test("a later failure revokes an earlier pass", () => {
    const ledger = new AttemptLedger();
    ledger.recordTerminal(ID, ledger.startAttempt(ID), "pass");
    expect(ledger.isSatisfied(ID)).toBe(true);
    ledger.recordTerminal(ID, ledger.startAttempt(ID), "fail");
    expect(ledger.isSatisfied(ID)).toBe(false);
    expect(ledger.flakinessTransitions(ID)).toBe(1);
  });

  test("a later pass re-satisfies after a failure", () => {
    const ledger = new AttemptLedger();
    ledger.recordTerminal(ID, ledger.startAttempt(ID), "fail");
    ledger.recordTerminal(ID, ledger.startAttempt(ID), "pass");
    expect(ledger.isSatisfied(ID)).toBe(true);
    expect(ledger.flakinessTransitions(ID)).toBe(1);
  });
});

describe("illegal transitions are rejected, not resolved", () => {
  test("a concurrent attempt is rejected and consumes no sequence number", () => {
    const ledger = new AttemptLedger();
    const first = ledger.startAttempt(ID);
    expect(() => ledger.startAttempt(ID)).toThrow(IllegalTransitionError);
    ledger.recordTerminal(ID, first, "pass");
    // The rejected attempt must not have burned a number.
    expect(ledger.startAttempt(ID)).toBe(first + 1);
    expect(ledger.anomalies.some((entry) => entry.type === "concurrent_attempt")).toBe(true);
  });

  // Concurrent attempts are prohibited, so a late duplicate completion is an
  // illegal transition — NOT an ordering to resolve by highest attempt number.
  test("a late duplicate completion after terminal is rejected", () => {
    const ledger = new AttemptLedger();
    const attempt = ledger.startAttempt(ID);
    ledger.recordTerminal(ID, attempt, "pass");
    expect(() => ledger.recordTerminal(ID, attempt, "fail")).toThrow(IllegalTransitionError);
    // The illegal write did not change eligibility.
    expect(ledger.isSatisfied(ID)).toBe(true);
    expect(ledger.anomalies.some((entry) => entry.type === "late_duplicate_completion")).toBe(true);
  });

  test("a terminal result for the wrong attempt number is rejected", () => {
    const ledger = new AttemptLedger();
    const attempt = ledger.startAttempt(ID);
    expect(() => ledger.recordTerminal(ID, attempt + 5, "pass")).toThrow(IllegalTransitionError);
    expect(ledger.anomalies.some((entry) => entry.type === "attempt_number_mismatch")).toBe(true);
  });

  test("a terminal result after an inconclusive closed the marker is rejected", () => {
    const ledger = new AttemptLedger();
    const attempt = ledger.startAttempt(ID);
    ledger.recordTerminal(ID, attempt, "inconclusive");
    expect(() => ledger.recordTerminal(ID, attempt, "pass")).toThrow(IllegalTransitionError);
  });
});
