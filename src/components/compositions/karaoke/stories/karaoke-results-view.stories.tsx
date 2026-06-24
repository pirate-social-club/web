import type { Meta, StoryObj } from "@storybook/react-vite";
import type { KaraokeLineScore, KaraokeSessionSummary } from "@pirate/karaoke-runtime";

import { realSongRawKaraokeLines } from "../fixtures/real-song";
import { toKaraokeStageLines } from "../lyric-transform";
import { toScorableKaraokeLines } from "../karaoke-stage-bridge";
import { KaraokeResultsView } from "../results/karaoke-results-view";

const artworkSrc = "https://picsum.photos/seed/pirate-karaoke-results/160/160";

const stageLines = toKaraokeStageLines(realSongRawKaraokeLines);
const scorableLines = toScorableKaraokeLines(stageLines);

function weakLine(lineIndex: number, missedWords: string[], signedMeanDeltaMs: number): KaraokeLineScore {
  const line = scorableLines[lineIndex] ?? scorableLines[0];
  const missedSet = new Set(missedWords.map((word) => word.toLowerCase()));
  // Recognized = the line's expected words minus the missed ones, so
  // recognizedWords and matchedWordCount stay internally consistent.
  const recognizedWords = line.words
    .filter((word) => !missedSet.has(word.text.toLowerCase()))
    .map((word) => ({
      text: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
      confidence: 0.7,
      final: true,
      source: "stt" as const,
    }));
  return {
    lineId: line.lineId,
    lineIndex: line.lineIndex,
    scoredLineIndex: line.scoredLineIndex,
    transcript: recognizedWords.map((word) => word.text).join(" "),
    recognizedWords,
    textScore: {
      score: 0.55,
      wer: 0.4,
      keywordCoverage: 0.6,
      phoneticQuality: 0,
      phoneticCoverage: 0,
      phoneticAvailable: false,
      confidenceMean: 0.6,
      missedWords,
    },
    timingScore: {
      score: 0.6,
      meanAbsDeltaMs: Math.abs(signedMeanDeltaMs),
      signedMeanDeltaMs,
      matchedWordCount: recognizedWords.length,
      timingTrend: signedMeanDeltaMs > 90 ? "late" : signedMeanDeltaMs < -90 ? "early" : "on_time",
    },
    confidenceScore: 0.6,
    score: 0.56,
    finalizedReason: "line_end",
    uncertain: false,
  };
}

const summary: KaraokeSessionSummary = {
  finalScore: 0.86,
  lyricsScore: 0.84,
  timingScore: 0.88,
  confidenceMean: 0.8,
  lineCount: 12,
  scoredLineCount: 11,
  noRecognitionLineCount: 1,
  uncertainLineCount: 1,
  phoneticUnavailableLineCount: 12,
  lowConfidenceLineCount: 1,
  timingTrend: "late",
  strongestLines: [],
  weakestLines: [
    weakLine(3, ["Mercedes", "Benz"], 420),
    weakLine(7, ["overtaken"], 180),
  ],
  missedWords: ["Mercedes", "Benz", "overtaken", "blues"],
};

const meta = {
  title: "Compositions/Karaoke/KaraokeResultsView",
  component: KaraokeResultsView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof KaraokeResultsView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The full vision: rankings + attempt history + language-learning feedback (backend-backed inputs mocked). */
export const Full: Story = {
  render: () => (
    <KaraokeResultsView
      artistName="The Castaways"
      artworkSrc={artworkSrc}
      attempts={[
        { label: "Today", score: 0.86, isBest: true },
        { label: "Yesterday", score: 0.79 },
        { label: "Mon", score: 0.74 },
      ]}
      lines={scorableLines}
      onExit={() => undefined}
      onPracticeLine={() => undefined}
      onShare={() => undefined}
      onSingAgain={() => undefined}
      onViewRankings={() => undefined}
      previousPersonalBest={0.82}
      ranking={{
        scope: "weekly",
        yourRank: 12,
        totalRanked: 64,
        percentile: 0.18,
        entries: [
          { rank: 1, displayName: "maya", score: 0.96 },
          { rank: 2, displayName: "diego", score: 0.94 },
          { rank: 3, displayName: "lin", score: 0.93 },
          { rank: 12, displayName: "you", score: 0.86, isCurrentUser: true },
        ],
      }}
      summary={summary}
      title="Midnight Waves"
      wordsToReview={[
        { word: "Mercedes", missCount: 3 },
        { word: "Benz", missCount: 3 },
        { word: "overtaken", missCount: 2 },
        { word: "blues" },
      ]}
    />
  ),
};

/** Degraded state before the durable model exists: score + this-attempt feedback only, no rankings/history. */
export const ScoreAndFeedbackOnly: Story = {
  render: () => (
    <KaraokeResultsView
      artistName="The Castaways"
      artworkSrc={artworkSrc}
      lines={scorableLines}
      onExit={() => undefined}
      onSingAgain={() => undefined}
      summary={summary}
      title="Midnight Waves"
    />
  ),
};

/** A clean run — high score, no practice lines, no missed words. */
export const HighScore: Story = {
  render: () => (
    <KaraokeResultsView
      artistName="The Castaways"
      artworkSrc={artworkSrc}
      lines={scorableLines}
      onExit={() => undefined}
      onSingAgain={() => undefined}
      onViewRankings={() => undefined}
      previousPersonalBest={0.95}
      ranking={{
        scope: "all_time",
        yourRank: 2,
        totalRanked: 64,
        percentile: 0.03,
        entries: [
          { rank: 1, displayName: "maya", score: 0.98 },
          { rank: 2, displayName: "you", score: 0.97, isCurrentUser: true },
          { rank: 3, displayName: "diego", score: 0.94 },
        ],
      }}
      summary={{
        ...summary,
        finalScore: 0.97,
        lyricsScore: 0.98,
        timingScore: 0.95,
        timingTrend: "on_time",
        scoredLineCount: 12,
        noRecognitionLineCount: 0,
        uncertainLineCount: 0,
        weakestLines: [],
        missedWords: [],
      }}
      title="Midnight Waves"
    />
  ),
};
