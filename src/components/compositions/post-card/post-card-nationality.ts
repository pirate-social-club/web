import { getCountryDisplayName } from "@/lib/countries";

function normalizeQualifierText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function buildNationalityBadgeLabel(countryCode: string, locale?: string | null): string {
  const countryName = getCountryDisplayName(countryCode, locale) ?? countryCode.toUpperCase();
  return `Verified ${countryName} nationality`;
}

export function nationalityMatchesQualifier(input: {
  countryCode: string;
  locale?: string | null;
  qualifierLabels?: string[];
}): boolean {
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!countryCode || !input.qualifierLabels?.length) {
    return false;
  }

  const countryName = getCountryDisplayName(countryCode, input.locale) ?? countryCode;
  const candidates = new Set([
    normalizeQualifierText(`${countryCode} national`),
    normalizeQualifierText(`${countryCode} nationality`),
    normalizeQualifierText(`${countryName} national`),
    normalizeQualifierText(`${countryName} nationality`),
  ]);

  return input.qualifierLabels.some((label) => candidates.has(normalizeQualifierText(label)));
}
