import { describe, expect, test } from "bun:test";

import { studyLessonProgress } from "./study-lesson-progress";

describe("studyLessonProgress", () => {
  const exerciseIds = ["one", "two", "three", "four"];

  test("advances as distinct exercises resolve", () => {
    expect(studyLessonProgress({ exerciseIds, exerciseQueue: [1, 2, 3], totalCount: 4 })).toEqual({
      resolvedCount: 1,
      totalCount: 4,
    });
  });

  test("does not advance while a missed exercise remains in the retry queue", () => {
    expect(studyLessonProgress({ exerciseIds, exerciseQueue: [1, 2, 3, 1], totalCount: 4 })).toEqual({
      resolvedCount: 1,
      totalCount: 4,
    });
  });

  test("reaches completion only when no exercises remain unresolved", () => {
    expect(studyLessonProgress({ exerciseIds, exerciseQueue: [], totalCount: 4 })).toEqual({
      resolvedCount: 4,
      totalCount: 4,
    });
  });
});
