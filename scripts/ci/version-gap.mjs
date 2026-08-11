// Decision logic for the production version-gap alarm, extracted so the cases
// that matter can be tested. The workflow supplies the I/O (fetch /__version,
// GitHub compare API, job list); everything here is pure.

export const RELEASE_FAILED = "release_failed";
export const NOT_DEPLOYED = "not_deployed";
export const DEPLOYED = "deployed";

function sameCommit(expectedSha, productionSha) {
  return expectedSha === productionSha;
}

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
  if (sameCommit(releaseHeadSha, productionSha)) return true;
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
  if (sameCommit(tipSha, productionSha)) {
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

/**
 * Decides what to report for the API pair: what api.pirate.sc is serving against
 * the pinned commit in .github/release-refs/api.sha.
 *
 * `compareStatus` is the GitHub compare in the API repo of base=pinSha,
 * head=productionSha:
 *   "identical" — production is exactly the pinned commit
 *   "ahead"     — production is a descendant of the pin: a deploy ran AHEAD of
 *                 the pin (a manual CLI lane), so the pin file now misleads
 *                 anyone reading it to make a decision
 *   "behind"    — production is an ancestor of the pin: the deploy lane is
 *                 lagging or failed silently, and a merged change everyone
 *                 believes is live is not
 *   "diverged"  — neither contains the other; never normal
 *
 * The two gap directions have different causes and different responses, so they
 * get distinct kinds and distinct labels. A check that only sees one of them is
 * half a check.
 */
export function decideApiPinGap({ productionSha, pinSha, compareStatus }) {
  if (!productionSha) {
    return { kind: "unreachable", failed: true, message: "API production version endpoint returned no git_sha." };
  }
  if (!pinSha) {
    return { kind: "unreachable", failed: true, message: "The API release pin (.github/release-refs/api.sha) is empty." };
  }
  if (sameCommit(pinSha, productionSha) || compareStatus === "identical") {
    return { kind: "in_sync", failed: false, message: `API production is serving the pinned commit (${productionSha}).` };
  }
  if (compareStatus === "ahead") {
    return {
      kind: "deployed_ahead_of_pin",
      failed: true,
      message:
        `API production ${productionSha} is NEWER than the release pin ${pinSha.slice(0, 7)}: ` +
        "a manual deploy ran ahead of the pin, so the pin file no longer describes what is live.",
    };
  }
  if (compareStatus === "behind") {
    return {
      kind: "deployed_behind_pin",
      failed: true,
      message:
        `API production ${productionSha} is OLDER than the release pin ${pinSha.slice(0, 7)}: ` +
        "the deploy lane is lagging or failed silently, and a merged change believed to be live is not.",
    };
  }
  if (compareStatus === "diverged") {
    return {
      kind: "diverged",
      failed: true,
      message: `API production ${productionSha} and the release pin ${pinSha.slice(0, 7)} have diverged.`,
    };
  }
  return {
    kind: "unreachable",
    failed: true,
    message: `Could not establish how API production ${productionSha} relates to the release pin (${compareStatus}).`,
  };
}
