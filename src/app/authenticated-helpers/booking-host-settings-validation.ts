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

function localInputParts(value: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]) };
}

function timezoneParts(instantMs: number, timeZone: string): ReturnType<typeof localInputParts> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantMs));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour: Number(value.hour),
    minute: Number(value.minute),
  };
}

function sameLocalParts(a: NonNullable<ReturnType<typeof localInputParts>>, b: NonNullable<ReturnType<typeof localInputParts>>): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;
}

export function localInputToIsoUtc(value: string, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): string | null {
  const desired = localInputParts(value);
  if (!desired) return null;
  try {
    const wallClockAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
    const first = timezoneParts(wallClockAsUtc, timeZone)!;
    const firstAsUtc = Date.UTC(first.year, first.month - 1, first.day, first.hour, first.minute);
    let candidate = wallClockAsUtc - (firstAsUtc - wallClockAsUtc);
    const second = timezoneParts(candidate, timeZone)!;
    const secondAsUtc = Date.UTC(second.year, second.month - 1, second.day, second.hour, second.minute);
    candidate -= secondAsUtc - wallClockAsUtc;
    return sameLocalParts(timezoneParts(candidate, timeZone)!, desired) ? new Date(candidate).toISOString() : null;
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
