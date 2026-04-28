"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

import {
  noneLanguageValue,
  songGenreOptions,
  songLanguageOptions,
} from "./post-composer-config";
import {
  EditorChrome,
  FieldLabel,
  LabeledFormattedTextarea,
  LabeledTextarea,
  UploadField,
} from "./post-composer-fields";
import { LiveTabContent } from "./post-composer-live-tab";
import {
  PostComposerDerivativeSection,
} from "./post-composer-sections";
import {
  dedupeReferences,
  SearchReferencePicker,
  SelectedReferenceCard,
} from "./post-composer-references";
import type {
  ComposerReference,
  ComposerTab,
  DerivativeStepState,
  LiveComposerState,
  SongComposerState,
  SongMode,
  VideoComposerState,
} from "./post-composer.types";

type SongStateUpdater = (updater: (current: SongComposerState) => SongComposerState) => void;
type VideoStateUpdater = (updater: (current: VideoComposerState) => VideoComposerState) => void;
type DerivativeStateUpdater = (
  updater: (current: DerivativeStepState | undefined) => DerivativeStepState | undefined,
) => void;

const acceptedImageMimeTypes = "image/jpeg,image/png,image/webp,image/gif,image/avif";
const acceptedImageFormatLabel = "JPG, PNG, WebP, GIF, or AVIF";
const acceptedVideoMimeTypes = "video/mp4,video/quicktime,video/webm";
const acceptedVideoFormatLabel = "MP4, MOV, or WebM";

function formatTimestamp(seconds: number): string {
  const bounded = Math.max(0, seconds);
  const mins = Math.floor(bounded / 60);
  const secs = bounded % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
}

function VideoFramePicker({
  copy,
  file,
  frameSeconds,
  onFrameSecondsChange,
}: {
  copy: {
    fields: Record<string, string>;
  };
  file: File;
  frameSeconds: string;
  onFrameSecondsChange: (value: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState(0);
  const selectedSeconds = Math.min(
    durationSeconds || 0,
    Math.max(0, Number.parseFloat(frameSeconds || "0") || 0),
  );

  React.useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setDurationSeconds(0);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !objectUrl) return;
    const seekTo = Math.min(video.duration || selectedSeconds, selectedSeconds);
    if (Number.isFinite(seekTo)) {
      video.currentTime = seekTo;
    }
  }, [objectUrl, selectedSeconds]);

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Type as="div" variant="label">{copy.fields.coverFrame}</Type>
        <Type as="div" variant="body-strong">{formatTimestamp(selectedSeconds)}</Type>
      </div>
      {objectUrl ? (
        <video
          className="aspect-video w-full rounded-[var(--radius-lg)] bg-black object-contain"
          muted
          playsInline
          preload="metadata"
          ref={videoRef}
          src={objectUrl}
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            setDurationSeconds(Number.isFinite(duration) ? duration : 0);
            event.currentTarget.currentTime = selectedSeconds;
          }}
        />
      ) : null}
      <Input
        aria-label={copy.fields.coverFrame}
        className="h-12"
        disabled={durationSeconds <= 0}
        max={Math.max(0, durationSeconds)}
        min={0}
        onChange={(event) => onFrameSecondsChange(event.target.value)}
        step={0.1}
        type="range"
        value={String(selectedSeconds)}
      />
    </div>
  );
}

