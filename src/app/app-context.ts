import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";

export type ThemeMode = "dark" | "light" | "system";

export type SeoMetadata = {
  description?: string | null;
  imageAlt?: string | null;
  imageHeight?: number | null;
  imageType?: string | null;
  imageUrl?: string | null;
  imageWidth?: number | null;
  title?: string | null;
  type?: "article" | "profile" | "website";
  url?: string | null;
};

export type AppContext = {
  appOrigin?: string;
  canonicalUrl?: string;
  dir?: UiDirection;
  effectiveUrl?: string;
  homeFeedPreloadUrl?: string;
  isIndexable?: boolean;
  locale?: UiLocaleCode;
  seoMetadata?: SeoMetadata | null;
  theme?: ThemeMode;
};
