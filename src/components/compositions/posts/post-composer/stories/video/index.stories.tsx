import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import type {
  ComposerStep,
  ComposerReference,
  DerivativeStepState,
  SubmitProgress,
  VideoComposerState,
} from "../../post-composer.types";
import { baseComposer, composerDecorator, composerParameters, InteractivePostComposer } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/Video",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

const syntheticVideoMimeType = "video/webm";
const sourceSongSearchResults: ComposerReference[] = [
  {
    id: "story:asset:asset_ast_source_song_1",
    title: "Sunset Driver",
    subtitle: "lena-wave.pirate",
    upstreamRoyaltyPct: 10,
    parentIpId: "0x01C0D038e1BA42959b83A56e5A1c459594719297",
    licenseTermsId: "1894",
  },
  {
    id: "story:asset:asset_ast_source_song_2",
    title: "Warehouse Lights",
    subtitle: "nightshift.pirate",
    upstreamRoyaltyPct: 12,
    parentIpId: "0x2121212121212121212121212121212121212121",
    licenseTermsId: "1902",
  },
  {
    id: "story:asset:asset_ast_source_song_3",
    title: "Hold the Floor",
    subtitle: "cassette-club.pirate",
    upstreamRoyaltyPct: 15,
    parentIpId: "0x3434343434343434343434343434343434343434",
    licenseTermsId: "1911",
  },
];
const sunsetDriverSource = sourceSongSearchResults[0]!;
const warehouseLightsSource = sourceSongSearchResults[1]!;
const regionalPricingPreview = {
  defaultTierKey: "high_income",
  tiers: [
    {
      tierKey: "high_income",
      displayName: "High income",
      adjustmentType: "multiplier" as const,
      adjustmentValue: 1,
      countryCodes: ["US", "CA", "GB", "DE", "JP", "AU"],
    },
    {
      tierKey: "standard",
      displayName: "Standard",
      adjustmentType: "multiplier" as const,
      adjustmentValue: 0.65,
      countryCodes: ["BR", "MX", "PL", "ZA", "TH"],
    },
    {
      tierKey: "reduced",
      displayName: "Reduced",
      adjustmentType: "multiplier" as const,
      adjustmentValue: 0.4,
      countryCodes: ["CO", "EC", "ID", "PE", "PH"],
    },
  ],
};

function videoUsesSongStep(overrides: Partial<DerivativeStepState> = {}): DerivativeStepState {
  return {
    visible: true,
    required: false,
    trigger: "uses_song",
    searchResults: sourceSongSearchResults,
    references: [],
    sourceTermsAccepted: false,
    ...overrides,
  };
}

function progress(input: {
  currentIndex: number;
  detail?: string;
  label: string;
  phase: SubmitProgress["phase"];
  totalSteps?: number;
}): SubmitProgress {
  return {
    currentIndex: input.currentIndex,
    detail: input.detail,
    display: "pipeline",
    label: input.label,
    phase: input.phase,
    totalSteps: input.totalSteps ?? 7,
  };
}

function VideoUsesSongComposer({
  composerStep = "details",
  derivativeStep,
  locked = false,
  title = "Dance cut from the floor",
}: {
  composerStep?: "details" | "settings" | "publish";
  derivativeStep: DerivativeStepState;
  locked?: boolean;
  title?: string;
}) {
  const videoName = locked ? "locked-dance-cut.webm" : "dance-cut.webm";
  const [video, setVideo] = React.useState<VideoComposerState>({
    primaryVideoLabel: "Generating sample video...",
    posterFrameSeconds: "0",
  });

  React.useEffect(() => {
    let cancelled = false;

    void createSyntheticVideoFile({
      height: 360,
      label: locked ? "Locked dance cut" : "Dance cut",
      name: videoName,
      width: 640,
    })
      .then((file) => {
        if (cancelled) return;
        setVideo({
          primaryVideoUpload: file,
          primaryVideoLabel: file.name,
          posterFrameSeconds: "1.5",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setVideo({
          primaryVideoUpload: new File([new Uint8Array([0])], videoName, { type: syntheticVideoMimeType }),
          primaryVideoLabel: videoName,
          posterFrameSeconds: "0",
        });
      });

    return () => { cancelled = true; };
  }, [locked, videoName]);

  return (
    <InteractivePostComposer
      {...baseComposer}
      composerStep={composerStep}
      mode="video"
      titleValue={title}
      titleCountLabel="24/300"
      captionValue="Danced to Sunset Driver at the warehouse show."
      derivativeStep={derivativeStep}
      license={{
        presetId: locked ? "commercial-use" : "non-commercial",
      }}
      monetization={{
        visible: locked,
        priceUsd: locked ? "4.99" : "0",
        regionalPricingAvailable: locked,
        regionalPricingEnabled: locked,
      }}
      regionalPricingPreview={locked ? regionalPricingPreview : undefined}
      onVideoChange={setVideo}
      video={video}
    />
  );
}

async function createSyntheticVideoFile({
  height,
  label,
  name,
  width,
}: {
  height: number;
  label: string;
  name: string;
  width: number;
}): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(
    stream,
    MediaRecorder.isTypeSupported(syntheticVideoMimeType)
      ? { mimeType: syntheticVideoMimeType }
      : undefined,
  );
  const chunks: BlobPart[] = [];
  const durationMs = 4000;
  const startedAt = performance.now();

  if (!context) {
    throw new Error("Canvas rendering is not available.");
  }
  const ctx = context;

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  const stopped = new Promise<void>((resolve) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
  });

  function drawFrame(now: number) {
    const elapsed = Math.min(now - startedAt, durationMs);
    const progress = elapsed / durationMs;
    const hue = Math.round(progress * 290);
    ctx.fillStyle = `hsl(${hue} 72% 42%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(width * 0.0875)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${(elapsed / 1000).toFixed(1)}s`, width * 0.075, height * 0.22);
    ctx.font = `500 ${Math.round(width * 0.04375)}px Inter, system-ui, sans-serif`;
    ctx.fillText(label, width * 0.075, height * 0.34, width * 0.82);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(width * 0.075, height * 0.8, width * 0.85 * progress, 12);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.075, height * 0.8, width * 0.85, 12);

    if (elapsed < durationMs) {
      requestAnimationFrame(drawFrame);
    } else if (recorder.state === "recording") {
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  recorder.start();
  requestAnimationFrame(drawFrame);
  await stopped;

  return new File(chunks, name, { type: recorder.mimeType || syntheticVideoMimeType });
}

