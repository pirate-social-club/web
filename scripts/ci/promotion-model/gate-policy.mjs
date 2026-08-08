// The required gate set is DERIVED from the release workflow, not chosen.
//
// `.github/workflows/release.yml` declares the production job's dependencies:
//
//   needs: [api-staging-contract-gate, release-inputs, release-gate,
//           schema-gate, production-freshness]
//
// Those are the pipeline's own definition of "validated enough to deploy".
// `production-freshness` is excluded because the promoter replaces it — it is a
// scheduling decision, not evidence about the candidate.
//
// Narrowing this set until an admission appears would manufacture the result the
// model exists to test, so the policy is fixed here and versioned, and any gate
// it names that is skipped or absent leaves the candidate UNSATISFIED.

export const GATE_POLICY_VERSION = 1;

// Workflow job id -> observable job-name prefix. GitHub reports a job from a
// reusable workflow as "Parent / Child", so the prefix is what the trace can be
// matched on. This mapping is the seam between the workflow's identifiers and
// the Actions API's rendering, and is asserted against the workflow itself.
export const WORKFLOW_JOB_IDS = {
  release_inputs: "release-inputs",
  schema_gate: "schema-gate",
  api_staging_contract_gate: "api-staging-contract-gate",
  release_gate: "release-gate",
};

// Dependencies of the production job that are NOT evidence about the candidate.
// production-freshness is the scheduling decision the promoter replaces; keeping
// it in the required set would mean requiring the very gate we are removing.
export const SCHEDULING_ONLY_JOB_IDS = ["production-freshness"];

export const REQUIRED_GATES = [
  { id: "release_inputs", version: 1, jobName: "Verify release inputs" },
  { id: "schema_gate", version: 1, jobName: "Community schema gate (staging fleet)" },
  { id: "api_staging_contract_gate", version: 1, jobName: "API staging contract gate" },
  { id: "release_gate", version: 1, jobName: "Release gate" },
];

// Transitive dependencies of the gates above. A release gate cannot pass without
// them, so they are not separately required — recorded for reporting only.
export const IMPLIED_GATES = [
  { id: "staging_freshness", version: 1, jobName: "Check staging freshness" },
  { id: "staging_deploy", version: 1, jobName: "Deploy staging" },
];

/**
 * GitHub renders a job that comes from a reusable workflow as "Parent / Child",
 * so match on the parent segment. Anchoring on the exact string silently turns a
 * present gate into an "absent" observation the moment a job is refactored into
 * a reusable workflow — which is what happened to the API contract gate.
 */
export function findJob(jobs, jobName) {
  return (jobs ?? []).find((job) => job.name === jobName || job.name.startsWith(`${jobName} / `)) ?? null;
}

/**
 * The production job's dependency set, minus scheduling-only gates, expressed as
 * gate ids. Callers derive this from the workflow rather than trusting
 * REQUIRED_GATES, so drift in either direction is detectable.
 */
export function derivedGateIdsFromWorkflow(workflow) {
  const needs = workflow?.jobs?.production?.needs ?? [];
  const byJobId = new Map(Object.entries(WORKFLOW_JOB_IDS).map(([gateId, jobId]) => [jobId, gateId]));
  return needs
    .filter((jobId) => !SCHEDULING_ONLY_JOB_IDS.includes(jobId))
    .map((jobId) => byJobId.get(jobId) ?? `UNMAPPED:${jobId}`)
    .sort();
}
