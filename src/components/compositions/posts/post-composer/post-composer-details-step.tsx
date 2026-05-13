"use client";

import { useEffect, useId, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { CardContent } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import {
  noneLanguageValue,
  songGenreOptions,
  songLanguageOptions,
} from "./post-composer-config";
import { FieldLabel, LabeledTextarea, UploadField } from "./post-composer-fields";
import { PostComposerDerivativeSection } from "./post-composer-sections";
import { VideoFramePicker } from "./post-composer-content";
import type { PostComposerController } from "./use-post-composer-controller";

const acceptedImageMimeTypes = "image/jpeg,image/png,image/webp,image/gif,image/avif";

function useObjectUrl(file: File | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>();

  useEffect(() => {
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

export function PostComposerDetailsStep({
  controller,
}: {
  controller: PostComposerController;
}) {
  const {
    advanceDerivativePicker,
    copy,
    isMobile,
    media,
    primary,
    song,
    tabs,
  } = controller;
  const coverPreviewUrl = useObjectUrl(song.state.coverUpload);
  const titleId = useId();
  const genreId = useId();
  const primaryLanguageId = useId();
  const lyricsId = useId();

  if (tabs.activeTab === "video") {
    return (
      <CardContent className={cn("space-y-6 p-5", isMobile && "px-0 pb-4 pt-1")}>
        <Type as="h2" variant="h3" className="text-muted-foreground">
          Video details
        </Type>
        {media.videoState.primaryVideoUpload ? (
          <VideoFramePicker
            copy={copy}
            file={media.videoState.primaryVideoUpload}
            frameSeconds={media.videoState.posterFrameSeconds ?? "0"}
            onFrameSecondsChange={(value) =>
              media.updateVideoState((current) => ({
                ...current,
                posterFrameSeconds: value,
              }))
            }
          />
        ) : null}
      </CardContent>
    );
  }

  if (tabs.activeTab !== "song") {
    return null;
  }

  return (
    <CardContent className={cn("space-y-6 p-5", isMobile && "px-0 pb-4 pt-1")}>
      <div className="space-y-1">
        <Type as="h2" variant="h3" className="text-muted-foreground">
          Song details
        </Type>
        <Type as="p" variant="caption" className="text-muted-foreground">
          {copy.requiredFieldsLegend}
        </Type>
      </div>

      <Tabs
        className="w-full"
        onValueChange={(value) => primary.handleSongModeChange(value === "remix" ? "remix" : "original")}
        value={primary.activeSongMode}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-full border border-border-soft">
          {(["original", "remix"] as const).map((value) => (
            <TabsTrigger
              className="h-10 min-w-0 px-3 font-semibold capitalize"
              disabled={Boolean(primary.derivativeState?.trigger === "analysis" && value === "original")}
              key={value}
              value={value}
            >
              {copy.songModes[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {primary.derivativeState?.visible ? (
        <PostComposerDerivativeSection
          copy={copy}
          derivativePickerKey={primary.derivativePickerKey}
          derivativeSearchResults={primary.derivativeSearchResults}
          derivativeState={primary.derivativeState}
          onAdvancePicker={advanceDerivativePicker}
          updateDerivativeState={primary.updateDerivativeState}
        />
      ) : null}

      <section className="space-y-4">
        <div>
          <FieldLabel htmlFor={titleId} label="Song title" required />
          <Input
            id={titleId}
            onChange={(event) => song.update((current) => ({ ...current, title: event.target.value }))}
            placeholder="Track title"
            required
            value={song.state.title ?? ""}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor={genreId} label={copy.fields.genre} required />
            <Select
              onValueChange={(value) =>
                song.update((current) => ({ ...current, genre: value }))
              }
              required
              value={song.state.genre}
            >
              <SelectTrigger id={genreId}>
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
            <FieldLabel htmlFor={primaryLanguageId} label={copy.fields.primaryLanguage} required />
            <Select
              onValueChange={(value) =>
                song.update((current) => ({ ...current, primaryLanguage: value }))
              }
              required
              value={song.state.primaryLanguage}
            >
              <SelectTrigger id={primaryLanguageId}>
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
        </div>

        <LabeledTextarea
          className="min-h-36"
          htmlFor={lyricsId}
          label={copy.fields.lyrics}
          onChange={controller.fields.onLyricsValueChange}
          placeholder={copy.placeholders.lyrics}
          variant={isMobile ? "flat" : "default"}
          value={controller.fields.lyricsValue}
        />
      </section>

      <section className="space-y-4">
        <UploadField
          accept={acceptedImageMimeTypes}
          copy={copy}
          label={copy.fields.coverArt}
          onChange={(files) =>
            song.update((current) => ({
              ...current,
              coverLabel: files?.[0]?.name ?? current.coverLabel,
              coverSource: files?.[0] ? "upload" : undefined,
              coverUpload: files?.[0] ?? null,
            }))
          }
          previewUrl={coverPreviewUrl}
          selectedLabel={song.state.coverUpload?.name ?? song.state.coverLabel}
          variant="artwork"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <UploadField
            accept="audio/*"
            copy={copy}
            label={copy.fields.instrumentalStem}
            onChange={(files) =>
              song.update((current) => ({
                ...current,
                instrumentalAudioLabel: files?.[0]?.name ?? current.instrumentalAudioLabel,
                instrumentalAudioUpload: files?.[0] ?? null,
              }))
            }
            selectedLabel={song.state.instrumentalAudioUpload?.name ?? song.state.instrumentalAudioLabel}
          />
          <UploadField
            accept="audio/*"
            copy={copy}
            label={copy.fields.vocalStem}
            onChange={(files) =>
              song.update((current) => ({
                ...current,
                vocalAudioLabel: files?.[0]?.name ?? current.vocalAudioLabel,
                vocalAudioUpload: files?.[0] ?? null,
              }))
            }
            selectedLabel={song.state.vocalAudioUpload?.name ?? song.state.vocalAudioLabel}
          />
        </div>
        <UploadField
          accept="video/*"
          copy={copy}
          label={copy.fields.canvasVideo}
          onChange={(files) =>
            song.update((current) => ({
              ...current,
              canvasVideoLabel: files?.[0]?.name ?? current.canvasVideoLabel,
              canvasVideoUpload: files?.[0] ?? null,
            }))
          }
          selectedLabel={song.state.canvasVideoUpload?.name ?? song.state.canvasVideoLabel}
        />
      </section>

      <section className="space-y-4">
        <div>
          <FieldLabel label={copy.fields.secondaryLanguage} />
          <Select
            onValueChange={(value) =>
              song.update((current) => ({
                ...current,
                secondaryLanguage: value === noneLanguageValue ? "" : value,
              }))
            }
            value={song.state.secondaryLanguage || noneLanguageValue}
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
      </section>
    </CardContent>
  );
}
