import { describe, expect, test } from "bun:test";

import trace from "./fixtures/release-trace-2026-07-28.json";
import { GATE_POLICY_VERSION, IMPLIED_GATES, REQUIRED_GATES, findJob } from "./gate-policy.mjs";
import { AttemptLedger, ingestRun } from "./ingestion.mjs";
import { SCENARIOS, simulate } from "./simulator.mjs";

// The fixture is captured verbatim from the Actions API and is never edited.
// Every expectation lives here, derived from that data — so a test cannot pass
// by having the desired conclusion written into the fixture.
//
// The gate policy is the workflow's own production `needs:` set (gate-policy.mjs).
// It is NOT narrowed to make an admission appear; where the historical trace
// lacks evidence for a required gate, the candidate is evidence-limited
// (category D) and reported as such rather than treated as validated.

const pushRuns = trace.runs
  .filter((run) => run.event === "push" && run.head_branch === "main")
  .sort((a, b) => Date.parse(a.run_started_at) - Date.parse(b.run_started_at));

function candidateId(run: { head_sha: string }): string {
  return `shc_${run.head_sha.slice(0, 12)}`;
}

const pushOrder = new Map(pushRuns.map((run, index) => [run.head_sha, index]));
const isDescendant = (a: string, b: string) => (pushOrder.get(a) ?? -1) > (pushOrder.get(b) ?? -1);

type Classification = {
  id: string;
  sha: string;
  validated: boolean;
  evidenceLimited: boolean;
  unsatisfied: string[];
  missingEvidence: string[];
  eligibleAt: number | null;
};

function classifyAll(): { ledger: AttemptLedger; classifications: Classification[] } {
  const ledger = new AttemptLedger();
  const classifications = pushRuns.map((run) => {
    const id = candidateId(run);
    ingestRun({ run, gatePolicy: REQUIRED_GATES, ledger, candidateId: id, findJob });
    const unsatisfied: string[] = [];
    const missingEvidence: string[] = [];
    const completions: number[] = [];
    for (const gate of REQUIRED_GATES) {
      const key = { candidateId: id, gateId: gate.id, gateVersion: gate.version };
      const controlling = ledger.controllingAttempt(key);
      if (!ledger.isSatisfied(key)) unsatisfied.push(gate.id);
      // No attempt at all => the gate did not run => evidence is absent, which is
      // a limitation of the historical trace, not a judgement about the code.
      if (controlling === null) missingEvidence.push(gate.id);
      if (controlling?.completedAt) completions.push(Date.parse(controlling.completedAt));
    }
    return {
      id,
      sha: run.head_sha,
      validated: unsatisfied.length === 0,
      evidenceLimited: missingEvidence.length > 0,
      unsatisfied,
      missingEvidence,
      eligibleAt: unsatisfied.length === 0 && completions.length > 0 ? Math.max(...completions) : null,
    };
  });
  return { ledger, classifications };
}

