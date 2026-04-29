import {
  Image as ImageIcon,
  Link,
  MusicNotes,
  VideoCamera,
} from "@phosphor-icons/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";

import { songGenreOptions, songLanguageOptions } from "./post-composer-config";
import { PostComposerUploadRow } from "./post-composer-upload-row";
import type { SongDetailsState } from "./post-composer.types";

export function PostComposerSongDetailsSection({
  onChange,
  value,
}: {
  onChange: (value: SongDetailsState) => void;
  value: SongDetailsState;
}) {
  return (
    <section className="space-y-5">
      <Type as="h2" variant="h3" className="text-muted-foreground">
        Song details
      </Type>
      <label className="block space-y-2">
        <Type as="span" variant="body-strong">
          Genre
        </Type>
        <Select onValueChange={(genre) => onChange({ ...value, genre })} value={value.genre}>
          <SelectTrigger className="h-12 bg-card">
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
      </label>
      <label className="block space-y-2">
        <Type as="span" variant="body-strong">
          Language
        </Type>
        <Select onValueChange={(language) => onChange({ ...value, language })} value={value.language}>
          <SelectTrigger className="h-12 bg-card">
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
      </label>
      <label className="block space-y-2">
        <Type as="span" variant="body-strong">
          Lyrics
        </Type>
        <Textarea
          className="min-h-28 resize-none rounded-[var(--radius-lg)] bg-card"
          onChange={(event) => onChange({ ...value, lyrics: event.target.value })}
          placeholder="Paste lyrics or mark instrumental"
          value={value.lyrics}
        />
      </label>
      <PostComposerUploadRow
        accept="image/*"
        description="Optional image"
        icon={<ImageIcon className="size-6" />}
        label="Cover art"
        onChange={(coverArt) => onChange({ ...value, coverArt })}
        value={value.coverArt}
      />
      <section className="space-y-3 pt-2">
        <Type as="h2" variant="h3" className="text-muted-foreground">
          Stems
        </Type>
        <PostComposerUploadRow
          accept="audio/*"
          description="Optional audio file"
          icon={<MusicNotes className="size-6" />}
          label="Instrumental"
          onChange={(instrumentalStem) => onChange({ ...value, instrumentalStem })}
          value={value.instrumentalStem}
        />
        <PostComposerUploadRow
          accept="audio/*"
          description="Optional audio file"
          icon={<MusicNotes className="size-6" />}
          label="Vocal"
          onChange={(vocalStem) => onChange({ ...value, vocalStem })}
          value={value.vocalStem}
        />
        <PostComposerUploadRow
          accept="video/*"
          description="Optional video loop"
          icon={<VideoCamera className="size-6" />}
          label="Canvas video"
          onChange={(canvasVideo) => onChange({ ...value, canvasVideo })}
          value={value.canvasVideo}
        />
      </section>
      <button
        className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3 text-start"
        type="button"
      >
        <span className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-background text-muted-foreground">
          <Link className="size-6" />
        </span>
        <span className="min-w-0">
          <Type as="span" variant="body-strong" className="block">
            Source track
          </Type>
          <Type as="span" variant="body" className="block text-muted-foreground">
            Select existing track
          </Type>
        </span>
        <Type as="span" variant="caption" className="text-muted-foreground">
          Soon
        </Type>
      </button>
    </section>
  );
}
