import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface KaraokeScoreSummaryProps {
  /** Final score, 0..1. */
  finalScore: number;
  /** Lines that couldn't be measured (provider/stream failure) — drives a neutral caveat. */
  uncertainLineCount?: number;
  className?: string;
}

function percent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

/**
 * The end-of-take result shown centered on the stage (not in the footer): the
 * final score, with a neutral measurement caveat when some lines couldn't be
 * measured. The "Sing again" action lives in the footer (the usual controls slot).
 */
export function KaraokeScoreSummary({ className, finalScore, uncertainLineCount = 0 }: KaraokeScoreSummaryProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      <Type as="p" className="text-muted-foreground" variant="caption">
        Final score
      </Type>
      <Type as="p" className="tabular-nums leading-none" variant="display">
        {percent(finalScore)}
      </Type>
      {uncertainLineCount > 0 ? (
        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
          Some lines couldn’t be measured.
        </Type>
      ) : null}
    </div>
  );
}