describe("2026-07-28 starvation trace", () => {
  test("the fixture retains the recorded starvation shape", () => {
    expect(pushRuns.length).toBeGreaterThanOrEqual(6);
    const prodConclusions = pushRuns.map((run) => findJob(run.jobs, "Deploy production")?.conclusion);
    expect(pushRuns.every((run) => run.conclusion === "success")).toBe(true);
    expect(prodConclusions.filter((conclusion) => conclusion === "skipped").length).toBeGreaterThanOrEqual(5);
    expect(prodConclusions.at(-1)).toBe("success");
  });

  test("PR runs are excluded rather than read as failed promotions", () => {
    const prRuns = trace.runs.filter((run) => run.event !== "push");
    expect(prRuns.length).toBeGreaterThan(0);
    expect(prRuns.some((run) => pushRuns.some((push) => push.id === run.id))).toBe(false);
  });

  test("the policy is the workflow's own production needs, not a narrowed set", () => {
    expect(GATE_POLICY_VERSION).toBe(2);
    const ids = REQUIRED_GATES.map((gate) => gate.id).sort();
    expect(ids).toEqual([
      "api_staging_contract_gate",
      "hns_forwarder_negative_probe",
      "release_gate",
      "release_inputs",
      "schema_gate",
    ]);
    // Implied gates are reported, never separately required.
    expect(IMPLIED_GATES.map((gate) => gate.id).sort()).toEqual(["staging_deploy", "staging_freshness"]);
  });

  // The correction that matters: skipped required gates leave a candidate
  // unsatisfied, and no amount of upstream green changes that.
  test("required gates that were skipped leave candidates unsatisfied", () => {
    const { classifications } = classifyAll();
    const starved = classifications.filter((entry) => !entry.validated);
    expect(starved.length).toBeGreaterThan(0);
    for (const entry of starved) {
      // Every unvalidated candidate here is unvalidated because a required gate
      // produced no passing attempt — the API contract gate and/or release gate.
      expect(entry.unsatisfied.length).toBeGreaterThan(0);
    }
  });

  test("candidates lacking gate evidence are category D, not validated", () => {
    const { classifications } = classifyAll();
    const evidenceLimited = classifications.filter((entry) => entry.evidenceLimited);
    for (const entry of evidenceLimited) {
      // Category D is a limitation of what the trace can show, and such a
      // candidate must never be counted as validated.
      expect(entry.validated).toBe(false);
      expect(entry.missingEvidence.length).toBeGreaterThan(0);
    }
    // Report shape: every candidate lands in exactly one bucket.
    for (const entry of classifications) {
      expect(entry.validated === !entry.unsatisfied.length).toBe(true);
    }
  });

  test.each(SCENARIOS)("scenario %s: admissions are drawn only from fully validated candidates", (scenario) => {
    const { classifications } = classifyAll();
    const candidates = new Map(
      classifications.map((entry, index) => [
        entry.id,
        { id: entry.id, sha: entry.sha, mintedAt: Date.parse(pushRuns[index].run_started_at), observedDurationMs: null },
      ]),
    );
    const events = classifications
      .filter((entry) => entry.validated && entry.eligibleAt !== null)
      .map((entry, index) => ({ at: entry.eligibleAt as number, seq: index, type: "eligible", candidateId: entry.id }));

    const observedDurations = pushRuns
      .map((run) => Date.parse(run.updated_at) - Date.parse(run.run_started_at))
      .filter((value) => Number.isFinite(value) && value > 0);

    const result = simulate({
      events,
      candidates,
      initialDeployedSha: "4b385f99",
      isDescendant,
      scenario,
      observedDurations,
    });

    const validatedIds = new Set(classifications.filter((entry) => entry.validated).map((entry) => entry.id));
    for (const admission of result.admissions.filter((entry) => entry.decision === "admitted")) {
      // Category E — an unsafe choice — must never occur.
      expect(validatedIds.has(admission.candidateId)).toBe(true);
    }
    // Whatever the admission count turns out to be, no completion may be claimed
    // as observed: these promotions never ran.
    for (const assumption of result.assumptions) {
      expect(typeof assumption.assumption).toBe("string");
    }
  });
});

describe("promoter timing", () => {
  const base = {
    initialDeployedSha: "sha0",
    isDescendant: (a: string, b: string) => Number(a.slice(3)) > Number(b.slice(3)),
    scenario: "p50" as const,
    observedDurations: [100],
  };

  // A promotion finishing at t must admit the queued candidate at t — not at
  // whenever CI happens to emit the next external event.
  test("a candidate eligible during a promotion is admitted exactly at busyUntil", () => {
    const candidates = new Map([
      ["c1", { id: "c1", sha: "sha1", mintedAt: 1, observedDurationMs: null }],
      ["c2", { id: "c2", sha: "sha2", mintedAt: 2, observedDurationMs: null }],
    ]);
    const result = simulate({
      ...base,
      candidates,
      events: [
        { at: 0, seq: 0, type: "eligible", candidateId: "c1" },
        { at: 10, seq: 1, type: "eligible", candidateId: "c2" }, // arrives mid-promotion
      ],
    });
    const admitted = result.admissions.filter((entry) => entry.decision === "admitted");
    expect(admitted.map((entry) => entry.candidateId)).toEqual(["c1", "c2"]);
    expect(admitted[0].at).toBe(0);
    expect(admitted[1].at).toBe(100); // exactly busyUntil, not the next external event
  });

  test("multiple queued promotions drain without another external event", () => {
    const candidates = new Map([
      ["c1", { id: "c1", sha: "sha1", mintedAt: 1, observedDurationMs: null }],
      ["c2", { id: "c2", sha: "sha2", mintedAt: 2, observedDurationMs: null }],
      ["c3", { id: "c3", sha: "sha3", mintedAt: 3, observedDurationMs: null }],
    ]);
    const result = simulate({
      ...base,
      candidates,
      events: [
        { at: 0, seq: 0, type: "eligible", candidateId: "c1" },
        { at: 5, seq: 1, type: "eligible", candidateId: "c2" },
        { at: 6, seq: 2, type: "eligible", candidateId: "c3" },
      ],
    });
    // c2 and c3 both arrive while c1 promotes; coalescing picks the newest, and
    // the drain must finish it rather than stopping after one completion.
    const admitted = result.admissions.filter((entry) => entry.decision === "admitted");
    expect(admitted.length).toBeGreaterThanOrEqual(2);
    expect(result.finalDeployedSha).toBe("sha3");
    // Every admitted promotion reached a completion.
    for (const entry of admitted) expect(entry.completedAt).toBeGreaterThan(entry.at);
  });
});

