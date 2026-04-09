"use client";

import * as React from "react";
import {
  CaretDown,
  Check,
  DotsThree,
  Image as ImageIcon,
  Link,
  List,
  MagnifyingGlass,
  Microphone,
  MusicNote,
  Plus,
  SquaresFour,
  Tag,
  Trash,
  VideoCamera,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  FormFieldLabel,
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Pill } from "@/components/primitives/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Scrubber } from "@/components/primitives/scrubber";
import { Stepper } from "@/components/primitives/stepper";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

import type {
  ComposerReference,
  ComposerTab,
  ComposerIdentityState,
  IdentityMode,
  LiveAccessMode,
  LiveComposerState,
  LiveRoomKind,
  LiveSetlistItemInput,
  LiveSetlistItemKind,
  LiveVisibility,
  MonetizationState,
  PostComposerProps,
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

const setlistItemKindOptions: { value: LiveSetlistItemKind; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "cover", label: "Cover" },
  { value: "remix", label: "Remix" },
  { value: "dj_playback", label: "DJ playback" },
  { value: "unknown", label: "Unknown" },
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
    donationPartnerOptions: monetization?.donationPartnerOptions ?? [],
    donationSharePct: monetization?.donationSharePct ?? 10,
    rightsAttested: monetization?.rightsAttested ?? false,
  };
}

function resolveDonationPartnerName(state: MonetizationState) {
  if (state.donationPartnerId) {
    const match = state.donationPartnerOptions?.find((partner) => partner.id === state.donationPartnerId);
    if (match) {
      return match.name;
    }
  }

  return state.donationPartnerName ?? state.donationPartnerOptions?.[0]?.name ?? "Club partner";
}

function ShellPill({
  avatarSrc,
  children,
}: {
  avatarSrc?: string;
  children: React.ReactNode;
}) {
  return (
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
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  selectedLabel?: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <input
        accept={accept}
        className={cn(
          "block w-full rounded-full border border-border-soft bg-background px-4 py-3 text-base text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-base file:font-semibold file:text-foreground",
        )}
        multiple={multiple}
        onChange={(event) => onChange?.(event.target.files)}
        type="file"
      />
      {selectedLabel ? <FormNote className="mt-2">{selectedLabel}</FormNote> : null}
    </label>
  );
}

function EditorChrome({
  value,
}: {
  value: string;
}) {
  const toolbar = ["B", "i", "S", "x2", "T", "link", "list", "ordered", "more"];

  return (
    <div className="rounded-full border border-border-soft bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3 text-muted-foreground">
        {toolbar.map((item) => (
          <span key={item} className="text-base font-medium">
            {item === "link" ? <Link className="size-5" /> : null}
            {item === "list" ? <List className="size-5" /> : null}
            {item === "ordered" ? <List className="size-5" /> : null}
            {item === "more" ? <DotsThree className="size-5" /> : null}
            {!["link", "list", "ordered", "more"].includes(item) ? item : null}
          </span>
        ))}
      </div>
      <Textarea
        className="min-h-44 rounded-none border-0 shadow-none focus-visible:ring-0"
        defaultValue={value}
      />
    </div>
  );
}

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
          <span className="text-base text-muted-foreground">Attached</span>
        </div>
      ))}
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

function SelectionCard({
  title,
  description,
  selected,
  onClick,
  children,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border-soft bg-background text-foreground hover:border-primary/40",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-base leading-6 text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-base text-muted-foreground">{label}</span>
      <span className="text-base font-medium text-foreground">{value}</span>
    </div>
  );
}

