"use client";

import * as React from "react";

import { CardContent } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
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

function attachmentFromController(
  controller: PostComposerController,
  imagePreviewUrl?: string,
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

function useWriteStepController(controller: PostComposerController) {
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const imagePreviewUrl = useObjectUrl(controller.media.activeImageUpload);
  const videoPreviewUrl = useObjectUrl(controller.media.videoState.primaryVideoUpload);
  const attachment = attachmentFromController(controller, imagePreviewUrl, videoPreviewUrl);

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

  function handleImageFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    controller.media.setImageUpload(file);
    controller.tabs.onTabChange("image");
  }

  function handleVideoFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    controller.media.updateVideoState((current) => ({
      ...current,
      primaryVideoLabel: file.name,
      primaryVideoUpload: file,
      posterFrameSeconds: "0",
    }));
    controller.tabs.onTabChange("video");
  }

  function handleAudioFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    controller.song.update((current) => ({
      ...current,
      primaryAudioLabel: file.name,
      primaryAudioUpload: file,
    }));
    controller.tabs.onTabChange("song");
  }

  const fileInputs = (
    <>
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleImageFile(event.target.files)}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        className="sr-only"
        onChange={(event) => handleVideoFile(event.target.files)}
        ref={videoInputRef}
        type="file"
      />
      <input
        accept="audio/*"
        className="sr-only"
        onChange={(event) => handleAudioFile(event.target.files)}
        ref={audioInputRef}
        type="file"
      />
    </>
  );

  return {
    attachment,
    fileInputs,
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
      <CardContent className="space-y-5 p-6">
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
