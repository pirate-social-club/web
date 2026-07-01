import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { SubmitProgress } from "../../post-composer.types";
import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

// Focused stories for the publish-button submit progress presentation. The button
// reads `submit.progress` + `submit.loading`, so these variants exercise the two
// presentation modes without running a real submit:
//   - activity: single dominant slow step (image/text/link, song reusing a bundle).
//     No "N/M" counter; a thin indeterminate bar sweeps the footer's top border.
//   - pipeline: several genuinely-slow stages (fresh song, video). "N/M" counter
//     is meaningful; live `detail` (e.g. "63%") replaces the counter when present.

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/SubmitProgress",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

function submitting(progress: SubmitProgress) {
  return {
    ...baseComposer.submit,
    canPost: true,
    label: "Post",
    loading: progress.phase !== "done",
    progress,
  };
}

// --- Activity mode: no counter, indeterminate bar ---------------------------

export const ImageUploadingActivity: Story = {
  name: "Activity / Image uploading",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "uploading_media",
        label: "Uploading image",
        currentIndex: 2,
        totalSteps: 4,
        display: "activity",
      })}
    />
  ),
};

export const TextPublishingActivity: Story = {
  name: "Activity / Text publishing",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "publishing_post",
        label: "Publishing",
        currentIndex: 2,
        totalSteps: 3,
        display: "activity",
      })}
    />
  ),
};

// A fresh song that reused a pre-uploaded bundle collapses to a single slow step
// (registration check) — data-driven display resolves this to activity, not "1/4".
export const SongPendingBundleActivity: Story = {
  name: "Activity / Song (pre-uploaded bundle)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "checking_registration",
        label: "Checking registration",
        currentIndex: 3,
        totalSteps: 4,
        display: "activity",
      })}
    />
  ),
};

// --- Pipeline mode: meaningful counter, live detail -------------------------

export const SongPipelineCounter: Story = {
  name: "Pipeline / Song analyzing (5/9)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "processing_media",
        label: "Analyzing song",
        currentIndex: 5,
        totalSteps: 9,
        display: "pipeline",
      })}
    />
  ),
};

// Video multipart upload already emits a byte-percentage `detail`; it should show
// in place of the counter.
export const VideoUploadingWithPercent: Story = {
  name: "Pipeline / Video uploading (63%)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "uploading_media",
        label: "Uploading video",
        detail: "63%",
        currentIndex: 2,
        totalSteps: 7,
        display: "pipeline",
      })}
    />
  ),
};

export const DonePublished: Story = {
  name: "Done / Post published",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      submit={submitting({
        phase: "done",
        label: "Post published",
        currentIndex: 4,
        totalSteps: 4,
        display: "activity",
      })}
    />
  ),
};
