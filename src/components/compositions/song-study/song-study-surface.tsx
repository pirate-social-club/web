import * as React from "react";
import {
  BookOpen,
  CheckCircle,
  Fire,
  GraduationCap,
  Microphone,
  SpeakerHigh,
  Stop,
  Trophy,
  X,
  XCircle,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { SongStreakEntryList } from "./song-streak-parts";
import type { SongStreakSummary } from "./song-streak-preview";

interface SongStudyOption {
  id: string;
  text: string;
}

export interface SongStudySayItBackExercise {
  id: string;
  lineNumber: number;
  maxAttempts: number;
  prompt: string;
  translation?: string;
  expected: string;
}

export interface SongStudyMultipleChoiceExercise {
  id: string;
  lineNumber: number;
  maxAttempts: number;
  prompt: string;
  question: string;
  options: SongStudyOption[];
  correctOptionId: string;
}

export type SongStudySurfaceState =
  | {
    kind: "locked";
    priceLabel?: string;
  }
  | {
    kind: "say_it_back";
    attemptNumber: number;
    exercise: SongStudySayItBackExercise;
    guidance?: string;
    phase: "idle" | "listening" | "checking" | "wrong";
    revealReference?: boolean;
    submitError?: string;
  }
  | {
    kind: "multiple_choice";
    attemptNumber: number;
    canRetry?: boolean;
    exercise: SongStudyMultipleChoiceExercise;
    result?: "correct" | "wrong";
    selectedOptionId?: string;
    submitError?: string;
    submitting?: boolean;
  }
  | {
    kind: "complete";
    correctCount: number;
    nextReviewLabel?: string;
    scorePercent: number;
    streak?: {
      currentStreak: number;
      qualifiedToday: boolean;
      studyAttemptsToday: number;
      studyCorrectCount: number;
      studyTargetCount: number;
    };
    streakSummary?: SongStreakSummary;
    totalCount: number;
  };

export interface SongStudySurfaceProps {
  artworkSrc?: string;
  className?: string;
  lessonProgress?: {
    resolvedCount: number;
    totalCount: number;
  };
  onExit?: () => void;
  onKaraoke?: () => void;
  onOptionSelect?: (optionId: string) => void;
  onPrimaryAction?: () => void;
  onStudyAgain?: () => void;
  rewardSlot?: React.ReactNode;
  sayItBackIdleLabel?: string;
  state: SongStudySurfaceState;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function primaryActionLabel(
  state: SongStudySurfaceState,
  sayItBackIdleLabel?: string,
): string | undefined {
  switch (state.kind) {
    case "locked":
      return state.priceLabel ? `Buy ${state.priceLabel}` : "Buy";
    case "say_it_back":
      if (state.phase === "wrong") return state.revealReference ? "Continue" : "Record";
      if (state.phase === "checking") return "Checking…";
      return state.phase === "listening" ? "Stop" : sayItBackIdleLabel ?? "Record";
    case "multiple_choice":
      if (state.submitting) return "Checking…";
      if (state.result === "wrong" && state.canRetry) return "Try again";
      return state.result ? "Continue" : undefined;
    case "complete":
      return undefined;
  }
}

function primaryActionVariant(state: SongStudySurfaceState): "default" | "destructive" | "secondary" {
  if (state.kind === "say_it_back") {
    if (state.phase === "listening") return "secondary";
    if (state.phase === "wrong") return "destructive";
    return "default";
  }
  if (state.kind === "multiple_choice" && state.result === "wrong") return "destructive";
  return "default";
}

function primaryActionIcon(state: SongStudySurfaceState): React.ReactNode {
  if (state.kind !== "say_it_back") return undefined;
  if (state.phase === "checking") return <Spinner className="size-5" />;
  if (state.phase === "listening") return <Stop className="size-5" weight="fill" />;
  if (state.phase === "idle" || (state.phase === "wrong" && !state.revealReference)) {
    return <Microphone className="size-5" weight="fill" />;
  }
  return undefined;
}

function primaryActionDisabled(state: SongStudySurfaceState): boolean {
  if (state.kind === "multiple_choice") return Boolean(state.submitting);
  if (state.kind === "say_it_back") return state.phase === "checking";
  return false;
}

function ActivityFooter({
  primaryDisabled,
  primaryIcon,
  primaryLabel,
  primaryVariant = "default",
  secondaryIcon,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
}: {
  primaryDisabled?: boolean;
  primaryIcon?: React.ReactNode;
  primaryLabel?: string;
  primaryVariant?: "default" | "destructive" | "secondary";
  secondaryIcon?: React.ReactNode;
  secondaryLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  if (!primaryLabel) return null;

  return (
    <footer className="sticky bottom-0 z-10 border-t border-border-soft bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-xl sm:px-6">
      <div className={cn("mx-auto grid w-full max-w-3xl gap-3", secondaryLabel && "sm:grid-cols-2")}>
        <Button className="w-full" disabled={primaryDisabled} leadingIcon={primaryIcon} onClick={onPrimaryAction} size="lg" variant={primaryVariant}>
          {primaryLabel}
        </Button>
        {secondaryLabel ? (
          <Button
            className="w-full"
            leadingIcon={secondaryIcon}
            onClick={onSecondaryAction}
            size="lg"
            variant="secondary"
          >
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}

function Header({
  lessonProgress,
  onExit,
  trailing,
}: {
  lessonProgress?: SongStudySurfaceProps["lessonProgress"];
  onExit?: () => void;
  trailing?: React.ReactNode;
}) {
  const totalCount = Math.max(0, lessonProgress?.totalCount ?? 0);
  const resolvedCount = Math.max(0, Math.min(totalCount, lessonProgress?.resolvedCount ?? 0));
  const progressPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  return (
    <header className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border-soft px-4 py-2 sm:min-h-20 sm:px-6 sm:py-3">
      <Button
        aria-label="Exit study"
        className="size-10 px-0 sm:size-11"
        leadingIcon={<X className="size-5" weight="bold" />}
        onClick={onExit}
        size="icon"
        variant="ghost"
      />
      <div className="flex min-w-0 items-center gap-3">
        <Type as="h1" className="sr-only">
          Study
        </Type>
        {lessonProgress ? (
          <div
            aria-label="Lesson progress"
            aria-valuemax={totalCount}
            aria-valuemin={0}
            aria-valuenow={resolvedCount}
            className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}
        {trailing}
      </div>
    </header>
  );
}

function LockedState({ state }: { state: Extract<SongStudySurfaceState, { kind: "locked" }> }) {
  return (
    <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-10 text-center sm:px-6">
      <div>
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <BookOpen className="size-8" weight="duotone" />
        </div>
        <Type as="h2" variant="h2">
          Study unlocks with the song
        </Type>
        <Type as="p" className="mt-2 text-muted-foreground" variant="body">
          Lyrics and translations follow the same access rules as the full track.
        </Type>
        {state.priceLabel ? (
          <Type as="p" className="mt-4 text-muted-foreground" variant="caption">
            Full study access is included after purchase.
          </Type>
        ) : null}
      </div>
    </div>
  );
}

function SayItBackState({ state }: { state: Extract<SongStudySurfaceState, { kind: "say_it_back" }> }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="rounded-[var(--radius-2xl)] border border-border-soft bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center gap-3 text-muted-foreground">
          <SpeakerHigh className="size-5" weight="fill" />
          <Type as="span" variant="caption">Say it back</Type>
        </div>
        <Type as="p" className="text-balance text-3xl font-bold leading-tight sm:text-5xl" dir="auto">
          {state.exercise.prompt}
        </Type>
      </div>

      {state.phase === "wrong" ? (
        <div className="rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="size-6 shrink-0 text-destructive" weight="fill" />
            <div className="min-w-0">
              <Type as="p" className="text-destructive" variant="caption">
                Correct answer:
              </Type>
              <Type as="p" dir="auto" variant="body-strong">
                {state.exercise.expected}
              </Type>
            </div>
          </div>
        </div>
      ) : null}
      {state.submitError ? (
        <Type as="p" className="text-destructive" role="alert" variant="caption">
          {state.submitError}
        </Type>
      ) : null}
      {state.guidance ? (
        <Type as="p" className="text-muted-foreground" role="status" variant="body">
          {state.guidance}
        </Type>
      ) : null}
    </div>
  );
}

function MultipleChoiceState({
  onOptionSelect,
  state,
}: {
  onOptionSelect?: (optionId: string) => void;
  state: Extract<SongStudySurfaceState, { kind: "multiple_choice" }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div>
        <Type as="p" className="text-muted-foreground" variant="caption">
          {state.exercise.question}
        </Type>
        <Type as="h2" className="mt-2 text-balance" dir="auto" variant="h2">
          {state.exercise.prompt}
        </Type>
      </div>

      <div className="grid gap-3">
        {state.exercise.options.map((option) => {
          const selected = option.id === state.selectedOptionId;
          const correct = option.id === state.exercise.correctOptionId;
          const revealCorrect = state.result && correct;
          const revealWrong = state.result === "wrong" && selected && !correct;

          return (
            <button
              className={cn(
                "flex min-h-16 items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-border-soft bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50",
                selected && !state.result && "border-foreground/30 bg-muted/70",
                revealCorrect && "border-success/40 bg-success/10",
                revealWrong && "border-destructive/40 bg-destructive/10",
              )}
              data-post-card-interactive="true"
              disabled={Boolean(state.result) || Boolean(state.submitting)}
              key={option.id}
              onClick={() => onOptionSelect?.(option.id)}
              type="button"
            >
              <Type as="span" dir="auto" variant="body-strong">
                {option.text}
              </Type>
              {revealCorrect ? (
                <CheckCircle className="size-6 shrink-0 text-success" weight="fill" />
              ) : revealWrong ? (
                <XCircle className="size-6 shrink-0 text-destructive" weight="fill" />
              ) : (
                <span className={cn("size-5 shrink-0 rounded-full border", selected ? "border-foreground bg-foreground" : "border-border")} />
              )}
            </button>
          );
        })}
      </div>

      {state.submitError ? (
        <Type as="p" className="text-destructive" role="alert" variant="caption">
          {state.submitError}
        </Type>
      ) : null}
    </div>
  );
}

// Patch the viewer's leaderboard row with the just-earned streak so the top-3
// count never contradicts the celebration card, then re-sort and re-rank the
// board the same way the server does (current streak desc, best streak desc,
// oldest streak start first, user id as final tiebreak; competition ranks
// keyed on the current/best pair) so a viewer who just hit #1 renders at
// rank 1 with the crown.
function patchViewerEntry(
  entries: SongStreakSummary["entries"],
  streak: { currentStreak: number },
): SongStreakSummary["entries"] {
  const sorted = entries
    .map((entry) =>
      entry.is_viewer
        ? {
            ...entry,
            current_streak: streak.currentStreak,
            best_streak: Math.max(entry.best_streak, streak.currentStreak),
          }
        : entry,
    )
    .sort((a, b) =>
      b.current_streak - a.current_streak
      || b.best_streak - a.best_streak
      || a.streak_started_date.localeCompare(b.streak_started_date)
      || a.identity.user_id.localeCompare(b.identity.user_id),
    );
  let previousPair: string | undefined;
  let previousRank = 0;
  return sorted.map((entry, index) => {
    const pair = `${entry.current_streak}:${entry.best_streak}`;
    const rank = pair === previousPair ? previousRank : index + 1;
    previousPair = pair;
    previousRank = rank;
    return { ...entry, rank };
  });
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

function previousStreakFromSummary(
  streak: { currentStreak: number } | undefined,
  summary: SongStreakSummary | undefined,
): number | undefined {
  if (!streak) return undefined;
  const previous = summary?.viewer?.current_streak ?? streak.currentStreak - 1;
  return Math.max(0, Math.min(previous, streak.currentStreak));
}

function StreakSlotNumber({
  currentStreak,
  previousStreak,
}: {
  currentStreak: number;
  previousStreak: number;
}) {
  const startDelayMs = 450;
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = currentStreak > previousStreak && !prefersReducedMotion;
  const [advanced, setAdvanced] = React.useState(false);

  React.useEffect(() => {
    if (!shouldAnimate) {
      setAdvanced(false);
      return;
    }

    setAdvanced(false);
    const timeout = window.setTimeout(() => setAdvanced(true), startDelayMs);
    return () => window.clearTimeout(timeout);
  }, [currentStreak, previousStreak, shouldAnimate]);

  if (!shouldAnimate) {
    return (
      <Type
        aria-label={`${currentStreak} day streak`}
        as="h2"
        className="mt-1 text-7xl font-bold leading-none tabular-nums sm:text-8xl"
      >
        {currentStreak}
      </Type>
    );
  }

  return (
    <h2
      aria-label={`${currentStreak} day streak`}
      className="relative mt-1 h-[0.92em] overflow-hidden text-7xl font-bold leading-none tabular-nums sm:text-8xl"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 block transition-[transform,opacity] duration-[1200ms] ease-out",
          advanced ? "translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {previousStreak}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 block transition-[transform,opacity] duration-[1200ms] ease-out",
          advanced ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        )}
      >
        {currentStreak}
      </span>
    </h2>
  );
}

function ViewerLeaderboardRow({
  currentStreak,
  rank,
}: {
  currentStreak: number;
  rank?: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-2xl)] border border-primary/40 bg-primary/10 px-5 py-4">
      <span className="grid size-10 place-items-center text-xl font-semibold tabular-nums text-muted-foreground">
        {rank ? `#${rank}` : "You"}
      </span>
      <Avatar fallback="You" fallbackSeed="song-study-viewer" size="sm" />
      <Type as="p" className="min-w-0 flex-1 truncate text-lg" variant="body-strong">
        You
      </Type>
      <span className="inline-flex min-w-20 items-center justify-end gap-1.5 text-2xl font-semibold tabular-nums text-primary">
        {currentStreak}
        <Fire className="size-8" weight="fill" />
      </span>
    </div>
  );
}

function PerformanceStat({
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

function CompleteState({ state }: { state: Extract<SongStudySurfaceState, { kind: "complete" }> }) {
  const score = clampPercent(state.scorePercent);
  const streak = state.streak;

  const summary = state.streakSummary;
  const previousStreak = previousStreakFromSummary(streak, summary);
  const summaryEntries = summary && streak
    ? patchViewerEntry(summary.entries, streak)
    : summary?.entries ?? [];
  const viewerVisible = summaryEntries.slice(0, 3).some((entry) => entry.is_viewer);
  const showViewerRow = Boolean(streak && summary?.viewer && !viewerVisible);
  const viewerPreviewRank = summaryEntries.slice(0, 3).length + 1;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6">
      <div className="text-center">
        <div className={cn(
          "mx-auto mb-5 grid size-24 place-items-center rounded-full",
          streak?.qualifiedToday ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary",
        )}>
          {streak?.qualifiedToday
            ? <Fire className="size-14" weight="duotone" />
            : <Trophy className="size-14" weight="duotone" />}
        </div>
        <Type as="p" className="text-lg font-semibold text-muted-foreground" variant="body">
          {streak?.qualifiedToday ? "Your streak" : "Session complete"}
        </Type>
        {streak?.qualifiedToday && previousStreak !== undefined ? (
          <>
            <StreakSlotNumber currentStreak={streak.currentStreak} previousStreak={previousStreak} />
            <Type as="p" className="mt-3 font-semibold text-foreground" variant="body">
              {`${score}% first-pass score`}
            </Type>
          </>
        ) : (
          <Type as="h2" className="mt-1 text-7xl font-bold leading-none sm:text-8xl">
            {`${score}%`}
          </Type>
        )}
      </div>

      <div className="w-full">
        <PerformanceStat label="Correct" value={`${state.correctCount}/${state.totalCount}`} />
      </div>

      {summaryEntries.length > 0 || showViewerRow ? (
        <div className="w-full space-y-3">
          {summaryEntries.length > 0 ? (
            <SongStreakEntryList
              className="space-y-3 [&_li>span:first-child]:!size-10 [&_li>span:first-child_svg]:!size-8 [&_li>span:last-child]:!min-w-20 [&_li>span:last-child]:!text-2xl [&_li>span:last-child_svg]:!size-8 [&_li]:!gap-4 [&_li]:!rounded-[var(--radius-2xl)] [&_li]:!px-5 [&_li]:!py-4 [&_li_p]:!text-lg"
              entries={summaryEntries}
              limit={3}
            />
          ) : null}
          {showViewerRow && streak ? (
            <ViewerLeaderboardRow currentStreak={streak.currentStreak} rank={viewerPreviewRank} />
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

function Body({
  onOptionSelect,
  state,
}: {
  onOptionSelect?: (optionId: string) => void;
  state: SongStudySurfaceState;
}) {
  switch (state.kind) {
    case "locked":
      return <LockedState state={state} />;
    case "say_it_back":
      return <SayItBackState state={state} />;
    case "multiple_choice":
      return <MultipleChoiceState onOptionSelect={onOptionSelect} state={state} />;
    case "complete":
      return <CompleteState state={state} />;
  }
}

export function SongStudySurface({
  className,
  lessonProgress,
  onExit,
  onKaraoke,
  onOptionSelect,
  onPrimaryAction,
  onStudyAgain,
  rewardSlot,
  sayItBackIdleLabel,
  state,
}: SongStudySurfaceProps) {
  const complete = state.kind === "complete";
  const primaryLabel = complete
    ? onStudyAgain
      ? "Study again"
      : onKaraoke
        ? "Karaoke"
        : undefined
    : primaryActionLabel(state, sayItBackIdleLabel);
  const primaryAction = complete ? onStudyAgain ?? onKaraoke : onPrimaryAction;
  const primaryIcon = complete
    ? onStudyAgain
      ? <GraduationCap className="size-5" weight="fill" />
      : onKaraoke
        ? <Microphone className="size-5" weight="fill" />
        : undefined
    : primaryActionIcon(state);
  const secondaryLabel = complete && onStudyAgain && onKaraoke ? "Karaoke" : undefined;

  return (
    <section className={cn("flex h-dvh w-full flex-col overflow-y-auto bg-background text-foreground", className)}>
      <Header lessonProgress={lessonProgress} onExit={onExit} trailing={complete ? undefined : rewardSlot} />
      {complete && rewardSlot ? (
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
          {rewardSlot}
        </div>
      ) : null}
      <Body onOptionSelect={onOptionSelect} state={state} />
      <ActivityFooter
        primaryDisabled={primaryActionDisabled(state)}
        primaryIcon={primaryIcon}
        primaryLabel={primaryLabel}
        primaryVariant={primaryActionVariant(state)}
        secondaryIcon={<Microphone className="size-5" weight="fill" />}
        secondaryLabel={secondaryLabel}
        onPrimaryAction={primaryAction}
        onSecondaryAction={onKaraoke}
      />
    </section>
  );
}
