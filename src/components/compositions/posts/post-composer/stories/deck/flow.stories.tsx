import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { userEvent } from "storybook/test";

import { Type } from "@/components/primitives/type";
import { PostComposer } from "../../post-composer";
import type { ComposerStep } from "../../post-composer.types";

type DeckStoryState = "draft" | "csv_row_error" | "processing" | "published";

const baseProps = {
  clubName: "c/learning-decks",
  mode: "deck" as const,
  availableTabs: ["deck"] as const,
  textBodyValue: "A deterministic study deck.",
};

function DeckComposerFlow({
  initialComposerStep = "write",
  initialState = "draft",
}: {
  initialComposerStep?: ComposerStep;
  initialState?: DeckStoryState;
}) {
  const [composerStep, setComposerStep] = React.useState(initialComposerStep);
  const [published, setPublished] = React.useState(initialState === "published");

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl p-6">
      <PostComposer
        {...baseProps}
        composerStep={composerStep}
        onComposerStepChange={setComposerStep}
        submit={{
          disabled: false,
          label: "Publish learning deck",
          onSubmit: () => setPublished(true),
        }}
      />
      {initialState === "csv_row_error" ? <Type as="p" className="mt-3 rounded-md bg-destructive/5 p-3 text-destructive" variant="body">CSV row 3 has an unmatched quote; no card is silently accepted.</Type> : null}
      {initialState === "processing" ? <Type as="p" className="mt-3 text-warning" variant="body">Publication processing · scanner, Story, CDR, and listing stages are resumable.</Type> : null}
      {published ? <Type as="p" className="mt-3 text-success" variant="body">Published immutable version · package hash remains pinned.</Type> : null}
    </div>
  );
}

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/Deck",
  component: DeckComposerFlow,
  tags: ["digital-goods"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DeckComposerFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "Deck authoring flow" };
Flow.play = async ({ canvasElement }) => {
  const title = canvasElement.querySelector<HTMLInputElement>('input[placeholder="Title*"]');
  const addCard = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === "Add card");
  if (!title || !addCard) throw new Error("deck composer controls are missing");
  await userEvent.clear(title);
  await userEvent.type(title, "Spaced repetition foundations");
  await userEvent.click(addCard);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const prompt = canvasElement.querySelector<HTMLInputElement>('input[aria-label="Card 1 prompt"]');
  const answer = canvasElement.querySelector<HTMLTextAreaElement>('textarea[aria-label="Card 1 answer"]');
  if (!prompt || !answer) throw new Error("deck card fields are missing");
  await userEvent.type(prompt, "What is deterministic?");
  await userEvent.type(answer, "The same input produces the same package.");
  const clickContinue = () => {
    const button = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")]
      .find((candidate) => candidate.textContent?.trim() === "Continue");
    if (!button || button.disabled) throw new Error("deck composer cannot continue");
    button.click();
  };
  await new Promise((resolve) => setTimeout(resolve, 0));
  clickContinue();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clickContinue();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const publish = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === "Publish");
  if (!publish || publish.disabled) throw new Error("deck publish action did not unlock");
  publish.click();
};

export const CsvRowError: Story = {
  name: "CSV import — bounded row error",
  args: { initialComposerStep: "write", initialState: "csv_row_error" },
};
export const Processing: Story = {
  name: "Processing — publication saga",
  args: { initialComposerStep: "publish", initialState: "processing" },
};
export const Published: Story = {
  name: "Terminal — immutable published deck",
  args: { initialComposerStep: "publish", initialState: "published" },
};
