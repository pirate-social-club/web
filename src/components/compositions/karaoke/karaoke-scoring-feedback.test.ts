import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import type { KaraokeLineScore } from "@pirate/karaoke-runtime";

import {
  COMBO_THRESHOLD,
  RATING_GREAT_THRESHOLD,
  RATING_PERFECT_THRESHOLD,
  deriveKaraokeFeedback,
  ratingTierForScore,
} from "./karaoke-scoring-feedback";
import type { KaraokeScoringState } from "./scoring/karaoke-scoring-controller";

function lineScore(lineId: string, scoredLineIndex: number, score: number, uncertain = false): KaraokeLineScore {
  return {
    confidenceScore: null,
    finalizedReason: "line_end",
    lineId,
    lineIndex: scoredLineIndex,
    recognizedWords: [],
    score,
    scoredLineIndex,
    textScore: {
      confidenceMean: null,
      keywordCoverage: score,
      missedWords: [],
      phoneticAvailable: false,
      phoneticCoverage: 0,
      phoneticQuality: 0,
      score,
      wer: 1 - score,
    },
    timingScore: null,
    transcript: "",
    uncertain,
  };
}

function state(scores: KaraokeLineScore[], latestLineId: string | null = null): KaraokeScoringState {
  return {
    error: null,
    latestLineId: latestLineId ?? scores.at(-1)?.lineId ?? null,
    lineScores: scores,
    micError: null,
    partialTranscript: "",
    phase: "live",
    status: "active",
    summary: null,
  };
}

describe("ratingTierForScore", () => {
  test("perfect at/above 0.9", () => {
    expect(ratingTierForScore(RATING_PERFECT_THRESHOLD)).toBe("perfect");
    expect(ratingTierForScore(1)).toBe("perfect");
  });

  test("great at/above 0.75", () => {
    expect(ratingTierForScore(RATING_GREAT_THRESHOLD)).toBe("great");
  });

  test("good at/above 0.5", () => {
    expect(ratingTierForScore(COMBO_THRESHOLD)).toBe("good");
  });

  test("miss below 0.5", () => {
    expect(ratingTierForScore(0.49)).toBe("miss");
    expect(ratingTierForScore(0)).toBe("miss");
  });
});

describe("deriveKaraokeFeedback", () => {
  test("empty state yields zeroed feedback", () => {
    expect(deriveKaraokeFeedback(null)).toEqual({
      bestCombo: 0,
      combo: 0,
      rating: null,
      runningScore: 0,
    });
    expect(deriveKaraokeFeedback({ ...state([]), latestLineId: null })).toEqual({
      bestCombo: 0,
      combo: 0,
      rating: null,
      runningScore: 0,
    });
  });

  test("accumulates running score from rounded per-line percents", () => {
    const fb = deriveKaraokeFeedback(state([
      lineScore("a", 0, 0.9),
      lineScore("b", 1, 0.5),
    ]));

    expect(fb.runningScore).toBe(90 + 50);
  });

  test("combo increments on non-miss and resets on miss", () => {
    const fb = deriveKaraokeFeedback(state([
      lineScore("a", 0, 0.9),
      lineScore("b", 1, 0.6),
      lineScore("c", 2, 0.3),
      lineScore("d", 3, 0.8),
    ]));

    expect(fb.combo).toBe(1);
    expect(fb.bestCombo).toBe(2);
  });

  test("uncertain lines are excluded from score and combo", () => {
    const fb = deriveKaraokeFeedback(state([
      lineScore("a", 0, 0.9),
      lineScore("b", 1, 0.0, true),
      lineScore("c", 2, 0.8),
    ]));

    expect(fb.runningScore).toBe(90 + 80);
    expect(fb.combo).toBe(2);
    expect(fb.bestCombo).toBe(2);
  });

  test("rating describes the latest non-uncertain line", () => {
    const fb = deriveKaraokeFeedback(state(
      [lineScore("a", 0, 0.9), lineScore("b", 1, 0.75, true)],
      "b",
    ));

    expect(fb.rating).toBeNull();
  });

  test("rating carries a unique key per line+score", () => {
    const fb = deriveKaraokeFeedback(state([lineScore("a", 0, 0.92)], "a"));

    expect(fb.rating?.label).toBe("Perfect");
    expect(fb.rating?.points).toBe(92);
    expect(fb.rating?.tone).toBe("success");
    expect(fb.rating?.key).toBe("a:0:0.92");
  });
});
