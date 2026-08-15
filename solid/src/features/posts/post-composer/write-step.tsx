import { createSignal, Show } from "solid-js";

import {
  CardContent,
  IconUploadSimple,
  Input,
  Textarea,
  Type,
} from "../../../design-system";
import { cn } from "../../../lib/cn";
import { PostComposerEventSection } from "./event-section";
import { PostComposerGenericAssetFields } from "./generic-asset-fields";
import {
  PostComposerDesktopAttachmentToolbar,
  PostComposerMobileAttachmentBar,
} from "./attachment-bar";
import { PostComposerAttachmentCard } from "./attachment-card";
import { attachmentActions } from "./defaults";
import { LiveTabContent } from "./live-tab";
import {
  createKeyboardBottomOffset,
  createObjectUrl,
  createVideoPosterUrl,
  createVideoSourceAspectRatio,
} from "./media-hooks";
import type { AttachmentKind, AttachmentState } from "./types";
import type { PostComposerController } from "./controller";

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "avif"]);
const videoExtensions = new Set(["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "3gp", "ts", "mts"]);
const audioExtensions = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "aiff", "opus"]);
const downloadExtensions = new Set(["csv", "tsv", "txt", "json"]);

function fileExtension(name: string): string | null {
  const index = name.lastIndexOf(".");
  return index > -1 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : null;
}

function fileKind(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "song";
  const extension = fileExtension(file.name);
  if (!extension) return null;
  if (imageExtensions.has(extension)) return "image";
  if (videoExtensions.has(extension)) return "video";
  if (audioExtensions.has(extension)) return "song";
  if (downloadExtensions.has(extension)) return "file";
  return null;
}

function titleFromFilename(name: string): string {
  const index = name.lastIndexOf(".");
  return (index > 0 ? name.slice(0, index) : name).trim();
}

function bodyValue(controller: PostComposerController): string {
  return controller.tabs.activeTab === "image" || controller.tabs.activeTab === "video"
    ? controller.fields.captionValue
    : controller.fields.textBodyValue;
}

function updateBody(controller: PostComposerController, value: string) {
  if (controller.tabs.activeTab === "image" || controller.tabs.activeTab === "video") {
    controller.fields.onCaptionValueChange?.(value);
  } else {
    controller.fields.onTextBodyValueChange?.(value);
  }
}

function attachmentFor(
  controller: PostComposerController,
  imagePreview: string | undefined,
  videoPoster: string | undefined,
  videoPreview: string | undefined,
  videoAspectRatio: number | undefined,
  songArtwork: string | undefined,
): AttachmentState {
  const { fields, media, song, tabs } = controller;
  if (tabs.activeTab === "link") return { kind: "link", url: fields.linkUrlValue };
  if (tabs.activeTab === "image") return { kind: "image", label: media.activeImageUpload?.name ?? media.imageUploadLabel ?? "Image", previewUrl: imagePreview };
  if (tabs.activeTab === "video") return { kind: "video", label: media.videoState.primaryVideoUpload?.name ?? media.videoState.primaryVideoLabel ?? "Video", aspectRatio: videoAspectRatio, posterUrl: videoPoster, previewUrl: videoPreview };
  if (tabs.activeTab === "song") return { kind: "song", label: song.state.primaryAudioUpload?.name ?? song.state.primaryAudioLabel ?? "Audio file", artworkUrl: songArtwork };
  if (tabs.activeTab === "live") return { kind: "live" };
  if (tabs.activeTab === "file") return { kind: "file", label: controller.generic.file.upload?.name ?? controller.generic.file.label ?? "Downloadable file" };
  return null;
}

