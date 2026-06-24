import * as React from "react";
import {
  ArrowsClockwise,
  CaretLeft,
  ShareNetwork,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  KaraokeLineScore,
  KaraokeSessionSummary,
  ScorableKaraokeLine,
} from "@pirate/karaoke-runtime";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

/**
 * SHELVED — future design reference, NOT wired into the app and NOT shipped.
 * Requires the gated `karaoke_attempt` persistence (core spec/karaoke-rankings)
 * and richer per-attempt evidence than current scoring reliably provides. The
 * production end-of-take UI is the minimal `KaraokeScoringPanel` "ended" state
 * (final score + "Sing again"). Kept as the target design for when that data exists.
 *
 * The dedicated post-performance results page. This is the screen the karaoke
 * surface would transition to once a scored attempt ends — replacing the tiny
 * "Final score" footer with rankings + language-learning feedback.
 *
 * It is purely presentational. `summary` + `lines` are produced by the scoring
 * runtime today (no backend needed). `ranking`, `attempts`, and `wordsToReview`
 * are the forward-looking, persistence-backed inputs; when omitted the
 * corresponding sections simply don't render, so the same component degrades
 * gracefully before the durable model exists.
 */

export interface KaraokeRankEntry {
  rank: number;
  displayName: string;
  /** 0..1 */
  score: number;
  isCurrentUser?: boolean;
}

export interface KaraokeRanking {
  scope: "weekly" | "all_time" | "community";
  /** Null when the viewer has no eligible entry yet. */
  yourRank: number | null;
  totalRanked: number;
  /** Top fraction, 0..1 (0.18 → "Top 18%"). Null when unranked. */
  percentile: number | null;
  /** Compact slice to show inline (e.g. top 3 + the viewer's neighborhood). */
  entries: KaraokeRankEntry[];
}

export interface KaraokeAttemptHistoryItem {
  label: string;
  /** 0..1 */
  score: number;
  isBest?: boolean;
}

export interface KaraokeWordReviewItem {
  word: string;
  /** How many times the word was missed across recent attempts (drives emphasis). */
  missCount?: number;
}

export interface KaraokeResultsViewProps {
  title: string;
  artistName?: string;
  artworkSrc?: string;
  summary: KaraokeSessionSummary;
  /** Expected lyric lines, used to render the text of weak/practice lines. */
  lines: readonly ScorableKaraokeLine[];
  /**
   * The viewer's best score for this song *before* this attempt, 0..1. Used only
   * to decide whether this attempt set a new best (raw comparison, no rounding).
   * Omit when unknown — the hero then shows "Your score" rather than guessing.
   */
  previousPersonalBest?: number | null;
  ranking?: KaraokeRanking | null;
  attempts?: readonly KaraokeAttemptHistoryItem[];
  /**
   * Words to surface for review. Defaults to this attempt's missed words; the
   * language-learning value comes from passing repeated-miss aggregates here.
   */
  wordsToReview?: readonly KaraokeWordReviewItem[];
  onSingAgain: () => void;
  onViewRankings?: () => void;
  onPracticeLine?: (lineId: string) => void;
  onExit?: () => void;
  onShare?: () => void;
  className?: string;
}

function percent(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) {
    return 0;
  }

  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

function timingTrendPhrase(trend: KaraokeSessionSummary["timingTrend"]): string {
  switch (trend) {
    case "early":
      return "You tended to come in early";
    case "late":
      return "You tended to come in late";
    case "mixed":
      return "Your timing drifted";
    case "on_time":
    default:
      return "Your timing was on the beat";
  }
}

function lineTimingNote(line: KaraokeLineScore): string | null {
  const timing = line.timingScore;
  if (!timing || timing.matchedWordCount === 0) {
    return null;
  }

  const seconds = Math.abs(timing.signedMeanDeltaMs) / 1000;
  if (seconds < 0.12) {
    return null;
  }

  const rounded = seconds.toFixed(1);
  switch (timing.timingTrend) {
    case "late":
      return `Came in ~${rounded}s late`;
    case "early":
      return `Came in ~${rounded}s early`;
    case "mixed":
      return "Timing drifted on this line";
    default:
      return null;
  }
}