export function PostComposerPrimaryArea({
  activeSongMode,
  activeTab,
  captionValue,
  copy,
  derivativePickerKey,
  derivativeSearchResults,
  derivativeState,
  imageUploadLabel,
  linkUrlValue,
  liveState,
  lyricsValue,
  onAdvanceDerivativePicker,
  onCaptionValueChange,
  onImageUploadChange,
  onLinkUrlValueChange,
  onLyricsValueChange,
  onTextBodyValueChange,
  setLiveState,
  setSongModeWithCallback,
  songState,
  textBodyValue,
  updateDerivativeState,
  updateSongState,
  updateVideoState,
  videoState,
}: {
  activeSongMode: SongMode;
  activeTab: ComposerTab;
  captionValue: string;
  copy: {
    buttons: Record<string, string>;
    derivative: Record<string, string>;
    empty: Record<string, string>;
    fields: Record<string, string>;
    none: string;
    placeholders: Record<string, string>;
    sections: Record<string, string>;
    songModes: Record<string, string>;
    upload: Record<string, string>;
    live: Record<string, string>;
  };
  derivativePickerKey: number;
  derivativeSearchResults: ComposerReference[];
  derivativeState?: DerivativeStepState;
  imageUploadLabel?: string;
  linkUrlValue: string;
  liveState: LiveComposerState;
  lyricsValue: string;
  onAdvanceDerivativePicker: () => void;
  onCaptionValueChange?: (value: string) => void;
  onImageUploadChange?: (file: File | null) => void;
  onLinkUrlValueChange?: (value: string) => void;
  onLyricsValueChange?: (value: string) => void;
  onTextBodyValueChange?: (value: string) => void;
  setLiveState: React.Dispatch<React.SetStateAction<LiveComposerState>>;
  setSongModeWithCallback: (next: SongMode) => void;
  songState: SongComposerState;
  textBodyValue: string;
  updateDerivativeState: DerivativeStateUpdater;
  updateSongState: SongStateUpdater;
  updateVideoState: VideoStateUpdater;
  videoState: VideoComposerState;
}) {
  switch (activeTab) {
    case "text":
      return (
        <div>
          <FieldLabel label={copy.fields.body} />
          <EditorChrome
            onChange={onTextBodyValueChange}
            placeholder={copy.placeholders.body}
            value={textBodyValue}
          />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <UploadField
            accept={acceptedImageMimeTypes}
            copy={copy}
            label={copy.fields.image}
            onChange={(files) => onImageUploadChange?.(files?.[0] ?? null)}
            placeholderLabel={acceptedImageFormatLabel}
            selectedLabel={imageUploadLabel}
          />
          <LabeledTextarea
            className="min-h-28"
            label={copy.fields.caption}
            onChange={onCaptionValueChange}
            placeholder={copy.placeholders.caption}
            value={captionValue}
          />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <UploadField
            accept={acceptedVideoMimeTypes}
            copy={copy}
            label={copy.fields.video}
            onChange={(files) =>
              updateVideoState((current) => ({
                ...current,
                primaryVideoUpload: files?.[0] ?? null,
                primaryVideoLabel: files?.[0]?.name ?? current.primaryVideoLabel,
                posterFrameSeconds: "0",
              }))
            }
            placeholderLabel={acceptedVideoFormatLabel}
            selectedLabel={videoState.primaryVideoUpload?.name ?? videoState.primaryVideoLabel}
          />
          {videoState.primaryVideoUpload ? (
            <VideoFramePicker
              copy={copy}
              file={videoState.primaryVideoUpload}
              frameSeconds={videoState.posterFrameSeconds ?? "0"}
              onFrameSecondsChange={(value) =>
                updateVideoState((current) => ({ ...current, posterFrameSeconds: value }))
              }
            />
          ) : null}
          <LabeledTextarea
            className="min-h-28"
            label={copy.fields.caption}
            onChange={onCaptionValueChange}
            placeholder={copy.placeholders.caption}
            value={captionValue}
          />
        </div>
      );
    case "link":
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel label={copy.fields.url} />
            <Input
              className="h-14"
              onChange={(event) => onLinkUrlValueChange?.(event.target.value)}
              placeholder={copy.placeholders.url}
              value={linkUrlValue}
            />
          </div>
          <LabeledFormattedTextarea
            className="min-h-28"
            label={copy.fields.commentary}
            onChange={onTextBodyValueChange}
            placeholder={copy.placeholders.commentary}
            value={textBodyValue}
          />
        </div>
      );
    case "song":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-full bg-muted p-1">
            {(["original", "remix"] as const).map((value) => (
              <button
                key={value}
                className={cn(
                  "rounded-full px-3 py-1.5 text-base font-medium capitalize transition-colors",
                  activeSongMode === value
                    ? "bg-card text-foreground shadow-sm"
                    : derivativeState?.trigger === "analysis" && value === "original"
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground",
                )}
                onClick={() => {
                  if (derivativeState?.trigger === "analysis" && value === "original") {
                    return;
                  }
                  setSongModeWithCallback(value);
                }}
                disabled={Boolean(derivativeState?.trigger === "analysis" && value === "original")}
                type="button"
              >
                {copy.songModes[value]}
              </button>
            ))}
          </div>

          {derivativeState?.visible ? (
            <PostComposerDerivativeSection
              copy={copy}
              derivativePickerKey={derivativePickerKey}
              derivativeSearchResults={derivativeSearchResults}
              derivativeState={derivativeState}
              onAdvancePicker={onAdvanceDerivativePicker}
              updateDerivativeState={updateDerivativeState}
            />
          ) : null}

          <div className="space-y-4">
            <UploadField
              accept="audio/*"
              copy={copy}
              label={copy.fields.audio}
              onChange={(files) =>
                updateSongState((current) => ({
                  ...current,
                  primaryAudioUpload: files?.[0] ?? null,
                  primaryAudioLabel: files?.[0]?.name ?? current.primaryAudioLabel,
                }))
              }
              selectedLabel={songState.primaryAudioUpload?.name ?? songState.primaryAudioLabel}
            />
            <UploadField
              accept={acceptedImageMimeTypes}
              copy={copy}
              label={copy.fields.coverArt}
              onChange={(files) =>
                updateSongState((current) => ({
                  ...current,
                  coverUpload: files?.[0] ?? null,
                  coverLabel: files?.[0]?.name ?? current.coverLabel,
                }))
              }
              selectedLabel={songState.coverUpload?.name ?? songState.coverLabel}
              variant="artwork"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <UploadField
                accept="audio/*"
                copy={copy}
                label={copy.fields.instrumentalStem}
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    instrumentalAudioUpload: files?.[0] ?? null,
                    instrumentalAudioLabel: files?.[0]?.name ?? current.instrumentalAudioLabel,
                  }))
                }
                selectedLabel={
                  songState.instrumentalAudioUpload?.name ?? songState.instrumentalAudioLabel
                }
              />
              <UploadField
                accept="audio/*"
                copy={copy}
                label={copy.fields.vocalStem}
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    vocalAudioUpload: files?.[0] ?? null,
                    vocalAudioLabel: files?.[0]?.name ?? current.vocalAudioLabel,
                  }))
                }
                selectedLabel={songState.vocalAudioUpload?.name ?? songState.vocalAudioLabel}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <UploadField
                accept="video/*"
                copy={copy}
                label={copy.fields.canvasVideo}
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    canvasVideoUpload: files?.[0] ?? null,
                    canvasVideoLabel: files?.[0]?.name ?? current.canvasVideoLabel,
                  }))
                }
                selectedLabel={songState.canvasVideoUpload?.name ?? songState.canvasVideoLabel}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <FieldLabel label={copy.fields.genre} />
              <Select
                onValueChange={(value) =>
                  updateSongState((current) => ({ ...current, genre: value }))
                }
                value={songState.genre}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.placeholders.selectGenre} />
                </SelectTrigger>
                <SelectContent>
                  {songGenreOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel label={copy.fields.primaryLanguage} />
              <Select
                onValueChange={(value) =>
                  updateSongState((current) => ({ ...current, primaryLanguage: value }))
                }
                value={songState.primaryLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.placeholders.selectLanguage} />
                </SelectTrigger>
                <SelectContent>
                  {songLanguageOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel label={copy.fields.secondaryLanguage} />
              <Select
                onValueChange={(value) =>
                  updateSongState((current) => ({
                    ...current,
                    secondaryLanguage: value === noneLanguageValue ? "" : value,
                  }))
                }
                value={songState.secondaryLanguage || noneLanguageValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.placeholders.optional} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneLanguageValue}>{copy.none}</SelectItem>
                  {songLanguageOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <LabeledTextarea
            className="min-h-36"
            label={copy.fields.lyrics}
            onChange={onLyricsValueChange}
            placeholder={copy.placeholders.lyrics}
            value={lyricsValue}
          />
        </div>
      );
    case "live":
      return <LiveTabContent copy={copy} live={liveState} onLiveChange={setLiveState} />;
    default:
      return null;
  }
}
