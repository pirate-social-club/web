"use client";

import * as React from "react";
import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";

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
};

const UiLocaleContext = React.createContext<UiLocaleContextValue>({
  dir: "ltr",
  isRtl: false,
  locale: "en",
});

export function UiLocaleProvider({
  children,
  dir,
  locale,
}: React.PropsWithChildren<{
  dir: UiDirection;
  locale: UiLocaleCode;
}>) {
  const value = React.useMemo<UiLocaleContextValue>(
    () => ({
      dir,
      isRtl: dir === "rtl",
      locale,
    }),
    [dir, locale],
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
