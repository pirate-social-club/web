import { Image as ImageIcon, VideoCamera } from "@phosphor-icons/react";

import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";

import { PostComposerUploadRow } from "./post-composer-upload-row";
import { revokeUploadValue } from "./post-composer-upload-utils";
import type { AttachmentState, ComposerUploadValue, VideoDetailsState } from "./post-composer.types";

export function PostComposerVideoDetailsSection({
  attachment,
  onChange,
  value,
}: {
  attachment: AttachmentState;
  onChange: (value: VideoDetailsState) => void;
  value: VideoDetailsState;
}) {
  const videoSrc = attachment?.kind === "video" ? attachment.previewUrl : undefined;
  const posterSrc = value.thumbnail?.previewUrl;

  function setThumbnail(next: ComposerUploadValue) {
    revokeUploadValue(value.thumbnail);
    onChange({ ...value, thumbnail: next });
  }

  function setPosterFrameSeconds(next: string) {
    const normalized = next.replace(/[^\d]/g, "").slice(0, 3);
    const seconds = Math.min(999, Number(normalized || 0));
    onChange({ ...value, posterFrameSeconds: normalized ? String(seconds) : "" });
  }

  return (
    <section className="space-y-5">
      <Type as="h2" variant="h3" className="text-muted-foreground">
        Video details
      </Type>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-card">
        <div className="aspect-video bg-muted">
          {posterSrc ? (
            <img alt="" className="size-full object-cover" src={posterSrc} />
          ) : videoSrc ? (
            <video
              className="size-full object-cover"
              muted
              playsInline
              preload="metadata"
              src={videoSrc}
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <VideoCamera className="size-12" />
            </div>
          )}
        </div>
        <div className="space-y-4 px-4 py-4">
          <label className="block space-y-2">
            <Type as="span" variant="body-strong">
              Poster frame
            </Type>
            <div className="grid grid-cols-[1fr_auto] items-center rounded-full border border-border-soft bg-background px-4">
              <Input
                className="h-12 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                inputMode="numeric"
                onChange={(event) => setPosterFrameSeconds(event.target.value)}
                placeholder="0"
                value={value.posterFrameSeconds}
              />
              <Type as="span" variant="body" className="text-muted-foreground">
                sec
              </Type>
            </div>
          </label>
          <PostComposerUploadRow
            accept="image/*"
            description="Optional image"
            icon={<ImageIcon className="size-6" />}
            label="Custom thumbnail"
            onChange={setThumbnail}
            value={value.thumbnail}
          />
        </div>
      </div>
    </section>
  );
}
