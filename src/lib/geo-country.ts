export function normalizeGeoCountryFilter(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z]{2}$/u.test(normalized) ? normalized : undefined;
}

export function normalizeCommunityCountryCode(value: string | null | undefined): string {
  return normalizeGeoCountryFilter(value) ?? "";
}
