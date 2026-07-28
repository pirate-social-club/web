import { describe, expect, test } from "bun:test";

import trace from "./fixtures/release-trace-2026-07-28.json";
import { AttemptLedger, ingestRun } from "./ingestion.mjs";
import { SCENARIOS, simulate } from "./simulator.mjs";

// The fixture is captured verbatim from the Actions API and is never edited.
// Every expectation lives here, derived from that data — so a test cannot pass
// by having the desired conclusion written into the fixture.

const GATE_POLICY = [
  { id: "release_inputs", version: 1, jobName: "Verify release inputs" },
  { id: "schema_fleet", version: 1, jobName: "Community schema gate (staging fleet)" },
  { id: "staging_freshness", version: 1, jobName: "Check staging freshness" },
  { id: "staging_deploy", version: 1, jobName: "Deploy staging" },
];

// Only push runs on main are promotion attempts; PR runs legitimately skip the
// deploy lanes and must never be read as failed promotions.
const pushRuns = trace.runs
  .filter((run) => run.event === "push" && run.head_branch === "main")
  .sort((a, b) => Date.parse(a.run_started_at) - Date.parse(b.run_started_at));

function candidateId(run: { head_sha: string }): string {
  return `shc_${run.head_sha.slice(0, 12)}`;
}

// Ancestry derived from the real push order on main: a later push to a linear
// branch is a descendant of an earlier one. Not a hand-authored conclusion.
const pushOrder = new Map(pushRuns.map((run, index) => [run.head_sha, index]));
const isDescendant = (a: string, b: string) =>
  (pushOrder.get(a) ?? -1) > (pushOrder.get(b) ?? -1);

