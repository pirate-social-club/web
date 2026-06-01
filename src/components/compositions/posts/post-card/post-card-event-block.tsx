"use client";

import { ArrowSquareOut, CalendarBlank, MapPin, VideoCamera } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { postCardReadableWidth, postCardTextWrap } from "./post-card.styles";
import type { PostCardEvent } from "./post-card.types";

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDatePart(
  date: Date,
  locale: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }
}

function sameDay(start: Date, end: Date, locale: string, timezone: string): boolean {
  return formatDatePart(start, locale, timezone, { day: "numeric", month: "numeric", year: "numeric" })
    === formatDatePart(end, locale, timezone, { day: "numeric", month: "numeric", year: "numeric" });
}

function formatTimezoneLabel(date: Date, locale: string, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

function formatEventTime(event: PostCardEvent, locale: string): string {
  const start = parseEventDate(event.startsAt);
  if (!start) return event.startsAt;

  const end = event.endsAt ? parseEventDate(event.endsAt) : null;
  const startLabel = formatDatePart(start, locale, event.timezone, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "short",
  });
  const timezoneLabel = formatTimezoneLabel(start, locale, event.timezone);

  if (!end) {
    return timezoneLabel ? `${startLabel} ${timezoneLabel}` : startLabel;
  }

  const endLabel = sameDay(start, end, locale, event.timezone)
    ? formatDatePart(end, locale, event.timezone, { hour: "numeric", minute: "2-digit" })
    : formatDatePart(end, locale, event.timezone, {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        weekday: "short",
      });

  return timezoneLabel ? `${startLabel} - ${endLabel} ${timezoneLabel}` : `${startLabel} - ${endLabel}`;
}

function statusLabel(status: PostCardEvent["status"]): string | null {
  switch (status) {
    case "canceled":
      return "Canceled";
    case "postponed":
      return "Postponed";
    case "ended":
      return "Ended";
    case "scheduled":
    case undefined:
      return null;
  }
}

function statusClassName(status: PostCardEvent["status"]): string {
  switch (status) {
    case "canceled":
      return "text-destructive";
    case "postponed":
      return "text-warning";
    case "ended":
      return "text-muted-foreground";
    case "scheduled":
    case undefined:
      return "text-muted-foreground";
  }
}

function eventHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

function osmMapHref(place: PostCardEvent["place"]): string | null {
  if (!place) return null;
  const lat = Number.isFinite(place.lat) ? place.lat : null;
  const lon = Number.isFinite(place.lon) ? place.lon : null;
  if (lat === null || lon === null) return null;
  const params = new URLSearchParams({
    mlat: String(lat),
    mlon: String(lon),
    zoom: "17",
  });
  return `https://www.openstreetmap.org/?${params.toString()}#map=17/${lat}/${lon}`;
}

export function PostCardEventBlock({
  event,
  showEventUrl = true,
}: {
  event: PostCardEvent;
  showEventUrl?: boolean;
}) {
  const { locale } = useUiLocale();
  const timeLabel = formatEventTime(event, locale);
  const status = statusLabel(event.status);
  const locationLabel = event.isOnline
    ? "Online"
    : [event.locationName ?? event.place?.label, event.address ?? event.place?.address].filter(Boolean).join(" - ");
  const host = showEventUrl ? eventHost(event.eventUrl) : null;
  const mapHref = event.isOnline ? null : osmMapHref(event.place);

  return (
    <section
      aria-label="Event details"
      className={cn("flex flex-col gap-1 text-start", postCardReadableWidth)}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <CalendarBlank className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        <time className="min-w-0" dateTime={event.startsAt}>
          <Type as="span" variant="body-strong">
            {timeLabel}
          </Type>
        </time>
        {status ? (
          <Type as="span" variant="label" className={cn("shrink-0", statusClassName(event.status))}>
            {status}
          </Type>
        ) : null}
      </div>

      {locationLabel ? (
        <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
          {event.isOnline ? (
            <VideoCamera className="size-4 shrink-0" weight="bold" />
          ) : (
            <MapPin className="size-4 shrink-0" weight="bold" />
          )}
          {mapHref ? (
            <a
              className={cn("min-w-0 flex-1 text-inherit hover:text-primary hover:underline", postCardTextWrap, "[word-break:break-word]")}
              data-post-card-interactive="true"
              href={mapHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Type as="span" variant="caption" className={cn("text-inherit", postCardTextWrap, "[word-break:break-word]")}>
                {locationLabel}
              </Type>
            </a>
          ) : (
            <Type as="span" variant="caption" className={cn("min-w-0 flex-1", postCardTextWrap, "[word-break:break-word]")}>
              {locationLabel}
            </Type>
          )}
        </div>
      ) : null}

      {showEventUrl && event.eventUrl ? (
        <a
          className="inline-flex max-w-full min-w-0 items-center gap-1.5 self-start text-muted-foreground hover:text-foreground hover:underline"
          data-post-card-interactive="true"
          href={event.eventUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ArrowSquareOut className="size-4 shrink-0" />
          <Type as="span" variant="label" className="min-w-0 break-all text-inherit [word-break:break-all]">
            {host ?? event.eventUrl}
          </Type>
        </a>
      ) : null}
    </section>
  );
}