export function PostComposerWriteStep(props: { controller: PostComposerController }) {
  const controller = props.controller;
  const imagePreview = createObjectUrl(() => controller.media.activeImageUpload);
  const videoPreview = createObjectUrl(() => controller.media.videoState.primaryVideoUpload);
  const videoAspectRatio = createVideoSourceAspectRatio(videoPreview);
  const videoPoster = createVideoPosterUrl(() => controller.media.videoState.primaryVideoUpload);
  const songArtwork = createObjectUrl(() => controller.song.state.coverUpload);
  const attachment = () => attachmentFor(controller, imagePreview(), videoPoster(), videoPreview(), videoAspectRatio(), songArtwork());
  const keyboardOffset = createKeyboardBottomOffset();
  const [dragging, setDragging] = createSignal(false);
  let dragCounter = 0;
  let imageInput: HTMLInputElement | undefined;
  let videoInput: HTMLInputElement | undefined;
  let songInput: HTMLInputElement | undefined;
  let fileInput: HTMLInputElement | undefined;

  const selectAttachment = (kind: AttachmentKind) => {
    if (kind === "image") return imageInput?.click();
    if (kind === "video") return videoInput?.click();
    if (kind === "song") return songInput?.click();
    if (kind === "file") return fileInput?.click();
    controller.tabs.onTabChange(kind);
  };

  const removeAttachment = () => {
    const current = attachment();
    if (current?.kind === "image") controller.media.setImageUpload(null);
    if (current?.kind === "video") controller.media.updateVideoState((state) => ({ ...state, primaryVideoUpload: null, primaryVideoLabel: undefined, primaryVideoAspectRatio: undefined }));
    if (current?.kind === "song") controller.song.update((state) => ({ ...state, primaryAudioUpload: null, primaryAudioLabel: undefined }));
    if (current?.kind === "link") controller.fields.onLinkUrlValueChange?.("");
    if (current?.kind === "file") controller.generic.setFile({ upload: null, label: undefined });
    controller.tabs.onTabChange("text");
  };

  const handleFile = (file: File) => {
    const kind = fileKind(file);
    if (!kind) return;
    if (kind === "image") {
      controller.media.setImageUpload(file);
    } else if (kind === "video") {
      controller.media.updateVideoState((state) => ({ ...state, primaryVideoUpload: file, primaryVideoLabel: file.name, posterFrameSeconds: "0" }));
    } else if (kind === "song") {
      controller.song.update((state) => ({ ...state, primaryAudioUpload: file, primaryAudioLabel: file.name, title: state.title?.trim() ? state.title : titleFromFilename(file.name) }));
    } else {
      controller.generic.setFile({ upload: file, label: file.name });
    }
    controller.tabs.onTabChange(kind);
  };

  const input = (kind: AttachmentKind, files: FileList | null) => {
    const file = files?.[0];
    if (file) handleFile(file);
    if (kind === "image" && imageInput) imageInput.value = "";
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    dragCounter = 0;
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const inputs = (
    <>
      <input accept="image/*" class="sr-only" ref={imageInput} type="file" onChange={(event) => input("image", event.currentTarget.files)} />
      <input accept="video/*" class="sr-only" ref={videoInput} type="file" onChange={(event) => input("video", event.currentTarget.files)} />
      <input accept="audio/*" class="sr-only" ref={songInput} type="file" onChange={(event) => input("song", event.currentTarget.files)} />
      <input accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json" class="sr-only" ref={fileInput} type="file" onChange={(event) => input("file", event.currentTarget.files)} />
    </>
  );

  const body = (mobile: boolean) => (
    <>
      <Show when={!mobile}>
        <Input maxlength={300} onChange={(event) => controller.fields.onTitleValueChange?.(event.currentTarget.value)} placeholder="Title*" size="title" value={controller.fields.titleValue} />
      </Show>
      <Show when={mobile}>
        <Textarea class="min-h-18 resize-none rounded-none border-0 bg-transparent p-0 text-3xl font-semibold leading-tight shadow-none focus-visible:ring-0" maxlength={300} onChange={(event) => controller.fields.onTitleValueChange?.(event.currentTarget.value)} placeholder={controller.copy.placeholders.title} value={controller.fields.titleValue} />
      </Show>
      <PostComposerAttachmentCard attachment={attachment()} onChange={(next) => { if (next?.kind === "link") { controller.fields.onLinkUrlValueChange?.(next.url); controller.tabs.onTabChange("link"); } }} onRemove={removeAttachment} onReplace={selectAttachment} />
      <Show when={controller.tabs.activeTab === "file"}><PostComposerGenericAssetFields file={controller.generic.file} onFileChange={controller.generic.setFile} /></Show>
      <Textarea class={cn("resize-none text-xl leading-relaxed", mobile ? "min-h-[38dvh] rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" : "min-h-36")} onChange={(event) => updateBody(controller, event.currentTarget.value)} placeholder={attachment() ? controller.copy.placeholders.optional : controller.copy.placeholders.body} value={bodyValue(controller)} />
      <Show when={controller.tabs.activeTab === "live"} fallback={<Show when={controller.tabs.activeTab !== "song"}><PostComposerEventSection event={controller.event.state} onChange={controller.event.update} onSearchPlaces={controller.event.searchPlaces} /></Show>}>
        <LiveTabContent copy={controller.copy} live={controller.primary.liveState} onLiveChange={controller.primary.setLiveState} />
      </Show>
    </>
  );

  return (
    <Show when={controller.isMobile()} fallback={
      <CardContent class={cn("relative space-y-5 p-6", dragging() && "overflow-hidden")} onDragEnter={(event) => { event.preventDefault(); dragCounter += 1; setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); dragCounter -= 1; if (dragCounter <= 0) setDragging(false); }} onDrop={drop}>
        <Show when={dragging()}><div class="absolute inset-0 z-10 grid place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-primary bg-primary-subtle/80"><div class="flex flex-col items-center gap-3"><IconUploadSimple class="size-10 text-primary" /><Type as="p" variant="body-strong" class="text-primary">Drop a file to attach it</Type></div></div></Show>
        {body(false)}
        <PostComposerDesktopAttachmentToolbar actions={attachmentActions} activeKind={attachment()?.kind ?? null} onSelect={selectAttachment} />
        {inputs}
      </CardContent>
    }>
      <div class="space-y-7 px-0 pb-32 pt-1" style={{ "padding-bottom": `${120 + keyboardOffset()}px` }}>{body(true)}</div>
      <PostComposerMobileAttachmentBar actions={attachmentActions} activeKind={attachment()?.kind ?? null} onSelect={selectAttachment} />
      {inputs}
    </Show>
  );
}
