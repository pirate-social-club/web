// Decision logic for the production version-gap alarm, extracted so the cases
// that matter can be tested. The workflow supplies the I/O (fetch /__version,
// GitHub compare API, job list); everything here is pure.

export const RELEASE_FAILED = "release_failed";
export const NOT_DEPLOYED = "not_deployed";
export const DEPLOYED = "deployed";

export function classifyRelease({ runConclusion, productionConclusion }) {
  if (runConclusion !== "success") return RELEASE_FAILED;
  return productionConclusion === "success" ? DEPLOYED : NOT_DEPLOYED;
}

/**
 * True when production already contains the commit a release run was built from.
 *
 * `compareStatus` is the GitHub compare of base=releaseHeadSha, head=productionSha:
 *   "identical" — production is exactly that commit
 *   "ahead"     — production is a descendant, so the commit is contained
 *   "behind" / "diverged" — not contained
 */
export function productionContainsRelease({ releaseHeadSha, productionSha, compareStatus }) {
  if (!releaseHeadSha || !productionSha) return false;
  // /__version serves an abbreviated SHA, so equality is a prefix test.
  if (releaseHeadSha.startsWith(productionSha)) return true;
  return compareStatus === "identical" || compareStatus === "ahead";
}

/**
 * Decides what to report.
 *
 * The subtle case is a DELAYED OBSERVER. Observers queue rather than cancel, so
 * one can run long after the release it describes: release A fails, release B
 * deploys A+B, C merges, and only then does A's observer get its turn. A's
 * outcome is stale history at that point — production already contains A — and
 * reporting "release A failed to promote" would be wrong and would mask the real
 * current state. When production already contains the observed run's commit, the
 * outcome is treated as superseded and the ordinary current-main gap is reported.
 */
export function decide({
  productionSha,
  tipSha,
  aheadBy,
  gapMinutes,
  maxGapMinutes,
  compareStatus,
  release,
}) {
  if (!productionSha) {
    return { kind: "unreachable", failed: true, message: "Production version endpoint returned no git_sha." };
  }
  if (tipSha.startsWith(productionSha)) {
    return { kind: "healthy", failed: false, message: `Production is serving main's tip (${productionSha}).` };
  }
  if (compareStatus !== "ahead") {
    return {
      kind: "diverged",
      failed: true,
      message: `Production SHA ${productionSha} is not an ancestor of main (${compareStatus}).`,
    };
  }

  const outcome = release?.outcome;
  if (outcome === RELEASE_FAILED || outcome === NOT_DEPLOYED) {
    if (release.containedInProduction) {
      // Stale observation; fall through to the current gap rather than reporting it.
    } else {
      return outcome === RELEASE_FAILED
        ? { kind: RELEASE_FAILED, failed: true, message: "A push release to main failed; production was not promoted." }
        : { kind: NOT_DEPLOYED, failed: true, message: "A push release to main succeeded without deploying production." };
    }
  }

  if (gapMinutes <= maxGapMinutes) {
    return {
      kind: "healthy",
      failed: false,
      message: `Production is ${aheadBy} commit(s) behind, waiting ${gapMinutes} min — within threshold.`,
    };
  }
  return {
    kind: "stale",
    failed: true,
    message: `Production has been ${aheadBy} commit(s) behind for ${gapMinutes} min.`,
  };
}
