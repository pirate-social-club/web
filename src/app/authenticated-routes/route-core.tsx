"use client";

import * as React from "react";

import type { FeedSortOption, TopTimeRangeOption } from "@/components/compositions/feed/feed";
import { resolveViewerContentLocale } from "@/lib/content-locale";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";

export function interpolateMessage(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}

export function useRouteMessages() {
  const { locale } = useUiLocale();

  return {
    copy: getLocaleMessages(locale, "routes"),
    localeTag: resolveLocaleLanguageTag(locale),
  };
}

export function buildFeedSortOptions(
  copy: ReturnType<typeof useRouteMessages>["copy"]["common"],
): FeedSortOption[] {
  return [
    { value: "best", label: copy.bestTab },
    { value: "new", label: copy.newTab },
    { value: "top", label: copy.topTab },
  ];
}

export function buildTopTimeRangeOptions(
  copy: ReturnType<typeof useRouteMessages>["copy"]["common"],
): TopTimeRangeOption[] {
  return [
    { value: "hour", label: copy.topHour },
    { value: "day", label: copy.topDay },
    { value: "week", label: copy.topWeek },
    { value: "month", label: copy.topMonth },
    { value: "year", label: copy.topYear },
    { value: "all", label: copy.topAll },
  ];
}

export function useClientHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function formatUsdLabel(value: number | null | undefined): string | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return new Intl.NumberFormat("en-US", {
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

export function resolvePreferredUiLocale(
  sessionPreferredLocale: string | null | undefined,
  uiLocale: UiLocaleCode,
): UiLocaleCode {
  return sessionPreferredLocale === "en" || sessionPreferredLocale === "ar" || sessionPreferredLocale === "pseudo"
    ? sessionPreferredLocale
    : uiLocale;
}

export function useRouteContentLocale(sessionPreferredLocale: string | null | undefined): string {
  const { locale: uiLocale } = useUiLocale();
  const preferredUiLocale = resolvePreferredUiLocale(sessionPreferredLocale, uiLocale);

  return React.useMemo(() => resolveViewerContentLocale({
    uiLocale: preferredUiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [preferredUiLocale]);
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
