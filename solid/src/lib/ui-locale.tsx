import { getRequestEvent } from "@solidjs/web";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";
import {
  isUiLocaleCode,
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type UiDirection,
  type UiLocaleCode,
} from "./ui-locale-core";

export {
  resolveDirectionalSide,
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  type RealUiLocaleCode,
  type UiDirection,
  type UiLocaleCode,
  type UiPlacement,
} from "./ui-locale-core";

const LOCALE_STORAGE_KEY = "pirate_ui_locale";

export interface UiLocaleContextValue {
  dir: Accessor<UiDirection>;
  isRtl: Accessor<boolean>;
  locale: Accessor<UiLocaleCode>;
  setLocale: (locale: UiLocaleCode) => void;
}

const defaultLocale = () => "en" as const;
const defaultDirection = () => "ltr" as const;
const UiLocaleContext = createContext<UiLocaleContextValue>({
  dir: defaultDirection,
  isRtl: () => false,
  locale: defaultLocale,
  setLocale: () => undefined,
});

export function readInitialUiLocale(): UiLocaleCode {
  const serverLocale = getRequestEvent()?.locals?.uiLocale;
  if (serverLocale) return serverLocale;
  if (typeof document !== "undefined") {
    const locale = document.documentElement.dataset.uiLocale;
    if (locale && isUiLocaleCode(locale)) return locale;
  }
  return "en";
}

export function UiLocaleProvider(props: ParentProps<{ locale: UiLocaleCode }>) {
  const [locale, setLocale] = createSignal<UiLocaleCode>(props.locale);
  const direction = createMemo(() => resolveLocaleDirection(locale()));
  let restoredStoredLocale = false;

  createEffect(() => {
    if (typeof document === "undefined") return;
    if (!restoredStoredLocale) {
      restoredStoredLocale = true;
      try {
        const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isUiLocaleCode(stored) && stored !== locale()) {
          setLocale(stored);
          return;
        }
      } catch {
        // Locale persistence is optional in restricted browser contexts.
      }
    }
    const activeLocale = locale();
    document.documentElement.dir = resolveLocaleDirection(activeLocale);
    document.documentElement.lang = resolveLocaleLanguageTag(activeLocale);
    document.documentElement.dataset.uiLocale = activeLocale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, activeLocale);
    } catch {
      // Locale persistence is optional in restricted browser contexts.
    }
  });

  return (
    <UiLocaleContext
      value={{
        dir: direction,
        isRtl: () => direction() === "rtl",
        locale,
        setLocale,
      }}
    >
      {props.children}
    </UiLocaleContext>
  );
}

export function useUiLocale(): UiLocaleContextValue {
  return useContext(UiLocaleContext);
}
