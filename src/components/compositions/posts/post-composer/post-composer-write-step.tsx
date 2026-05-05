"use client";

import * as React from "react";

import { UploadSimple } from "@phosphor-icons/react";

import { CardContent } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { PostComposerAttachmentCard } from "./post-composer-attachment-card";
import {
  PostComposerDesktopAttachmentToolbar,
  PostComposerMobileAttachmentBar,
} from "./post-composer-attachment-bar";
import { attachmentActions } from "./post-composer-config";
import type { AttachmentKind, AttachmentState } from "./post-composer.types";
import { useKeyboardBottomOffset } from "./use-keyboard-bottom-offset";
import type { PostComposerController } from "./use-post-composer-controller";

function useObjectUrl(file: File | null | undefined) {
  const [objectUrl, setObjectUrl] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!file) {
      setObjectUrl(undefined);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return objectUrl;
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadeddata" | "loadedmetadata",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Could not read the selected video frame."));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function useVideoPosterUrl(file: File | null | undefined) {
  const [posterUrl, setPosterUrl] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!file) {
      setPosterUrl(undefined);
      return;
    }

    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    async function extractPoster() {
      try {
        video.src = objectUrl;
        await waitForVideoEvent(video, "loadedmetadata");
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await waitForVideoEvent(video, "loadeddata");
        }

        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
          throw new Error("Could not read the selected video frame.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not prepare the selected video frame.");
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (!cancelled) {
          setPosterUrl(canvas.toDataURL("image/jpeg", 0.9));
        }
      } catch {
        if (!cancelled) {
          setPosterUrl(undefined);
        }
      }
    }

    setPosterUrl(undefined);
    void extractPoster();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
  }, [file]);

  return posterUrl;
}

function attachmentFromController(
  controller: PostComposerController,
  imagePreviewUrl?: string,
  videoPosterUrl?: string,
  videoPreviewUrl?: string,
): AttachmentState {
  const { fields, media, song, tabs } = controller;

  if (tabs.activeTab === "link") {
    return { kind: "link", url: fields.linkUrlValue };
  }
  if (tabs.activeTab === "image") {
    return {
      kind: "image",
      label: media.activeImageUpload?.name ?? media.imageUploadLabel ?? "Image",
      previewUrl: imagePreviewUrl,
    };
  }
  if (tabs.activeTab === "video") {
    return {
      kind: "video",
      label: media.videoState.primaryVideoUpload?.name ?? media.videoState.primaryVideoLabel ?? "Video",
      posterUrl: videoPosterUrl,
      previewUrl: videoPreviewUrl,
    };
  }
  if (tabs.activeTab === "song") {
    return {
      kind: "song",
      label: song.state.primaryAudioUpload?.name ?? song.state.primaryAudioLabel ?? "Audio file",
    };
  }
  if (tabs.activeTab === "live") {
    return { kind: "live" };
  }
  return null;
}

function bodyValue(controller: PostComposerController) {
  const { fields, tabs } = controller;
  return tabs.activeTab === "image" || tabs.activeTab === "video"
    ? fields.captionValue
    : fields.textBodyValue;
}

function updateBody(controller: PostComposerController, value: string) {
  const { fields, tabs } = controller;
  if (tabs.activeTab === "image" || tabs.activeTab === "video") {
    fields.onCaptionValueChange?.(value);
    return;
  }
  fields.onTextBodyValueChange?.(value);
}

const imageExtensions = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "avif",
]);
const videoExtensions = new Set([
  "mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "3gp", "ts", "mts",
]);
const audioExtensions = new Set([
  "mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "aiff", "opus",
]);

function extensionFromFileName(name: string): string | null {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === name.length - 1) return null;
  return name.slice(dotIndex + 1).toLowerCase();
}

function fileKindFromFile(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "song";

  const ext = extensionFromFileName(file.name);
  if (!ext) return null;

  if (imageExtensions.has(ext)) return "image";
  if (videoExtensions.has(ext)) return "video";
  if (audioExtensions.has(ext)) return "song";

  return null;
}

