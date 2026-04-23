import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";

export type ThemeMode = "dark" | "light" | "system";

export type AppContext = {
  appOrigin?: string;
  canonicalUrl?: string;
  dir?: UiDirection;
  effectiveUrl?: string;
  isIndexable?: boolean;
  locale?: UiLocaleCode;
  theme?: ThemeMode;
};
