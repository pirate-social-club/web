"use client";

import * as React from "react";
import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";
import { resolveLocaleDirection, SUPPORTED_UI_LOCALES } from "@/lib/ui-locale-core";

export {
  resolveDirectionalSide,
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type UiDirection,
  type UiLocaleCode,
  type UiPlacement,
} from "@/lib/ui-locale-core";

type UiLocaleContextValue = {
  dir: UiDirection;
  isRtl: boolean;
  locale: UiLocaleCode;
  setLocale: (locale: UiLocaleCode) => void;
};

const LOCALE_STORAGE_KEY = "pirate_ui_locale";

const UiLocaleContext = React.createContext<UiLocaleContextValue>({
  dir: "ltr",
  isRtl: false,
  locale: "en",
  setLocale: () => {},
});

function isSupportedLocale(value: string): value is UiLocaleCode {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(value);
}

function readStoredUiLocale(): UiLocaleCode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored && isSupportedLocale(stored) ? stored : null;
}

export function UiLocaleProvider({
  children,
  dir,
  locale,
}: React.PropsWithChildren<{
  dir: UiDirection;
  locale: UiLocaleCode;
}>) {
  const hasStoredLocaleRef = React.useRef(false);
  const [activeLocale, setActiveLocale] = React.useState<UiLocaleCode>(() => {
    const storedLocale = readStoredUiLocale();
    hasStoredLocaleRef.current = storedLocale != null;
    return storedLocale ?? locale;
  });

  React.useEffect(() => {
    if (!hasStoredLocaleRef.current) {
      setActiveLocale(locale);
    }
  }, [locale]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, activeLocale);
    document.documentElement.dir = resolveLocaleDirection(activeLocale);
    document.documentElement.lang = activeLocale === "ar"
      ? "ar"
      : activeLocale === "zh"
        ? "zh-CN"
        : activeLocale === "pseudo"
          ? "en-XA"
          : "en";
  }, [activeLocale]);

  const setLocale = React.useCallback((nextLocale: UiLocaleCode) => {
    hasStoredLocaleRef.current = true;
    setActiveLocale(nextLocale);
  }, []);

  const value = React.useMemo<UiLocaleContextValue>(
    () => ({
      dir: resolveLocaleDirection(activeLocale),
      isRtl: resolveLocaleDirection(activeLocale) === "rtl",
      locale: activeLocale,
      setLocale,
    }),
    [activeLocale, setLocale],
  );

  return (
    <UiLocaleContext.Provider value={value}>
      {children}
    </UiLocaleContext.Provider>
  );
}

export function useUiLocale() {
  return React.useContext(UiLocaleContext);
}
