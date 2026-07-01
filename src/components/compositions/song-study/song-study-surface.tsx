import * as React from "react";
import {
  BookOpen,
  CaretLeft,
  CheckCircle,
  GraduationCap,
  Microphone,
  SpeakerHigh,
  Trophy,
  Translate,
  XCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
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
    kind: "start";
    exerciseCount: number;
    hasKaraoke?: boolean;
    progressLabel?: string;
    sourceLanguageLabel: string;
    targetLanguageLabel: string;
  }
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
    submitting?: boolean;
  }
  | {
    kind: "complete";
    correctCount: number;
    nextReviewLabel?: string;
    scorePercent: number;
    totalCount: number;
  };

export interface SongStudySurfaceProps {
  artistName?: string;
  artworkSrc?: string;
  className?: string;
  onExit?: () => void;
  onOptionSelect?: (optionId: string) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  state: SongStudySurfaceState;
  title: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function primaryActionLabel(state: SongStudySurfaceState): string {
  switch (state.kind) {
    case "start":
      return "Study";
    case "locked":
      return state.priceLabel ? `Buy ${state.priceLabel}` : "Buy";
    case "say_it_back":
      if (state.phase === "correct") return "Continue";
      if (state.phase === "wrong") return state.revealReference ? "Continue" : "Record again";
      if (state.phase === "checking") return "Checking…";
      return state.phase === "listening" ? "Stop recording" : "Record";
    case "multiple_choice":
      if (state.submitting) return "Checking…";
      if (state.result === "wrong" && state.canRetry) return "Try again";
      return state.result ? "Continue" : "Check answer";
    case "complete":
      return "Back to song";
  }
}

function primaryActionDisabled(state: SongStudySurfaceState): boolean {
  if (state.kind === "multiple_choice") return Boolean(state.submitting) || (!state.result && !state.selectedOptionId);
  if (state.kind === "say_it_back") return state.phase === "checking";
  return false;
}

function ActivityFooter({
  primaryDisabled,
  primaryLabel,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
}: {
  primaryDisabled?: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-border-soft bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-xl sm:px-6">
      <div className={cn("mx-auto grid w-full max-w-3xl gap-3", secondaryLabel && "sm:grid-cols-2")}>
        {secondaryLabel ? (
          <Button className="w-full" onClick={onSecondaryAction} size="lg" variant="secondary">
            {secondaryLabel}
          </Button>
        ) : null}
        <Button className="w-full" disabled={primaryDisabled} onClick={onPrimaryAction} size="lg">
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

function StudyPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-soft bg-muted px-3 py-1 text-base font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function StartState({ state }: { state: Extract<SongStudySurfaceState, { kind: "start" }> }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="size-9" weight="duotone" />
        </div>
        <div>
          <Type as="h2" variant="h2">
            Learn this song line by line
          </Type>
          <Type as="p" className="mx-auto mt-2 max-w-xl text-muted-foreground" variant="body">
            Practice listening, recall, and translation with short exercises generated from the lyrics.
          </Type>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <StudyPill>{state.exerciseCount} exercises</StudyPill>
          <StudyPill>{state.sourceLanguageLabel} → {state.targetLanguageLabel}</StudyPill>
          {state.progressLabel ? <StudyPill>{state.progressLabel}</StudyPill> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Microphone className="size-5" weight="fill" />
          </div>
          <Type as="h3" variant="body-strong">
            Say it back
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            Hear a lyric, repeat it, then get a second attempt when the transcript misses.
          </Type>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
          <div className="mb-3 grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Translate className="size-5" weight="fill" />
          </div>
          <Type as="h3" variant="body-strong">
            Translation choice
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            Pick the right meaning from shuffled server-generated distractors.
          </Type>
        </div>
      </div>
    </div>
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
  const missing = state.feedback?.missing?.filter(Boolean) ?? [];
  const extra = state.feedback?.extra?.filter(Boolean) ?? [];

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
        {state.exercise.translation ? (
          <Type as="p" className="mt-4 text-muted-foreground" dir="auto" variant="body">
            {state.exercise.translation}
          </Type>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-[var(--radius-xl)] border p-4",
          state.phase === "listening" && "border-primary/30 bg-primary/10",
          state.phase === "checking" && "border-primary/30 bg-primary/10",
          isWrong && "border-destructive/30 bg-destructive/10",
          isCorrect && "border-success/30 bg-success/10",
          state.phase === "idle" && "border-border-soft bg-muted/40",
        )}
      >
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle className="size-6 text-success" weight="fill" />
          ) : isWrong ? (
            <XCircle className="size-6 text-destructive" weight="fill" />
          ) : state.phase === "checking" ? (
            <Microphone className="size-6 animate-pulse text-primary" weight="fill" />
          ) : (
            <Microphone className={cn("size-6", state.phase === "listening" && "animate-pulse text-primary")} weight="fill" />
          )}
          <div className="min-w-0">
            <Type as="p" variant="body-strong">
              {isCorrect
                ? "Correct"
                : isWrong
                  ? "Not quite"
                  : state.phase === "checking"
                    ? "Checking your line"
                    : state.phase === "listening"
                      ? "Listening…"
                      : "Ready"}
            </Type>
            <Type as="p" className="truncate text-muted-foreground" dir="auto" variant="caption">
              {state.transcript ? `Heard: ${state.transcript}` : "Your transcript will appear here."}
            </Type>
          </div>
        </div>
        {isWrong && (missing.length > 0 || extra.length > 0 || state.revealReference) ? (
          <div className="mt-4 space-y-3 border-t border-border-soft pt-4">
            {missing.length > 0 ? (
              <div>
                <Type as="p" className="text-destructive" variant="caption">
                  Missing
                </Type>
                <Type as="p" className="mt-1" dir="auto" variant="body-strong">
                  {missing.join(" · ")}
                </Type>
              </div>
            ) : null}
            {extra.length > 0 ? (
              <div>
                <Type as="p" className="text-muted-foreground" variant="caption">
                  Extra
                </Type>
                <Type as="p" className="mt-1" dir="auto" variant="body-strong">
                  {extra.join(" · ")}
                </Type>
              </div>
            ) : null}
            {state.revealReference ? (
              <div>
                <Type as="p" className="text-muted-foreground" variant="caption">
                  Reference
                </Type>
                <Type as="p" className="mt-1" dir="auto" variant="body-strong">
                  {state.exercise.expected}
                </Type>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
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
                selected && !state.result && "border-primary bg-primary/10",
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
                <span className={cn("size-5 shrink-0 rounded-full border", selected ? "border-primary bg-primary" : "border-border")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompleteState({ state }: { state: Extract<SongStudySurfaceState, { kind: "complete" }> }) {
  const score = clampPercent(state.scorePercent);

  return (
    <div className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-10 text-center sm:px-6">
      <div>
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
          <Trophy className="size-11" weight="duotone" />
        </div>
        <Type as="p" className="text-muted-foreground" variant="caption">
          Session complete
        </Type>
        <Type as="h2" className="mt-1" variant="h1">
          {score}%
        </Type>
        <Type as="p" className="mt-2 text-muted-foreground" variant="body">
          {state.correctCount} of {state.totalCount} exercises correct.
        </Type>
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
    case "start":
      return <StartState state={state} />;
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
  onSecondaryAction,
  state,
  title,
}: SongStudySurfaceProps) {
  return (
    <section className={cn("flex min-h-screen w-full flex-col bg-background text-foreground", className)}>
      <Header artistName={artistName} artworkSrc={artworkSrc} onExit={onExit} title={title} />
      <Body onOptionSelect={onOptionSelect} state={state} />
      <ActivityFooter
        primaryDisabled={primaryActionDisabled(state)}
        primaryLabel={primaryActionLabel(state)}
        secondaryLabel={state.kind === "start" && state.hasKaraoke ? "Karaoke" : undefined}
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />
    </section>
  );
}
