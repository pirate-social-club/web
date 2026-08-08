import { describe, expect, test } from "bun:test";
import { evidenceComment, evidenceFromManifest, latestEvidence, shouldRecord } from "./d1-attestation-evidence.mjs";

const baseline = "a".repeat(64);
const changed = "b".repeat(64);
const manifest = (digest, comparison) => ({
  effective_policy_digest: digest,
  attestation_shadow: {
    comparison: {
      live_count: 10,
      verified_count: 10,
      invalid_count: 0,
      policy_mismatch_count: 0,
      missing_count: 0,
      fresh_allocation_unattested_count: 0,
      stale_generation_proof_count: 0,
      unexplained_missing_proof_count: 0,
      roster_matches_authoritative: true,
      ...comparison,
    },
  },
});
const run = { id: 42, attempt: 2, url: "https://example.test/run/42", artifactName: "schema-gate-staging-42-2" };

describe("D1 attestation evidence", () => {
  test("quiet baseline recovery does not create noise", () => {
    const current = evidenceFromManifest(manifest(baseline, {
      authoritative_pass: true, would_fast_path_fire: true, authoritative_match: true,
    }), run);
    expect(shouldRecord({ baselineDigest: baseline, latest: null, current })).toBe(false);
  });

  test("records decline and later recovery for the same changed digest", () => {
    const decline = evidenceFromManifest(manifest(changed, {
      authoritative_pass: false, would_fast_path_fire: false, authoritative_match: true,
      live_count: 10, verified_count: 0, invalid_count: 10, policy_mismatch_count: 10,
    }), run);
    expect(decline.phase).toBe("decline");
    expect(shouldRecord({ baselineDigest: baseline, latest: null, current: decline })).toBe(true);
    const parsed = latestEvidence([evidenceComment(decline)]);
    const recovery = evidenceFromManifest(manifest(changed, {
      authoritative_pass: true, would_fast_path_fire: true, authoritative_match: true,
      live_count: 10, verified_count: 10, invalid_count: 0,
    }), { ...run, attempt: 3 });
    expect(shouldRecord({ baselineDigest: baseline, latest: parsed, current: recovery })).toBe(true);
  });

  test("deduplicates repeated evidence state", () => {
    const current = evidenceFromManifest(manifest(changed, {
      authoritative_pass: false, would_fast_path_fire: false, authoritative_match: true,
    }), run);
    expect(shouldRecord({ baselineDigest: baseline, latest: current, current })).toBe(false);
  });
});
