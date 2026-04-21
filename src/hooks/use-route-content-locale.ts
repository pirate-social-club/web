"use client";

import * as React from "react";

import { resolveViewerContentLocale } from "@/lib/content-locale";
import { useUiLocale } from "@/lib/ui-locale";

export function useRouteContentLocale(): string {
  const { locale: uiLocale } = useUiLocale();

  return React.useMemo(() => resolveViewerContentLocale({
    uiLocale,
    browserLocales: typeof navigator === "undefined"
      ? []
      : [...navigator.languages, navigator.language].filter(Boolean),
  }), [uiLocale]);
}
