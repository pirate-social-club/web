import * as React from "react";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/primitives/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/primitives/combobox";
import { Input } from "@/components/primitives/input";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { FieldLabel } from "./post-composer-fields";
import type { ComposerReference, LiveSetlistItemInput } from "./post-composer.types";

export function References({
  items,
}: {
  items?: ComposerReference[];
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  if (!items || items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-border-soft px-4 py-4 text-base text-muted-foreground">
        {copy.empty.noReferences}
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
          <span className="text-base text-muted-foreground">{copy.labels.source}</span>
        </div>
      ))}
    </div>
  );
}

export function dedupeReferences(items: ComposerReference[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export function buildManualReference(item: LiveSetlistItemInput): ComposerReference | undefined {
  if (!item.titleText) {
    return undefined;
  }

  return {
    id: item.declaredTrackId || `manual:${item.titleText}:${item.artistText ?? ""}`,
    title: item.titleText,
    subtitle: item.artistText,
  };
}

export function SearchReferencePicker({
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
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
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
              {item.subtitle ? (
                <p className="truncate text-base text-muted-foreground">{item.subtitle}</p>
              ) : null}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function SelectedReferenceCard({
  item,
  onClear,
}: {
  item: ComposerReference;
  onClear: () => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-base text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
      <Button
        aria-label={`${copy.buttons.clear} ${item.title}`}
        onClick={onClear}
        size="icon"
        variant="secondary"
      >
        <Trash className="size-5" />
      </Button>
    </div>
  );
}

export function SetlistItemRow({
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
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").createPost;
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
        <FieldLabel label={copy.fields.song} />
        <SearchReferencePicker
          ariaLabel={`${copy.setlist.searchSongs} ${index + 1}`}
          emptyLabel={copy.empty.noSongs}
          items={options}
          onSelect={(reference) => {
            setShowManualFields(false);
            onReferenceSelect(index, reference);
          }}
          placeholder={copy.placeholders.songSearch}
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
        {showManualFields ? copy.setlist.hideManualDetails : copy.setlist.cannotFindTrack}
      </button>

      {showManualFields ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            className="h-10"
            placeholder={copy.placeholders.songTitle}
            defaultValue={item.titleText}
            onChange={(e) => onUpdateManual(index, "titleText", e.target.value)}
          />
          <Input
            className="h-10"
            placeholder={copy.placeholders.artist}
            defaultValue={item.artistText ?? ""}
            onChange={(e) => onUpdateManual(index, "artistText", e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
