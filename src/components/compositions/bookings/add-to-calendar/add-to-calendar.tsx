import * as React from "react";

import { Button } from "@/components/primitives/button";
import type { IanaTz, IsoInstant } from "../view-models";

export interface AddToCalendarProps {
  bookingTitle: string;
  hostName: string;
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  viewerTimezone: IanaTz;
  className?: string;
}

function formatIcsTimestamp(utcIso: IsoInstant): string {
  // ICS format: 20260701T070000Z (UTC, no separators, trailing Z)
  return utcIso
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildIcs(props: AddToCalendarProps): string {
  const dtStart = formatIcsTimestamp(props.startUtc);
  const dtEnd = formatIcsTimestamp(props.endUtc);
  const title = escapeIcsText(`${props.bookingTitle} with ${props.hostName}`);
  const description = escapeIcsText(
    `1:1 video session with ${props.hostName}. Times shown in ${props.viewerTimezone}.`,
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pirate//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${props.startUtc}-${props.hostName}@pirate.sc`,
    `DTSTAMP:${formatIcsTimestamp(new Date().toISOString().replace(/\.\d{3}Z$/, "Z"))}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AddToCalendar({
  bookingTitle,
  hostName,
  startUtc,
  endUtc,
  viewerTimezone,
  className,
}: AddToCalendarProps) {
  const onClick = React.useCallback(() => {
    const ics = buildIcs({ bookingTitle, hostName, startUtc, endUtc, viewerTimezone });
    const datePart = startUtc.slice(0, 10).replace(/-/g, "");
    triggerDownload(ics, `pirate-booking-${datePart}.ics`);
  }, [bookingTitle, hostName, startUtc, endUtc, viewerTimezone]);

  return (
    <Button className={className} onClick={onClick} variant="secondary">
      Add to calendar
    </Button>
  );
}
