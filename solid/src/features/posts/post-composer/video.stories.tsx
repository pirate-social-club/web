import type { Meta, StoryObj } from "storybook-solidjs-vite";
import type { PostComposerProps } from "./types";

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

function videoVariant(overrides: Partial<PostComposerProps>) {
  return (
    <ComposerFrame>
      <PostComposer {...baseComposer} mode="video" video={video} {...overrides} />
    </ComposerFrame>
  );
}

export const Upload: Story = {
  name: "Upload",
  render: () => videoVariant({ titleValue: "Dance cut from the floor", captionValue: "A short cut from the warehouse show." }),
};

export const PaidUnlock: Story = {
  name: "Access / Paid unlock",
  render: () => videoVariant({ composerStep: "settings", monetization: { visible: true, priceUsd: "4.99" }, license: { presetId: "commercial-use" } }),
};

export const UploadFailed: Story = {
  name: "Upload / Failed",
  render: () => videoVariant({ composerStep: "publish", submitError: "The video upload failed. Try again." }),
};

export const SubmittingMultipartUpload: Story = {
  name: "Submitting / Multipart upload",
  render: () => videoVariant({ composerStep: "publish", submit: { canPost: true, loading: true, progress: { phase: "uploading_media", label: "Uploading video", detail: "63%", currentIndex: 2, totalSteps: 6, display: "pipeline" } } }),
};

export const ProcessingAnalysisPending: Story = {
  name: "Processing / Analysis pending",
  render: () => videoVariant({ composerStep: "publish", submit: { canPost: true, loading: true, progress: { phase: "processing_media", label: "Analyzing video", currentIndex: 3, totalSteps: 6, display: "pipeline" } } }),
};

export const RoyaltySplitMultiRecipient: Story = {
  name: "Royalties / Multiple recipients",
  render: () => videoVariant({ composerStep: "settings", monetization: { visible: true, priceUsd: "4.99" }, royaltySplit: { allocations: [{ id: "creator", recipientKind: "creator", sharePct: 70 }, { id: "collaborator", recipientKind: "collaborator", sharePct: 30 }] } }),
};

export const ExplicitContentSetting: Story = {
  name: "Audience / Explicit content",
  render: () => videoVariant({ composerStep: "settings", ageGatePolicy: "18_plus" }),
};

export const PaidUnlockLicenseNonCommercial: Story = {
  name: "License / Non-commercial",
  render: () => videoVariant({ composerStep: "settings", monetization: { visible: true, priceUsd: "4.99" }, license: { presetId: "non-commercial" } }),
};

export const PaidUnlockLicenseCommercialUse: Story = {
  name: "License / Commercial use",
  render: () => videoVariant({ composerStep: "settings", monetization: { visible: true, priceUsd: "4.99" }, license: { presetId: "commercial-use" } }),
};

export const PaidUnlockLicenseCommercialRemix: Story = {
  name: "License / Commercial remix",
  render: () => videoVariant({ composerStep: "settings", monetization: { visible: true, priceUsd: "4.99" }, license: { presetId: "commercial-remix", commercialRevSharePct: 10 } }),
};

export const FramePicker: Story = {
  name: "Poster / Frame picker",
  render: () => videoVariant({ composerStep: "details", video: { ...video, posterFrameSeconds: "2" } }),
};

export const FramePickerVertical: Story = {
  name: "Poster / Vertical frame picker",
  render: () => videoVariant({ composerStep: "details", video: { ...video, primaryVideoAspectRatio: 9 / 16, posterFrameSeconds: "1" } }),
};

export const FramePickerVerticalPublish: Story = {
  name: "Poster / Vertical publish preview",
  render: () => videoVariant({ composerStep: "publish", video: { ...video, primaryVideoAspectRatio: 9 / 16 } }),
};

function usesSong(override: Partial<NonNullable<PostComposerProps["derivativeStep"]>> = {}) {
  return { visible: true, required: true, trigger: "uses_song" as const, searchResults: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }], references: [], sourceTermsAccepted: false, ...override };
}

export const UsesSongEmpty: Story = {
  name: "Uses song / Empty",
  render: () => videoVariant({ composerStep: "details", derivativeStep: usesSong() }),
};

export const UsesSongSearchLoading: Story = {
  name: "Uses song / Searching",
  render: () => videoVariant({ composerStep: "details", derivativeStep: usesSong({ searchLoading: true, query: "sunset" }) }),
};

export const UsesSongSelected: Story = {
  name: "Uses song / Selected",
  render: () => videoVariant({ composerStep: "details", derivativeStep: usesSong({ references: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }] }) }),
};

export const UsesSongTermsAccepted: Story = {
  name: "Uses song / Terms accepted",
  render: () => videoVariant({ composerStep: "details", derivativeStep: usesSong({ references: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }], sourceTermsAccepted: true }) }),
};

export const UsesSongRequiredByAnalysis: Story = {
  name: "Uses song / Required by analysis",
  render: () => videoVariant({ composerStep: "details", derivativeStep: usesSong({ requirementLabel: "Analysis found a likely song reference." }) }),
};

export const LockedUsesSong: Story = {
  name: "Uses song / Locked publish",
  render: () => videoVariant({ composerStep: "settings", license: { presetId: "commercial-remix" }, derivativeStep: usesSong({ required: true }) }),
};
