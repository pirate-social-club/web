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
