import { describe, expect, test } from "bun:test";
import {
  aggregateKaraokeSession,
  applyTimingOffsetCompensation,
  type KaraokeLineScore,
} from "../src/scoring";

function line(opts: {
  index: number;
  textScore: number;
  signedMeanDeltaMs: number;
  meanAbsDeltaMs: number;
}): KaraokeLineScore {
  return {
    confidenceScore: 0.9,
    finalizedReason: "asr_final",
    lineId: `line-${opts.index}`,
    lineIndex: opts.index,
    recognizedWords: [{ text: "x", startMs: 0, endMs: 100, confidence: 0.9, final: true }],
    score: 0,
    scoredLineIndex: opts.index,
    textScore: {
      confidenceMean: 0.9,
      keywordCoverage: opts.textScore,
      missedWords: [],
      phoneticAvailable: true,
      phoneticCoverage: opts.textScore,
      phoneticQuality: opts.textScore,
      score: opts.textScore,
      wer: 1 - opts.textScore,
    },
    timingScore: {
      matchedWordCount: 5,
      meanAbsDeltaMs: opts.meanAbsDeltaMs,
      score: Math.max(0, 1 - opts.meanAbsDeltaMs / 575),
      signedMeanDeltaMs: opts.signedMeanDeltaMs,
      timingTrend: "on_time",
    },
    transcript: "x",
    uncertain: false,
  };
}

describe("timing offset compensation", () => {
  test("a consistent lead/lag is removed — timing scores rise toward 1", () => {
    // Every line is a steady 180ms late with no within-line spread: clean singing.
    const lines = [0, 1, 2, 3].map((i) =>
      line({ index: i, meanAbsDeltaMs: 180, signedMeanDeltaMs: 180, textScore: 0.95 }),
    );
    const { offsetMs, lineScores } = applyTimingOffsetCompensation(lines);
    expect(offsetMs).toBe(180);
    for (const ls of lineScores) {
      expect(ls.timingScore!.score).toBeGreaterThan(0.98); // was ~0.69 before
    }
  });

  test("erratic timing is NOT excused (median offset ~0, residual spread remains)", () => {
    const lines = [
      line({ index: 0, meanAbsDeltaMs: 220, signedMeanDeltaMs: -220, textScore: 0.95 }),
      line({ index: 1, meanAbsDeltaMs: 10, signedMeanDeltaMs: 0, textScore: 0.95 }),
      line({ index: 2, meanAbsDeltaMs: 220, signedMeanDeltaMs: 220, textScore: 0.95 }),
    ];
    const { offsetMs, lineScores } = applyTimingOffsetCompensation(lines);
    expect(Math.abs(offsetMs)).toBeLessThanOrEqual(10);
    // The two wildly off lines still carry a real timing penalty.
    expect(lineScores[0].timingScore!.score).toBeLessThan(0.7);
    expect(lineScores[2].timingScore!.score).toBeLessThan(0.7);
  });

  test("a clean, consistently-offset performance summarizes well above the raw score", () => {
    const lines = [0, 1, 2, 3, 4].map((i) =>
      line({ index: i, meanAbsDeltaMs: 175, signedMeanDeltaMs: 175, textScore: 0.95 }),
    );
    const summary = aggregateKaraokeSession({ lineScores: lines });
    // Raw (uncompensated) would land in the high 60s; compensated should be much higher.
    expect(summary.finalScore).toBeGreaterThan(0.85);
    expect(summary.lyricsScore).toBeCloseTo(0.95, 1);
  });

  test("mis-recognized lines do not skew the offset estimate", () => {
    // 2 well-sung lines at +180, plus 3 garbage-text lines whose deltas would
    // drag the raw median to -250. The garbage lines must be excluded so the
    // estimate stays at the true +180.
    const good = [0, 1].map((i) =>
      line({ index: i, meanAbsDeltaMs: 180, signedMeanDeltaMs: 180, textScore: 0.95 }),
    );
    const garbage = [2, 3, 4].map((i) =>
      line({ index: i, meanAbsDeltaMs: 250, signedMeanDeltaMs: -250, textScore: 0.2 }),
    );
    const { offsetMs } = applyTimingOffsetCompensation([...good, ...garbage]);
    expect(offsetMs).toBe(180);
  });
});
