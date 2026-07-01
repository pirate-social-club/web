"use client";

import type {
  SubmitProgress,
  SubmitProgressDisplay,
  SubmitProgressPhase,
} from "@/components/compositions/posts/post-composer/post-composer.types";

export type SubmitProgressStep = {
  key: string;
  phase: SubmitProgressPhase;
  label: string;
};

export type SubmitProgressReporter = (key: string, detail?: string) => void;

// Phases that represent genuinely slow, awaited work (network upload, media
// processing, on-chain checks). The bookkeeping phases — validating,
// publishing_post (a single create call), done — are effectively instant, so
// they should not inflate the step counter's denominator.
const MEANINGFUL_PROGRESS_PHASES: ReadonlySet<SubmitProgressPhase> = new Set([
  "preparing_media",
  "uploading_media",
  "processing_media",
  "checking_rights",
  "creating_listing",
  "checking_registration",
]);

// Decide presentation from the *actual* built step list rather than the composer
// type, so a flow that collapses to a single slow step at runtime (e.g. a song
// post reusing a pre-uploaded bundle) is presented as activity, not a misleading
// "1/4"-style pipeline.
export function resolveSubmitProgressDisplay(
  steps: SubmitProgressStep[],
): SubmitProgressDisplay {
  const meaningfulCount = steps.reduce(
    (count, step) => (MEANINGFUL_PROGRESS_PHASES.has(step.phase) ? count + 1 : count),
    0,
  );
  return meaningfulCount >= 2 ? "pipeline" : "activity";
}

export function createSubmitProgressReporter(
  steps: SubmitProgressStep[],
  emit: (progress: SubmitProgress) => void,
): SubmitProgressReporter {
  // "done" is a terminal completion signal (it stops the button spinner right
  // before the composer navigates to the new post), not a unit of work. Exclude
  // it from the counter so the last real step rests at "N/N" instead of the count
  // being inflated by a step the user never actually waits through.
  const byKey = new Map<string, SubmitProgressStep>();
  const countedIndex = new Map<string, number>();
  let counted = 0;
  for (const step of steps) {
    byKey.set(step.key, step);
    if (step.phase !== "done") {
      counted += 1;
      countedIndex.set(step.key, counted);
    }
  }
  const totalSteps = counted;
  const display = resolveSubmitProgressDisplay(steps);

  return (key, detail) => {
    const step = byKey.get(key);
    if (step === undefined) return;
    emit({
      phase: step.phase,
      label: step.label,
      detail,
      // done reports as complete (N/N); real steps report their counted position.
      currentIndex: step.phase === "done" ? totalSteps : (countedIndex.get(key) ?? totalSteps),
      totalSteps,
      display,
    });
  };
}
