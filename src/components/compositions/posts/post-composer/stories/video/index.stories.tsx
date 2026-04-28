import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import type { VideoComposerState } from "../../post-composer.types";
import { baseComposer, composerDecorator, composerParameters, InteractivePostComposer } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Video",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

const syntheticVideoMimeType = "video/webm";

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
  height,
  label,
  name,
  title,
  width,
}: {
  caption: string;
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
      mode="video"
      titleValue={title}
      titleCountLabel="18/300"
      captionValue={caption}
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
        rightsAttested: true,
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
    <PostComposer
      {...baseComposer}
      mode="video"
      titleValue="Full backstage cut"
      titleCountLabel="18/300"
      captionValue="Members can preview the post; buyers unlock the full video."
      monetization={{
        visible: true,
        priceUsd: "4.99",
        regionalPricingAvailable: true,
        rightsAttested: true,
      }}
      video={{
        primaryVideoLabel: "full-backstage-cut.mp4",
      }}
    />
  ),
};

export const PaidUnlockLicenseNonCommercial: Story = {
  name: "Paid Unlock / License / Non-commercial",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
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
        rightsAttested: true,
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
        rightsAttested: true,
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
        rightsAttested: true,
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

export const Reference: Story = {
  name: "With Reference Required",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="video"
      titleValue="Fan edit from the encore"
      titleCountLabel="24/300"
      captionValue="Posting the cut now. Attribution can stay tucked away unless needed."
      derivativeStep={{
        visible: true,
        required: true,
        trigger: "analysis",
        query: "encore live original",
        references: [
          {
            id: "ast_02def",
            title: "Encore performance",
            subtitle: "Likely matched source video",
          },
        ],
        requirementLabel: "Attach the source video before posting.",
      }}
    />
  ),
};
