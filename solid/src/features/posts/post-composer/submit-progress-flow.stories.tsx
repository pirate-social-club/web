import { createEffect, createSignal, Show } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Button, Type } from "../../../design-system";
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

function FlowDemo(props: { scenario: Scenario }) {
  const [current, setCurrent] = createSignal<SubmitProgress | null>(null);
  const [stepIndex, setStepIndex] = createSignal(0);

  createEffect(
    () => props.scenario,
    () => {
      setCurrent(null);
      setStepIndex(0);
    },
  );

  const advance = () => {
    const steps = stepsForScenario(props.scenario);
    const index = stepIndex() % steps.length;
    const step = steps[index]!;
    const reporter = createSubmitProgressReporter(steps, setCurrent);
    reporter(step.key, step.phase === "uploading_media" ? "62%" : undefined);
    setStepIndex((value) => (value + 1) % steps.length);
  };

  const mode = (): ComposerTab => props.scenario;
  return (
    <ComposerFrame>
      <ShowProgress progress={current()} mode={mode()} />
      <Button type="button" onClick={advance}>
        Advance progress
      </Button>
    </ComposerFrame>
  );
}

function ShowProgress(props: { progress: SubmitProgress | null; mode: ComposerTab }) {
  return (
    <Show
      when={props.progress?.phase !== "done"}
      fallback={<Type as="p" variant="body">Post published — the app navigates to the new post.</Type>}
    >
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
    </Show>
  );
}

const meta = {
  title: "App/Posts/PostComposer/Composer/SubmitProgressFlow",
  component: FlowDemo,
  parameters: { layout: "fullscreen" },
  argTypes: {
    scenario: { control: "select", options: ["text", "image", "song", "video"] },
  },
  args: { scenario: "image" },
} satisfies Meta<typeof FlowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "Flow (interactive)" };
