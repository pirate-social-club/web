// S0 shadow model: counterfactual promotion timeline.
//
// CLAIM BOUNDARY. This simulator establishes what the promoter would have
// ADMITTED. It cannot establish that production would have advanced: the
// promotions it describes never ran, so their deploy and migration outcomes are
// unobservable. Evidence of successful advancement belongs to staging
// rehearsals, not to S0.
//
// Two borrowing errors this deliberately avoids:
//   - ancestry is checked against the HYPOTHETICAL deployed sha, never against
//     what production actually served; after the first divergence they differ,
//     and checking reality would let the timeline claim deploys it never made.
//   - a real failure/needs_repair interval is replayed only when the simulator
//     admitted the same candidate at the same phase. Otherwise the counterfactual
//     outcome is unknown and is recorded as an explicit assumption.

export const SCENARIOS = ["observed", "p50", "p95", "worst_observed"];

export const ADMITTED = "admitted";
export const SUPERSEDED = "superseded";
export const BLOCKED = "blocked";

/**
 * Deterministic duration per scenario. No random draws: the same trace and
 * scenario must always produce the same timeline, or the evidence is
 * unreproducible.
 */
export function durationFor({ scenario, candidate, observedDurations }) {
  const sorted = [...observedDurations].sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error("no observed durations; cannot build a deterministic scenario");
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  switch (scenario) {
    case "observed":
      // Falls back to p50 only when this candidate had no real promotion to
      // measure — recorded by the caller as an assumption when it happens.
      return candidate.observedDurationMs ?? percentile(50);
    case "p50":
      return percentile(50);
    case "p95":
      return percentile(95);
    case "worst_observed":
      return sorted[sorted.length - 1];
    default:
      throw new Error(`unknown scenario: ${scenario}`);
  }
}

/**
 * Replays an ordered event stream against a stateful promoter model.
 *
 * events: { at:number, type:"eligible"|"ineligible"|"arrival", candidateId, ... }
 * candidates: Map candidateId -> { sha, observedDurationMs?, gatesSatisfied:boolean }
 * isDescendant(a, b): true when sha a is a strict descendant of sha b
 */
export function simulate({
  events,
  candidates,
  initialDeployedSha,
  isDescendant,
  scenario,
  observedDurations,
  realOutcomes = new Map(), // candidateId -> { phase, outcome } for the promotion that ACTUALLY ran
}) {
  if (!SCENARIOS.includes(scenario)) throw new Error(`unknown scenario: ${scenario}`);

  const ordered = [...events].sort((a, b) => a.at - b.at || a.seq - b.seq);
  const eligible = new Set();
  const admissions = [];
  const assumptions = [];
  let deployedSha = initialDeployedSha;
  let busyUntil = null;
  let inFlight = null;

  const completeInFlight = (now) => {
    if (!inFlight || busyUntil === null || busyUntil > now) return;
    const real = realOutcomes.get(inFlight.candidateId);
    // A real outcome applies ONLY if reality promoted this same candidate at
    // this same phase. Anything else is a different promotion.
    if (real && real.phase === "promote" && real.candidateId === inFlight.candidateId) {
      inFlight.outcome = real.outcome;
      inFlight.outcomeSource = "observed";
    } else {
      inFlight.outcome = "assumed_deployed";
      inFlight.outcomeSource = "assumption";
      assumptions.push({
        candidateId: inFlight.candidateId,
        at: busyUntil,
        assumption: "a fully validated candidate promotes successfully",
        note: "counterfactual: this promotion never ran, so its outcome is unobservable",
      });
    }
    if (inFlight.outcome === "assumed_deployed" || inFlight.outcome === "deployed") {
      deployedSha = inFlight.sha;
    }
    inFlight.completedAt = busyUntil;
    inFlight = null;
    busyUntil = null;
  };

  const tryAdmit = (now) => {
    completeInFlight(now);
    if (inFlight) return;
    // F5: coalesce to the newest eligible candidate at this instant, rather than
    // giving every candidate a turn. Fairness is about production progress.
    const ready = [...eligible]
      .map((id) => candidates.get(id))
      .filter((candidate) => candidate && isDescendant(candidate.sha, deployedSha))
      .sort((a, b) => b.mintedAt - a.mintedAt);
    const chosen = ready[0];
    if (!chosen) return;

    for (const other of ready.slice(1)) {
      admissions.push({ at: now, candidateId: other.id, sha: other.sha, decision: SUPERSEDED });
      eligible.delete(other.id);
    }
    eligible.delete(chosen.id);

    let duration;
    try {
      duration = durationFor({ scenario, candidate: chosen, observedDurations });
    } catch (error) {
      throw new Error(`duration unavailable for ${chosen.id}: ${error.message}`);
    }
    if (scenario === "observed" && chosen.observedDurationMs == null) {
      assumptions.push({
        candidateId: chosen.id,
        at: now,
        assumption: "median duration substituted for a candidate with no real promotion to measure",
      });
    }
    // `at` is present on every entry so the timeline reads uniformly; admittedAt
    // is kept as the explicit name for the admission instant.
    inFlight = {
      at: now,
      admittedAt: now,
      candidateId: chosen.id,
      sha: chosen.sha,
      deployedShaBefore: deployedSha,
      decision: ADMITTED,
    };
    busyUntil = now + duration;
    admissions.push(inFlight);
  };

  for (const event of ordered) {
    completeInFlight(event.at);
    if (event.type === "eligible") eligible.add(event.candidateId);
    if (event.type === "ineligible") eligible.delete(event.candidateId);
    if (event.type === "blocked") {
      eligible.delete(event.candidateId);
      admissions.push({ at: event.at, candidateId: event.candidateId, decision: BLOCKED });
    }
    tryAdmit(event.at);
  }
  // Drain: let an in-flight promotion finish and admit anything still waiting.
  const horizon = ordered.length > 0 ? ordered[ordered.length - 1].at : 0;
  const endOfTime = Math.max(horizon, busyUntil ?? horizon);
  completeInFlight(endOfTime);
  tryAdmit(endOfTime);

  return {
    scenario,
    admissions,
    assumptions,
    finalDeployedSha: deployedSha,
    admittedCount: admissions.filter((entry) => entry.decision === ADMITTED).length,
  };
}
