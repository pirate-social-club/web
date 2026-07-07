import * as React from "react";
import {
  BookOpen,
  CaretLeft,
  CheckCircle,
  Fire,
  Microphone,
  SpeakerHigh,
  Stop,
  Trophy,
  XCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface SongStudyOption {
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

export interface SongStudySayItBackFeedback {
  extra?: string[];
  matched?: string[];
  missing?: string[];
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
    feedback?: SongStudySayItBackFeedback;
    phase: "idle" | "listening" | "checking" | "wrong" | "correct";
    revealReference?: boolean;
    transcript?: string;
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
      studyCorrectCount: number;
      studyTargetCount: number;
    };
    totalCount: number;
  };

export interface SongStudySurfaceProps {
  artistName?: string;
  artworkSrc?: string;
  className?: string;
  onExit?: () => void;
  onOptionSelect?: (optionId: string) => void;
  onPrimaryAction?: () => void;
  state: SongStudySurfaceState;
  title: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function primaryActionLabel(state: SongStudySurfaceState): string | undefined {
  switch (state.kind) {
    case "locked":
      return state.priceLabel ? `Buy ${state.priceLabel}` : "Buy";
    case "say_it_back":
      if (state.phase === "correct") return "Continue";
      if (state.phase === "wrong") return state.revealReference ? "Continue" : "Record";
      if (state.phase === "checking") return "Checking…";
      return state.phase === "listening" ? "Stop" : "Record";
    case "multiple_choice":
      if (state.submitting) return "Checking…";
      if (state.result === "wrong" && state.canRetry) return "Try again";
      return state.result ? "Continue" : undefined;
    case "complete":
      return "Back to song";
  }
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
  onPrimaryAction,
}: {
  primaryDisabled?: boolean;
  primaryIcon?: React.ReactNode;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
}) {
  if (!primaryLabel) return null;

  return (
    <footer className="sticky bottom-0 z-10 border-t border-border-soft bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto grid w-full max-w-3xl gap-3">
        <Button className="w-full" disabled={primaryDisabled} leadingIcon={primaryIcon} onClick={onPrimaryAction} size="lg">
          {primaryLabel}
        </Button>
      </div>
    </footer>
  );
}

function Header({
  artistName,
  artworkSrc,
  onExit,
  title,
}: {
  artistName?: string;
  artworkSrc?: string;
  onExit?: () => void;
  title: string;
}) {
  return (
    <header className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border-soft px-4 py-2 sm:min-h-20 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6 sm:py-3">
      <Button
        aria-label="Exit study"
        className="size-10 px-0 sm:size-11"
        leadingIcon={<CaretLeft className="size-5" weight="bold" />}
        onClick={onExit}
        size="icon"
        variant="ghost"
      />
      <div className="min-w-0">
        <Type as="h1" className="truncate" variant="h3">
          {title}
        </Type>
        {artistName ? (
          <Type as="p" className="hidden truncate text-muted-foreground sm:block" variant="caption">
            {artistName}
          </Type>
        ) : null}
      </div>
      {artworkSrc ? (
        <img
          alt=""
          aria-hidden="true"
          className="hidden size-12 rounded-[var(--radius-lg)] object-cover sm:block"
          src={artworkSrc}
        />
      ) : (
        <div aria-hidden="true" className="hidden size-12 rounded-[var(--radius-lg)] bg-muted sm:block" />
      )}
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
  const isWrong = state.phase === "wrong";
  const isCorrect = state.phase === "correct";
  const showStatus = isWrong || isCorrect;

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

      {showStatus ? (
        <div
          className={cn(
            "rounded-[var(--radius-xl)] border p-4",
            isWrong && "border-destructive/30 bg-destructive/10",
            isCorrect && "border-success/30 bg-success/10",
          )}
        >
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <CheckCircle className="size-6 text-success" weight="fill" />
            ) : isWrong ? (
              <XCircle className="size-6 text-destructive" weight="fill" />
            ) : (
              <Microphone className="size-6 animate-pulse text-primary" weight="fill" />
            )}
            <Type as="p" className="min-w-0 truncate text-muted-foreground" dir="auto" variant="body-strong">
              <span className={cn(isCorrect && "text-success", isWrong && "text-destructive")}>
                {isCorrect ? "Correct." : "Incorrect."}
              </span>
              {state.transcript ? ` You said, "${state.transcript}"` : null}
            </Type>
          </div>
        </div>
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

function CompleteState({ state }: { state: Extract<SongStudySurfaceState, { kind: "complete" }> }) {
  const score = clampPercent(state.scorePercent);
  const streak = state.streak;
  const streakProgress = streak
    ? `${Math.min(streak.studyCorrectCount, streak.studyTargetCount)} of ${streak.studyTargetCount}`
    : null;

  return (
    <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-10 text-center sm:px-6">
      <div>
        <div className={cn(
          "mx-auto mb-4 grid size-20 place-items-center rounded-full",
          streak?.qualifiedToday ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary",
        )}>
          {streak?.qualifiedToday
            ? <Fire className="size-11" weight="duotone" />
            : <Trophy className="size-11" weight="duotone" />}
        </div>
        <Type as="p" className="text-muted-foreground" variant="caption">
          {streak?.qualifiedToday ? "Streak extended" : "Session complete"}
        </Type>
        <Type as="h2" className="mt-1" variant="h1">
          {streak?.qualifiedToday ? `${streak.currentStreak} day${streak.currentStreak === 1 ? "" : "s"}` : `${score}%`}
        </Type>
        <Type as="p" className="mt-2 text-muted-foreground" variant="body">
          {state.correctCount} of {state.totalCount} exercises correct.
        </Type>
        {streak && !streak.qualifiedToday ? (
          <Type as="p" className="mt-4 text-muted-foreground" variant="caption">
            {streakProgress} correct toward today's streak.
          </Type>
        ) : null}
        {streak?.qualifiedToday && streakProgress ? (
          <Type as="p" className="mt-4 text-muted-foreground" variant="caption">
            Today's streak target met: {streakProgress} correct.
          </Type>
        ) : null}
        {state.nextReviewLabel ? (
          <Type as="p" className="mt-4 text-muted-foreground" variant="caption">
            Next review: {state.nextReviewLabel}
          </Type>
        ) : null}
      </div>
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
  artistName,
  artworkSrc,
  className,
  onExit,
  onOptionSelect,
  onPrimaryAction,
  state,
  title,
}: SongStudySurfaceProps) {
  return (
    <section className={cn("flex h-dvh w-full flex-col overflow-y-auto bg-background text-foreground", className)}>
      <Header artistName={artistName} artworkSrc={artworkSrc} onExit={onExit} title={title} />
      <Body onOptionSelect={onOptionSelect} state={state} />
      <ActivityFooter
        primaryDisabled={primaryActionDisabled(state)}
        primaryIcon={primaryActionIcon(state)}
        primaryLabel={primaryActionLabel(state)}
        onPrimaryAction={onPrimaryAction}
      />
    </section>
  );
}
