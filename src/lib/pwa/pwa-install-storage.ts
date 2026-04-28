"use client";

const STORAGE_KEY = "pirate_pwa_install_v1";

export type DismissReason = "not_now" | "close" | "native_dismissed" | "dont_show_again";

export interface PwaInstallRecord {
  impressionCount: number;
  lastDismissedAt: string | null;
  lastDismissReason: DismissReason | null;
  permanentlyDismissed: boolean;
  installed: boolean;
}

const DEFAULT_RECORD: PwaInstallRecord = {
  impressionCount: 0,
  lastDismissedAt: null,
  lastDismissReason: null,
  permanentlyDismissed: false,
  installed: false,
};

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readPwaInstallRecord(): PwaInstallRecord {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_RECORD };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RECORD };
    const parsed = JSON.parse(raw) as Partial<PwaInstallRecord>;
    return {
      impressionCount: typeof parsed.impressionCount === "number" ? parsed.impressionCount : DEFAULT_RECORD.impressionCount,
      lastDismissedAt: typeof parsed.lastDismissedAt === "string" ? parsed.lastDismissedAt : DEFAULT_RECORD.lastDismissedAt,
      lastDismissReason: (parsed.lastDismissReason as DismissReason | null) ?? DEFAULT_RECORD.lastDismissReason,
      permanentlyDismissed: typeof parsed.permanentlyDismissed === "boolean" ? parsed.permanentlyDismissed : DEFAULT_RECORD.permanentlyDismissed,
      installed: typeof parsed.installed === "boolean" ? parsed.installed : DEFAULT_RECORD.installed,
    };
  } catch {
    return { ...DEFAULT_RECORD };
  }
}

function writePwaInstallRecord(record: PwaInstallRecord): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

function daysMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function snoozeDurationFor(reason: DismissReason): number {
  switch (reason) {
    case "not_now":
      return daysMs(14);
    case "close":
      return daysMs(7);
    case "native_dismissed":
      return daysMs(30);
    case "dont_show_again":
      return Infinity;
  }
}

export function isPromoSnoozed(record: PwaInstallRecord): boolean {
  if (record.permanentlyDismissed || record.installed) return true;
  if (!record.lastDismissedAt || !record.lastDismissReason) return false;
  const duration = snoozeDurationFor(record.lastDismissReason);
  if (duration === Infinity) return true;
  const elapsed = Date.now() - new Date(record.lastDismissedAt).getTime();
  return elapsed < duration;
}

export function shouldShowAutoPromo(record: PwaInstallRecord): boolean {
  if (record.permanentlyDismissed || record.installed) return false;
  if (record.impressionCount >= 3) return false;
  return !isPromoSnoozed(record);
}

export function markPromoImpression(): PwaInstallRecord {
  const record = readPwaInstallRecord();
  record.impressionCount += 1;
  writePwaInstallRecord(record);
  return record;
}

export function dismissPromo(reason: DismissReason): PwaInstallRecord {
  const record = readPwaInstallRecord();
  record.lastDismissedAt = new Date().toISOString();
  record.lastDismissReason = reason;
  if (reason === "dont_show_again") {
    record.permanentlyDismissed = true;
  }
  writePwaInstallRecord(record);
  return record;
}

export function markPromoInstalled(): PwaInstallRecord {
  const record = readPwaInstallRecord();
  record.installed = true;
  writePwaInstallRecord(record);
  return record;
}
