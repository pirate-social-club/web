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

interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseLocalInput(value: string): LocalDateTimeParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function partsAt(instantMs: number, timeZone: string): LocalDateTimeParts {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantMs)).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function partsAsUtc(parts: LocalDateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day
    && left.hour === right.hour && left.minute === right.minute;
}

export function zonedLocalInputToIsoUtc(value: string, timeZone: string): string | null {
  const desired = parseLocalInput(value);
  if (!desired) return null;
  try {
    const wallClockAsUtc = partsAsUtc(desired);
    let candidate = wallClockAsUtc - (partsAsUtc(partsAt(wallClockAsUtc, timeZone)) - wallClockAsUtc);
    candidate -= partsAsUtc(partsAt(candidate, timeZone)) - wallClockAsUtc;
    return sameParts(partsAt(candidate, timeZone), desired) ? new Date(candidate).toISOString() : null;
  } catch {
    return null;
  }
}

export function epochSecondsToZonedLocalInput(seconds: number, timeZone: string): string | null {
  try {
    const parts = partsAt(seconds * 1000, timeZone);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
  } catch {
    return null;
  }
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
