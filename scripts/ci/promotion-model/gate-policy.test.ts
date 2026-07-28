import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

import {
  REQUIRED_GATES,
  SCHEDULING_ONLY_JOB_IDS,
  WORKFLOW_JOB_IDS,
  derivedGateIdsFromWorkflow,
  findJob,
} from "./gate-policy.mjs";

// The policy must be DERIVED from the workflow, not restated alongside it.
// A hand-maintained list and a test asserting that same list can drift together
// while staying green — which is exactly how the API contract gate and release
// gate went missing from the first version of this model.
const workflow = parse(readFileSync(".github/workflows/release.yml", "utf8"));

describe("required gate policy is derived from the release workflow", () => {
  test("the workflow still has a production job with declared dependencies", () => {
    expect(workflow?.jobs?.production).toBeTruthy();
    expect(Array.isArray(workflow.jobs.production.needs)).toBe(true);
    expect(workflow.jobs.production.needs.length).toBeGreaterThan(0);
  });

  test("REQUIRED_GATES equals production.needs minus scheduling-only gates", () => {
    const derived = derivedGateIdsFromWorkflow(workflow);
    const declared = REQUIRED_GATES.map((gate) => gate.id).sort();
    expect(derived).toEqual(declared);
  });

  test("every production dependency is either mapped or explicitly scheduling-only", () => {
    const needs: string[] = workflow.jobs.production.needs;
    const mapped = new Set(Object.values(WORKFLOW_JOB_IDS));
    for (const jobId of needs) {
      const accounted = mapped.has(jobId) || SCHEDULING_ONLY_JOB_IDS.includes(jobId);
      // An unaccounted dependency means the workflow grew a gate the model does
      // not know about — the model must fail, not silently ignore it.
      expect({ jobId, accounted }).toEqual({ jobId, accounted: true });
    }
  });

  test("derivation surfaces an unmapped dependency rather than dropping it", () => {
    const derived = derivedGateIdsFromWorkflow({
      jobs: { production: { needs: ["release-gate", "brand-new-gate", "production-freshness"] } },
    });
    expect(derived).toContain("UNMAPPED:brand-new-gate");
  });

  test("each mapped workflow job resolves to the observable job name prefix", () => {
    for (const gate of REQUIRED_GATES) {
      const jobId = WORKFLOW_JOB_IDS[gate.id as keyof typeof WORKFLOW_JOB_IDS];
      const job = workflow.jobs[jobId];
      expect(job).toBeTruthy();
      // The workflow's `name:` is what the Actions API reports, possibly with a
      // " / child" suffix for reusable workflows.
      const declaredName: string | undefined = job.name;
      if (declaredName) expect(declaredName.startsWith(gate.jobName)).toBe(true);
    }
  });

  test("job matching tolerates the reusable-workflow rendering", () => {
    const jobs = [{ name: "API staging contract gate / Required staging API contracts", conclusion: "success" }];
    expect(findJob(jobs, "API staging contract gate")?.conclusion).toBe("success");
    expect(findJob(jobs, "Release gate")).toBeNull();
  });
});
