import { formatCentsAsUsd } from "@/lib/formatting/currency";

import type { IanaTz, IsoInstant, ResolvedSlot } from "./view-models";

export function formatSlotTime(startUtc: IsoInstant, viewerTz: IanaTz): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: viewerTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(startUtc));
}

export function formatSlotDuration(startUtc: IsoInstant, endUtc: IsoInstant): string {
  const durMs = Date.parse(endUtc) - Date.parse(startUtc);
  const minutes = Math.round(durMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin === 0 ? `${hours} hr` : `${hours} hr ${remMin} min`;
}

export function formatTzLabel(tz: IanaTz): string {
  const parts = tz.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

export function formatTzAbbrev(utcIso: IsoInstant, tz: IanaTz): string {
  // Full-ICU runtimes may return abbreviations while SSR returns GMT offsets;
  // either form still distinguishes repeated hours during a DST transition.
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date(utcIso));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

export function formatBookingDate(startUtc: IsoInstant, viewerTz: IanaTz): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: viewerTz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(startUtc));
}

export function formatDayPillWeekday(startUtc: IsoInstant, viewerTz: IanaTz): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: viewerTz,
    weekday: "short",
  }).format(new Date(startUtc));
}

export function formatDayPillDay(startUtc: IsoInstant, viewerTz: IanaTz): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: viewerTz,
    day: "numeric",
  }).format(new Date(startUtc));
}

export interface SlotUniformity {
  sameDuration: boolean;
  samePrice: boolean;
  /** Shared duration label when all slots have the same length. */
  durationLabel: string | null;
  /** Shared price label when all slots have the same price. */
  priceLabel: string | null;
}

export function getSlotUniformity(slots: ResolvedSlot[]): SlotUniformity {
  const first = slots[0];
  if (!first) {
    return { sameDuration: true, samePrice: true, durationLabel: null, priceLabel: null };
  }
  const firstDurationMs = Date.parse(first.endUtc) - Date.parse(first.startUtc);
  let sameDuration = true;
  let samePrice = true;
  for (const slot of slots) {
    if (Date.parse(slot.endUtc) - Date.parse(slot.startUtc) !== firstDurationMs) sameDuration = false;
    if (slot.priceCents !== first.priceCents) samePrice = false;
  }
  return {
    sameDuration,
    samePrice,
    durationLabel: sameDuration ? formatSlotDuration(first.startUtc, first.endUtc) : null,
    priceLabel: samePrice ? formatCentsAsUsd(first.priceCents) : null,
  };
}
