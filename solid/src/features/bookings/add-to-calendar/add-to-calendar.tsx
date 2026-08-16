import { Button, cn } from "../../../design-system";
import type { IanaTz, IsoInstant } from "../view-models";

export interface AddToCalendarProps {
  bookingTitle: string;
  hostName: string;
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  viewerTimezone: IanaTz;
  class?: string;
}

function formatIcsTimestamp(utcIso: IsoInstant): string {
  return utcIso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function buildIcs(props: AddToCalendarProps): string {
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
    `DTSTART:${formatIcsTimestamp(props.startUtc)}`,
    `DTEND:${formatIcsTimestamp(props.endUtc)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AddToCalendar(props: AddToCalendarProps) {
  const onClick = () => {
    const ics = buildIcs(props);
    const datePart = props.startUtc.slice(0, 10).replace(/-/g, "");
    triggerDownload(ics, `pirate-booking-${datePart}.ics`);
  };

  return (
    <Button class={cn(props.class)} onClick={onClick} variant="secondary">
      Add to calendar
    </Button>
  );
}
