import * as React from "react";
import { Plus } from "@phosphor-icons/react";
import { Chip } from "@/components/primitives/chip";
import { FormNote, FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { UploadField, FieldLabel } from "./post-composer-fields";
import { SetlistItemRow, dedupeReferences, buildManualReference } from "./post-composer-references";
import {
  roomKindOptions,
  accessModeOptions,
  visibilityOptions,
  fallbackTrackOptions,
} from "./post-composer-config";
import type { ComposerReference, LiveComposerState } from "./post-composer.types";

export function SummaryRow({
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

export function LiveTabContent({
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
