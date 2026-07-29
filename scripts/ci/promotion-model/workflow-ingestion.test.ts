import { describe, expect, test } from "bun:test";
import { REQUIRED_GATES } from "./gate-policy.mjs";
import {
  buildShadowCandidate,
  ingestCompletedRelease,
  type ObservedWorkflowRun,
} from "./workflow-ingestion";

const RUN: ObservedWorkflowRun = {
  id: 123,
  run_attempt: 2,
  event: "push",
  head_branch: "main",
  head_sha: "a".repeat(40),
  conclusion: "failure",
  updated_at: "2026-07-29T12:00:00Z",
};

function memoryStore() {
  const candidates: unknown[] = [];
  const attempts: unknown[] = [];
  const observations: unknown[] = [];
  return {
    candidates,
    attempts,
    observations,
    async mintCandidate(input: unknown) {
      candidates.push(input);
    },
    async recordTerminalAttempt(input: unknown) {
      attempts.push(input);
      return { kind: "recorded" as const, attemptNo: attempts.length };
    },
    async recordObservation(input: unknown) {
      observations.push(input);
      return "recorded" as const;
    },
  };
}

describe("promotion shadow workflow ingestion", () => {
  test("derives deterministic candidate identity from the versioned manifest", () => {
    const first = buildShadowCandidate({ run: RUN, apiSha: "api", coreSha: "core" });
    const replay = buildShadowCandidate({ run: { ...RUN }, apiSha: "api", coreSha: "core" });
    const changedPin = buildShadowCandidate({ run: RUN, apiSha: "api-2", coreSha: "core" });
    expect(first).toEqual(replay);
    expect(first.candidateId).toMatch(/^shc_[0-9a-f]{64}$/);
    expect(changedPin.candidateId).not.toBe(first.candidateId);
    expect(first.manifest).not.toHaveProperty("rc_id");
    expect(first.manifest).not.toHaveProperty("artifact_digest");
  });

  test("records pass, fail, inconclusive, and skipped/absent without fabricating attempts", async () => {
    const store = memoryStore();
    const jobs = [
      {
        id: 1,
        name: REQUIRED_GATES[0].jobName,
        status: "completed",
        conclusion: "success",
        started_at: "2026-07-29T11:55:00Z",
        completed_at: "2026-07-29T11:56:00Z",
      },
      {
        id: 2,
        name: REQUIRED_GATES[1].jobName,
        status: "completed",
        conclusion: "failure",
        started_at: "2026-07-29T11:56:00Z",
        completed_at: "2026-07-29T11:57:00Z",
      },
      {
        id: 3,
        name: `${REQUIRED_GATES[2].jobName} / Required staging API contracts`,
        status: "completed",
        conclusion: "timed_out",
        started_at: "2026-07-29T11:57:00Z",
        completed_at: "2026-07-29T11:58:00Z",
      },
      {
        id: 4,
        name: REQUIRED_GATES[3].jobName,
        status: "completed",
        conclusion: "skipped",
        started_at: "2026-07-29T11:59:00Z",
        completed_at: "2026-07-29T11:59:00Z",
      },
    ];
    const report = await ingestCompletedRelease({
      run: RUN,
      jobs,
      apiSha: "api",
      coreSha: "core",
      store,
    });
    expect(report).toMatchObject({ attempts: 3, observations: 1, duplicates: 0 });
    expect(store.attempts.map((entry: any) => entry.result)).toEqual([
      "pass",
      "fail",
      "inconclusive",
    ]);
    expect(store.observations.map((entry: any) => entry.observation)).toEqual(["skipped"]);
    expect(store.attempts.every((entry: any) => entry.sourceRunAttempt === 2)).toBe(true);
  });

  test("records a policy gate absent from the API as an observation", async () => {
    const store = memoryStore();
    const report = await ingestCompletedRelease({
      run: RUN,
      jobs: [],
      apiSha: "api",
      coreSha: "core",
      store,
    });
    expect(report).toMatchObject({ attempts: 0, observations: REQUIRED_GATES.length });
    expect(store.observations.every((entry: any) => entry.observation === "absent")).toBe(true);
  });

  test("refuses pull-request and non-main workflow runs in application code", async () => {
    for (const run of [
      { ...RUN, event: "pull_request" },
      { ...RUN, head_branch: "feature/not-main" },
    ]) {
      await expect(ingestCompletedRelease({
        run,
        jobs: [],
        apiSha: "api",
        coreSha: "core",
        store: memoryStore(),
      })).rejects.toThrow("refusing non-main push release");
    }
  });
});
