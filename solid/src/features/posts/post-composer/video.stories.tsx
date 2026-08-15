import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PostComposer } from "./post-composer";
import { baseComposer } from "./story-fixtures";
import { ComposerFrame, InteractiveComposer } from "./story-helpers";

const meta = {
  title: "App/Posts/PostComposer/Composer/Video",
  component: PostComposer,
  args: baseComposer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

const video = {
  primaryVideoLabel: "dance-cut.webm",
  primaryVideoAspectRatio: 16 / 9,
  posterFrameSeconds: "1.5",
};
export const OriginalDetails: Story = {
  name: "Original / Details",
  render: () => (
    <ComposerFrame>
      <InteractiveComposer
        {...baseComposer}
        mode="video"
        composerStep="details"
        titleValue="Dance cut from the floor"
        captionValue="Danced to Sunset Driver at the warehouse show."
        video={video}
      />
    </ComposerFrame>
  ),
};

export const UsesSong: Story = {
  name: "Derivative / Uses song",
  render: () => (
    <ComposerFrame>
      <InteractiveComposer
        {...baseComposer}
        mode="video"
        composerStep="details"
        titleValue="Dance cut from the floor"
        captionValue="A short cut from the warehouse show."
        video={video}
        derivativeStep={{
          visible: true,
          required: true,
          trigger: "uses_song",
          searchResults: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }],
          references: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }],
          sourceTermsAccepted: true,
        }}
      />
    </ComposerFrame>
  ),
};

export const MonetizedSettings: Story = {
  name: "Settings / Monetized",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="video"
        composerStep="settings"
        video={video}
        monetization={{ visible: true, priceUsd: "4.99", regionalPricingAvailable: true }}
        license={{ presetId: "commercial-use" }}
      />
    </ComposerFrame>
  ),
};

export const Uploading: Story = {
  name: "Publish / Uploading",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="video"
        composerStep="publish"
        video={video}
        submit={{
          canPost: true,
          loading: true,
          progress: {
            phase: "uploading_media",
            label: "Uploading video",
            detail: "63%",
            currentIndex: 2,
            totalSteps: 6,
            display: "pipeline",
          },
        }}
      />
    </ComposerFrame>
  ),
};
