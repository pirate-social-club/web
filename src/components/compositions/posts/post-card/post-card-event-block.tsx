"use client";

import * as React from "react";
import { ArrowSquareOut, CalendarBlank, Check, Copy, MapPin, VideoCamera } from "@phosphor-icons/react";

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

function localDateParts(date: Date, locale: string, timezone: string): Record<string, string> {
  try {
    return Object.fromEntries(
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        timeZone: timezone,
        year: "numeric",
      }).formatToParts(date).map((part) => [part.type, part.value]),
    );
  } catch {
    return Object.fromEntries(
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        year: "numeric",
      }).formatToParts(date).map((part) => [part.type, part.value]),
    );
  }
}

function isStartOfDay(date: Date, locale: string, timezone: string): boolean {
  const parts = localDateParts(date, locale, timezone);
  return (parts.hour === "00" || parts.hour === "24") && parts.minute === "00" && parts.second === "00";
}

function isEndOfDay(date: Date, locale: string, timezone: string): boolean {
  const parts = localDateParts(date, locale, timezone);
  return (parts.hour === "23" || parts.hour === "24") && parts.minute === "59";
}

function sameYear(start: Date, end: Date, locale: string, timezone: string): boolean {
  return formatDatePart(start, locale, timezone, { year: "numeric" })
    === formatDatePart(end, locale, timezone, { year: "numeric" });
}

function sameMonth(start: Date, end: Date, locale: string, timezone: string): boolean {
  return formatDatePart(start, locale, timezone, { month: "numeric", year: "numeric" })
    === formatDatePart(end, locale, timezone, { month: "numeric", year: "numeric" });
}

function formatAllDayEventTime(start: Date, end: Date | null, locale: string, timezone: string): string {
  if (!end || sameDay(start, end, locale, timezone)) {
    return formatDatePart(start, locale, timezone, {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  }

  if (sameMonth(start, end, locale, timezone)) {
    const startLabel = formatDatePart(start, locale, timezone, { month: "short" });
    const startDay = formatDatePart(start, locale, timezone, { day: "numeric" });
    const endDay = formatDatePart(end, locale, timezone, { day: "numeric" });
    return `${startLabel} ${startDay}-${endDay}`;
  }

  const options: Intl.DateTimeFormatOptions = sameYear(start, end, locale, timezone)
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  return `${formatDatePart(start, locale, timezone, options)} - ${formatDatePart(end, locale, timezone, options)}`;
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
  if (isStartOfDay(start, locale, event.timezone) && (!end || isEndOfDay(end, locale, event.timezone))) {
    return formatAllDayEventTime(start, end, locale, event.timezone);
  }

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

function CopyLocationButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      aria-label={copied ? "Location copied" : "Copy location"}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-post-card-interactive="true"
      onClick={handleCopy}
      title={copied ? "Location copied" : "Copy location"}
      type="button"
    >
      {copied ? <Check className="size-4" weight="bold" /> : <Copy className="size-4" weight="bold" />}
    </button>
  );
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
          <Type as="span" variant="caption" className={cn("min-w-0 flex-1", postCardTextWrap, "[word-break:break-word]")}>
            {locationLabel}
          </Type>
          <CopyLocationButton value={locationLabel} />
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
