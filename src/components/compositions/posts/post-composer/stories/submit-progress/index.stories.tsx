import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { SubmitProgress } from "../../post-composer.types";
import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

// Focused snapshot stories for the submit progress bar + constant "Posting…" label.
// The button reads `submit.progress` + `submit.loading`; the top-border bar fills a
// monotonic 0→1 fraction (submitProgressFraction). These variants pin single frames:
//   - activity: single-upload flows (image/live cover) fill directly by upload byte-%.
//   - pipeline: multi-step flows (song/video) fill by step, with byte-% interpolated
//     within the current step. See the "▶ Flow (interactive)" story to watch it move.

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

// --- Activity mode: bar fills directly by upload byte-% ---------------------

export const ImageUploadingActivity: Story = {
  name: "Activity / Image uploading (real bytes)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="image"
      submit={submitting({
        phase: "uploading_media",
        label: "Uploading image",
        // Image upload now reports real byte-progress over XHR, so the bar fills
        // to this fraction rather than sweeping indeterminately.
        detail: "45%",
        currentIndex: 2,
        totalSteps: 3,
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
      mode="text"
      submit={submitting({
        phase: "publishing_post",
        label: "Publishing",
        currentIndex: 2,
        totalSteps: 2,
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
      mode="song"
      submit={submitting({
        phase: "checking_registration",
        label: "Checking registration",
        currentIndex: 3,
        totalSteps: 3,
        display: "activity",
      })}
    />
  ),
};

// --- Pipeline mode: meaningful counter, live detail -------------------------

export const SongPipelineCounter: Story = {
  name: "Pipeline / Song analyzing (5/8)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      submit={submitting({
        phase: "processing_media",
        label: "Analyzing song",
        currentIndex: 5,
        totalSteps: 8,
        display: "pipeline",
      })}
    />
  ),
};

// Video multipart upload emits a byte-percentage `detail` (63% here) that
// interpolates progress WITHIN the upload step; the ring sweeps the OVERALL
// pipeline fraction, so it reads lower than the step's own byte-%.
export const VideoUploadingWithPercent: Story = {
  name: "Pipeline / Video uploading (mid-flight)",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="video"
      submit={submitting({
        phase: "uploading_media",
        label: "Uploading video",
        detail: "63%",
        currentIndex: 2,
        totalSteps: 6,
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
        currentIndex: 3,
        totalSteps: 3,
        display: "activity",
      })}
    />
  ),
};
