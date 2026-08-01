export interface StudyLessonProgress {
  resolvedCount: number;
  totalCount: number;
}

export function studyLessonProgress(input: {
  exerciseQueue: readonly number[];
  totalCount: number;
}): StudyLessonProgress {
  const totalCount = Math.max(0, input.totalCount);
  const unresolvedCount = new Set(input.exerciseQueue).size;

  return {
    resolvedCount: Math.max(0, totalCount - unresolvedCount),
    totalCount,
  };
}
