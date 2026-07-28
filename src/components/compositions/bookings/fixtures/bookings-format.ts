import type { Cents, IanaTz, IsoInstant, ResolvedSlot } from "../view-models";

export function formatCentsAsUsd(cents: Cents): string {
  const dollars = cents / 100;
  const hasFractionalDollars = cents % 100 !== 0;
  return new Intl.NumberFormat("en", {
    currency: "USD",
    minimumFractionDigits: hasFractionalDollars ? 2 : 0,
    maximumFractionDigits: hasFractionalDollars ? 2 : 0,
    style: "currency",
  }).format(dollars);
}

export function formatCentsAsStartingUsd(cents: Cents): string {
  const hasFractionalDollars = cents % 100 !== 0;
  const dollars = new Intl.NumberFormat("en", {
    currency: "USD",
    minimumFractionDigits: hasFractionalDollars ? 2 : 0,
    maximumFractionDigits: hasFractionalDollars ? 2 : 0,
    style: "currency",
  }).format(cents / 100);
  return `${dollars}+`;
}

export function formatCentsAsUsdc(cents: Cents): string {
  return `${(cents / 100).toFixed(2)} USDC`;
}

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
  // e.g. "America/New_York" → "New York"
  const parts = tz.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

export function formatTzAbbrev(utcIso: IsoInstant, tz: IanaTz): string {
  // Disambiguates the fall-back repeated hour by appending the timezone abbreviation.
  // Output is environment-dependent: full-ICU runtimes may return "CEST"/"CET",
  // while Node/workerd SSR returns "GMT+2"/"GMT+1". Both are distinct, which is all
  // that's required — tests must assert the two labels differ, not a literal string.
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date(utcIso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
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
  /** Shared duration label (e.g. "15 min") when every slot has the same length, else null. */
  durationLabel: string | null;
  /** Shared price label (e.g. "$50") when every slot costs the same, else null. */
  priceLabel: string | null;
}

/**
 * Whether the slot set is uniform enough to state duration/price once instead of per slot.
 * Slot chips stay time-only when uniform; the labels here feed a single header/summary line.
 */
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
