import * as React from "react";
import { Plus } from "@phosphor-icons/react";
import { Checkbox } from "@/components/primitives/checkbox";
import { Chip } from "@/components/primitives/chip";
import { FormNote, FormSectionHeading } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { UploadField, FieldLabel } from "./post-composer-fields";
import { SetlistItemRow, dedupeReferences, buildManualReference } from "./post-composer-references";
import type { ComposerReference, LiveComposerState } from "./post-composer.types";

function scheduleInputValue(scheduleAt: string | undefined) {
  const value = scheduleAt?.trim();
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;

  const date = new Date(timestamp);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - timezoneOffsetMs).toISOString().slice(0, 16);
}

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

export function LiveTabContent({
  copy,
  live,
  onLiveChange,
}: {
  copy: {
    fields: Record<string, string>;
    placeholders: Record<string, string>;
    live: Record<string, string>;
    buttons: Record<string, string>;
    upload: Record<string, string>;
  };
  live: LiveComposerState;
  onLiveChange: (state: LiveComposerState) => void;
}) {
  const coverPreviewUrl = useObjectUrl(live.coverUpload);
  const setlistKeySeed = React.useRef(0);
  const setlistKeysRef = React.useRef<string[]>([]);
  const scheduleForLater = live.scheduleForLater ?? Boolean(live.scheduleAt?.trim());

  if (setlistKeysRef.current.length !== live.setlistItems.length) {
    const next = [...setlistKeysRef.current];
    while (next.length < live.setlistItems.length) {
      next.push(`setlist-${setlistKeySeed.current++}`);
    }
    setlistKeysRef.current = next.slice(0, live.setlistItems.length);
  }

  const trackOptions = React.useMemo(
    () =>
      dedupeReferences([
        ...(live.trackOptions ?? []),
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
    setlistKeysRef.current = setlistKeysRef.current.filter((_, i) => i !== index);
    onLiveChange({ ...live, setlistItems: updated });
  };

  return (
    <div className="space-y-5">
      <UploadField
        accept="image/*"
        artworkHelp={copy.live.eventCoverHelp}
        artworkPlaceholderLabel={copy.live.eventCoverUpload}
        artworkPreviewAspect="video"
        copy={copy}
        label={copy.live.eventCover}
        onChange={(files) =>
          onLiveChange({
            ...live,
            coverUpload: files?.[0] ?? null,
            coverLabel: files?.[0]?.name ?? live.coverLabel,
          })
        }
        previewUrl={coverPreviewUrl}
        selectedLabel={live.coverUpload?.name ?? live.coverLabel}
        variant="artwork"
      />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={scheduleForLater}
            id="live-schedule-for-later"
            onCheckedChange={(checked) =>
              onLiveChange({
                ...live,
                scheduleAt: checked === true ? live.scheduleAt : undefined,
                scheduleForLater: checked === true,
              })
            }
          />
          <Label htmlFor="live-schedule-for-later">{copy.live.scheduleForLater}</Label>
        </div>

        {scheduleForLater ? (
          <div>
            <FieldLabel label={copy.live.startTime} />
            <Input
              className="h-10"
              onChange={(event) => onLiveChange({ ...live, scheduleAt: event.target.value, scheduleForLater: true })}
              type="datetime-local"
              value={scheduleInputValue(live.scheduleAt)}
            />
            <FormNote className="mt-1">{copy.live.startTimeNote}</FormNote>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <FieldLabel label={copy.live.roomKind} />
          <div className="flex flex-wrap gap-2">
            {([
              { value: "solo" as const, label: copy.live.roomKindSolo },
              { value: "duet" as const, label: copy.live.roomKindDuet },
            ]).map((opt) => (
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
          <FieldLabel label={copy.live.access} />
          <div className="flex flex-wrap gap-2">
            {([
              { value: "free" as const, label: copy.live.accessFree },
              { value: "gated" as const, label: copy.live.accessGated },
              { value: "paid" as const, label: copy.live.accessPaid },
            ]).map((opt) => (
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
          <FieldLabel label={copy.live.visibility} />
          <div className="flex flex-wrap gap-2">
            {([
              { value: "public" as const, label: copy.live.visibilityPublic },
              { value: "unlisted" as const, label: copy.live.visibilityUnlisted },
            ]).map((opt) => (
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
          <FieldLabel label={copy.live.guestPerformer} />
          <Input
            className="h-10"
            placeholder={copy.live.collaboratorPlaceholder}
            onChange={(event) => {
              const guestUserId = event.target.value;
              onLiveChange({
                ...live,
                guestUserId,
                performerAllocations: live.performerAllocations.map((allocation) =>
                  allocation.role === "guest" ? { ...allocation, userId: guestUserId } : allocation,
                ),
              });
            }}
            value={live.guestUserId ?? ""}
          />
          <FormNote className="mt-1">{copy.live.collaboratorNote}</FormNote>
        </div>
      ) : null}

      {live.accessMode === "paid" ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
          <FormSectionHeading
            description={
              live.roomKind === "solo"
                ? copy.live.soloProceedsDescription
                : copy.live.duetProceedsDescription
            }
            title={copy.live.performerAllocations}
          />
          <div className="space-y-2">
            {live.performerAllocations.map((alloc) => (
              <div
                key={alloc.role}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border-soft bg-background px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium text-foreground">
                    {alloc.role === "host" ? copy.live.hostLabel : copy.live.guestLabel}
                  </span>
                  <span className="text-base text-foreground">
                    {alloc.role === "host" ? copy.live.youLabel : live.guestUserId || copy.live.collaboratorLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-10 w-20 text-center"
                    defaultValue={String(alloc.sharePct)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) return;
                      const updated = live.performerAllocations.map((a) =>
                        a.role === alloc.role ? { ...a, sharePct: val } : a,
                      );
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
            <FormNote tone="destructive">{copy.live.allocationsError}</FormNote>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <FormSectionHeading title={copy.live.setlistTitle} />
          <Chip
            leadingIcon={<Plus className="size-4" />}
            onClick={handleAddSetlistItem}
          >
            {copy.live.addSong}
          </Chip>
        </div>
        {live.setlistItems.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-6 text-center text-base text-muted-foreground">
            {copy.live.emptySetlist}
          </div>
        ) : (
          <div className="space-y-2">
            {live.setlistItems.map((item, i) => (
              <SetlistItemRow
                key={setlistKeysRef.current[i]}
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