function FramePickerStory({
  caption,
  composerStep,
  height,
  label,
  name,
  title,
  width,
}: {
  caption: string;
  composerStep?: ComposerStep;
  height: number;
  label: string;
  name: string;
  title: string;
  width: number;
}) {
  const [video, setVideo] = React.useState<VideoComposerState>({
    primaryVideoLabel: "Generating sample video...",
    posterFrameSeconds: "0",
  });

  React.useEffect(() => {
    let cancelled = false;

    void createSyntheticVideoFile({ height, label, name, width })
      .then((file) => {
        if (cancelled) return;
        setVideo({
          primaryVideoUpload: file,
          primaryVideoLabel: file.name,
          posterFrameSeconds: "1.5",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setVideo({
          primaryVideoLabel: "Sample video generation failed",
          posterFrameSeconds: "0",
        });
      });

    return () => { cancelled = true; };
  }, [height, label, name, width]);

  return (
    <PostComposer
      {...baseComposer}
      composerStep={composerStep}
      mode="video"
      titleValue={title}
      titleCountLabel="18/300"
      captionValue={caption}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
      }}
      onVideoChange={setVideo}
      video={video}
    />
  );
}

export const Upload: Story = {
  name: "Default",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="video"
      titleValue="Fan edit from the encore"
      titleCountLabel="24/300"
      captionValue="Posting the cut now. Attribution can stay tucked away unless needed."
      video={{
        primaryVideoLabel: "encore-fan-edit.mp4",
      }}
    />
  ),
};

export const PaidUnlock: Story = {
  name: "Paid Unlock",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="video"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
        regionalPricingEnabled: true,
      }}
      regionalPricingPreview={regionalPricingPreview}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const UploadFailed: Story = {
  name: "Publish Step / Upload Failed",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="video"
      titleValue="Encore fan edit"
      titleCountLabel="15/300"
      captionValue="Posting the cut from the encore."
      submit={{
        disabled: false,
        error: "Video upload failed. Check the file and try again.",
        label: "Post",
        loading: false,
        onSubmit: () => undefined,
      }}
      video={{
        primaryVideoLabel: "encore-fan-edit.mp4",
      }}
    />
  ),
};

export const SubmittingMultipartUpload: Story = {
  name: "Publish Step / Submitting / Multipart Upload",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="video"
      titleValue="Full warehouse set"
      titleCountLabel="18/300"
      captionValue="Large public video uploading through multipart direct upload."
      submit={{
        disabled: true,
        label: "Posting...",
        loading: true,
        onSubmit: () => undefined,
        progress: progress({
          currentIndex: 2,
          detail: "63%",
          label: "Uploading video",
          phase: "uploading_media",
        }),
      }}
      video={{
        primaryVideoLabel: "full-warehouse-set-1.4gb.mp4",
      }}
    />
  ),
};

export const ProcessingAnalysisPending: Story = {
  name: "Publish Step / Processing Analysis Pending",
  render: () => (
    <PostComposer
      {...baseComposer}
      composerStep="publish"
      mode="video"
      titleValue="Backstage cut"
      titleCountLabel="13/300"
      captionValue="Audio and poster checks are still processing."
      submit={{
        disabled: true,
        label: "Posting...",
        loading: true,
        onSubmit: () => undefined,
        progress: progress({
          currentIndex: 5,
          label: "Checking soundtrack",
          phase: "processing_media",
        }),
      }}
      video={{
        primaryVideoLabel: "backstage-cut.mp4",
      }}
    />
  ),
};

