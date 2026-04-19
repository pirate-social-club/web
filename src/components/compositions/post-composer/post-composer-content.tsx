"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";
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
  LinkPreviewCard,
  UploadField,
} from "./post-composer-fields";
import { LiveTabContent } from "./post-composer-live-tab";
import type {
  ComposerTab,
  DerivativeStepState,
  LinkPreviewState,
  LiveComposerState,
  SongComposerState,
  SongMode,
} from "./post-composer.types";

type SongStateUpdater = (updater: (current: SongComposerState) => SongComposerState) => void;

export function PostComposerPrimaryArea({
  activeSongMode,
  activeTab,
  captionValue,
  derivativeState,
  linkPreview,
  linkUrlValue,
  liveState,
  lyricsValue,
  onCaptionValueChange,
  onLinkUrlValueChange,
  onLyricsValueChange,
  onTextBodyValueChange,
  setLiveState,
  setSongModeWithCallback,
  songState,
  textBodyValue,
  updateSongState,
}: {
  activeSongMode: SongMode;
  activeTab: ComposerTab;
  captionValue: string;
  derivativeState?: DerivativeStepState;
  linkPreview?: LinkPreviewState;
  linkUrlValue: string;
  liveState: LiveComposerState;
  lyricsValue: string;
  onCaptionValueChange?: (value: string) => void;
  onLinkUrlValueChange?: (value: string) => void;
  onLyricsValueChange?: (value: string) => void;
  onTextBodyValueChange?: (value: string) => void;
  setLiveState: React.Dispatch<React.SetStateAction<LiveComposerState>>;
  setSongModeWithCallback: (next: SongMode) => void;
  songState: SongComposerState;
  textBodyValue: string;
  updateSongState: SongStateUpdater;
}) {
  switch (activeTab) {
    case "text":
      return (
        <div>
          <FieldLabel label="Body" />
          <EditorChrome onChange={onTextBodyValueChange} value={textBodyValue} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <UploadField accept="image/*" label="Image" />
          <LabeledTextarea
            className="min-h-28"
            defaultValue={captionValue}
            label="Caption"
            placeholder="Add a caption"
          />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <UploadField accept="video/*" label="Video" />
          <LabeledTextarea
            className="min-h-28"
            defaultValue={captionValue}
            label="Caption"
            placeholder="Add a caption"
          />
        </div>
      );
    case "link":
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel label="URL" />
            <Input
              className="h-14"
              onChange={(event) => onLinkUrlValueChange?.(event.target.value)}
              placeholder="https://"
              value={linkUrlValue}
            />
          </div>
          <LabeledFormattedTextarea
            className="min-h-28"
            label="Commentary"
            onChange={onCaptionValueChange}
            placeholder="Add commentary"
            value={captionValue}
          />
          {linkPreview ? <LinkPreviewCard {...linkPreview} /> : null}
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
                    : derivativeState?.required && value === "original"
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground",
                )}
                onClick={() => {
                  if (derivativeState?.required && value === "original") {
                    return;
                  }
                  setSongModeWithCallback(value);
                }}
                disabled={Boolean(derivativeState?.required && value === "original")}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <UploadField
              accept="audio/*"
              label="Audio"
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
              accept="image/*"
              label="Cover art"
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
                label="Instrumental stem"
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
                label="Vocal stem"
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
                accept="audio/*"
                label="Preview clip"
                onChange={(files) =>
                  updateSongState((current) => ({
                    ...current,
                    previewAudioUpload: files?.[0] ?? null,
                    previewAudioLabel: files?.[0]?.name ?? current.previewAudioLabel,
                  }))
                }
                selectedLabel={songState.previewAudioUpload?.name ?? songState.previewAudioLabel}
              />
              <UploadField
                accept="video/*"
                label="Canvas video"
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
              <FieldLabel label="Genre" />
              <Select
                onValueChange={(value) =>
                  updateSongState((current) => ({ ...current, genre: value }))
                }
                value={songState.genre}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
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
              <FieldLabel label="Primary language" />
              <Select
                onValueChange={(value) =>
                  updateSongState((current) => ({ ...current, primaryLanguage: value }))
                }
                value={songState.primaryLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
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
              <FieldLabel label="Secondary language" />
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
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneLanguageValue}>None</SelectItem>
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
            label="Lyrics"
            onChange={onLyricsValueChange}
            placeholder="Paste lyrics"
            value={lyricsValue}
          />
        </div>
      );
    case "live":
      return <LiveTabContent live={liveState} onLiveChange={setLiveState} />;
    default:
      return null;
  }
}
