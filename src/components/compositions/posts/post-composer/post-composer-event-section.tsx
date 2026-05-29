import * as React from "react";

import { CalendarBlank, CheckCircle, MapPin, VideoCamera } from "@phosphor-icons/react";

import { Checkbox } from "@/components/primitives/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/primitives/combobox";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { FieldLabel } from "./post-composer-fields";
import type { ComposerEventPlace, ComposerEventState } from "./post-composer.types";

const mockPlaces: ComposerEventPlace[] = [
  {
    address: "8 Egnate Ninoshvili St, Tbilisi",
    city: "Tbilisi",
    countryCode: "ge",
    label: "Fabrika",
    lat: 41.70982,
    lon: 44.80398,
    providerPlaceId: "geoapify:fabrika-tbilisi-storybook",
    source: "geoapify",
  },
  {
    address: "Dedaena Park, Tbilisi",
    city: "Tbilisi",
    countryCode: "ge",
    label: "Dedaena Bar",
    lat: 41.70459,
    lon: 44.80243,
    providerPlaceId: "geoapify:dedaena-bar-storybook",
    source: "geoapify",
  },
  {
    address: "Left Embankment, Tbilisi",
    city: "Tbilisi",
    countryCode: "ge",
    label: "Left Bank",
    lat: 41.71053,
    lon: 44.79786,
    providerPlaceId: "geoapify:left-bank-tbilisi-storybook",
    source: "geoapify",
  },
];

type TimeZoneOption = {
  cityLabel: string;
  id: string;
  label: string;
  offsetLabel: string;
  searchLabel: string;
  value: string;
};

const fallbackTimeZones = [
  "Asia/Tbilisi",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
] as const;

function localDatetimeValue(value: string | undefined): string {
  return value?.slice(0, 16) ?? "";
}

function matchingMockPlaces(query: string): ComposerEventPlace[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return mockPlaces.filter((place) =>
    `${place.label} ${place.address ?? ""} ${place.city ?? ""}`.toLowerCase().includes(normalized),
  ).slice(0, 3);
}

async function defaultSearchPlaces(query: string): Promise<ComposerEventPlace[]> {
  return matchingMockPlaces(query);
}

function defaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function supportedTimeZones(): string[] {
  const supportedValuesOf = (Intl as typeof Intl & {
    supportedValuesOf?: (key: "calendar" | "collation" | "currency" | "numberingSystem" | "timeZone" | "unit") => string[];
  }).supportedValuesOf;

  if (typeof supportedValuesOf === "function") {
    return supportedValuesOf("timeZone");
  }
  return [...fallbackTimeZones];
}

