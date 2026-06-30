export function centsToUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function usdToCents(usd: string): number {
  return Math.round(Number.parseFloat(usd || "0") * 100);
}

export function isValidMoneyInput(value: string): boolean {
  const cents = usdToCents(value);
  return Number.isInteger(cents) && cents >= 0;
}

export function isValidPositiveMoneyInput(value: string): boolean {
  const cents = usdToCents(value);
  return Number.isInteger(cents) && cents > 0;
}

export function isTimeRange(start: string, end: string): boolean {
  return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;
}

export function epochSecondsToLocalInput(seconds: number): string {
  const date = new Date(seconds * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIsoUtc(value: string): string {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
}

export function defaultExceptionStart(nowMs = Date.now()): string {
  const date = new Date(nowMs + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return epochSecondsToLocalInput(Math.floor(date.getTime() / 1000));
}

export function defaultExceptionEnd(start: string): string {
  const startMs = Date.parse(start);
  return epochSecondsToLocalInput(Math.floor((startMs + 60 * 60 * 1000) / 1000));
}

export function isDateTimeRange(start: string, end: string): boolean {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}
