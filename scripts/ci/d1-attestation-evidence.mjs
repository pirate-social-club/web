const DIGEST = /^[0-9a-f]{64}$/u;

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${field} must be a non-negative integer`);
  return number;
}

export function evidenceFromManifest(manifest, run) {
  const digest = String(manifest?.effective_policy_digest ?? "");
  if (!DIGEST.test(digest)) throw new Error("manifest effective_policy_digest must be 64 lowercase hex characters");
  const comparison = manifest?.attestation_shadow?.comparison;
  if (!comparison || typeof comparison !== "object") throw new Error("manifest attestation shadow comparison is absent");
  const authoritativePass = comparison.authoritative_pass === true;
  const wouldFastPathFire = comparison.would_fast_path_fire === true;
  const authoritativeMatch = comparison.authoritative_match === true;
  const phase = authoritativePass && wouldFastPathFire && authoritativeMatch ? "recovery" : "decline";
  return {
    digest,
    phase,
    authoritative_pass: authoritativePass,
    would_fast_path_fire: wouldFastPathFire,
    authoritative_match: authoritativeMatch,
    live_count: nonNegativeInteger(comparison.live_count, "comparison.live_count"),
    verified_count: nonNegativeInteger(comparison.verified_count, "comparison.verified_count"),
    invalid_count: nonNegativeInteger(comparison.invalid_count, "comparison.invalid_count"),
    policy_mismatch_count: nonNegativeInteger(comparison.policy_mismatch_count, "comparison.policy_mismatch_count"),
    missing_count: nonNegativeInteger(comparison.missing_count, "comparison.missing_count"),
    fresh_allocation_unattested_count: nonNegativeInteger(
      comparison.fresh_allocation_unattested_count,
      "comparison.fresh_allocation_unattested_count",
    ),
    stale_generation_proof_count: nonNegativeInteger(
      comparison.stale_generation_proof_count,
      "comparison.stale_generation_proof_count",
    ),
    unexplained_missing_proof_count: nonNegativeInteger(
      comparison.unexplained_missing_proof_count,
      "comparison.unexplained_missing_proof_count",
    ),
    roster_matches_authoritative: comparison.roster_matches_authoritative === true,
    run_id: nonNegativeInteger(run.id, "run.id"),
    run_attempt: nonNegativeInteger(run.attempt, "run.attempt"),
    run_url: String(run.url),
    artifact_name: String(run.artifactName),
  };
}

export function latestEvidence(texts) {
  let latest = null;
  for (const text of texts) {
    for (const match of String(text ?? "").matchAll(/<!-- d1-attestation-evidence:(\{[^\n]+\}) -->/gu)) {
      latest = JSON.parse(match[1]);
    }
  }
  return latest;
}

export function shouldRecord({ baselineDigest, latest, current }) {
  if (!latest && current.digest === baselineDigest && current.phase === "recovery") return false;
  if (!latest) return true;
  return latest.digest !== current.digest ||
    latest.authoritative_pass !== current.authoritative_pass ||
    latest.would_fast_path_fire !== current.would_fast_path_fire ||
    latest.authoritative_match !== current.authoritative_match;
}

export function evidenceComment(evidence) {
  const heading = evidence.phase === "recovery"
    ? "D1 attestation shadow recovered under the effective policy"
    : "D1 attestation shadow declined under the effective policy";
  return `### ${heading}

- Effective policy digest: \`${evidence.digest}\`
- Authoritative pass: \`${evidence.authoritative_pass}\`
- Would fast path fire: \`${evidence.would_fast_path_fire}\`
- Authoritative match: \`${evidence.authoritative_match}\`
- Live / verified / invalid: ${evidence.live_count} / ${evidence.verified_count} / ${evidence.invalid_count}
- Missing / policy mismatch: ${evidence.missing_count} / ${evidence.policy_mismatch_count}
- Missing attribution (fresh allocation / stale generation / unexplained): ${evidence.fresh_allocation_unattested_count} / ${evidence.stale_generation_proof_count} / ${evidence.unexplained_missing_proof_count}
- Roster matches authoritative: \`${evidence.roster_matches_authoritative}\`
- Release evidence: [run ${evidence.run_id}, attempt ${evidence.run_attempt}](${evidence.run_url})
- Artifact: \`${evidence.artifact_name}\`

<!-- d1-attestation-evidence:${JSON.stringify(evidence)} -->`;
}
