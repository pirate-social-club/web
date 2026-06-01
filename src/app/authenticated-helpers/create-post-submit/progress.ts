"use client";

import type {
  SubmitProgress,
  SubmitProgressPhase,
} from "@/components/compositions/posts/post-composer/post-composer.types";

export type SubmitProgressStep = {
  key: string;
  phase: SubmitProgressPhase;
  label: string;
};

export type SubmitProgressReporter = (key: string, detail?: string) => void;

export function createSubmitProgressReporter(
  steps: SubmitProgressStep[],
  emit: (progress: SubmitProgress) => void,
): SubmitProgressReporter {
  const indexes = new Map<string, number>();
  steps.forEach((step, index) => {
    indexes.set(step.key, index);
  });

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
    });
  };
}
