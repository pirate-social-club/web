import type { IanaTz, IsoInstant } from "./view-models";

export function formatCentsAsUsdc(cents: number): string {
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
  const minutes = Math.round((Date.parse(endUtc) - Date.parse(startUtc)) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}
