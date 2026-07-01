import { describe, expect, test } from "bun:test";

import type { SubmitProgressStep } from "./progress";
import { createSubmitProgressReporter, resolveSubmitProgressDisplay } from "./progress";

describe("createSubmitProgressReporter", () => {
  test("emits indexed progress for known keys and ignores unknown keys", () => {
    const events: unknown[] = [];
    const report = createSubmitProgressReporter([
      { key: "validating", phase: "validating", label: "Checking details" },
      { key: "upload", phase: "uploading_media", label: "Uploading media" },
      { key: "done", phase: "done", label: "Done" },
    ], (progress) => {
      events.push(progress);
    });

    report("upload", "Track.wav");
    report("missing");
    report("done");

    // Single slow step (uploading_media) -> activity presentation. The terminal
    // "done" step is excluded from the counter, so totalSteps is 2 (not 3) and the
    // upload rests at 2/2; done reports as complete (2/2).
    expect(events).toEqual([
      {
        currentIndex: 2,
        detail: "Track.wav",
        display: "activity",
        label: "Uploading media",
        phase: "uploading_media",
        totalSteps: 2,
      },
      {
        currentIndex: 2,
        detail: undefined,
        display: "activity",
        label: "Done",
        phase: "done",
        totalSteps: 2,
      },
    ]);
  });
});

describe("createSubmitProgressReporter — done exclusion", () => {
  test("the terminal done step is not counted in totalSteps and the last real step rests at N/N", () => {
    const events: Array<{ label: string; currentIndex: number; totalSteps: number }> = [];
    const report = createSubmitProgressReporter([
      { key: "validating", phase: "validating", label: "Checking details" },
      { key: "upload", phase: "uploading_media", label: "Uploading" },
      { key: "publish", phase: "publishing_post", label: "Publishing" },
      { key: "done", phase: "done", label: "Post published" },
    ], (progress) => {
      events.push({ label: progress.label, currentIndex: progress.currentIndex, totalSteps: progress.totalSteps });
    });

    report("validating");
    report("upload");
    report("publish");
    report("done");

    expect(events).toEqual([
      { label: "Checking details", currentIndex: 1, totalSteps: 3 },
      { label: "Uploading", currentIndex: 2, totalSteps: 3 },
      { label: "Publishing", currentIndex: 3, totalSteps: 3 },
      { label: "Post published", currentIndex: 3, totalSteps: 3 },
    ]);
  });
});

describe("resolveSubmitProgressDisplay", () => {
  const step = (phase: SubmitProgressStep["phase"]): SubmitProgressStep => ({
    key: phase,
    phase,
    label: phase,
  });

  test("image flow (single upload step) is activity", () => {
    expect(
      resolveSubmitProgressDisplay([
        step("validating"),
        step("uploading_media"),
        step("publishing_post"),
        step("done"),
      ]),
    ).toBe("activity");
  });

  test("text flow (no slow steps) is activity", () => {
    expect(
      resolveSubmitProgressDisplay([
        step("validating"),
        step("publishing_post"),
        step("done"),
      ]),
    ).toBe("activity");
  });

  test("song reusing a pre-uploaded bundle collapses to activity", () => {
    // Only checking_registration is meaningful once upload/analyze/rights are skipped.
    expect(
      resolveSubmitProgressDisplay([
        step("validating"),
        step("publishing_post"),
        step("checking_registration"),
        step("done"),
      ]),
    ).toBe("activity");
  });

  test("fresh song upload (multiple slow stages) is pipeline", () => {
    expect(
      resolveSubmitProgressDisplay([
        step("validating"),
        step("uploading_media"),
        step("processing_media"),
        step("checking_rights"),
        step("publishing_post"),
        step("checking_registration"),
        step("done"),
      ]),
    ).toBe("pipeline");
  });

  test("video flow (upload + poster + registration) is pipeline", () => {
    expect(
      resolveSubmitProgressDisplay([
        step("validating"),
        step("uploading_media"),
        step("preparing_media"),
        step("uploading_media"),
        step("publishing_post"),
        step("checking_registration"),
        step("done"),
      ]),
    ).toBe("pipeline");
  });
});
