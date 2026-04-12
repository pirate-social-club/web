"use client";

import * as React from "react";
import {
  X,
  CaretDown,
  Image as ImageIcon,
  Link,
  List,
  Microphone,
  MusicNote,
  Plus,
  Quotes,
  SquaresFour,
  Tag,
  Trash,
  VideoCamera,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/primitives/combobox";
import { FormFieldLabel, FormNote, FormSectionHeading } from "@/components/primitives/form-layout";
import { IconButton } from "@/components/primitives/icon-button";
import { OptionCard } from "@/components/primitives/option-card";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { MarkdownContent } from "@/components/primitives/markdown-content";
import { Chip } from "@/components/primitives/chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Scrubber } from "@/components/primitives/scrubber";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  ComposerReference,
  ComposerTab,
  ComposerIdentityState,
  DerivativeStepState,
  IdentityMode,
  LiveAccessMode,
  LiveComposerState,
  LiveRoomKind,
  LiveSetlistItemInput,
  LiveVisibility,
  MonetizationState,
  PostComposerProps,
  PostComposerSubmitPayload,
  QualifierOption,
  SongComposerState,
  SongLicense,
} from "./post-composer.types";

const tabMeta: Record<ComposerTab, { label: string; icon: React.ReactNode }> = {
  text: { label: "Text", icon: <SquaresFour className="size-5" /> },
  image: { label: "Image", icon: <ImageIcon className="size-5" /> },
  video: { label: "Video", icon: <VideoCamera className="size-5" /> },
  link: { label: "Link", icon: <Link className="size-5" /> },
  song: { label: "Song", icon: <MusicNote className="size-5" /> },
  live: { label: "Live", icon: <Microphone className="size-5" /> },
};

const defaultTabs: ComposerTab[] = ["text", "image", "video", "link", "song", "live"];
const anonymousEligibleTabs: ComposerTab[] = ["text", "image", "video", "link"];

type MobileDockMode = "attachments" | "formatting";

type MobileAttachmentKey = "link" | "image" | "video" | "song";

const roomKindOptions: { value: LiveRoomKind; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "duet", label: "Duet" },
];

const accessModeOptions: { value: LiveAccessMode; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "gated", label: "Gated" },
  { value: "paid", label: "Paid" },
];

const visibilityOptions: { value: LiveVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
];

const noneLanguageValue = "__none__";

const songGenreOptions = [
  "Electronic",
  "Hip-hop",
  "Pop",
  "R&B",
  "Rock",
  "Ambient",
] as const;

const songLanguageOptions = [
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Korean",
  "Portuguese",
] as const;

const licenseOptions: {
  value: SongLicense;
  label: string;
  description: string;
}[] = [
  {
    value: "non_commercial",
    label: "Non-commercial only",
    description: "Private listening and sharing. No commercial releases or paid derivatives.",
  },
  {
    value: "commercial_no_remix",
    label: "Commercial use (no remix)",
    description: "Monetization is allowed, but downstream remix derivatives stay closed.",
  },
  {
    value: "commercial_remix",
    label: "Commercial use + remix",
    description: "Commercial use stays open and licensed remix derivatives can flow through.",
  },
];

const fallbackTrackOptions: ComposerReference[] = [
  { id: "trk_01midnightwaves", title: "Midnight Waves", subtitle: "DJ Solar" },
  { id: "trk_01echoes", title: "Echoes", subtitle: "DJ Solar" },
  { id: "trk_01afterhours", title: "After Hours", subtitle: "DJ Solar" },
  { id: "trk_01blue", title: "Blue", subtitle: "Joni Mitchell" },
];

const fallbackSourceOptions: ComposerReference[] = [
  { id: "ast_01abc", title: "Midnight Waves", subtitle: "DJ Solar" },
  { id: "ast_01def", title: "After Hours", subtitle: "DJ Solar" },
  { id: "ast_01ghi", title: "Blue", subtitle: "Joni Mitchell" },
];

function allowsCommercialUse(license?: SongLicense) {
  return license === "commercial_no_remix" || license === "commercial_remix";
}

function formatLicenseLabel(license?: SongLicense) {
  switch (license) {
    case "non_commercial":
      return "Non-commercial only";
    case "commercial_no_remix":
      return "Commercial use (no remix)";
    case "commercial_remix":
      return "Commercial use + remix";
    default:
      return "Unconfigured";
  }
}

function defaultSongState(song?: SongComposerState): SongComposerState {
  return {
    primaryAudioUpload: song?.primaryAudioUpload ?? null,
    primaryAudioLabel: song?.primaryAudioLabel,
    genre: song?.genre ?? "Electronic",
    primaryLanguage: song?.primaryLanguage ?? "English",
    secondaryLanguage: song?.secondaryLanguage ?? "",
    coverUpload: song?.coverUpload ?? null,
    coverLabel: song?.coverLabel,
  };
}

function defaultMonetizationState(monetization?: MonetizationState): MonetizationState {
  return {
    visible: monetization?.visible ?? false,
    license: monetization?.license ?? "non_commercial",
    revenueSharePct: monetization?.revenueSharePct ?? 10,
    priceLabel: monetization?.priceLabel,
    priceUsd:
      monetization?.priceUsd ??
      monetization?.priceLabel?.replace(/[^0-9.]/g, "") ??
      "1.00",
    openEdition: monetization?.openEdition ?? true,
    maxSupply: monetization?.maxSupply ?? "250",
    donationAvailable: monetization?.donationAvailable ?? false,
    donationOptIn: monetization?.donationOptIn ?? false,
    donationPartnerId: monetization?.donationPartnerId,
    donationPartnerName: monetization?.donationPartnerName,
    donationSharePct: monetization?.donationSharePct ?? 10,
    rightsAttested: monetization?.rightsAttested ?? false,
  };
}

function resolveDonationPartnerName(state: MonetizationState) {
  return state.donationPartnerName ?? "Community partner";
}

function ShellPill({
  avatarSrc,
  children,
  onClick,
}: {
  avatarSrc?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <div className="inline-flex items-center gap-3 rounded-full bg-muted px-3.5 py-2.5 text-base font-semibold text-foreground">
      {avatarSrc ? (
        <img alt="" className="size-8 rounded-full object-cover" src={avatarSrc} />
      ) : (
        <div className="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
          <Tag className="size-5" />
        </div>
      )}
      <span>{children}</span>
      <CaretDown className="size-5 text-muted-foreground" />
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button className="inline-flex text-left" onClick={onClick} type="button">
      {content}
    </button>
  );
}

function FieldLabel({
  label,
  counter,
}: {
  label: string;
  counter?: string;
}) {
  return <FormFieldLabel className="mb-2" counter={counter} label={label} />;
}