function useWriteStepController(controller: PostComposerController) {
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const imagePreviewUrl = useObjectUrl(controller.media.activeImageUpload);
  const videoPreviewUrl = useObjectUrl(controller.media.videoState.primaryVideoUpload);
  const videoPosterUrl = useVideoPosterUrl(controller.media.videoState.primaryVideoUpload);
  const attachment = attachmentFromController(controller, imagePreviewUrl, videoPosterUrl, videoPreviewUrl);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounter = React.useRef(0);

  function selectAttachment(kind: AttachmentKind) {
    if (kind === "image") {
      imageInputRef.current?.click();
      return;
    }
    if (kind === "video") {
      videoInputRef.current?.click();
      return;
    }
    if (kind === "song") {
      audioInputRef.current?.click();
      return;
    }
    controller.tabs.onTabChange(kind);
  }

  function updateAttachment(next: AttachmentState) {
    if (!next) {
      controller.tabs.onTabChange("text");
      return;
    }
    if (next.kind === "link") {
      controller.tabs.onTabChange("link");
      controller.fields.onLinkUrlValueChange?.(next.url);
    }
  }

  function removeAttachment() {
    if (attachment?.kind === "image") {
      controller.media.setImageUpload(null);
    } else if (attachment?.kind === "video") {
      controller.media.updateVideoState((current) => ({
        ...current,
        primaryVideoLabel: undefined,
        primaryVideoUpload: null,
        posterFrameSeconds: "0",
      }));
    } else if (attachment?.kind === "song") {
      controller.song.update((current) => ({
        ...current,
        primaryAudioLabel: undefined,
        primaryAudioUpload: null,
      }));
    } else if (attachment?.kind === "link") {
      controller.fields.onLinkUrlValueChange?.("");
    }
    controller.tabs.onTabChange("text");
  }

  function handleImageFile(file: File) {
    controller.media.setImageUpload(file);
    controller.tabs.onTabChange("image");
  }

  function handleVideoFile(file: File) {
    controller.media.updateVideoState((current) => ({
      ...current,
      primaryVideoLabel: file.name,
      primaryVideoUpload: file,
      posterFrameSeconds: "0",
    }));
    controller.tabs.onTabChange("video");
  }

  function handleAudioFile(file: File) {
    controller.song.update((current) => ({
      ...current,
      primaryAudioLabel: file.name,
      primaryAudioUpload: file,
    }));
    controller.tabs.onTabChange("song");
  }

  function handleFileInputChange(kind: AttachmentKind, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (kind === "image") handleImageFile(file);
    else if (kind === "video") handleVideoFile(file);
    else if (kind === "song") handleAudioFile(file);
  }

  function handleDroppedFile(file: File) {
    const kind = fileKindFromFile(file);
    if (!kind) return;
    if (kind === "image") handleImageFile(file);
    else if (kind === "video") handleVideoFile(file);
    else if (kind === "song") handleAudioFile(file);
  }

  function onDragEnter(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current += 1;
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (event.dataTransfer.types.includes("Files")) {
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  }

  function onDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (fileKindFromFile(file)) {
        handleDroppedFile(file);
        break;
      }
    }
  }

  const fileInputs = (
    <>
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFileInputChange("image", event.target.files)}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        className="sr-only"
        onChange={(event) => handleFileInputChange("video", event.target.files)}
        ref={videoInputRef}
        type="file"
      />
      <input
        accept="audio/*"
        className="sr-only"
        onChange={(event) => handleFileInputChange("song", event.target.files)}
        ref={audioInputRef}
        type="file"
      />
    </>
  );

  return {
    attachment,
    fileInputs,
    isDragging,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    removeAttachment,
    selectAttachment,
    updateAttachment,
  };
}

export function PostComposerWriteStep({
  controller,
}: {
  controller: PostComposerController;
}) {
  const bottomOffset = useKeyboardBottomOffset();
  const write = useWriteStepController(controller);

  if (!controller.isMobile) {
    return (
      <CardContent
        className={cn("relative space-y-5 p-6", write.isDragging && "overflow-hidden")}
        onDragEnter={write.onDragEnter}
        onDragLeave={write.onDragLeave}
        onDragOver={write.onDragOver}
        onDrop={write.onDrop}
      >
        {write.isDragging ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-primary bg-primary-subtle/80 backdrop-blur-sm">
            <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
              <UploadSimple className="size-8" weight="bold" />
            </span>
            <Type as="p" variant="body-strong" className="text-primary">
              Drop image, video, or audio here
            </Type>
          </div>
        ) : null}
        <Input
          maxLength={300}
          onChange={(event) => controller.fields.onTitleValueChange?.(event.target.value)}
          placeholder="Title*"
          size="title"
          value={controller.fields.titleValue}
        />
        <PostComposerAttachmentCard
          attachment={write.attachment}
          onChange={write.updateAttachment}
          onRemove={write.removeAttachment}
          onReplace={write.selectAttachment}
        />
        <Textarea
          className={cn(
            "min-h-36 resize-none text-xl leading-relaxed",
            write.attachment?.kind === "link" && "min-h-32",
          )}
          onChange={(event) => updateBody(controller, event.target.value)}
          placeholder={write.attachment ? "Optional" : "Body text (optional)"}
          value={bodyValue(controller)}
        />
        <PostComposerDesktopAttachmentToolbar
          actions={attachmentActions}
          activeKind={write.attachment?.kind ?? null}
          onSelect={write.selectAttachment}
        />
        {write.fileInputs}
      </CardContent>
    );
  }

  return (
    <>
      <div
        className="space-y-7 px-0 pb-32 pt-1"
        style={{ paddingBottom: 120 + bottomOffset }}
      >
        <Textarea
          className="min-h-18 resize-none break-words rounded-none border-0 bg-transparent px-0 py-0 text-3xl font-semibold leading-tight shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          maxLength={300}
          onChange={(event) => controller.fields.onTitleValueChange?.(event.target.value)}
          placeholder={controller.copy.placeholders.title}
          value={controller.fields.titleValue}
        />
        <PostComposerAttachmentCard
          attachment={write.attachment}
          onChange={write.updateAttachment}
          onRemove={write.removeAttachment}
          onReplace={write.selectAttachment}
        />
        <Textarea
          className={cn(
            "min-h-[38dvh] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-xl leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0",
            write.attachment?.kind === "link" && "min-h-[28dvh]",
          )}
          onChange={(event) => updateBody(controller, event.target.value)}
          placeholder={write.attachment ? controller.copy.placeholders.optional : controller.copy.placeholders.body}
          value={bodyValue(controller)}
        />
      </div>
      <PostComposerMobileAttachmentBar
        actions={attachmentActions}
        activeKind={write.attachment?.kind ?? null}
        onSelect={write.selectAttachment}
      />
      {write.fileInputs}
    </>
  );
}
