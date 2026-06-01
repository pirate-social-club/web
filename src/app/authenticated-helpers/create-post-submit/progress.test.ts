import { describe, expect, test } from "bun:test";

import { createSubmitProgressReporter } from "./progress";

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

    expect(events).toEqual([
      {
        currentIndex: 2,
        detail: "Track.wav",
        label: "Uploading media",
        phase: "uploading_media",
        totalSteps: 3,
      },
      {
        currentIndex: 3,
        detail: undefined,
        label: "Done",
        phase: "done",
        totalSteps: 3,
      },
    ]);
  });
});
