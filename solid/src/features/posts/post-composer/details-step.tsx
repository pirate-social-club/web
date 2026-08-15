// Details step (song metadata + video cover frame / source song), ported from
// the React post-composer-details-step.tsx. Genre/language selects use the DS
// Select.

import { Show } from "solid-js";

import {
  CardContent,
  Input,
  Select,
  Type,
} from "../../../design-system";
import { cn } from "../../../lib/cn";
import type { PostComposerController } from "./controller";
import { noneLanguageValue, songGenreOptions, songLanguageOptions } from "./defaults";
import { PostComposerDerivativeSection, PostComposerSourceModeTabs } from "./derivative-section";
import { FieldLabel, LabeledTextarea, UploadField } from "./fields";
import { createObjectUrl } from "./media-hooks";
import { VideoFramePicker } from "./video-frame-picker";

const acceptedImageMimeTypes = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export function PostComposerDetailsStep(props: {
  controller: PostComposerController;
}) {
  const controller = props.controller;
  const copy = controller.copy;
  const coverPreviewUrl = createObjectUrl(() => controller.song.state.coverUpload);
  const uploadCopy = {
    chooseFileLabel: copy.buttons.chooseFile,
    coverLabel: copy.upload.cover,
    noFileSelectedLabel: copy.upload.noFileSelected,
    replaceLabel: copy.buttons.replace,
    squareArtworkLabel: copy.upload.squareArtwork,
    uploadArtworkHelp: copy.upload.artworkHelp,
  };

  return (
    <Show when={controller.tabs.activeTab === "video" || controller.tabs.activeTab === "song"}>
      <Show
        when={controller.tabs.activeTab === "video"}
        fallback={
          <CardContent class={cn("space-y-6 p-5", controller.isMobile() && "px-0 pb-4 pt-1")}>
            <div class="space-y-1">
              <Type as="h2" variant="h3" class="text-muted-foreground">
                Song details
              </Type>
              <Type as="p" variant="caption" class="text-muted-foreground">
                {copy.requiredFieldsLegend}
              </Type>
            </div>

            <PostComposerSourceModeTabs
              modes={(["original", "remix"] as const).map((value) => ({
                label: copy.songModes[value],
                value,
              }))}
              onValueChange={(value) => controller.primary.handleSongModeChange(value === "remix" ? "remix" : "original")}
              value={controller.primary.activeSongMode}
            />

            <Show when={controller.primary.derivativeState?.visible}>
              <PostComposerDerivativeSection
                copy={copy}
                derivativePickerKey={controller.primary.derivativePickerKey}
                derivativeSearchResults={controller.primary.derivativeSearchResults}
                derivativeState={controller.primary.derivativeState}
                onAdvancePicker={controller.advanceDerivativePicker}
                updateDerivativeState={controller.primary.updateDerivativeState}
              />
            </Show>

            <section class="space-y-4">
              <div>
                <FieldLabel htmlFor="song-title" label="Song title" required />
                <Input
                  id="song-title"
                  onChange={(event) => controller.song.update((current) => ({ ...current, title: event.currentTarget.value }))}
                  placeholder="Track title"
                  required
                  value={controller.song.state.title ?? ""}
                />
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="song-genre" label={copy.fields.genre} required />
                  <Select<string>
                    aria-label={copy.fields.genre}
                    onChange={(value) => {
                      if (value) controller.song.update((current) => ({ ...current, genre: value }));
                    }}
                    optionLabel={(option) => option}
                    options={[...songGenreOptions]}
                    optionValue={(option) => option}
                    placeholder={copy.placeholders.selectGenre}
                    value={controller.song.state.genre}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="song-primary-language" label={copy.fields.primaryLanguage} required />
                  <Select<string>
                    aria-label={copy.fields.primaryLanguage}
                    onChange={(value) => {
                      if (value) controller.song.update((current) => ({ ...current, primaryLanguage: value }));
                    }}
                    optionLabel={(option) => option}
                    options={[...songLanguageOptions]}
                    optionValue={(option) => option}
                    placeholder={copy.placeholders.selectLanguage}
                    value={controller.song.state.primaryLanguage}
                  />
                </div>
              </div>

              <LabeledTextarea
                class="min-h-36"
                htmlFor="song-lyrics"
                label={copy.fields.lyrics}
                onChange={controller.fields.onLyricsValueChange}
                placeholder={copy.placeholders.lyrics}
                variant={controller.isMobile() ? "flat" : "default"}
                value={controller.fields.lyricsValue}
              />
              <div>
                <FieldLabel htmlFor="song-genius-annotations" label={copy.fields.geniusAnnotations} />
                <Input
                  id="song-genius-annotations"
                  inputmode="url"
                  onChange={(event) =>
                    controller.song.update((current) => ({
                      ...current,
                      geniusAnnotationsUrl: event.currentTarget.value,
                    }))
                  }
                  placeholder={copy.placeholders.geniusAnnotationsUrl}
                  type="url"
                  value={controller.song.state.geniusAnnotationsUrl ?? ""}
                />
              </div>
            </section>

            <section class="space-y-4">
              <UploadField
                accept={acceptedImageMimeTypes}
                label={copy.fields.coverArt}
                onChange={(files) =>
                  controller.song.update((current) => ({
                    ...current,
                    coverLabel: files?.[0]?.name ?? current.coverLabel,
                    coverSource: files?.[0] ? "upload" : undefined,
                    coverUpload: files?.[0] ?? null,
                  }))
                }
                onClear={() =>
                  controller.song.update((current) => ({
                    ...current,
                    coverLabel: undefined,
                    coverSource: undefined,
                    coverUpload: null,
                  }))
                }
                previewUrl={coverPreviewUrl()}
                selectedLabel={controller.song.state.coverUpload?.name ?? controller.song.state.coverLabel}
                variant="artwork"
                {...uploadCopy}
              />
              <div class="grid gap-3 md:grid-cols-2">
                <UploadField
                  accept="audio/*"
                  label={copy.fields.instrumentalStem}
                  onChange={(files) =>
                    controller.song.update((current) => ({
                      ...current,
                      instrumentalAudioLabel: files?.[0]?.name ?? current.instrumentalAudioLabel,
                      instrumentalAudioUpload: files?.[0] ?? null,
                    }))
                  }
                  onClear={() =>
                    controller.song.update((current) => ({
                      ...current,
                      instrumentalAudioLabel: undefined,
                      instrumentalAudioUpload: null,
                    }))
                  }
                  selectedLabel={controller.song.state.instrumentalAudioUpload?.name ?? controller.song.state.instrumentalAudioLabel}
                  {...uploadCopy}
                />
                <UploadField
                  accept="audio/*"
                  label={copy.fields.vocalStem}
                  onChange={(files) =>
                    controller.song.update((current) => ({
                      ...current,
                      vocalAudioLabel: files?.[0]?.name ?? current.vocalAudioLabel,
                      vocalAudioUpload: files?.[0] ?? null,
                    }))
                  }
                  onClear={() =>
                    controller.song.update((current) => ({
                      ...current,
                      vocalAudioLabel: undefined,
                      vocalAudioUpload: null,
                    }))
                  }
                  selectedLabel={controller.song.state.vocalAudioUpload?.name ?? controller.song.state.vocalAudioLabel}
                  {...uploadCopy}
                />
              </div>
              <UploadField
                accept="video/*"
                label={copy.fields.canvasVideo}
                onChange={(files) =>
                  controller.song.update((current) => ({
                    ...current,
                    canvasVideoLabel: files?.[0]?.name ?? current.canvasVideoLabel,
                    canvasVideoUpload: files?.[0] ?? null,
                  }))
                }
                onClear={() =>
                  controller.song.update((current) => ({
                    ...current,
                    canvasVideoLabel: undefined,
                    canvasVideoUpload: null,
                  }))
                }
                selectedLabel={controller.song.state.canvasVideoUpload?.name ?? controller.song.state.canvasVideoLabel}
                {...uploadCopy}
              />
            </section>

            <section class="space-y-4">
              <div>
                <FieldLabel label={copy.fields.secondaryLanguage} />
                <Select<string>
                  aria-label={copy.fields.secondaryLanguage}
                  onChange={(value) =>
                    controller.song.update((current) => ({
                      ...current,
                      secondaryLanguage: value === noneLanguageValue ? "" : value ?? "",
                    }))
                  }
                  optionLabel={(option) => option === noneLanguageValue ? copy.none : option}
                  options={[noneLanguageValue, ...songLanguageOptions]}
                  optionValue={(option) => option}
                  placeholder={copy.placeholders.optional}
                  value={controller.song.state.secondaryLanguage || noneLanguageValue}
                />
              </div>
            </section>
          </CardContent>
        }
      >
        <CardContent class={cn("space-y-6 p-5", controller.isMobile() && "px-0 pb-4 pt-1")}>
          <Type as="h2" variant="h3" class="text-muted-foreground">
            Video details
          </Type>
          <PostComposerSourceModeTabs
            modes={[
              { label: "Original video", value: "original" },
              { label: "Uses song", value: "uses_song" },
            ]}
            onValueChange={(value) =>
              controller.primary.handleVideoSourceModeChange(value === "uses_song" ? "uses_song" : "original")
            }
            value={controller.primary.activeVideoSourceMode}
          />
          <Show when={controller.media.videoState.primaryVideoUpload}>
            {(file) => (
              <VideoFramePicker
                copy={copy}
                file={file()}
                frameSeconds={controller.media.videoState.posterFrameSeconds ?? "0"}
                onFrameSecondsChange={(value) =>
                  controller.media.updateVideoState((current) => ({
                    ...current,
                    posterFrameSeconds: value,
                  }))
                }
              />
            )}
          </Show>
          <Show when={controller.primary.derivativeState?.visible}>
            <PostComposerDerivativeSection
              copy={copy}
              derivativePickerKey={controller.primary.derivativePickerKey}
              derivativeSearchResults={controller.primary.derivativeSearchResults}
              derivativeState={controller.primary.derivativeState}
              labels={{
                acceptTermsLabel: "I accept the source song terms.",
                emptyLabel: "No songs found.",
                placeholder: "Search songs",
                searchAriaLabel: "Search songs this video uses",
                sectionTitle: "Uses song",
              }}
              onAdvancePicker={controller.advanceDerivativePicker}
              updateDerivativeState={controller.primary.updateDerivativeState}
            />
          </Show>
        </CardContent>
      </Show>
    </Show>
  );
}