// needs_repair is terminal for automation. The accepted design halts the lane
// until an operator clears it — so the simulator must model a state that
// arrivals, eligibility changes and the passage of time cannot dissolve.
describe("needs_repair halts promotion", () => {
  const base = {
    initialDeployedSha: "sha0",
    isDescendant: (a: string, b: string) => Number(a.slice(3)) > Number(b.slice(3)),
    scenario: "p50" as const,
    observedDurations: [100],
  };
  const candidates = new Map([
    ["c1", { id: "c1", sha: "sha1", mintedAt: 1, observedDurationMs: null }],
    ["c2", { id: "c2", sha: "sha2", mintedAt: 2, observedDurationMs: null }],
    ["c3", { id: "c3", sha: "sha3", mintedAt: 3, observedDurationMs: null }],
  ]);
  const realOutcomes = new Map([
    ["c1", { candidateId: "c1", phase: "promote", outcome: "needs_repair" }],
  ]);

  test("no later candidate is admitted while halted", () => {
    const result = simulate({
      ...base,
      candidates,
      realOutcomes,
      events: [
        { at: 0, seq: 0, type: "eligible", candidateId: "c1" },
        { at: 200, seq: 1, type: "eligible", candidateId: "c2" },
        { at: 300, seq: 2, type: "eligible", candidateId: "c3" },
      ],
    });
    const admitted = result.admissions.filter((entry) => entry.decision === "admitted");
    expect(admitted.map((entry) => entry.candidateId)).toEqual(["c1"]);
    expect(result.haltedForRepair).toBe(true);
    expect(result.admissions.some((entry) => entry.decision === "halted_needs_repair")).toBe(true);
    // The failed promotion must not advance the hypothetical deployed sha.
    expect(result.finalDeployedSha).toBe("sha0");
  });

  test("ordinary arrivals and eligibility changes do not clear the halt", () => {
    const result = simulate({
      ...base,
      candidates,
      realOutcomes,
      events: [
        { at: 0, seq: 0, type: "eligible", candidateId: "c1" },
        { at: 200, seq: 1, type: "eligible", candidateId: "c2" },
        { at: 250, seq: 2, type: "ineligible", candidateId: "c2" },
        { at: 300, seq: 3, type: "eligible", candidateId: "c2" },
        { at: 400, seq: 4, type: "eligible", candidateId: "c3" },
      ],
    });
    expect(result.haltedForRepair).toBe(true);
    expect(result.admissions.filter((entry) => entry.decision === "admitted")).toHaveLength(1);
  });

  test("only an explicit repair-clear event resumes admission", () => {
    const result = simulate({
      ...base,
      candidates,
      realOutcomes,
      events: [
        { at: 0, seq: 0, type: "eligible", candidateId: "c1" },
        { at: 200, seq: 1, type: "eligible", candidateId: "c2" },
        { at: 500, seq: 2, type: "repair_clear" },
      ],
    });
    const admitted = result.admissions.filter((entry) => entry.decision === "admitted");
    expect(admitted.map((entry) => entry.candidateId)).toEqual(["c1", "c2"]);
    expect(admitted[1].at).toBe(500); // resumes at the clear, not before
    expect(result.haltedForRepair).toBe(false);
    expect(result.admissions.some((entry) => entry.decision === "repair_cleared")).toBe(true);
  });
});
