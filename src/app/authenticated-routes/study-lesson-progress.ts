export interface StudyLessonProgress {
  resolvedCount: number;
  totalCount: number;
}

export function studyLessonProgress(input: {
  exerciseIds: readonly string[];
  exerciseQueue: readonly number[];
  totalCount: number;
}): StudyLessonProgress {
  const totalCount = Math.max(0, input.totalCount);
  const unresolvedCount = new Set(
    input.exerciseQueue.map((index) => input.exerciseIds[index]).filter(Boolean),
  ).size;

  return {
    resolvedCount: Math.max(0, totalCount - unresolvedCount),
    totalCount,
  };
}
