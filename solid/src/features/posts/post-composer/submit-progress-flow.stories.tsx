import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Type } from "../../../design-system";
import { PostComposer } from "./post-composer";
import {
  createSubmitProgressReporter,
  simpleSubmitProgressSteps,
  songSubmitProgressSteps,
  videoSubmitProgressSteps,
} from "./submit-progress";
import { baseComposer } from "./story-fixtures";
import { ComposerFrame } from "./story-helpers";
import type { ComposerTab, SubmitProgress } from "./types";

type Scenario = "text" | "image" | "song" | "video";

function stepsForScenario(scenario: Scenario) {
  if (scenario === "song") {
    return songSubmitProgressSteps({ hasPendingBundle: false, hasExtraArtifacts: true, isLocked: false });
  }
  if (scenario === "video") return videoSubmitProgressSteps({ monetized: true });
  return simpleSubmitProgressSteps({ mode: scenario, hasMedia: scenario === "image" });
}

function FlowDemo(props: { scenario: Scenario; intervalMs: number }) {
  const [current, setCurrent] = createSignal<SubmitProgress | null>(null);

  createEffect(() => {
    const reporter = createSubmitProgressReporter(stepsForScenario(props.scenario), setCurrent);
    const steps = stepsForScenario(props.scenario);
    let index = 0;
    const tick = () => {
      const step = steps[index % steps.length]!;
      reporter(step.key, step.phase === "uploading_media" ? "62%" : undefined);
      index = (index + 1) % steps.length;
    };
    tick();
    const timer = window.setInterval(tick, props.intervalMs);
    onCleanup(() => window.clearInterval(timer));
  });

  const mode = (): ComposerTab => props.scenario;
  return (
    <ComposerFrame>
      <ShowProgress progress={current()} mode={mode()} />
    </ComposerFrame>
  );
}

function ShowProgress(props: { progress: SubmitProgress | null; mode: ComposerTab }) {
  if (props.progress?.phase === "done") {
    return <Type as="p" variant="body">Post published — the app navigates to the new post.</Type>;
  }
  return (
    <PostComposer
      {...baseComposer}
      mode={props.mode}
      composerStep="publish"
      submit={{
        canPost: true,
        loading: props.progress !== null,
        progress: props.progress,
      }}
    />
  );
}

const meta = {
  title: "App/Posts/PostComposer/Composer/SubmitProgressFlow",
  component: FlowDemo,
  parameters: { layout: "fullscreen" },
  argTypes: {
    scenario: { control: "select", options: ["text", "image", "song", "video"] },
    intervalMs: { control: { type: "range", min: 300, max: 2000, step: 100 } },
  },
  args: { scenario: "image", intervalMs: 900 },
} satisfies Meta<typeof FlowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "Flow (interactive)" };
