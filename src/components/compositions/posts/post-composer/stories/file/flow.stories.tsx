import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { userEvent } from "storybook/test";

import { PostComposer } from "../../post-composer";
import type { ComposerStep } from "../../post-composer.types";

type PublicationState = "idle" | "queued" | "retrying" | "failed" | "published";

const baseProps = {
  clubName: "c/generic-goods",
  mode: "file" as const,
  availableTabs: ["file"] as const,
  textBodyValue: "A deterministic downloadable file.",
};

function FileComposerFlow({
  initialComposerStep = "write",
  initialPublicationState = "idle",
}: {
  initialComposerStep?: ComposerStep;
  initialPublicationState?: PublicationState;
}) {
  const [composerStep, setComposerStep] = React.useState(initialComposerStep);
  const [publicationState, setPublicationState] = React.useState(initialPublicationState);

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl p-6">
      <PostComposer
        {...baseProps}
        composerStep={composerStep}
        onComposerStepChange={setComposerStep}
        submit={{
          disabled: false,
          label: "Publish locked file",
          onSubmit: () => setPublicationState("queued"),
        }}
      />
      <p aria-live="polite" className="sr-only">
        {publicationState === "queued" ? "Publication queued" : null}
      </p>
    </div>
  );
}

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/File",
  component: FileComposerFlow,
  tags: ["digital-goods"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FileComposerFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "File publication flow" };
Flow.play = async ({ canvasElement }) => {
  const fileInput = canvasElement.querySelector<HTMLInputElement>('input[type="file"][accept*=".csv"]');
  const title = canvasElement.querySelector<HTMLInputElement>('input[placeholder="Title*"]');
  if (!fileInput || !title) throw new Error("file composer controls are missing");
  await userEvent.upload(fileInput, new File(["id,name\n1,one\n"], "export.csv", { type: "text/csv" }));
  await userEvent.clear(title);
  await userEvent.type(title, "Research export");
  const clickContinue = () => {
    const button = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")]
      .find((candidate) => candidate.textContent?.trim() === "Continue");
    if (!button || button.disabled) throw new Error("file composer cannot continue");
    button.click();
  };
  await new Promise((resolve) => setTimeout(resolve, 0));
  clickContinue();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clickContinue();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const publish = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === "Publish");
  if (!publish || publish.disabled) throw new Error("locked file publish action is missing");
  publish.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!canvasElement.textContent?.includes("Publication queued")) throw new Error("file publication did not reach queued state");
};

export const Processing: Story = {
  name: "Processing — scanner and publication pending",
  args: { initialComposerStep: "publish", initialPublicationState: "queued" },
};
export const StoryRetry: Story = {
  name: "Retrying — Story registration",
  args: { initialComposerStep: "publish", initialPublicationState: "retrying" },
};
export const ResumableFailure: Story = {
  name: "Failure — resumable publication",
  args: { initialComposerStep: "publish", initialPublicationState: "failed" },
};
export const Published: Story = {
  name: "Terminal — published navigation",
  args: { initialComposerStep: "publish", initialPublicationState: "published" },
};
