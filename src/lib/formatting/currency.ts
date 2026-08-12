const usdLabelFormatters = new Map<string, Intl.NumberFormat>();
const usdCompactLabelFormatters = new Map<string, Intl.NumberFormat>();

function getUsdLabelFormatter(localeTag: string): Intl.NumberFormat {
  const existing = usdLabelFormatters.get(localeTag);
  if (existing) return existing;
  const formatter = Intl.NumberFormat(localeTag, {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
  usdLabelFormatters.set(localeTag, formatter);
  return formatter;
}

function getUsdCompactLabelFormatter(localeTag: string, minimumFractionDigits: number): Intl.NumberFormat {
  const key = `${localeTag}:${minimumFractionDigits}`;
  const existing = usdCompactLabelFormatters.get(key);
  if (existing) return existing;
  const formatter = Intl.NumberFormat(localeTag, {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits,
    style: "currency",
  });
  usdCompactLabelFormatters.set(key, formatter);
  return formatter;
}

export function formatUsdLabel(
  value: number | null | undefined,
  localeTag = "en",
): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return getUsdLabelFormatter(localeTag).format(value);
}

export function formatUsdCompactLabel(
  value: number | null | undefined,
  localeTag = "en",
): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return getUsdCompactLabelFormatter(localeTag, value % 1 === 0 ? 0 : 2).format(value);
}

export function formatUsdCentsLabel(
  value: number | null | undefined,
  localeTag = "en",
): string | undefined {
  return formatUsdLabel(centsToUsd(value), localeTag);
}

export function formatCentsAsUsd(cents: number): string {
  return formatUsdCompactLabel(cents / 100, "en") ?? "$0";
}

export function formatCentsAsStartingUsd(cents: number): string {
  return `${formatCentsAsUsd(cents)}+`;
}

export function formatCentsAsUsdc(cents: number): string {
  return `${(cents / 100).toFixed(2)} USDC`;
}

export function parseUsdInput(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9.]/gu, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

export function usdToCents(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

export function centsToUsd(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value / 100;
}
