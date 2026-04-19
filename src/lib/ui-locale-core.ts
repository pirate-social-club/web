export const SUPPORTED_UI_LOCALES = ["en", "ar", "pseudo"] as const;

export type UiLocaleCode = (typeof SUPPORTED_UI_LOCALES)[number];
export type UiDirection = "ltr" | "rtl";
export type UiPlacement = "left" | "right" | "start" | "end";

export function isUiLocaleCode(value: string): value is UiLocaleCode {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(value);
}

export function resolveLocaleDirection(locale: UiLocaleCode): UiDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function resolveLocaleLanguageTag(locale: UiLocaleCode): string {
  if (locale === "ar") return "ar";
  if (locale === "pseudo") return "en-XA";
  return "en";
}

export function resolveDirectionalSide(
  side: UiPlacement,
  dir: UiDirection,
): "left" | "right" {
  if (side === "left" || side === "right") return side;
  if (side === "start") return dir === "rtl" ? "right" : "left";
  return dir === "rtl" ? "left" : "right";
}

export function resolveRequestLocale(
  acceptLanguageHeader: string | null | undefined,
): Exclude<UiLocaleCode, "pseudo"> {
  if (!acceptLanguageHeader) return "en";

  const requestedTags = acceptLanguageHeader
    .split(",")
    .map((part) => part.trim().split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const tag of requestedTags) {
    if (tag === "ar" || tag.startsWith("ar-")) return "ar";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  return "en";
}