function SetlistItemRow({
  item,
  index,
  onRemove,
  onUpdate,
}: {
  item: LiveSetlistItemInput;
  index: number;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof LiveSetlistItemInput, value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3">
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
        <FieldLabel label="Track search" />
        <div className="relative">
          <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-10"
            placeholder="Search Pirate songbase"
            defaultValue={item.declaredTrackId ?? ""}
            onChange={(e) => onUpdate(index, "declaredTrackId", e.target.value)}
          />
        </div>
        <FormNote>Choose a canonical track first. Manual title and artist are only fallback metadata.</FormNote>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          className="h-10"
          placeholder="Manual song title"
          defaultValue={item.titleText}
          onChange={(e) => onUpdate(index, "titleText", e.target.value)}
        />
        <Input
          className="h-10"
          placeholder="Manual artist"
          defaultValue={item.artistText ?? ""}
          onChange={(e) => onUpdate(index, "artistText", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {setlistItemKindOptions.map((opt) => (
          <button
            key={opt.value}
            className={cn(
              "rounded-full px-3 py-1.5 text-base font-medium transition-colors",
              item.performanceKind === opt.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onUpdate(index, "performanceKind", opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
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
  const handleSetlistItemUpdate = (
    index: number,
    field: keyof LiveSetlistItemInput,
    value: string,
  ) => {
    const updated = [...live.setlistItems];
    updated[index] = { ...updated[index], [field]: value };
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
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <FieldLabel label="Room kind" />
          <div className="flex flex-wrap gap-2">
            {roomKindOptions.map((opt) => (
              <Pill
                key={opt.value}
                variant={live.roomKind === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, roomKind: opt.value })}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel label="Access" />
          <div className="flex flex-wrap gap-2">
            {accessModeOptions.map((opt) => (
              <Pill
                key={opt.value}
                variant={live.accessMode === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, accessMode: opt.value })}
              >
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel label="Visibility" />
          <div className="flex flex-wrap gap-2">
            {visibilityOptions.map((opt) => (
              <Pill
                key={opt.value}
                variant={live.visibility === opt.value ? "selected" : "default"}
                onClick={() => onLiveChange({ ...live, visibility: opt.value })}
              >
                {opt.label}
              </Pill>
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
          <FormSectionHeading
            description="Search Pirate&apos;s songbase for the songs you plan to perform. Required before going live."
            title="Setlist"
          />
          <Pill
            leadingIcon={<Plus className="size-4" />}
            onClick={handleAddSetlistItem}
          >
            Add song
          </Pill>
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
                onRemove={handleRemoveSetlistItem}
                onUpdate={handleSetlistItemUpdate}
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
  onToggleQualifier,
}: {
  identity: ComposerIdentityState;
  selectedQualifierIds: string[];
  onToggleQualifier: (qualifierId: string) => void;
}) {
  const availableQualifiers = (identity.availableQualifiers ?? []).filter(
    (qualifier) => !qualifier.suppressedByClubGate,
  );
  const activeQualifiers = availableQualifiers.filter((qualifier) =>
    selectedQualifierIds.includes(qualifier.qualifierId),
  );
  const helpText =
    identity.helpText ??
    "Attach verified qualifiers to this post. Qualifiers already implied by club gates are omitted.";

  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
      <FormSectionHeading description={helpText} title="Qualifiers" />

      {availableQualifiers.length > 0 ? (
        <div className="space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="justify-between" variant="secondary">
                <span>
                  {activeQualifiers.length > 0
                    ? `${activeQualifiers.length} qualifier${activeQualifiers.length === 1 ? "" : "s"} attached`
                    : "Add qualifiers"}
                </span>
                <CaretDown className="size-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px]">
              {availableQualifiers.map((qualifier) => {
                const selected = selectedQualifierIds.includes(qualifier.qualifierId);
                return (
                  <DropdownMenuItem
                    key={qualifier.qualifierId}
                    className="items-start justify-between gap-3"
                    onSelect={(event) => {
                      event.preventDefault();
                      onToggleQualifier(qualifier.qualifierId);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-base font-medium text-foreground">{qualifier.label}</p>
                      {qualifier.description ? (
                        <p className="text-base text-muted-foreground">{qualifier.description}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-soft text-transparent",
                      )}
                    >
                      <Check className="size-4" weight="bold" />
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeQualifiers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeQualifiers.map((qualifier) => (
                <Pill
                  key={qualifier.qualifierId}
                  onClick={() => onToggleQualifier(qualifier.qualifierId)}
                >
                  {qualifier.label}
                </Pill>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {availableQualifiers.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
          No optional qualifiers are available for this club.
        </div>
      ) : null}
    </section>
  );
}

export function PostComposer({
  clubName,
  clubAvatarSrc,
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
}: PostComposerProps) {
  const visibleTabs = React.useMemo(
    () => availableTabs.filter((tab) => tab !== "song" || canCreateSongPost),
    [availableTabs, canCreateSongPost],
  );
  const [activeTab, setActiveTab] = React.useState<ComposerTab>(visibleTabs[0] ?? "text");
  const [activeSongMode, setActiveSongMode] = React.useState(songMode);
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
  const [songStepIndex, setSongStepIndex] = React.useState(0);

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
    setSongState(defaultSongState(song));
  }, [song]);

  React.useEffect(() => {
    setMonetizationState(defaultMonetizationState(monetization));
  }, [monetization]);

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

  const songSteps = React.useMemo((): string[] => {
    if (activeTab !== "song" || !monetizationState.visible) return [];
    return allowsCommercialUse(monetizationState.license)
      ? ["Upload", "Details", "License", "Sales", "Review"]
      : ["Upload", "Details", "License", "Review"];
  }, [activeTab, monetizationState.visible, monetizationState.license]);

  const isSongStepper = activeTab === "song" && songSteps.length > 0;

  React.useEffect(() => {
    if (songSteps.length > 0 && songStepIndex >= songSteps.length) {
      setSongStepIndex(songSteps.length - 1);
    }
  }, [songSteps.length, songStepIndex]);

  const shouldShowDerivativeStep = Boolean(
    !isSongStepper &&
    (derivativeStep?.visible || (activeTab === "song" && activeSongMode === "remix")),
  );
  const donationPartnerName = resolveDonationPartnerName(monetizationState);
  const liveAllocationsValid =
    liveState.performerAllocations.reduce((sum, allocation) => sum + allocation.sharePct, 0) ===
    100;
  const postDisabled =
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

  const renderPrimaryArea = () => {
    switch (activeTab) {
      case "text":
        return <EditorChrome value={textBodyValue} />;
      case "image":
        return (
          <div className="space-y-3">
            <UploadField accept="image/*" label="Image" />
            <Textarea
              className="min-h-28"
              placeholder="Add a caption"
              defaultValue={captionValue}
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            <UploadField accept="video/*" label="Video" />
            <Textarea
              className="min-h-28"
              placeholder="Add a caption"
              defaultValue={captionValue}
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
                defaultValue={linkUrlValue}
                placeholder="https://"
              />
            </div>
            <Textarea
              className="min-h-28"
              placeholder="Add commentary"
              defaultValue={captionValue}
            />
            {linkPreview ? <LinkPreviewCard {...linkPreview} /> : null}
          </div>
        );
      case "song":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
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
              <span className="text-base text-muted-foreground">Song</span>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="space-y-4">
                <UploadField accept="audio/*" label="Audio" />
                <Textarea
                  className="min-h-24"
                  placeholder="Add a caption"
                  defaultValue={captionValue}
                />
              </div>

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
              />
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

            <Textarea
              className="min-h-36"
              placeholder="Paste lyrics"
              defaultValue={lyricsValue}
            />

            <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading
                description="Optional uploads for karaoke and remix workflows."
                title="Stems"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <UploadField accept="audio/*" label="Instrumental stem" />
                <UploadField accept="audio/*" label="Vocal stem" />
              </div>
            </div>
          </div>
        );
      case "live":
        return <LiveTabContent live={liveState} onLiveChange={setLiveState} />;
      default:
        return null;
    }
  };

  const renderSongStepContent = () => {
    const currentStep = songSteps[songStepIndex];

    switch (currentStep) {
      case "Upload":
        return (
          <div className="space-y-4">
            <div>
              <FieldLabel counter={titleCountLabel} label="Title" />
              <Input
                className="h-14"
                placeholder="Title"
                defaultValue={titleValue}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full bg-muted p-1">
                {(["original", "remix"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setActiveSongMode(value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-base font-medium capitalize transition-colors",
                      activeSongMode === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="text-base text-muted-foreground">Song</span>
            </div>

            {activeSongMode === "remix" || derivativeStep?.visible ? (
              <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
                <FormSectionHeading
                  description="Attach the source before posting when required."
                  title="Find source audio or upstream work"
                />
                <div className="relative">
                  <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search Pirate / Story assets"
                    defaultValue={derivativeStep?.query ?? ""}
                  />
                </div>
                {derivativeStep?.requirementLabel ? (
                  <div className="rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground">
                    {derivativeStep.requirementLabel}
                  </div>
                ) : null}
                <References items={derivativeStep?.references} />
              </section>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="space-y-4">
                <UploadField accept="audio/*" label="Audio" />
                <Textarea
                  className="min-h-24"
                  placeholder="Add a caption"
                  defaultValue={captionValue}
                />
              </div>

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
              />
            </div>

            <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading
                description="Optional uploads for karaoke and remix workflows."
                title="Stems"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <UploadField accept="audio/*" label="Instrumental stem" />
                <UploadField accept="audio/*" label="Vocal stem" />
              </div>
            </div>
          </div>
        );

      case "Details":
        return (
          <div className="space-y-4">
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

            <Textarea
              className="min-h-36"
              placeholder="Paste lyrics"
              defaultValue={lyricsValue}
            />
          </div>
        );

      case "License":
        return (
          <div className="space-y-4">
            <FormSectionHeading
              description="Pick the Story Protocol license path for this release before you set pricing."
              title="License"
            />
            <div className="grid gap-3">
              {licenseOptions.map((option) => (
                <SelectionCard
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
        );

      case "Sales":
        return (
          <div className="space-y-4">
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

            {monetizationState.donationAvailable ? (
              <div className="space-y-3">
                <FormSectionHeading
                  description="Donation remains creator-side and only applies when this listing is paid."
                  title="Donation"
                />

                {monetizationState.donationPartnerOptions &&
                monetizationState.donationPartnerOptions.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {monetizationState.donationPartnerOptions.map((partner) => (
                      <button
                        key={partner.id}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-colors",
                          monetizationState.donationPartnerId === partner.id
                            ? "border-primary bg-primary/10"
                            : "border-border-soft bg-background hover:border-primary/40",
                        )}
                        onClick={() =>
                          setMonetizationState((current) => ({
                            ...current,
                            donationPartnerId: partner.id,
                            donationPartnerName: partner.name,
                            donationOptIn: true,
                          }))
                        }
                        type="button"
                      >
                        {partner.logoSrc ? (
                          <img
                            alt=""
                            className="size-12 rounded-full border border-border-soft bg-white object-cover p-2"
                            src={partner.logoSrc}
                          />
                        ) : (
                          <div className="grid size-12 place-items-center rounded-full border border-border-soft bg-muted text-base font-semibold text-foreground">
                            {partner.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-base font-medium text-foreground">{partner.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={monetizationState.donationOptIn}
                      className="mt-0.5"
                      id="donation-opt-in"
                      onCheckedChange={(next) =>
                        setMonetizationState((current) => ({
                          ...current,
                          donationOptIn: next === true,
                          donationPartnerId:
                            current.donationPartnerId ??
                            current.donationPartnerOptions?.[0]?.id,
                          donationPartnerName:
                            current.donationPartnerName ??
                            current.donationPartnerOptions?.[0]?.name,
                        }))
                      }
                    />
                    <div className="space-y-1">
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
          </div>
        );

      case "Review":
        return (
          <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
            <FormSectionHeading
              description="Review the release configuration before posting."
              title="Review"
            />
            <div>
              <SummaryRow label="Title" value={titleValue || "Untitled"} />
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
        );

      default:
        return null;
    }
  };

  const renderSongStepFooter = () => {
    const isFirst = songStepIndex === 0;
    const isLast = songStepIndex === songSteps.length - 1;

    return (
      <>
        {!isFirst && (
          <Button variant="secondary" onClick={() => setSongStepIndex(songStepIndex - 1)}>
            Back
          </Button>
        )}
        {isLast ? (
          <Button disabled={postDisabled}>Post</Button>
        ) : (
          <Button onClick={() => setSongStepIndex(songStepIndex + 1)}>Next</Button>
        )}
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <CardTitle className="text-3xl">Create post</CardTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShellPill avatarSrc={clubAvatarSrc}>{clubName}</ShellPill>
      </div>

      {isSongStepper ? (
        <Stepper
          currentStep={songStepIndex + 1}
          onStepClick={(step) => setSongStepIndex(step - 1)}
          steps={songSteps.map((label) => ({ label }))}
        />
      ) : null}

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
          {isSongStepper ? (
            renderSongStepContent()
          ) : (
            <>
          <div>
            <FieldLabel counter={titleCountLabel} label="Title" />
            <Input
              className="h-14"
              placeholder="Title"
              defaultValue={titleValue}
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
              onToggleQualifier={(qualifierId) =>
                setSelectedQualifierIds((current) =>
                  current.includes(qualifierId)
                    ? current.filter((id) => id !== qualifierId)
                    : [...current, qualifierId],
                )
              }
              selectedQualifierIds={selectedQualifierIds}
            />
          ) : null}

          {renderPrimaryArea()}

          {shouldShowDerivativeStep ? (
            <section className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-4">
              <FormSectionHeading
                description="Attach the source before posting when required."
                title="Find source audio or upstream work"
              />
              <div className="relative">
                <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search Pirate / Story assets"
                  defaultValue={derivativeStep?.query ?? ""}
                />
              </div>
              {derivativeStep?.requirementLabel ? (
                <div className="rounded-[var(--radius-lg)] bg-muted px-4 py-3 text-base text-foreground">
                  {derivativeStep.requirementLabel}
                </div>
              ) : null}
              <References items={derivativeStep?.references} />
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
                      <SelectionCard
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

                  {monetizationState.donationPartnerOptions &&
                  monetizationState.donationPartnerOptions.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {monetizationState.donationPartnerOptions.map((partner) => (
                        <button
                          key={partner.id}
                          className={cn(
                            "flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-colors",
                            monetizationState.donationPartnerId === partner.id
                              ? "border-primary bg-primary/10"
                              : "border-border-soft bg-background hover:border-primary/40",
                          )}
                          onClick={() =>
                            setMonetizationState((current) => ({
                              ...current,
                              donationPartnerId: partner.id,
                              donationPartnerName: partner.name,
                              donationOptIn: true,
                            }))
                          }
                          type="button"
                        >
                          {partner.logoSrc ? (
                            <img
                              alt=""
                              className="size-12 rounded-full border border-border-soft bg-white object-cover p-2"
                              src={partner.logoSrc}
                            />
                          ) : (
                            <div className="grid size-12 place-items-center rounded-full border border-border-soft bg-muted text-base font-semibold text-foreground">
                              {partner.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-base font-medium text-foreground">{partner.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={monetizationState.donationOptIn}
                        className="mt-0.5"
                        id="donation-opt-in"
                        onCheckedChange={(next) =>
                          setMonetizationState((current) => ({
                            ...current,
                            donationOptIn: next === true,
                            donationPartnerId:
                              current.donationPartnerId ??
                              current.donationPartnerOptions?.[0]?.id,
                            donationPartnerName:
                              current.donationPartnerName ??
                              current.donationPartnerOptions?.[0]?.name,
                          }))
                        }
                      />
                      <div className="space-y-1">
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
                  <div>
                    <SummaryRow label="Title" value={titleValue || "Untitled"} />
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
          )}
        </CardContent>

        <CardFooter className="justify-end gap-3 border-t border-border-soft p-5">
          {isSongStepper ? renderSongStepFooter() : <Button disabled={postDisabled}>Post</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
