import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PostComposer } from "./post-composer";
import { baseComposer, doneProgress, imageProgress, videoProgress } from "./story-fixtures";
import { ComposerFrame } from "./story-helpers";
import type { ComposerTab, SubmitProgress } from "./types";

const meta = {
  title: "App/Posts/PostComposer/Composer/SubmitProgress",
  component: PostComposer,
  args: baseComposer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

function progressStory(progress: SubmitProgress, mode: ComposerTab = "image") {
  return (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode={mode}
        composerStep="publish"
        submit={{
          canPost: true,
          loading: progress.phase !== "done",
          progress,
        }}
      />
    </ComposerFrame>
  );
}

export const ImageUploadingActivity: Story = {
  name: "Activity / Image uploading",
  render: () => progressStory(imageProgress),
};

export const VideoProcessingPipeline: Story = {
  name: "Pipeline / Video processing",
  render: () => progressStory(videoProgress, "video"),
};

export const DonePublished: Story = {
  name: "Done / Post published",
  render: () => progressStory(doneProgress),
};

export const ErrorRetry: Story = {
  name: "Error / Retry",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        composerStep="publish"
        submit={{
          canPost: true,
          error: "The media service is unavailable. Try again.",
          label: "Retry post",
        }}
      />
    </ComposerFrame>
  ),
};
