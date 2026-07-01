import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { createSubmitProgressReporter } from "@/app/authenticated-helpers/create-post-submit/progress";
import type { SubmitProgressStep } from "@/app/authenticated-helpers/create-post-submit/progress";
import {
  simpleSubmitProgressSteps,
  songSubmitProgressSteps,
  videoSubmitProgressSteps,
} from "@/app/authenticated-helpers/create-post-submit/progress-steps";

import type { SubmitProgress } from "../../post-composer.types";
import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

// Interactive play-through: drives the REAL reporter through the REAL per-type step
// lists on a timer, so you can watch each flow advance exactly as production emits it.
// Pick a scenario in the Controls panel; the loop restarts after "Post published".

type Scenario =
  | "image"
  | "text"
  | "link"
  | "live (free)"
  | "song (fresh, paid, +stems)"
  | "song (pre-uploaded bundle)"
  | "video (monetized)";

const SCENARIOS: Scenario[] = [
  "image",
  "text",
  "link",
  "live (free)",
  "song (fresh, paid, +stems)",
  "song (pre-uploaded bundle)",
  "video (monetized)",
];

function stepsForScenario(scenario: Scenario): SubmitProgressStep[] {
  switch (scenario) {
    case "image":
      return simpleSubmitProgressSteps({ mode: "image", hasMedia: true });
    case "text":
      return simpleSubmitProgressSteps({ mode: "text" });
    case "link":
      return simpleSubmitProgressSteps({ mode: "link" });
    case "live (free)":
      return simpleSubmitProgressSteps({ mode: "live", hasMedia: true });
    case "song (fresh, paid, +stems)":
      return songSubmitProgressSteps({ hasPendingBundle: false, hasExtraArtifacts: true, isLocked: true });
    case "song (pre-uploaded bundle)":
      return songSubmitProgressSteps({ hasPendingBundle: true, hasExtraArtifacts: false, isLocked: false });
    case "video (monetized)":
      return videoSubmitProgressSteps({ monetized: true });
  }
}

// A frame is one reporter emission: a step key plus optional live detail. Upload
// steps get a few percentage sub-frames to mimic real byte progress (which today
// only video actually reports).
type Frame = { key: string; detail?: string };

function framesForSteps(steps: SubmitProgressStep[]): Frame[] {
  const frames: Frame[] = [];
  for (const step of steps) {
    // Byte-uploading steps report real percentages (image via XHR, video via
    // multipart) — play a short sweep so the bar fills instead of flashing.
    if (step.phase === "uploading_media") {
      for (const pct of ["18%", "52%", "86%"]) {
        frames.push({ key: step.key, detail: pct });
      }
      frames.push({ key: step.key });
    } else {
      frames.push({ key: step.key });
    }
  }
  return frames;
}

function FlowDemo({ scenario, intervalMs }: { scenario: Scenario; intervalMs: number }) {
  const [progress, setProgress] = React.useState<SubmitProgress | null>(null);

  React.useEffect(() => {
    const steps = stepsForScenario(scenario);
    const frames = framesForSteps(steps);
    const report = createSubmitProgressReporter(steps, setProgress);

    let index = 0;
    const tick = () => {
      const frame = frames[index];
      report(frame.key, frame.detail);
      // In the real app, "done" is immediately followed by navigation to the new
      // post — it is not a state the user dwells in. Mirror that: as soon as the
      // terminal frame shows, loop back to the start instead of holding on it.
      index = index >= frames.length - 1 ? 0 : index + 1;
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [scenario, intervalMs]);

  // When "done" fires, the real app navigates to the new post — it does NOT sit on
  // a "Post published" button. Represent that here: swap the composer for a mock
  // post page + URL so the demo reflects production, then the loop restarts.
  if (progress?.phase === "done") {
    return <NavigatedToPost postId="pst_ab12cd34" />;
  }

  return (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={{
        ...baseComposer.submit,
        canPost: true,
        label: "Post",
        // done is handled by the early return above, so any progress here is in-flight.
        loading: progress != null,
        progress,
      }}
    />
  );
}

// Stand-in for the post route the composer navigates to after publishing. Storybook
// has no router, so this makes the "then it just shows the post + updates the URL"
// behaviour visible instead of leaving a misleading "Post published" button on screen.
function NavigatedToPost({ postId }: { postId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-full border border-border-soft bg-muted/40 px-4 py-2 font-mono text-sm text-muted-foreground">
        <span className="opacity-60">🔒</span>
        <span>pirate.social/p/{postId}</span>
      </div>
      <div className="rounded-2xl border border-border-soft p-5">
        <p className="text-sm text-muted-foreground">
          Published — the composer navigated to the new post. In the app you now see the
          post page; there is no separate “Post published” screen. (Storybook has no
          router, so this demo loops back to the start.)
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/SubmitProgress",
  component: FlowDemo,
  parameters: composerParameters,
  decorators: composerDecorator,
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    intervalMs: { control: { type: "range", min: 300, max: 2000, step: 100 } },
  },
  args: {
    scenario: "image",
    intervalMs: 900,
  },
} satisfies Meta<typeof FlowDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

// Single interactive story — switch scenarios and speed in the Controls panel.
export const Flow: Story = {
  name: "▶ Flow (interactive)",
};