function UploadField({
  label,
  accept,
  multiple = false,
  onChange,
  selectedLabel,
  variant = "default",
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  selectedLabel?: string;
  variant?: "default" | "artwork";
}) {
  const inputId = React.useId();
  const isArtwork = variant === "artwork";

  return (
    <div className="block">
      <FieldLabel label={label} />
      <input
        id={inputId}
        accept={accept}
        className="sr-only"
        multiple={multiple}
        onChange={(event) => onChange?.(event.target.files)}
        type="file"
      />
      <label
        className={cn(
          "flex w-full cursor-pointer rounded-[var(--radius-lg)] border border-border-soft bg-background transition-colors hover:border-primary/40",
          isArtwork ? "items-center gap-4 px-4 py-4" : "items-center justify-between gap-4 px-4 py-3.5",
        )}
        htmlFor={inputId}
      >
        {isArtwork ? (
          <>
            <div className="grid size-24 shrink-0 place-items-center rounded-[var(--radius-lg)] border border-border-soft bg-muted">
              {selectedLabel ? (
                <span className="px-3 text-center text-base font-semibold text-foreground">
                  Cover
                </span>
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-base font-semibold text-foreground">
                {selectedLabel || "Upload square artwork"}
              </p>
              <p className="text-base text-muted-foreground">
                Shows in feed, release, and player surfaces.
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {selectedLabel || "No file selected"}
            </p>
          </div>
        )}
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3.5 py-2 text-base font-semibold text-foreground">
          {selectedLabel ? "Replace" : "Choose file"}
        </span>
      </label>
    </div>
  );
}

function LabeledTextarea({
  label,
  placeholder,
  value,
  onChange,
  className,
  onFocusChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <Textarea
        className={className}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onFocusChange?.(false)}
        onFocus={() => onFocusChange?.(true)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

function MobileInlineUpload({
  icon,
  label,
  accept,
  file,
  onChange,
  onDismiss,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  onDismiss: () => void;
}) {
  const inputId = React.useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold text-foreground">{label}</span>
        <button
          className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          <X className="size-5" />
        </button>
      </div>
      <input
        id={inputId}
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        type="file"
      />
      <label
        className="flex cursor-pointer items-center justify-between rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3.5 transition-colors hover:border-primary/40"
        htmlFor={inputId}
      >
        <span className="truncate text-base font-semibold text-foreground">
          {file ? file.name : "Choose file"}
        </span>
        <span className="shrink-0 inline-flex items-center rounded-full bg-muted px-3.5 py-2 text-base font-semibold text-foreground">
          {file ? "Replace" : "Browse"}
        </span>
      </label>
    </div>
  );
}

type MarkdownSelectionUpdate = {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
};

export interface EditorChromeHandle {
  applyBold: () => void;
  applyItalic: () => void;
  applyLink: () => void;
  applyList: () => void;
  applyQuote: () => void;
  applyStrikethrough: () => void;
  applyUppercase: () => void;
}

function wrapMarkdownSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownSelectionUpdate {
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const replacement = `${before}${selected}${after}`;

  return {
    nextValue:
      value.slice(0, selectionStart) +
      replacement +
      value.slice(selectionEnd),
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + selected.length,
  };
}

function prefixMarkdownLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): MarkdownSelectionUpdate {
  const blockStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = value.indexOf("\n", selectionEnd);
  const blockEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(blockStart, blockEnd).split("\n");
  const replacement = lines
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");

  return {
    nextValue: value.slice(0, blockStart) + replacement + value.slice(blockEnd),
    selectionStart: blockStart,
    selectionEnd: blockStart + replacement.length,
  };
}

function insertMarkdownLink(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownSelectionUpdate {
  const label = value.slice(selectionStart, selectionEnd) || "link text";
  const replacement = `[${label}](https://)`;
  const urlStart = selectionStart + label.length + 3;

  return {
    nextValue:
      value.slice(0, selectionStart) +
      replacement +
      value.slice(selectionEnd),
    selectionStart: urlStart,
    selectionEnd: urlStart + "https://".length,
  };
}

function uppercaseMarkdownSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownSelectionUpdate {
  const selected = value.slice(selectionStart, selectionEnd) || "heading";
  const replacement = selected.toUpperCase();

  return {
    nextValue:
      value.slice(0, selectionStart) +
      replacement +
      value.slice(selectionEnd),
    selectionStart,
    selectionEnd: selectionStart + replacement.length,
  };
}

const EditorChrome = React.forwardRef<EditorChromeHandle, {
  value: string;
  onChange: (value: string) => void;
  mobile?: boolean;
  onFocusChange?: (focused: boolean) => void;
}>(({
  value,
  onChange,
  mobile = false,
  onFocusChange,
}, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = React.useState(false);

  const applyUpdate = React.useCallback(
    (
      transform: (
        currentValue: string,
        selectionStart: number,
        selectionEnd: number,
      ) => MarkdownSelectionUpdate,
    ) => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      const next = transform(value, textarea.selectionStart, textarea.selectionEnd);
      onChange(next.nextValue);

      requestAnimationFrame(() => {
        const input = textareaRef.current;

        if (!input) {
          return;
        }

        input.focus();
        input.setSelectionRange(next.selectionStart, next.selectionEnd);
      });
    },
    [onChange, value],
  );

  const applyBold = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        wrapMarkdownSelection(
          currentValue,
          selectionStart,
          selectionEnd,
          "**",
          "**",
          "bold text",
        ),
      ),
    [applyUpdate],
  );

  const applyItalic = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        wrapMarkdownSelection(
          currentValue,
          selectionStart,
          selectionEnd,
          "*",
          "*",
          "italic text",
        ),
      ),
    [applyUpdate],
  );

  const applyStrikethrough = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        wrapMarkdownSelection(
          currentValue,
          selectionStart,
          selectionEnd,
          "~~",
          "~~",
          "strikethrough",
        ),
      ),
    [applyUpdate],
  );

  const applyUppercase = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        uppercaseMarkdownSelection(currentValue, selectionStart, selectionEnd),
      ),
    [applyUpdate],
  );

  const applyLink = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        insertMarkdownLink(currentValue, selectionStart, selectionEnd),
      ),
    [applyUpdate],
  );

  const applyList = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        prefixMarkdownLines(currentValue, selectionStart, selectionEnd, "- "),
      ),
    [applyUpdate],
  );

  const applyQuote = React.useCallback(
    () =>
      applyUpdate((currentValue, selectionStart, selectionEnd) =>
        prefixMarkdownLines(currentValue, selectionStart, selectionEnd, "> "),
      ),
    [applyUpdate],
  );

  React.useImperativeHandle(ref, () => ({
    applyBold,
    applyItalic,
    applyLink,
    applyList,
    applyQuote,
    applyStrikethrough,
    applyUppercase,
  }), [applyBold, applyItalic, applyLink, applyList, applyQuote, applyStrikethrough, applyUppercase]);

  const toolbarActions = [
    {
      label: "Bold",
      onClick: applyBold,
    },
    {
      label: "Italic",
      onClick: applyItalic,
    },
    {
      label: "Code",
      onClick: () =>
        applyUpdate((currentValue, selectionStart, selectionEnd) =>
          wrapMarkdownSelection(
            currentValue,
            selectionStart,
            selectionEnd,
            "`",
            "`",
            "code",
          ),
        ),
    },
    {
      label: "Link",
      onClick: applyLink,
    },
    {
      label: "List",
      onClick: applyList,
    },
    {
      label: "Quote",
      onClick: applyQuote,
    },
  ];

  if (mobile) {
    return (
      <Textarea
        ref={textareaRef}
        className="min-h-[40dvh] rounded-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onFocusChange?.(false)}
        onFocus={() => onFocusChange?.(true)}
        placeholder="Share your thoughts"
        value={value}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-4 py-3">
        {toolbarActions.map((action) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            size="sm"
            variant="ghost"
          >
            {action.label}
          </Button>
        ))}
        <Button
          className="ml-auto"
          onClick={() => setPreview((current) => !current)}
          size="sm"
          variant={preview ? "secondary" : "ghost"}
        >
          {preview ? "Write" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <div className="min-h-44 px-4 py-3">
          {value.trim() ? (
            <MarkdownContent markdown={value} />
          ) : (
            <p className="text-base text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          className="min-h-44 rounded-none border-0 shadow-none focus-visible:ring-0"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Write in markdown"
          value={value}
        />
      )}
    </div>
  );
});
EditorChrome.displayName = "EditorChrome";

