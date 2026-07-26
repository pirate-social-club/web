import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface KaraokeScoreSummaryProps {
  /** Final score, 0..1. */
  finalScore: number;
  /** Lyrics accuracy score, 0..1. */
  lyricsScore?: number;
  /** Number of lyric lines available in the take. */
  lineCount?: number;
  /** Number of lyric lines that received a usable score. */
  scoredLineCount?: number;
  /** Timing score, 0..1. */
  timingScore?: number;
  /**
   * Timing was measured but could not be calibrated for this take, so it did not
   * count. Say so plainly: the singer must never be left guessing whether a
   * missing metric cost them something.
   */
  timingCalibrationUnavailable?: boolean;
  /** Which way the singer sat against the beat — shown alongside the timing score. */
  timingTrend?: "early" | "late" | "mixed" | "on_time";
  /** Lines that couldn't be measured (provider/stream failure) — drives a neutral caveat. */
  uncertainLineCount?: number;
  className?: string;
}

function percent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

// The trend is the actionable half of the timing metric: the score says how
// consistent you were, the label says which way to move.
function timingLabel(trend: KaraokeScoreSummaryProps["timingTrend"]): string {
  switch (trend) {
    case "early":
      return "Timing · ahead";
    case "late":
      return "Timing · behind";
    case "mixed":
      return "Timing · uneven";
    default:
      return "Timing";
  }
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-muted px-4 py-3 text-center">
      <Type as="p" className="text-xl font-semibold tabular-nums" variant="body-strong">
        {value}
      </Type>
      <Type as="p" className="text-muted-foreground" variant="caption">
        {label}
      </Type>
    </div>
  );
}

/**
 * The end-of-take result shown centered on the stage (not in the footer): the
 * final score, with a neutral measurement caveat when some lines couldn't be
 * measured. The "Sing again" action lives in the footer (the usual controls slot).
 */
export function KaraokeScoreSummary({
  className,
  finalScore,
  lyricsScore,
  lineCount,
  scoredLineCount,
  timingScore,
  timingCalibrationUnavailable = false,
  timingTrend,
  uncertainLineCount = 0,
}: KaraokeScoreSummaryProps) {
  const showLines = typeof lineCount === "number" && typeof scoredLineCount === "number";
  const showMetrics = typeof timingScore === "number" || typeof lyricsScore === "number" || showLines;
  return (
    <div className={cn("flex w-full flex-col items-center gap-6 text-center", className)}>
      <div>
        <Type as="p" className="text-lg font-semibold text-muted-foreground" variant="body">
          Your score
        </Type>
        <Type as="p" className="tabular-nums leading-none" variant="display">
          {percent(finalScore)}
        </Type>
      </div>
      {showMetrics ? (
        <div className="grid w-full grid-cols-3 gap-3">
          {typeof timingScore === "number" ? (
            <Metric label={timingLabel(timingTrend)} value={`${percent(timingScore)}%`} />
          ) : null}
          {typeof lyricsScore === "number" ? (
            <Metric label="Lyrics" value={`${percent(lyricsScore)}%`} />
          ) : null}
          {showLines ? (
            <Metric label="Lines" value={`${scoredLineCount}/${lineCount}`} />
          ) : null}
        </div>
      ) : null}
      {uncertainLineCount > 0 ? (
        <Type as="p" className="text-muted-foreground" variant="caption">
          Some lines couldn't be measured.
        </Type>
      ) : null}
      {timingCalibrationUnavailable ? (
        <Type as="p" className="text-muted-foreground" variant="caption">
          We couldn't measure your timing on this take, so it didn't count against your score.
        </Type>
      ) : null}
    </div>
  );
}