export const RoyaltySplitMultiRecipient: Story = {
  name: "Royalty Split / Multi-recipient",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="video"
      currentUserWalletAddress="0xA11ce00000000000000000000000000000000000"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      license={{
        presetId: "commercial-use",
      }}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
      }}
      royaltySplit={{
        allocations: [
          {
            id: "creator",
            recipientKind: "creator",
            walletAddress: "0xA11ce00000000000000000000000000000000000",
            sharePct: 70,
          },
          {
            id: "recipient-1",
            recipientKind: "collaborator",
            walletAddress: "0xEd17000000000000000000000000000000000000",
            sharePct: 20,
          },
          {
            id: "recipient-2",
            recipientKind: "collaborator",
            walletAddress: "0xBeef000000000000000000000000000000000000",
            sharePct: 10,
          },
        ],
      }}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const ExplicitContentSetting: Story = {
  name: "Content Warning / 18+",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      ageGatePolicy="18_plus"
      composerStep="settings"
      mode="video"
      titleValue="Late-night studio cut"
      titleCountLabel="21/300"
      captionValue="Author has marked this video as requiring age verification."
      video={{
        primaryVideoLabel: "late-night-studio-cut.mp4",
      }}
    />
  ),
};

export const PaidUnlockLicenseNonCommercial: Story = {
  name: "Paid Unlock / License / Non-commercial",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="video"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      license={{
        presetId: "non-commercial",
      }}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
      }}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const PaidUnlockLicenseCommercialUse: Story = {
  name: "Paid Unlock / License / Commercial use",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="video"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      license={{
        presetId: "commercial-use",
      }}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
      }}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const PaidUnlockLicenseCommercialRemix: Story = {
  name: "Paid Unlock / License / Commercial derivatives",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="video"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      license={{
        presetId: "commercial-remix",
        commercialRevSharePct: 15,
      }}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
      }}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const FramePicker: Story = {
  name: "Frame Picker",
  render: () => (
    <FramePickerStory
      caption="Use the slider to choose the frame buyers will see before unlocking."
      height={360}
      label="16:9 cover frame"
      name="storybook-cover-frame-demo.webm"
      title="Cover frame picker"
      width={640}
    />
  ),
};

export const FramePickerVertical: Story = {
  name: "Frame Picker / 9:16",
  render: () => (
    <FramePickerStory
      caption="Vertical sample for checking the picker, poster extraction, and preview fit."
      height={640}
      label="9:16 cover frame"
      name="storybook-cover-frame-vertical-demo.webm"
      title="Vertical cover frame picker"
      width={360}
    />
  ),
};

export const FramePickerVerticalPublish: Story = {
  name: "Publish Preview / 9:16",
  render: () => (
    <FramePickerStory
      caption="Vertical sample for checking the publish preview fit."
      composerStep="publish"
      height={640}
      label="9:16 publish preview"
      name="storybook-publish-preview-vertical-demo.webm"
      title="Vertical publish preview"
      width={360}
    />
  ),
};

export const UsesSongEmpty: Story = {
  name: "Uses Song / Empty",
  render: () => (
    <VideoUsesSongComposer
      derivativeStep={videoUsesSongStep()}
    />
  ),
};

export const UsesSongSearchLoading: Story = {
  name: "Uses Song / Search Loading",
  render: () => (
    <VideoUsesSongComposer
      derivativeStep={videoUsesSongStep({
        query: "sunset",
        searchLoading: true,
        searchResults: undefined,
      })}
    />
  ),
};

export const UsesSongSelected: Story = {
  name: "Uses Song / Terms Required",
  render: () => (
    <VideoUsesSongComposer
      derivativeStep={videoUsesSongStep({
        references: [sunsetDriverSource],
      })}
    />
  ),
};

export const UsesSongTermsAccepted: Story = {
  name: "Uses Song / Terms Accepted",
  render: () => (
    <VideoUsesSongComposer
      derivativeStep={videoUsesSongStep({
        references: [sunsetDriverSource],
        sourceTermsAccepted: true,
      })}
    />
  ),
};

export const UsesSongRequiredByAnalysis: Story = {
  name: "Uses Song / ACR Required",
  render: () => (
    <VideoUsesSongComposer
      derivativeStep={videoUsesSongStep({
        query: "warehouse lights",
        required: true,
        references: [],
        requirementLabel: "Audio analysis matched a registered song. Attach the source song before posting.",
      })}
    />
  ),
};

export const LockedUsesSong: Story = {
  name: "Locked Video / Uses Song",
  render: () => (
    <VideoUsesSongComposer
      locked
      derivativeStep={videoUsesSongStep({
        references: [warehouseLightsSource],
        sourceTermsAccepted: true,
      })}
      title="Members-only dance cut"
    />
  ),
};
