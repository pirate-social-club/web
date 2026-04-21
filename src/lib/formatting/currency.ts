export function formatUsdLabel(
  value: number | null | undefined,
  localeTag = "en",
): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return new Intl.NumberFormat(localeTag, {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
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
