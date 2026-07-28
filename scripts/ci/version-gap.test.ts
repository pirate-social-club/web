import { describe, expect, test } from "bun:test";

import {
  classifyRelease,
  decide,
  productionContainsRelease,
} from "./version-gap.mjs";

const BASE = {
  productionSha: "aaaaaaa",
  tipSha: "ccccccccccccccccccccccccccccccccccccccc",
  aheadBy: 1,
  gapMinutes: 5,
  maxGapMinutes: 45,
  compareStatus: "ahead",
};

describe("version gap decisions", () => {
  test("classifies a release run from its conclusion and production job", () => {
    expect(classifyRelease({ runConclusion: "failure", productionConclusion: "skipped" })).toBe("release_failed");
    expect(classifyRelease({ runConclusion: "success", productionConclusion: "skipped" })).toBe("not_deployed");
    expect(classifyRelease({ runConclusion: "success", productionConclusion: undefined })).toBe("not_deployed");
    expect(classifyRelease({ runConclusion: "success", productionConclusion: "success" })).toBe("deployed");
  });

  test("recognises when production already contains a release commit", () => {
    expect(productionContainsRelease({ releaseHeadSha: "aaaaaaabbbb", productionSha: "aaaaaaa", compareStatus: "behind" }))
      .toBe(true); // prefix equality wins regardless of compare
    expect(productionContainsRelease({ releaseHeadSha: "ddddddd", productionSha: "aaaaaaa", compareStatus: "ahead" }))
      .toBe(true);
    expect(productionContainsRelease({ releaseHeadSha: "ddddddd", productionSha: "aaaaaaa", compareStatus: "behind" }))
      .toBe(false);
    expect(productionContainsRelease({ releaseHeadSha: "ddddddd", productionSha: "aaaaaaa", compareStatus: "diverged" }))
      .toBe(false);
    expect(productionContainsRelease({ releaseHeadSha: "", productionSha: "aaaaaaa", compareStatus: "ahead" }))
      .toBe(false);
  });

  test("reports production serving the tip as healthy", () => {
    expect(decide({ ...BASE, tipSha: "aaaaaaabbbbbbb" }).kind).toBe("healthy");
  });

  test("reports a non-ancestor production as diverged", () => {
    const result = decide({ ...BASE, compareStatus: "diverged" });
    expect(result.kind).toBe("diverged");
    expect(result.failed).toBe(true);
  });

  test("reports a failed push release immediately", () => {
    const result = decide({ ...BASE, release: { outcome: "release_failed", containedInProduction: false } });
    expect(result.kind).toBe("release_failed");
    expect(result.failed).toBe(true);
  });

  test("reports a push release that skipped production immediately, before the threshold", () => {
    const result = decide({
      ...BASE,
      gapMinutes: 3, // well within threshold
      release: { outcome: "not_deployed", containedInProduction: false },
    });
    expect(result.kind).toBe("not_deployed");
    expect(result.failed).toBe(true);
  });

  // THE DELAYED-OBSERVER RACE.
  //
  // Observers queue (cancel-in-progress: false), so an observer can run long
  // after the release it describes. Sequence:
  //   1. release A fails
  //   2. release B deploys A+B  -> production contains A
  //   3. C merges               -> production is now behind main by C
  //   4. A's observer finally runs
  //
  // A's outcome is stale history. Reporting "release A failed to promote" would
  // be wrong AND would mask the real state, which is the B->C gap.
  test("a delayed observer for an already-deployed release reports the current gap, not the old outcome", () => {
    const withinThreshold = decide({
      ...BASE,
      productionSha: "bbbbbbb", // B, which contains A
      tipSha: "ccccccccccccccccccccccccccccccccccccccc", // C merged after B
      aheadBy: 1,
      gapMinutes: 4,
      release: { outcome: "release_failed", containedInProduction: true },
    });
    expect(withinThreshold.kind).toBe("healthy");
    expect(withinThreshold.message).toContain("1 commit(s) behind");

    // And if the B->C gap is itself too old, it is reported as ordinary staleness
    // — still never as release A's failure.
    const stale = decide({
      ...BASE,
      productionSha: "bbbbbbb",
      aheadBy: 1,
      gapMinutes: 90,
      release: { outcome: "release_failed", containedInProduction: true },
    });
    expect(stale.kind).toBe("stale");
    expect(stale.message).toContain("90 min");
  });

  test("the same supersession applies to a not_deployed observation", () => {
    const result = decide({
      ...BASE,
      gapMinutes: 2,
      release: { outcome: "not_deployed", containedInProduction: true },
    });
    expect(result.kind).toBe("healthy");
  });

  test("a deployed release falls through to ordinary gap classification", () => {
    expect(decide({ ...BASE, gapMinutes: 90, release: { outcome: "deployed" } }).kind).toBe("stale");
    expect(decide({ ...BASE, gapMinutes: 2, release: { outcome: "deployed" } }).kind).toBe("healthy");
  });

  test("scheduled runs with no release context use the threshold", () => {
    expect(decide({ ...BASE, gapMinutes: 90 }).kind).toBe("stale");
    expect(decide({ ...BASE, gapMinutes: 10 }).kind).toBe("healthy");
  });

  test("a missing production sha is unreachable, not healthy", () => {
    expect(decide({ ...BASE, productionSha: "" }).kind).toBe("unreachable");
  });
});