function isValidTimeZone(value: string | undefined): boolean {
  const timezone = value?.trim();
  if (!timezone) return false;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function timeZoneOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

function timeZoneCityLabel(timezone: string): string {
  if (timezone === "UTC") return "UTC";
  const city = timezone.split("/").pop() ?? timezone;
  return city.replace(/_/gu, " ");
}

function makeTimeZoneOption(timezone: string): TimeZoneOption {
  const cityLabel = timeZoneCityLabel(timezone);
  const offsetLabel = timeZoneOffsetLabel(timezone);
  const label = offsetLabel ? `${cityLabel} · ${offsetLabel}` : cityLabel;

  return {
    cityLabel,
    id: timezone,
    label,
    offsetLabel,
    searchLabel: `${label} ${timezone}`,
    value: timezone,
  };
}

function timeZoneOptions(): TimeZoneOption[] {
  return supportedTimeZones().map(makeTimeZoneOption);
}

function TimeZonePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const options = React.useMemo(() => timeZoneOptions(), []);
  const selected = React.useMemo(
    () => options.find((option) => option.value === value) ?? makeTimeZoneOption(value || defaultTimeZone()),
    [options, value],
  );
  const triggerLabel = selected.offsetLabel
    ? `${selected.cityLabel} (${selected.offsetLabel})`
    : selected.cityLabel;

  return (
    <Combobox<TimeZoneOption>
      autoHighlight
      items={options}
      itemToStringLabel={(option) => option.searchLabel}
      itemToStringValue={(option) => option.value}
      onValueChange={(option) => {
        if (option) {
          onChange(option.value);
        }
      }}
      value={options.find((option) => option.value === selected.value)}
    >
      <ComboboxTrigger className="h-10 rounded-[var(--radius-lg)]" id={id}>
        {triggerLabel}
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput
          aria-label="Search time zones"
          className="h-10 rounded-none border-0 border-b border-border-soft shadow-none focus-visible:ring-0"
          placeholder="Search time zones"
        />
        <ComboboxEmpty>No time zones found.</ComboboxEmpty>
        <ComboboxList className="max-h-64 py-0">
          {(option) => (
            <ComboboxItem key={option.id} value={option}>
              <Type as="p" variant="body-strong">{option.label}</Type>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function PostComposerEventSection({
  className,
  event,
  onChange,
  onSearchPlaces = defaultSearchPlaces,
}: {
  className?: string;
  event: ComposerEventState;
  onChange: (value: ComposerEventState) => void;
  onSearchPlaces?: (query: string) => Promise<ComposerEventPlace[]>;
}) {
  const enabled = event.enabled === true;
  const isOnline = event.isOnline === true;
  const locationQuery = event.locationName ?? "";
  const [suggestions, setSuggestions] = React.useState<ComposerEventPlace[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchRequestId = React.useRef(0);
  const timezoneInvalid = Boolean(enabled && event.timezone?.trim() && !isValidTimeZone(event.timezone));

  React.useEffect(() => {
    const query = locationQuery.trim();
    searchRequestId.current += 1;
    const requestId = searchRequestId.current;

    if (!enabled || isOnline || query.length < 2 || event.place?.label === locationQuery) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timeoutId = globalThis.setTimeout(() => {
      void onSearchPlaces(query)
        .then((places) => {
          if (searchRequestId.current !== requestId) return;
          setSuggestions(places);
        })
        .catch(() => {
          if (searchRequestId.current !== requestId) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (searchRequestId.current !== requestId) return;
          setSearchLoading(false);
        });
    }, 300);

    return () => globalThis.clearTimeout(timeoutId);
  }, [enabled, event.place?.label, isOnline, locationQuery, onSearchPlaces]);

  function update(patch: Partial<ComposerEventState>) {
    onChange({ ...event, ...patch });
  }

  function selectPlace(place: ComposerEventPlace) {
    onChange({
      ...event,
      address: place.address,
      locationName: place.label,
      place,
    });
  }

  return (
    <section className={cn("space-y-4 border-t border-border-soft pt-4", className)}>
      <div className="flex items-center gap-3">
        <Checkbox
          checked={enabled}
          id="post-event-enabled"
          onCheckedChange={(checked) =>
            onChange({
              ...event,
              enabled: checked === true,
              timezone: event.timezone ?? defaultTimeZone(),
            })
          }
        />
        <Label className="font-semibold" htmlFor="post-event-enabled">
          Add date and place
        </Label>
      </div>

      {enabled ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="post-event-start" label="Starts" required />
              <Input
                className="h-10"
                id="post-event-start"
                onChange={(inputEvent) => update({ startsAt: inputEvent.target.value })}
                type="datetime-local"
                value={localDatetimeValue(event.startsAt)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="post-event-end" label="Ends" />
              <Input
                className="h-10"
                id="post-event-end"
                onChange={(inputEvent) => update({ endsAt: inputEvent.target.value })}
                type="datetime-local"
                value={localDatetimeValue(event.endsAt)}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="post-event-timezone" label="Timezone" />
            <TimeZonePicker
              id="post-event-timezone"
              onChange={(timezone) => update({ timezone })}
              value={event.timezone ?? defaultTimeZone()}
            />
            {timezoneInvalid ? (
              <FormNote className="mt-1" tone="destructive">
                Choose a valid event timezone.
              </FormNote>
            ) : (
              <FormNote className="mt-1">
                Uses your browser timezone by default.
              </FormNote>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={isOnline}
              id="post-event-online"
              onCheckedChange={(checked) =>
                onChange({
                  ...event,
                  address: checked === true ? undefined : event.address,
                  isOnline: checked === true,
                  locationName: checked === true ? undefined : event.locationName,
                  place: checked === true ? undefined : event.place,
                })
              }
            />
            <Label className="flex items-center gap-2" htmlFor="post-event-online">
              <VideoCamera className="size-4 text-muted-foreground" />
              Online event
            </Label>
          </div>

          {!isOnline ? (
            <div className="space-y-3">
              <div>
                <FieldLabel htmlFor="post-event-location" label="Venue or place" />
                <Input
                  className={cn("h-10 transition-opacity", searchLoading && "opacity-70")}
                  id="post-event-location"
                  onChange={(inputEvent) => update({ locationName: inputEvent.target.value, place: undefined })}
                  placeholder="Search a venue or enter a place"
                  value={locationQuery}
                />
                {event.place ? (
                  <FormNote className="mt-1 flex items-center gap-1 text-success">
                    <CheckCircle className="size-4" />
                    Matched to Geoapify place data
                  </FormNote>
                ) : null}
              </div>

              {suggestions.length > 0 ? (
                <div className={cn("space-y-2 transition-opacity", searchLoading && "opacity-70")}>
                  {suggestions.map((place) => (
                    <button
                      className="flex w-full items-start gap-2 rounded-md border border-border-soft px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      key={place.providerPlaceId ?? place.label}
                      onClick={() => selectPlace(place)}
                      type="button"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">{place.label}</span>
                        {place.address ? (
                          <Type as="span" className="block truncate" variant="caption">{place.address}</Type>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <FieldLabel htmlFor="post-event-address" label="Address" />
                <Input
                  className="h-10"
                  id="post-event-address"
                  onChange={(inputEvent) => update({ address: inputEvent.target.value, place: undefined })}
                  placeholder="Street address or neighborhood"
                  value={event.address ?? ""}
                />
              </div>
            </div>
          ) : null}

          <div>
            <FieldLabel htmlFor="post-event-url" label="Event URL" />
            <div className="relative">
              <CalendarBlank className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                id="post-event-url"
                inputMode="url"
                onChange={(inputEvent) => update({ eventUrl: inputEvent.target.value })}
                placeholder="https://..."
                type="url"
                value={event.eventUrl ?? ""}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