function References({
  items,
}: {
  items?: ComposerReference[];
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
        No upstream works attached yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
            {item.subtitle ? (
              <p className="truncate text-base text-muted-foreground">{item.subtitle}</p>
            ) : null}
          </div>
          <span className="text-base text-muted-foreground">Source</span>
        </div>
      ))}
    </div>
  );
}

function dedupeReferences(items: ComposerReference[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildManualReference(item: LiveSetlistItemInput): ComposerReference | undefined {
  if (!item.titleText) {
    return undefined;
  }

  return {
    id: item.declaredTrackId || `manual:${item.titleText}:${item.artistText ?? ""}`,
    title: item.titleText,
    subtitle: item.artistText,
  };
}

function SearchReferencePicker({
  ariaLabel,
  emptyLabel,
  items,
  onSelect,
  placeholder,
  resetKey,
  value,
}: {
  ariaLabel: string;
  emptyLabel: string;
  items: ComposerReference[];
  onSelect: (item: ComposerReference) => void;
  placeholder: string;
  resetKey?: number;
  value?: ComposerReference;
}) {
  return (
    <Combobox
      key={resetKey}
      autoHighlight
      items={items}
      itemToStringLabel={(item) => item.title}
      itemToStringValue={(item) => item.id}
      onValueChange={(item) => {
        if (item) {
          onSelect(item);
        }
      }}
      value={value}
    >
      <ComboboxInput aria-label={ariaLabel} placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList
          renderItem={(item) => {
            const reference = item as ComposerReference;

            return (
              <ComboboxItem key={reference.id} value={reference}>
                <p className="truncate text-base font-semibold text-foreground">{reference.title}</p>
                {reference.subtitle ? (
                  <p className="truncate text-base text-muted-foreground">{reference.subtitle}</p>
                ) : null}
              </ComboboxItem>
            );
          }}
        />
      </ComboboxContent>
    </Combobox>
  );
}

function SelectedReferenceCard({
  item,
  onClear,
}: {
  item: ComposerReference;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-base text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
      <Button
        aria-label={`Clear ${item.title}`}
        onClick={onClear}
        size="icon"
        variant="secondary"
      >
        <Trash className="size-5" />
      </Button>
    </div>
  );
}

function LinkPreviewCard({
  title,
  domain,
  description,
  imageSrc,
}: {
  title: string;
  domain: string;
  description?: string;
  imageSrc?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-card">
      <div className="flex min-h-28 flex-col md:flex-row">
        <div className="flex-1 space-y-2 px-4 py-4">
          <p className="text-base font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Preview
          </p>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
          <p className="text-base text-muted-foreground">{domain}</p>
        </div>
        {imageSrc ? (
          <img
            alt=""
            className="h-28 w-full border-t border-border-soft object-cover md:h-auto md:w-40 md:border-l md:border-t-0"
            src={imageSrc}
          />
        ) : null}
      </div>
    </div>
  );
}

function deriveSelectedQualifierIds(
  identity: NonNullable<PostComposerProps["identity"]>,
): string[] {
  return identity.selectedQualifierIds ?? [];
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
      <div className="space-y-1">
        <span className="block text-base text-muted-foreground">{label}</span>
        <span className="block text-lg font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

function SetlistItemRow({
  item,
  index,
  options,
  onRemove,
  onClearReference,
  onReferenceSelect,
  onUpdateManual,
}: {
  item: LiveSetlistItemInput;
  index: number;
  options: ComposerReference[];
  onRemove: (index: number) => void;
  onClearReference: (index: number) => void;
  onReferenceSelect: (index: number, item: ComposerReference) => void;
  onUpdateManual: (index: number, field: "titleText" | "artistText", value: string) => void;
}) {
  const selectedReference = React.useMemo(() => {
    return options.find((option) => option.id === item.declaredTrackId);
  }, [item, options]);
  const [showManualFields, setShowManualFields] = React.useState(
    !item.declaredTrackId && Boolean(item.titleText || item.artistText),
  );

  React.useEffect(() => {
    if (!item.declaredTrackId && (item.titleText || item.artistText)) {
      setShowManualFields(true);
    }
  }, [item.artistText, item.declaredTrackId, item.titleText]);

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-muted-foreground">{index + 1}</span>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onRemove(index)}
          type="button"
        >
          <Trash className="size-5" />
        </button>
      </div>
      <div className="space-y-2">
        <FieldLabel label="Song" />
        <SearchReferencePicker
          ariaLabel={`Search songs for setlist item ${index + 1}`}
          emptyLabel="No songs found."
          items={options}
          onSelect={(reference) => {
            setShowManualFields(false);
            onReferenceSelect(index, reference);
          }}
          placeholder="Search Pirate songbase"
          value={item.declaredTrackId ? selectedReference : undefined}
        />
      </div>

      {selectedReference ? (
        <SelectedReferenceCard
          item={selectedReference}
          onClear={() => onClearReference(index)}
        />
      ) : null}

      <button
        className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setShowManualFields((current) => !current)}
        type="button"
      >
        {showManualFields ? "Hide manual details" : "Can’t find the track?"}
      </button>

      {showManualFields ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            className="h-10"
            placeholder="Song title"
            defaultValue={item.titleText}
            onChange={(e) => onUpdateManual(index, "titleText", e.target.value)}
          />
          <Input
            className="h-10"
            placeholder="Artist"
            defaultValue={item.artistText ?? ""}
            onChange={(e) => onUpdateManual(index, "artistText", e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function LiveTabContent({
  live,
  onLiveChange,
}: {
  live: LiveComposerState;
  onLiveChange: (state: LiveComposerState) => void;
}) {
  const trackOptions = React.useMemo(
    () =>
      dedupeReferences([
        ...(live.trackOptions ?? []),
        ...fallbackTrackOptions,
        ...live.setlistItems.reduce<ComposerReference[]>((items, item) => {
          const manualReference = buildManualReference(item);

          if (manualReference) {
            items.push(manualReference);
          }

          return items;
        }, []),
      ]),
    [live.setlistItems, live.trackOptions],
  );
  const handleSetlistItemUpdate = (
    index: number,
    field: "titleText" | "artistText",
    value: string,
  ) => {
    const updated = [...live.setlistItems];
    updated[index] = { ...updated[index], [field]: value };
    onLiveChange({ ...live, setlistItems: updated });
  };

  const handleSetlistReferenceSelect = (index: number, reference: ComposerReference) => {
    const updated = [...live.setlistItems];
    updated[index] = {
      ...updated[index],
      declaredTrackId: reference.id,
      titleText: reference.title,
      artistText: reference.subtitle,
    };
    onLiveChange({ ...live, setlistItems: updated });
  };

  const handleClearSetlistReference = (index: number) => {
    const updated = [...live.setlistItems];
    updated[index] = {
      ...updated[index],
      declaredTrackId: undefined,
    };
    onLiveChange({ ...live, setlistItems: updated });
  };

  const handleAddSetlistItem = () => {
    onLiveChange({
      ...live,
      setlistItems: [
        ...live.setlistItems,
        { titleText: "", performanceKind: "unknown" },
      ],
    });
  };

  const handleRemoveSetlistItem = (index: number) => {
    const updated = live.setlistItems.filter((_, i) => i !== index);
    onLiveChange({ ...live, setlistItems: updated });
  };

  return (
    <div className="space-y-5">
      <UploadField
        accept="image/*"
        label="Cover art"
        onChange={(files) =>
          onLiveChange({
            ...live,
            coverUpload: files?.[0] ?? null,
            coverLabel: files?.[0]?.name ?? live.coverLabel,
          })
        }
        selectedLabel={live.coverUpload?.name ?? live.coverLabel}
        variant="artwork"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <FieldLabel label="Room kind" />
          <div className="flex flex-wrap gap-2">
            {roomKindOptions.map((opt) => (
              <Chip
                key={opt.value}
                variant={live.roomKind === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, roomKind: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel label="Access" />
          <div className="flex flex-wrap gap-2">
            {accessModeOptions.map((opt) => (
              <Chip
                key={opt.value}
                variant={live.accessMode === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, accessMode: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel label="Visibility" />
          <div className="flex flex-wrap gap-2">
            {visibilityOptions.map((opt) => (
              <Chip
                key={opt.value}
                variant={live.visibility === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, visibility: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {live.roomKind === "duet" ? (
        <div>
          <FieldLabel label="Guest performer" />
          <Input
            className="h-10"
            placeholder="Search for a collaborator"
            defaultValue={live.guestUserId ?? ""}
          />
          <FormNote className="mt-1">Invite a collaborator for this duet session.</FormNote>
        </div>
      ) : null}

      <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
        <FormSectionHeading
          description={
            live.roomKind === "solo"
              ? "The host receives 100% of performer-side proceeds."
              : "Split performer-side proceeds between host and collaborator."
          }
          title="Performer allocations"
        />
        <div className="space-y-2">
          {live.performerAllocations.map((alloc, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-medium text-foreground">
                  {alloc.role === "host" ? "Host" : "Guest"}
                </span>
                <span className="text-base text-foreground">
                  {alloc.role === "host" ? "You" : live.guestUserId || "Collaborator"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="h-10 w-20 text-center"
                  defaultValue={String(alloc.sharePct)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) return;
                    const updated = [...live.performerAllocations];
                    updated[i] = { ...updated[i], sharePct: val };
                    onLiveChange({ ...live, performerAllocations: updated });
                  }}
                  type="number"
                  min={0}
                  max={100}
                />
                <span className="text-base text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        {live.performerAllocations.reduce((sum, a) => sum + a.sharePct, 0) !== 100 ? (
          <FormNote tone="destructive">Allocations must sum to 100%</FormNote>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <FormSectionHeading title="Setlist" />
          <Chip
            leadingIcon={<Plus className="size-4" />}
            onClick={handleAddSetlistItem}
          >
            Add song
          </Chip>
        </div>
        {live.setlistItems.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-6 text-center text-base text-muted-foreground">
            No songs yet. Add at least one song before going live.
          </div>
        ) : (
          <div className="space-y-2">
            {live.setlistItems.map((item, i) => (
              <SetlistItemRow
                key={i}
                item={item}
                index={i}
                options={trackOptions}
                onClearReference={handleClearSetlistReference}
                onRemove={handleRemoveSetlistItem}
                onReferenceSelect={handleSetlistReferenceSelect}
                onUpdateManual={handleSetlistItemUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IdentitySection({
  identity,
  identityMode,
  onIdentityModeChange,
}: {
  identity: ComposerIdentityState;
  identityMode: IdentityMode;
  onIdentityModeChange: (mode: IdentityMode) => void;
}) {
  const handleLabel = identity.publicHandle ?? "@handle";
  const anonymousLabel = identity.anonymousLabel ?? "anon_club";

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading
        description={identityMode === "anonymous" ? anonymousLabel : handleLabel}
        title="Post As"
      />
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
        <Checkbox
          checked={identityMode === "anonymous"}
          className="mt-0.5"
          id="post-anonymously"
          onCheckedChange={(next) => onIdentityModeChange(next === true ? "anonymous" : "public")}
        />
        <div className="space-y-1">
          <Label htmlFor="post-anonymously">Post anonymously</Label>
        </div>
      </div>
    </section>
  );
}

function QualifierSection({
  identity,
  selectedQualifierIds,
  onSelectedQualifierIdsChange,
}: {
  identity: ComposerIdentityState;
  selectedQualifierIds: string[];
  onSelectedQualifierIdsChange: (qualifierIds: string[]) => void;
}) {
  const availableQualifiers = (identity.availableQualifiers ?? []).filter(
    (qualifier) => !qualifier.suppressedByClubGate,
  );
  const activeQualifiers = availableQualifiers.filter((qualifier) =>
    selectedQualifierIds.includes(qualifier.qualifierId),
  );
  const helpText =
    identity.helpText ??
    "Attach verified qualifiers to this post. Qualifiers already implied by community gates are omitted.";

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading description={helpText} title="Qualifiers" />

      {availableQualifiers.length > 0 ? (
        <div className="space-y-3">
          <Combobox
            multiple
            autoHighlight
            items={availableQualifiers}
            value={activeQualifiers}
            itemToStringLabel={(qualifier) => qualifier.label}
            itemToStringValue={(qualifier) => qualifier.qualifierId}
            onValueChange={(value) =>
              onSelectedQualifierIdsChange(value.map((qualifier) => qualifier.qualifierId))
            }
          >
            <ComboboxChips>
              <ComboboxValue>
                {(values) => (
                  <>
                    {values.map((qualifier) => {
                      const option = qualifier as QualifierOption;

                      return (
                        <ComboboxChip key={option.qualifierId} value={option}>
                          {option.label}
                        </ComboboxChip>
                      );
                    })}
                    <ComboboxChipsInput
                      aria-label="Search qualifiers"
                      placeholder={activeQualifiers.length > 0 ? "Search qualifiers" : "Add qualifiers"}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxEmpty>No qualifiers found.</ComboboxEmpty>
              <ComboboxList
                renderItem={(qualifier) => {
                  const option = qualifier as QualifierOption;

                  return (
                    <ComboboxItem key={option.qualifierId} value={option}>
                      <p className="text-base font-medium text-foreground">{option.label}</p>
                      {option.description ? (
                        <p className="text-base text-muted-foreground">{option.description}</p>
                      ) : null}
                    </ComboboxItem>
                  );
                }}
              />
            </ComboboxContent>
          </Combobox>
        </div>
      ) : null}

      {availableQualifiers.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
          No optional qualifiers are available for this community.
        </div>
      ) : null}
    </section>
  );
}

export function PostComposer({
  clubName,
  clubAvatarSrc,
  mobileChrome,
  mode,
  availableTabs = defaultTabs,
  canCreateSongPost = false,
  titleValue = "",
  titleCountLabel = "0/300",
  textBodyValue = "",
  captionValue = "",
  lyricsValue = "",
  linkUrlValue = "",
  linkPreview,
  songMode = "original",
  song,
  derivativeStep,
  monetization,
  identity,
  live,
  onSubmit,
}: PostComposerProps) {
  const visibleTabs = React.useMemo(
    () => availableTabs.filter((tab) => tab !== "song" || canCreateSongPost),
    [availableTabs, canCreateSongPost],
  );
  const [activeTab, setActiveTab] = React.useState<ComposerTab>(visibleTabs[0] ?? "text");
  const [activeSongMode, setActiveSongMode] = React.useState(songMode);
  const [draftTitle, setDraftTitle] = React.useState(titleValue);
  const [draftTextBody, setDraftTextBody] = React.useState(textBodyValue);
  const [draftCaption, setDraftCaption] = React.useState(captionValue);
  const [draftLyrics, setDraftLyrics] = React.useState(lyricsValue);
  const [draftLinkUrl, setDraftLinkUrl] = React.useState(linkUrlValue);
  const [songState, setSongState] = React.useState<SongComposerState>(defaultSongState(song));
  const [identityMode, setIdentityMode] = React.useState<IdentityMode>(
    identity?.identityMode ?? "public",
  );
  const [selectedQualifierIds, setSelectedQualifierIds] = React.useState<string[]>(
    identity ? deriveSelectedQualifierIds(identity) : [],
  );
  const [monetizationState, setMonetizationState] = React.useState<MonetizationState>(
    defaultMonetizationState(monetization),
  );
  const [derivativeState, setDerivativeState] = React.useState<DerivativeStepState | undefined>(
    derivativeStep,
  );
  const [derivativePickerKey, setDerivativePickerKey] = React.useState(0);
  const [liveState, setLiveState] = React.useState<LiveComposerState>(
    live ?? {
      roomKind: "solo",
      accessMode: "free",
      visibility: "public",
      setlistItems: [],
      setlistStatus: "draft",
      performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
    },
  );
  const [prevRoomKind, setPrevRoomKind] = React.useState<LiveRoomKind>(liveState.roomKind);

  React.useEffect(() => {
    if (liveState.roomKind !== prevRoomKind) {
      const hostAlloc = liveState.performerAllocations.find((a) => a.role === "host");
      if (liveState.roomKind === "solo") {
        setLiveState({
          ...liveState,
          performerAllocations: [{ ...hostAlloc!, sharePct: 100 }],
          guestUserId: undefined,
        });
      } else if (liveState.roomKind === "duet") {
        setLiveState({
          ...liveState,
          performerAllocations: [
            { ...hostAlloc!, sharePct: 50 },
            { userId: "", role: "guest", sharePct: 50 },
          ],
        });
      }
      setPrevRoomKind(liveState.roomKind);
    }
  }, [liveState.roomKind]);

  React.useEffect(() => {
    if (visibleTabs.includes(mode)) {
      setActiveTab(mode);
      return;
    }

    setActiveTab(visibleTabs[0] ?? "text");
  }, [mode, visibleTabs]);

  React.useEffect(() => {
    setActiveSongMode(songMode);
  }, [songMode]);

  React.useEffect(() => {
    setDraftTitle(titleValue);
  }, [titleValue]);

  React.useEffect(() => {
    setDraftTextBody(textBodyValue);
  }, [textBodyValue]);

  React.useEffect(() => {
    setDraftCaption(captionValue);
  }, [captionValue]);

  React.useEffect(() => {
    setDraftLyrics(lyricsValue);
  }, [lyricsValue]);

  React.useEffect(() => {
    setDraftLinkUrl(linkUrlValue);
  }, [linkUrlValue]);

  React.useEffect(() => {
    setSongState(defaultSongState(song));
  }, [song]);

  React.useEffect(() => {
    setMonetizationState(defaultMonetizationState(monetization));
  }, [monetization]);

  React.useEffect(() => {
    setDerivativeState(derivativeStep);
    setDerivativePickerKey(0);
  }, [derivativeStep]);

  React.useEffect(() => {
    if (live) {
      setLiveState(live);
    }
  }, [live]);

  React.useEffect(() => {
    if (!identity) {
      return;
    }

    setIdentityMode(identity.identityMode ?? "public");
    setSelectedQualifierIds(deriveSelectedQualifierIds(identity));
  }, [identity]);

  React.useEffect(() => {
    if (!anonymousEligibleTabs.includes(activeTab) && identityMode === "anonymous") {
      setIdentityMode("public");
    }
  }, [activeTab, identityMode]);

  React.useEffect(() => {
    if (identityMode === "anonymous" && identity?.allowQualifiersOnAnonymousPosts === false) {
      setSelectedQualifierIds([]);
    }
  }, [identity?.allowQualifiersOnAnonymousPosts, identityMode]);

  React.useEffect(() => {
    if (identityMode !== "anonymous" && selectedQualifierIds.length > 0) {
      setSelectedQualifierIds([]);
    }
  }, [identityMode, selectedQualifierIds]);

  const shouldShowDerivativeStep = Boolean(
    (derivativeState?.visible || (activeTab === "song" && activeSongMode === "remix")),
  );
  const derivativeSearchResults = React.useMemo(
    () =>
      dedupeReferences([
        ...(derivativeState?.searchResults ?? []),
        ...(derivativeState?.references ?? []),
        ...fallbackSourceOptions,
      ]),
    [derivativeState?.references, derivativeState?.searchResults],
  );
  const donationPartnerName = resolveDonationPartnerName(monetizationState);
  const effectiveTitleCountLabel =
    titleCountLabel === "0/300" ? `${draftTitle.length}/300` : titleCountLabel;
  const liveAllocationsValid =
    liveState.performerAllocations.reduce((sum, allocation) => sum + allocation.sharePct, 0) ===
    100;
  const textPostInvalid = activeTab === "text" &&
    draftTitle.trim().length === 0 &&
    draftTextBody.trim().length === 0;
  const linkPostInvalid = activeTab === "link" && draftLinkUrl.trim().length === 0;
  const songPostInvalid = activeTab === "song" &&
    (
      draftLyrics.trim().length === 0
      || !songState.primaryAudioUpload
    );
  const postDisabled =
    textPostInvalid ||
    linkPostInvalid ||
    songPostInvalid ||
    (activeTab === "song" &&
      monetizationState.visible &&
      !Boolean(monetizationState.rightsAttested)) ||
    (activeTab === "live" && !liveAllocationsValid);
  const shouldShowIdentity =
    Boolean(identity?.allowAnonymousIdentity) && anonymousEligibleTabs.includes(activeTab);
  const shouldShowQualifiers =
    Boolean(identity) &&
    Boolean(identity?.availableQualifiers?.some((qualifier) => !qualifier.suppressedByClubGate)) &&
    identityMode === "anonymous" &&
    identity?.allowQualifiersOnAnonymousPosts !== false;
  const usesMobileChrome = Boolean(mobileChrome);
  const [mobileDockOffset, setMobileDockOffset] = React.useState(0);
  const [mobileDockMode, setMobileDockMode] = React.useState<MobileDockMode>("attachments");
  const [mobileActiveAttachment, setMobileActiveAttachment] = React.useState<MobileAttachmentKey | null>(null);
  const [mobileDraftLinkUrl, setMobileDraftLinkUrl] = React.useState("");
  const [mobileImageFile, setMobileImageFile] = React.useState<File | null>(null);
  const [mobileVideoFile, setMobileVideoFile] = React.useState<File | null>(null);
  const [mobileAudioFile, setMobileAudioFile] = React.useState<File | null>(null);
  const [mobileCoverFile, setMobileCoverFile] = React.useState<File | null>(null);
  const [mobileDraftLyrics, setMobileDraftLyrics] = React.useState("");
  const [mobileSongGenre, setMobileSongGenre] = React.useState<string>(songGenreOptions[0]);
  const editorRef = React.useRef<EditorChromeHandle>(null);
  const mobileBlurTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (mobileBlurTimeoutRef.current != null) {
        window.clearTimeout(mobileBlurTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!usesMobileChrome || typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const updateOffset = () => {
      const nextOffset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setMobileDockOffset(nextOffset);
    };

    updateOffset();
    viewport.addEventListener("resize", updateOffset);
    viewport.addEventListener("scroll", updateOffset);

    return () => {
      viewport.removeEventListener("resize", updateOffset);
      viewport.removeEventListener("scroll", updateOffset);
    };
  }, [usesMobileChrome]);

  const handleMobileFieldFocusChange = React.useCallback((focused: boolean) => {
    if (!usesMobileChrome) {
      return;
    }

    if (mobileBlurTimeoutRef.current != null) {
      window.clearTimeout(mobileBlurTimeoutRef.current);
      mobileBlurTimeoutRef.current = null;
    }

    if (focused) {
      setMobileDockMode("formatting");
      return;
    }

    mobileBlurTimeoutRef.current = window.setTimeout(() => {
      setMobileDockMode("attachments");
      mobileBlurTimeoutRef.current = null;
    }, 120);
  }, [usesMobileChrome]);

  const handleMobileAttachmentTap = React.useCallback((key: MobileAttachmentKey) => {
    setMobileActiveAttachment((current) => (current === key ? null : key));
  }, []);

  const renderPrimaryArea = () => {
    switch (activeTab) {
      case "text":
        return (
          <div>
            {usesMobileChrome ? null : <FieldLabel label="Body" />}
            <EditorChrome
              mobile={usesMobileChrome}
              onChange={setDraftTextBody}
              onFocusChange={handleMobileFieldFocusChange}
              ref={editorRef}
              value={draftTextBody}
            />
          </div>
        );
      case "image":
        return (
          <div className="space-y-3">
            <UploadField accept="image/*" label="Image" />
            <LabeledTextarea
              className="min-h-28"
              label="Caption"
              onChange={setDraftCaption}
              placeholder="Add a caption"
              value={draftCaption}
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            <UploadField accept="video/*" label="Video" />
            <LabeledTextarea
              className="min-h-28"
              label="Caption"
              onChange={setDraftCaption}
              placeholder="Add a caption"
              value={draftCaption}
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
                onChange={(event) => setDraftLinkUrl(event.target.value)}
                placeholder="https://"
                value={draftLinkUrl}
              />
            </div>
            <LabeledTextarea
              className="min-h-28"
              label="Commentary"
              onChange={setDraftCaption}
              placeholder="Add commentary"
              value={draftCaption}
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
                      : "text-muted-foreground",
                  )}
                  onClick={() => setActiveSongMode(value)}
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
                  setSongState((current) => ({
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
                  setSongState((current) => ({
                    ...current,
                    coverUpload: files?.[0] ?? null,
                    coverLabel: files?.[0]?.name ?? current.coverLabel,
                  }))
                }
                selectedLabel={songState.coverUpload?.name ?? songState.coverLabel}
                variant="artwork"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <UploadField accept="audio/*" label="Instrumental stem" />
                <UploadField accept="audio/*" label="Vocal stem" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel label="Genre" />
                <Select
                  onValueChange={(value) => setSongState((current) => ({ ...current, genre: value }))}
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
                    setSongState((current) => ({ ...current, primaryLanguage: value }))
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
                    setSongState((current) => ({
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
              onChange={setDraftLyrics}
              placeholder="Paste lyrics"
              value={draftLyrics}
            />

          </div>
        );
      case "live":
        return <LiveTabContent live={liveState} onLiveChange={setLiveState} />;
      default:
        return null;
    }
  };

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!onSubmit || postDisabled) {
      return;
    }

    const resolvedMode = usesMobileChrome
      ? (mobileActiveAttachment === "link" ? "link" as ComposerTab
        : mobileActiveAttachment === "image" ? "image" as ComposerTab
        : mobileActiveAttachment === "video" ? "video" as ComposerTab
        : mobileActiveAttachment === "song" ? "song" as ComposerTab
        : "text" as ComposerTab)
      : activeTab;
    const resolvedLyrics = usesMobileChrome && resolvedMode === "song"
      ? mobileDraftLyrics.trim()
      : draftLyrics.trim();
    const resolvedSongState = usesMobileChrome && resolvedMode === "song"
      ? {
          ...songState,
          primaryAudioUpload: mobileAudioFile,
          primaryAudioLabel: mobileAudioFile?.name ?? songState.primaryAudioLabel,
          coverUpload: mobileCoverFile,
          coverLabel: mobileCoverFile?.name ?? songState.coverLabel,
          genre: mobileSongGenre,
        }
      : songState;

    const payload: PostComposerSubmitPayload = {
      mode: resolvedMode,
      title: draftTitle.trim(),
      body: draftTextBody.trim(),
      caption: draftCaption.trim(),
      lyrics: resolvedLyrics,
      linkUrl: draftLinkUrl.trim(),
      songMode: activeSongMode,
      song: resolvedSongState,
      derivativeStep: derivativeState,
      monetization: monetizationState,
      identityMode,
      selectedQualifierIds,
      live: liveState,
    };

    onSubmit(payload);
  };

  const formBody = (
    <>
          <div>
            <FieldLabel counter={effectiveTitleCountLabel} label="Title" />
            <Input
              className="h-14"
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Title"
              value={draftTitle}
            />
          </div>

          {shouldShowIdentity ? (
            <IdentitySection
              identity={identity!}
              identityMode={identityMode}
              onIdentityModeChange={setIdentityMode}
            />
          ) : null}

          {shouldShowQualifiers ? (
            <QualifierSection
              identity={identity!}
              onSelectedQualifierIdsChange={setSelectedQualifierIds}
              selectedQualifierIds={selectedQualifierIds}
            />
          ) : null}

          {renderPrimaryArea()}

          {shouldShowDerivativeStep ? (
            <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading title="Source track" />
              <SearchReferencePicker
                ariaLabel="Search source tracks"
                emptyLabel="No source tracks found."
                items={derivativeSearchResults}
                onSelect={(reference) => {
                  setDerivativeState((current) => ({
                    visible: true,
                    trigger: current?.trigger ?? "remix",
                    requirementLabel: current?.requirementLabel,
                    searchResults: current?.searchResults,
                    references: dedupeReferences([...(current?.references ?? []), reference]),
                  }));
                  setDerivativePickerKey((current) => current + 1);
                }}
                placeholder="Search Pirate / Story assets"
                resetKey={derivativePickerKey}
              />
              {derivativeState?.requirementLabel ? (
                <div className="rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground">
                  {derivativeState.requirementLabel}
                </div>
              ) : null}
              <References items={derivativeState?.references} />
            </section>
          ) : null}

          {monetizationState.visible ? (
            <section className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              {activeTab === "song" ? (
                <div className="space-y-3">
                  <FormSectionHeading
                    description="Pick the Story Protocol license path for this release before you set pricing."
                    title="License"
                  />
                  <div className="grid gap-3">
                    {licenseOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        description={option.description}
                        onClick={() =>
                          setMonetizationState((current) => ({
                            ...current,
                            license: option.value,
                          }))
                        }
                        selected={monetizationState.license === option.value}
                        title={option.label}
                      />
                    ))}
                  </div>

                  {allowsCommercialUse(monetizationState.license) ? (
                    <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <FormSectionHeading
                          description="Derivative commercial revenue owed back to this track."
                          title="Revenue share"
                        />
                        <span className="text-lg font-semibold text-foreground">
                          {monetizationState.revenueSharePct ?? 0}%
                        </span>
                      </div>
                      <div className="mt-4">
                        <Scrubber
                          showThumb
                          onChange={(value) =>
                            setMonetizationState((current) => ({
                              ...current,
                              revenueSharePct: value,
                            }))
                          }
                          value={monetizationState.revenueSharePct ?? 0}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <FormSectionHeading
                  description="Configure the paid listing surface."
                  title="Sales"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Unlock price (USD)" />
                    <Input
                      className="h-12"
                      inputMode="decimal"
                      onChange={(event) =>
                        setMonetizationState((current) => ({
                          ...current,
                          priceUsd: event.target.value,
                        }))
                      }
                      placeholder="1.00"
                      value={monetizationState.priceUsd ?? ""}
                    />
                  </div>

                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={monetizationState.openEdition}
                        className="mt-0.5"
                        id="open-edition"
                        onCheckedChange={(next) =>
                          setMonetizationState((current) => ({
                            ...current,
                            openEdition: next === true,
                          }))
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor="open-edition">Open edition</Label>
                        <FormNote>Leave supply uncapped for this release.</FormNote>
                      </div>
                    </div>
                    {!monetizationState.openEdition ? (
                      <div className="mt-3">
                        <FieldLabel label="Max supply" />
                        <Input
                          className="h-12"
                          inputMode="numeric"
                          onChange={(event) =>
                            setMonetizationState((current) => ({
                              ...current,
                              maxSupply: event.target.value,
                            }))
                          }
                          placeholder="250"
                          value={monetizationState.maxSupply ?? ""}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {monetizationState.donationAvailable ? (
                <div className="space-y-3">
                  <FormSectionHeading
                    description="Donation remains creator-side and only applies when this listing is paid."
                    title="Donation"
                  />

                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                    <div className="flex items-center justify-between gap-4 border-b border-border-soft pb-4">
                      <FieldLabel label="Community partner" />
                      <span className="text-base font-medium text-foreground">{donationPartnerName}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={monetizationState.donationOptIn}
                        className="mt-4"
                        id="donation-opt-in"
                        onCheckedChange={(next) =>
                          setMonetizationState((current) => ({
                            ...current,
                            donationOptIn: next === true,
                          }))
                        }
                      />
                      <div className="space-y-1 pt-3">
                        <Label htmlFor="donation-opt-in">
                          Donate part of your proceeds to {donationPartnerName}
                        </Label>
                      </div>
                    </div>

                    {monetizationState.donationOptIn ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <FieldLabel label="Donation share" />
                          <span className="text-lg font-semibold text-foreground">
                            {monetizationState.donationSharePct ?? 0}%
                          </span>
                        </div>
                        <Scrubber
                          max={50}
                          onChange={(value) =>
                            setMonetizationState((current) => ({
                              ...current,
                              donationSharePct: value,
                            }))
                          }
                          showThumb
                          value={Math.min(50, Math.max(1, monetizationState.donationSharePct ?? 10))}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTab === "song" ? (
                <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                  <FormSectionHeading
                    description="Review the release configuration before posting."
                    title="Review"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <SummaryRow label="Title" value={draftTitle || "Untitled"} />
                    <SummaryRow label="Genre" value={songState.genre ?? "Unconfigured"} />
                    <SummaryRow
                      label="Languages"
                      value={
                        songState.secondaryLanguage
                          ? `${songState.primaryLanguage ?? "English"} + ${songState.secondaryLanguage}`
                          : (songState.primaryLanguage ?? "English")
                      }
                    />
                    <SummaryRow
                      label="License"
                      value={formatLicenseLabel(monetizationState.license)}
                    />
                    {allowsCommercialUse(monetizationState.license) ? (
                      <SummaryRow
                        label="Revenue share"
                        value={`${monetizationState.revenueSharePct ?? 0}%`}
                      />
                    ) : null}
                    <SummaryRow
                      label="Donation"
                      value={
                        monetizationState.donationOptIn
                          ? `${monetizationState.donationSharePct ?? 0}% to ${donationPartnerName}`
                          : "Off"
                      }
                    />
                    <SummaryRow
                      label="Price"
                      value={
                        monetizationState.priceUsd ? `$${monetizationState.priceUsd}` : "Unconfigured"
                      }
                    />
                    <SummaryRow
                      label="Supply"
                      value={
                        monetizationState.openEdition
                          ? "Open edition"
                          : `${monetizationState.maxSupply || "Unconfigured"} copies`
                      }
                    />
                  </div>

                  <div className="flex items-start gap-3 border-t border-border-soft pt-4">
                    <Checkbox
                      checked={monetizationState.rightsAttested}
                      className="mt-0.5"
                      id="rights-attested"
                      onCheckedChange={(next) =>
                        setMonetizationState((current) => ({
                          ...current,
                          rightsAttested: next === true,
                        }))
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor="rights-attested">
                        I have the rights to publish and monetize this track.
                      </Label>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
    </>
  );

  if (usesMobileChrome) {
    const mobileAttachmentActions: Array<{
      key: MobileAttachmentKey;
      icon: React.ReactNode;
      label: string;
    }> = [
      { key: "link", icon: <Link className="size-5" />, label: "Link" },
      { key: "image", icon: <ImageIcon className="size-5" />, label: "Image" },
      { key: "video", icon: <VideoCamera className="size-5" />, label: "Video" },
      { key: "song", icon: <MusicNote className="size-5" />, label: "Song" },
    ];

    const formattingActions: Array<{
      key: string;
      label?: string;
      icon?: React.ReactNode;
      className?: string;
      onClick?: () => void;
    }> = [
      { key: "aa", label: "Aa", className: "font-medium" },
      { key: "bold", label: "B", onClick: () => editorRef.current?.applyBold(), className: "font-semibold" },
      { key: "italic", label: "i", onClick: () => editorRef.current?.applyItalic(), className: "italic" },
      { key: "strike", label: "S", onClick: () => editorRef.current?.applyStrikethrough(), className: "line-through" },
      { key: "caps", label: "Tt", onClick: () => editorRef.current?.applyUppercase(), className: "font-semibold tracking-tight" },
      { key: "link", icon: <Link className="size-5" />, onClick: () => editorRef.current?.applyLink() },
      { key: "list", icon: <List className="size-5" />, onClick: () => editorRef.current?.applyList() },
      { key: "quote", icon: <Quotes className="size-5" />, onClick: () => editorRef.current?.applyQuote() },
    ];

    const mobilePostDisabled = (() => {
      if (mobileActiveAttachment === "link") return draftLinkUrl.trim().length === 0;
      if (mobileActiveAttachment === "song") {
        return !mobileAudioFile || mobileDraftLyrics.trim().length === 0;
      }
      return draftTitle.trim().length === 0 && draftTextBody.trim().length === 0;
    })();

    return (
      <form
        className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-none flex-col"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between gap-3 pb-1">
          <IconButton
            aria-label="Close composer"
            onClick={mobileChrome?.onClose}
            variant="ghost"
          >
            <X className="size-6" weight="bold" />
          </IconButton>
          <Button disabled={mobilePostDisabled} type="submit">
            {mobileChrome?.postLabel ?? "Post"}
          </Button>
        </div>

        <div className="pt-2">
          <ShellPill avatarSrc={clubAvatarSrc} onClick={mobileChrome?.onDestinationClick}>
            {mobileChrome?.destinationLabel ?? clubName}
          </ShellPill>
        </div>

        <div className="flex-1 px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
          <div className="space-y-5">
            <div>
              <FieldLabel counter={effectiveTitleCountLabel} label="Title" />
              <Input
                className="h-14"
                onChange={(event) => setDraftTitle(event.target.value)}
                onFocus={() => handleMobileFieldFocusChange(true)}
                onBlur={() => handleMobileFieldFocusChange(false)}
                placeholder="Title"
                value={draftTitle}
              />
            </div>

            {shouldShowIdentity ? (
              <IdentitySection
                identity={identity!}
                identityMode={identityMode}
                onIdentityModeChange={setIdentityMode}
              />
            ) : null}

            {mobileActiveAttachment === "link" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link className="size-5 text-primary" />
                  <span className="text-base font-semibold text-foreground">Enter link</span>
                  <button
                    className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileActiveAttachment(null)}
                    type="button"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <Input
                  className="h-12"
                  onChange={(event) => {
                    setMobileDraftLinkUrl(event.target.value);
                    setDraftLinkUrl(event.target.value);
                  }}
                  onFocus={() => handleMobileFieldFocusChange(false)}
                  placeholder="https://"
                  value={mobileDraftLinkUrl}
                />
              </div>
            ) : null}

            {mobileActiveAttachment === "image" ? (
              <MobileInlineUpload
                accept="image/*"
                file={mobileImageFile}
                icon={<ImageIcon className="size-5 text-primary" />}
                label="Add image"
                onChange={setMobileImageFile}
                onDismiss={() => setMobileActiveAttachment(null)}
              />
            ) : null}

            {mobileActiveAttachment === "video" ? (
              <MobileInlineUpload
                accept="video/*"
                file={mobileVideoFile}
                icon={<VideoCamera className="size-5 text-primary" />}
                label="Add video"
                onChange={setMobileVideoFile}
                onDismiss={() => setMobileActiveAttachment(null)}
              />
            ) : null}

            {mobileActiveAttachment === "song" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MusicNote className="size-5 text-primary" />
                  <span className="text-base font-semibold text-foreground">Song</span>
                  <button
                    className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setMobileActiveAttachment(null)}
                    type="button"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <MobileInlineUpload
                  accept="audio/*"
                  file={mobileAudioFile}
                  icon={<Microphone className="size-4 text-muted-foreground" />}
                  label="Audio"
                  onChange={setMobileAudioFile}
                  onDismiss={() => setMobileAudioFile(null)}
                />

                <MobileInlineUpload
                  accept="image/*"
                  file={mobileCoverFile}
                  icon={<ImageIcon className="size-4 text-muted-foreground" />}
                  label="Cover art"
                  onChange={setMobileCoverFile}
                  onDismiss={() => setMobileCoverFile(null)}
                />

                <div>
                  <FieldLabel label="Genre" />
                  <Select
                    onValueChange={(value) => setMobileSongGenre(value)}
                    value={mobileSongGenre}
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
                  <FieldLabel label="Lyrics" />
                  <Textarea
                    className="min-h-28"
                    onChange={(event) => setMobileDraftLyrics(event.target.value)}
                    onFocus={() => handleMobileFieldFocusChange(true)}
                    onBlur={() => handleMobileFieldFocusChange(false)}
                    placeholder="Paste lyrics"
                    value={mobileDraftLyrics}
                  />
                </div>
              </div>
            ) : null}

            <EditorChrome
              mobile
              onChange={setDraftTextBody}
              onFocusChange={handleMobileFieldFocusChange}
              ref={editorRef}
              value={draftTextBody}
            />
          </div>
        </div>

        <div
          className="fixed inset-x-0 z-40 border-t border-border-soft bg-background/98 backdrop-blur-md"
          style={{
            bottom: `${mobileDockOffset}px`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {mobileDockMode === "formatting" ? (
            <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
              {formattingActions.map((action) => (
                <button
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  key={action.key}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.icon ? action.icon : <span className={cn("text-base", action.className)}>{action.label}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
              {mobileAttachmentActions.map((action) => (
                <button
                  aria-label={action.label}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    mobileActiveAttachment === action.key && "bg-muted text-foreground",
                  )}
                  key={action.key}
                  onClick={() => handleMobileAttachmentTap(action.key)}
                  type="button"
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    );
  }

  return (
    <form className="mx-auto w-full max-w-5xl space-y-4" onSubmit={handleSubmit}>
      <CardTitle className="text-3xl">Create post</CardTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShellPill avatarSrc={clubAvatarSrc}>{clubName}</ShellPill>
      </div>

      <Card className="overflow-hidden bg-background shadow-none">
        <CardHeader className="border-b border-border-soft px-0 pb-0 pt-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ComposerTab)}>
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-border-soft bg-transparent p-0">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "rounded-none border-b-2 border-transparent px-5 py-4 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {tabMeta[tab].icon}
                    {tabMeta[tab].label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          {formBody}
        </CardContent>

        <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
          <Button disabled={postDisabled} type="submit">
            Post
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
