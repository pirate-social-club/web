import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";
import type { CommunityPreview } from "@pirate/api-contracts";

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
  expectsEntitySeoMetadata?: boolean;
  homeFeedPreloadUrl?: string;
  homeFeedScopeKey?: string;
  isIndexable?: boolean;
  initialPublicCommunity?: { identifier: string; preview: CommunityPreview } | null;
  locale?: UiLocaleCode;
  seoMetadata?: SeoMetadata | null;
  sovereignRouteMismatch?: boolean;
  surfaceNavigationHref?: string;
  theme?: ThemeMode;
  walletInteractive?: boolean;
};