function dedupeWords(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (!word || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(word);
  }
  return out;
}

function ScoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-lg)] bg-muted/50 px-3 py-2">
      <Type as="span" variant="h3">
        {value}
      </Type>
      <Type as="span" className="text-muted-foreground" variant="caption">
        {label}
      </Type>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Type as="h2" className="px-1 text-muted-foreground" variant="overline">
      {children}
    </Type>
  );
}

export function KaraokeResultsView({
  artistName,
  artworkSrc,
  attempts,
  className,
  lines,
  onExit,
  onPracticeLine,
  onShare,
  onSingAgain,
  onViewRankings,
  previousPersonalBest,
  ranking,
  summary,
  title,
  wordsToReview,
}: KaraokeResultsViewProps) {
  const finalScore = percent(summary.finalScore);
  // Compare raw scores (not the rounded display value) so 86.1 doesn't beat 86.4.
  // Unknown previous best → don't claim a new best.
  const isNewBest = previousPersonalBest != null && summary.finalScore > previousPersonalBest;

  const lineText = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const line of lines) {
      map.set(line.lineId, line.text);
    }
    return map;
  }, [lines]);

  // Practice targets: the weakest *measured* lines, plus any that couldn't be
  // measured (provider/stream failure) shown separately so we never frame an
  // infrastructure miss as poor singing.
  const practiceLines = summary.weakestLines.filter((line) => !line.uncertain).slice(0, 3);
  // Only genuine measurement failures (provider/stream) earn the infra caveat —
  // NOT silence/failed recognition, which `noRecognitionLineCount` would conflate.
  const uncertainCount = summary.uncertainLineCount;

  const reviewWords = React.useMemo<KaraokeWordReviewItem[]>(() => {
    if (wordsToReview && wordsToReview.length > 0) {
      return [...wordsToReview];
    }
    return dedupeWords(summary.missedWords).slice(0, 12).map((word) => ({ word }));
  }, [summary.missedWords, wordsToReview]);

  return (
    <section
      aria-label={`Karaoke results for ${title}`}
      className={cn("flex min-h-dvh w-full flex-col bg-background text-foreground", className)}
    >
      <header className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-soft px-4 py-3 sm:px-6">
        <Button
          aria-label="Exit"
          className="size-11 px-0"
          leadingIcon={<CaretLeft className="size-5" weight="bold" />}
          onClick={onExit}
          size="icon"
          variant="ghost"
        />
        <div className="min-w-0 text-center">
          <Type as="h1" className="truncate" variant="body-strong">
            {title}
          </Type>
          {artistName ? (
            <Type as="p" className="truncate text-muted-foreground" variant="caption">
              {artistName}
            </Type>
          ) : null}
        </div>
        <Button
          aria-label="Share"
          className="size-11 px-0"
          disabled={!onShare}
          leadingIcon={<ShareNetwork className="size-5" />}
          onClick={onShare}
          size="icon"
          variant="ghost"
        />
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        {/* Hero score */}
        <div className="flex flex-col items-center gap-1 text-center">
          {artworkSrc ? (
            <img
              alt=""
              aria-hidden="true"
              className="mb-2 size-16 rounded-[var(--radius-lg)] object-cover"
              src={artworkSrc}
            />
          ) : null}
          <Type as="p" className="text-[5rem] font-semibold leading-none tabular-nums" variant="h1">
            {finalScore}
          </Type>
          <Type as="p" className="text-muted-foreground" variant="caption">
            {isNewBest ? "New personal best" : "Your score"}
          </Type>
          {ranking && ranking.yourRank != null ? (
            <Type as="p" className="mt-1" variant="body-strong">
              #{ranking.yourRank}
              {ranking.scope === "weekly" ? " this week" : ranking.scope === "all_time" ? " all-time" : " in community"}
              {ranking.percentile != null ? ` · Top ${Math.max(1, Math.round(ranking.percentile * 100))}%` : ""}
            </Type>
          ) : null}
        </div>

        {/* Sub-scores */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <ScoreStat label="Lyrics" value={percent(summary.lyricsScore)} />
            {summary.timingScore != null ? (
              <ScoreStat label="Timing" value={percent(summary.timingScore)} />
            ) : null}
          </div>
          <Type as="p" className="px-1 text-muted-foreground" variant="caption">
            {summary.scoredLineCount} of {summary.lineCount} lines measured · {timingTrendPhrase(summary.timingTrend)}
          </Type>
        </div>

        {/* Primary actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            leadingIcon={<ArrowsClockwise className="size-5" weight="bold" />}
            onClick={onSingAgain}
            size="lg"
          >
            Sing again
          </Button>
          {ranking || onViewRankings ? (
            <Button
              className="flex-1"
              leadingIcon={<Trophy className="size-5" weight="fill" />}
              onClick={onViewRankings}
              size="lg"
              variant="secondary"
            >
              Rankings
            </Button>
          ) : null}
        </div>

        {/* What to practice */}
        {practiceLines.length > 0 || uncertainCount > 0 ? (
          <div className="flex flex-col gap-3">
            <SectionHeading>What to practice</SectionHeading>
            {practiceLines.map((line) => {
              const missed = dedupeWords(line.textScore.missedWords);
              const timingNote = lineTimingNote(line);
              return (
                <div
                  className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-border-soft p-4"
                  key={line.lineId}
                >
                  <Type as="p" variant="body-strong">
                    “{lineText.get(line.lineId) ?? line.transcript}”
                  </Type>
                  <div className="flex flex-col gap-1">
                    {missed.length > 0 ? (
                      <Type as="p" className="text-muted-foreground" variant="caption">
                        Words not recognized: {missed.join(", ")}
                      </Type>
                    ) : null}
                    {timingNote ? (
                      <Type as="p" className="text-muted-foreground" variant="caption">
                        {timingNote}
                      </Type>
                    ) : null}
                  </div>
                  {onPracticeLine ? (
                    <Button
                      className="self-start"
                      onClick={() => onPracticeLine(line.lineId)}
                      size="sm"
                      variant="secondary"
                    >
                      Practice this line
                    </Button>
                  ) : null}
                </div>
              );
            })}
            {uncertainCount > 0 ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-xl)] border border-border-soft bg-muted/30 p-3">
                <WarningCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <Type as="p" className="text-muted-foreground" variant="caption">
                  {uncertainCount} line{uncertainCount === 1 ? "" : "s"} couldn’t be measured (audio or
                  connection). These don’t count against your score.
                </Type>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Words to review (language-learning) */}
        {reviewWords.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SectionHeading>Words to review</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {reviewWords.map((item) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-border-soft px-3 py-1 text-sm"
                  key={item.word}
                >
                  {item.word}
                  {item.missCount && item.missCount > 1 ? (
                    <span className="text-muted-foreground">×{item.missCount}</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Song rankings */}
        {ranking && ranking.entries.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SectionHeading>
              {ranking.scope === "weekly" ? "This week" : ranking.scope === "all_time" ? "All-time" : "Community"} ranking
            </SectionHeading>
            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-soft">
              {ranking.entries.map((entry) => (
                <div
                  className={cn(
                    "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-soft px-4 py-2.5 last:border-b-0",
                    entry.isCurrentUser && "bg-muted/50",
                  )}
                  key={`${entry.rank}-${entry.displayName}`}
                >
                  <Type as="span" className="text-muted-foreground tabular-nums" variant="caption">
                    #{entry.rank}
                  </Type>
                  <Type as="span" className={cn("truncate", entry.isCurrentUser && "font-semibold")} variant="body">
                    {entry.isCurrentUser ? "You" : entry.displayName}
                  </Type>
                  <Type as="span" className="tabular-nums" variant="body-strong">
                    {percent(entry.score)}
                  </Type>
                </div>
              ))}
            </div>
            {onViewRankings ? (
              <Button className="self-center" onClick={onViewRankings} size="sm" variant="ghost">
                View full leaderboard
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Attempt history */}
        {attempts && attempts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <SectionHeading>Your attempts</SectionHeading>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {attempts.map((attempt) => (
                <Type
                  as="span"
                  className={cn("tabular-nums", attempt.isBest ? "font-semibold" : "text-muted-foreground")}
                  key={attempt.label}
                  variant="caption"
                >
                  {attempt.label} {percent(attempt.score)}
                  {attempt.isBest ? " · best" : ""}
                </Type>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
