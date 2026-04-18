import type { UiLocaleCode } from "@/lib/ui-locale-core";

const CONTENT_LOCALE_ALIAS_MAP = new Map<string, string>([
  ["en-us", "en"],
  ["en-gb", "en"],
  ["es-es", "es"],
  ["es-419", "es"],
  ["pt", "pt-BR"],
  ["pt-br", "pt-BR"],
  ["zh", "zh-Hans"],
  ["zh-cn", "zh-Hans"],
  ["zh-sg", "zh-Hans"],
  ["zh-hans", "zh-Hans"],
  ["zh-tw", "zh-Hant"],
  ["zh-hk", "zh-Hant"],
  ["zh-mo", "zh-Hant"],
  ["zh-hant", "zh-Hant"],
]);

function normalizeContentLocale(locale: string | null | undefined): string | null {
  const trimmed = String(locale ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.replace(/_/g, "-").toLowerCase();
  const aliased = CONTENT_LOCALE_ALIAS_MAP.get(lowered);
  if (aliased) {
    return aliased;
  }

  const [language, ...rest] = lowered.split("-").filter(Boolean);
  if (!language) {
    return null;
  }

  if (language === "pt") {
    return "pt-BR";
  }
  if (language === "zh") {
    return "zh-Hans";
  }
  if (rest.length === 0) {
    return language;
  }

  return [language, ...rest.map((segment) => {
    if (segment.length === 4) {
      return segment[0]!.toUpperCase() + segment.slice(1);
    }
    return segment.toUpperCase();
  })].join("-");
}

function uiLocaleToContentLocale(locale: UiLocaleCode): string {
  if (locale === "ar") return "ar";
  return "en";
}

export function resolveViewerContentLocale(input: {
  uiLocale: UiLocaleCode;
  browserLocales?: readonly string[] | null;
}): string {
  for (const candidate of input.browserLocales ?? []) {
    const normalized = normalizeContentLocale(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return uiLocaleToContentLocale(input.uiLocale);
}
