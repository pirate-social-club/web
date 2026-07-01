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
  const indexes = new Map<string, number>();
  steps.forEach((step, index) => {
    indexes.set(step.key, index);
  });
  const display = resolveSubmitProgressDisplay(steps);

  return (key, detail) => {
    const index = indexes.get(key);
    if (index === undefined) return;
    const step = steps[index];
    emit({
      phase: step.phase,
      label: step.label,
      detail,
      currentIndex: index + 1,
      totalSteps: steps.length,
      display,
    });
  };
}
