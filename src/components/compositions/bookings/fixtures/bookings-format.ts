import type { Cents, IanaTz, IsoInstant } from "../view-models";

export function formatCentsAsUsd(cents: Cents): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en", {
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(dollars);
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
