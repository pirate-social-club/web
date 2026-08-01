import { describe, expect, test } from "bun:test";

import { studyLessonProgress } from "./study-lesson-progress";

describe("studyLessonProgress", () => {
  test("advances as distinct exercises resolve", () => {
    expect(studyLessonProgress({ exerciseQueue: [1, 2, 3], totalCount: 4 })).toEqual({
      resolvedCount: 1,
      totalCount: 4,
    });
  });

  test("does not advance while a missed exercise remains in the retry queue", () => {
    expect(studyLessonProgress({ exerciseQueue: [1, 2, 3, 1], totalCount: 4 })).toEqual({
      resolvedCount: 1,
      totalCount: 4,
    });
  });

  test("reaches completion only when no exercises remain unresolved", () => {
    expect(studyLessonProgress({ exerciseQueue: [], totalCount: 4 })).toEqual({
      resolvedCount: 4,
      totalCount: 4,
    });
  });

  test("does not inflate progress when the queue contains an invalid index", () => {
    expect(studyLessonProgress({ exerciseQueue: [0, 99], totalCount: 2 })).toEqual({
      resolvedCount: 0,
      totalCount: 2,
    });
  });
});
