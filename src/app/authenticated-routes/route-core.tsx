"use client";

import * as React from "react";

import { resolveViewerContentLocale } from "@/lib/content-locale";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";

export { getErrorMessage } from "@/lib/error-utils";
export { buildFeedSortOptions, buildTopTimeRangeOptions } from "@/lib/feed-sort-options";
export { interpolateMessage } from "@/lib/route-messages";

export function useRouteMessages() {
  const { locale } = useUiLocale();

  return {
    copy: getLocaleMessages(locale, "routes"),
    localeTag: resolveLocaleLanguageTag(locale),
  };
}

export function useClientHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

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

export function useRouteContentLocale(): string {
  const { locale: uiLocale } = useUiLocale();

  return React.useMemo(() => resolveViewerContentLocale({
    uiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [uiLocale]);
}

export function formatRelativeTimestamp(isoString: string): string {
  const timestamp = new Date(isoString).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMinutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;

  return `${Math.floor(diffDays / 365)}y`;
}