describe("2026-07-28 starvation trace", () => {
  test("the fixture contains the recorded starvation shape", () => {
    // Properties of the captured data, asserted so the fixture cannot drift
    // underneath the conclusions drawn from it.
    expect(trace.runs.length).toBeGreaterThanOrEqual(9);
    expect(pushRuns.length).toBeGreaterThanOrEqual(6);
    const prodConclusions = pushRuns.map(
      (run) => run.jobs.find((job) => job.name === "Deploy production")?.conclusion,
    );
    // Every push run reported success at the workflow level...
    expect(pushRuns.every((run) => run.conclusion === "success")).toBe(true);
    // ...while all but the last skipped production.
    expect(prodConclusions.filter((conclusion) => conclusion === "skipped").length).toBeGreaterThanOrEqual(5);
    expect(prodConclusions.at(-1)).toBe("success");
  });

  test("PR runs are excluded rather than read as failed promotions", () => {
    const prRuns = trace.runs.filter((run) => run.event !== "push");
    expect(prRuns.length).toBeGreaterThan(0);
    for (const run of prRuns) {
      expect(pushRuns.some((push) => push.id === run.id)).toBe(false);
    }
  });

  test("ingestion yields validated candidates from the observed gates", () => {
    const ledger = new AttemptLedger();
    for (const run of pushRuns) {
      ingestRun({ run, gatePolicy: GATE_POLICY, ledger, candidateId: candidateId(run) });
    }
    const satisfied = pushRuns.filter((run) =>
      GATE_POLICY.every((gate) =>
        ledger.isSatisfied({ candidateId: candidateId(run), gateId: gate.id, gateVersion: gate.version }),
      ),
    );
    // Derived, not assumed: the runs whose modelled gates all passed.
    expect(satisfied.length).toBeGreaterThan(0);
    // No gate should show flakiness in this trace; every run was uniformly green
    // at the gate level, which is exactly why the skips were invisible.
    for (const run of pushRuns) {
      for (const gate of GATE_POLICY) {
        expect(
          ledger.flakinessTransitions({ candidateId: candidateId(run), gateId: gate.id, gateVersion: gate.version }),
        ).toBe(0);
      }
    }
  });

  // The claim S0 is permitted to make: admission, not advancement.
  test.each(SCENARIOS)("scenario %s: a validated candidate is admitted despite continuing arrivals", (scenario) => {
    const ledger = new AttemptLedger();
    const candidates = new Map();
    const events: Array<{ at: number; seq: number; type: string; candidateId: string }> = [];

    pushRuns.forEach((run, index) => {
      const id = candidateId(run);
      ingestRun({ run, gatePolicy: GATE_POLICY, ledger, candidateId: id });
      const allSatisfied = GATE_POLICY.every((gate) =>
        ledger.isSatisfied({ candidateId: id, gateId: gate.id, gateVersion: gate.version }),
      );
      const mintedAt = Date.parse(run.run_started_at);
      candidates.set(id, { id, sha: run.head_sha, mintedAt, observedDurationMs: null });
      if (allSatisfied) {
        // Eligible when its last modelled gate completed — a timestamp from the
        // data, not an assumed instant.
        const completions = GATE_POLICY
          .map((gate) => run.jobs.find((job) => job.name === gate.jobName)?.completed_at)
          .filter(Boolean)
          .map((value) => Date.parse(value as string));
        events.push({ at: Math.max(...completions), seq: index, type: "eligible", candidateId: id });
      }
    });

    const observedDurations = pushRuns
      .map((run) => Date.parse(run.updated_at) - Date.parse(run.run_started_at))
      .filter((value) => Number.isFinite(value) && value > 0);

    const result = simulate({
      events,
      candidates,
      initialDeployedSha: "4b385f99", // what production actually served at the window's start
      isDescendant,
      scenario,
      observedDurations,
    });

    // S0's permitted claim: the promoter ADMITTED a validated candidate during a
    // window in which the real pipeline promoted nothing.
    expect(result.admittedCount).toBeGreaterThan(0);

    // Every admitted candidate had all modelled gates satisfied — no unsafe choice.
    for (const admission of result.admissions.filter((entry) => entry.decision === "admitted")) {
      for (const gate of GATE_POLICY) {
        expect(
          ledger.isSatisfied({ candidateId: admission.candidateId, gateId: gate.id, gateVersion: gate.version }),
        ).toBe(true);
      }
    }

    // Deployment success is NOT claimed: every completion rests on a recorded
    // assumption, because these promotions never ran.
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.assumptions.every((entry) => typeof entry.assumption === "string")).toBe(true);
  });

  test("the simulation is deterministic for a given scenario", () => {
    const build = () => {
      const ledger = new AttemptLedger();
      const candidates = new Map();
      const events: Array<{ at: number; seq: number; type: string; candidateId: string }> = [];
      pushRuns.forEach((run, index) => {
        const id = candidateId(run);
        ingestRun({ run, gatePolicy: GATE_POLICY, ledger, candidateId: id });
        candidates.set(id, { id, sha: run.head_sha, mintedAt: Date.parse(run.run_started_at), observedDurationMs: null });
        events.push({ at: Date.parse(run.updated_at), seq: index, type: "eligible", candidateId: id });
      });
      return simulate({
        events,
        candidates,
        initialDeployedSha: "4b385f99",
        isDescendant,
        scenario: "p95",
        observedDurations: [60_000, 120_000, 300_000],
      });
    };
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });

  test("ancestry is enforced against the hypothetical deployed sha", () => {
    // A candidate that is not a descendant of what the SIMULATION has deployed
    // is never admitted, even though production actually served something else.
    const candidates = new Map([
      ["shc_old", { id: "shc_old", sha: pushRuns[0].head_sha, mintedAt: 1, observedDurationMs: null }],
    ]);
    const result = simulate({
      events: [{ at: 10, seq: 0, type: "eligible", candidateId: "shc_old" }],
      candidates,
      initialDeployedSha: pushRuns[pushRuns.length - 1].head_sha, // already ahead
      isDescendant,
      scenario: "p50",
      observedDurations: [60_000],
    });
    expect(result.admittedCount).toBe(0);
  });
});
