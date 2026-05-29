import {
  Image as ImageIcon,
  MusicNotes,
  Pause,
  Play,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import * as React from "react";

import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { isValidHttpUrl } from "./post-composer-utils";
import type { AttachmentKind, AttachmentState } from "./post-composer.types";

const MAX_LINK_URL_LENGTH = 2_048;

function VideoAttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Extract<AttachmentState, { kind: "video" }>;
  onRemove: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [posterVisible, setPosterVisible] = React.useState(Boolean(attachment.posterUrl));

  React.useEffect(() => {
    setIsPlaying(false);
    setPosterVisible(Boolean(attachment.posterUrl));
  }, [attachment.posterUrl, attachment.previewUrl]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setPosterVisible(false);
      await video.play().catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    video.pause();
  }

  return (
    <div
      className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-card"
      onClick={() => void togglePlayback()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void togglePlayback();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {attachment.previewUrl ? (
        <video
          ref={videoRef}
          className="size-full object-cover"
          muted
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          playsInline
          preload="metadata"
          src={attachment.previewUrl}
        />
      ) : attachment.posterUrl ? (
        <img
          alt=""
          className="size-full object-cover"
          src={attachment.posterUrl}
        />
      ) : (
        <div className="grid size-full place-items-center bg-muted text-muted-foreground">
          <VideoCamera className="size-12" />
        </div>
      )}

      {attachment.posterUrl && posterVisible ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          src={attachment.posterUrl}
        />
      ) : null}

      <div className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/20">
        <span className="grid size-14 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur">
          {isPlaying ? (
            <Pause className="size-7" weight="fill" />
          ) : (
            <Play className="ml-1 size-7" weight="fill" />
          )}
        </span>
      </div>
      <button
        aria-label="Remove video"
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        <X className="size-5" weight="bold" />
      </button>
    </div>
  );
}

export function PostComposerAttachmentCard({
  attachment,
  onChange,
  onRemove,
  onReplace,
}: {
  attachment: AttachmentState;
  onChange: (next: AttachmentState) => void;
  onRemove: () => void;
  onReplace?: (kind: AttachmentKind) => void;
}) {
  const linkInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (attachment?.kind === "link") {
      linkInputRef.current?.focus();
    }
  }, [attachment?.kind]);

  if (!attachment) return null;

  if (attachment.kind === "link") {
    const hasValue = Boolean(attachment.url.trim());
    const isInvalid = hasValue && !isValidHttpUrl(attachment.url);
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <Input
            aria-invalid={isInvalid}
            className={cn(
              "h-auto rounded-none border-0 bg-transparent p-0 text-2xl shadow-none placeholder:text-muted-foreground focus-visible:ring-0",
              isInvalid && "text-destructive",
            )}
            inputMode="url"
            maxLength={MAX_LINK_URL_LENGTH}
            onChange={(event) => onChange({ ...attachment, url: event.target.value })}
            placeholder="https://"
            ref={linkInputRef}
            value={attachment.url}
          />
          <button
            aria-label="Remove link"
            className="grid size-11 place-items-center rounded-full bg-muted text-foreground"
            onClick={onRemove}
            type="button"
          >
            <X className="size-6" weight="bold" />
          </button>
        </div>
        {isInvalid ? (
          <Type as="p" variant="caption" className="text-destructive">
            Enter a valid http or https link.
          </Type>
        ) : null}
      </div>
    );
  }

  if (attachment.kind === "image") {
    return (
      <div className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-card">
        {attachment.previewUrl ? (
          <img alt="" className="max-h-96 w-full object-contain" src={attachment.previewUrl} />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-muted text-muted-foreground">
            <ImageIcon className="size-12" />
          </div>
        )}
        <button
          aria-label="Remove image"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur"
          onClick={onRemove}
          type="button"
        >
          <X className="size-5" weight="bold" />
        </button>
      </div>
    );
  }

  if (attachment.kind === "video") {
    return <VideoAttachmentPreview attachment={attachment} onRemove={onRemove} />;
  }

  if (attachment.kind === "song") {
    return (
      <div
        className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3 text-start"
        onClick={() => onReplace?.("song")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onReplace?.("song");
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className="grid size-12 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-background text-muted-foreground">
          {attachment.artworkUrl ? (
            <img alt="" className="size-full object-cover" src={attachment.artworkUrl} />
          ) : (
            <MusicNotes className="size-6" />
          )}
        </span>
        <span className="min-w-0">
          <Type as="span" variant="body-strong" className="block truncate">
            {attachment.label === "No audio selected" ? "Audio file" : attachment.label}
          </Type>
          <Type as="span" variant="body" className="block truncate text-muted-foreground">
            Replace
          </Type>
        </span>
        <button
          aria-label="Remove audio"
          className="grid size-10 place-items-center rounded-full text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <X className="size-5" weight="bold" />
        </button>
      </div>
    );
  }

  return null;
}
