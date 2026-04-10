import * as React from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/styles/tokens.css";
import {
  resolveLocaleDirection,
  resolveLocaleLanguageTag,
  UiLocaleProvider,
  type UiDirection,
  type UiLocaleCode,
} from "../src/lib/ui-locale";

function StorybookCanvasRoot({
  children,
  directionMode,
  locale,
  mode,
}: {
  children?: React.ReactNode;
  directionMode: "auto" | UiDirection;
  locale: UiLocaleCode;
  mode: "dark" | "light" | "system";
}) {
  React.useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = mode === "dark" || (mode === "system" && prefersDark);
    const resolvedDirection =
      directionMode === "auto" ? resolveLocaleDirection(locale) : directionMode;

    root.classList.toggle("dark", useDark);
    root.classList.toggle("light", !useDark);
    root.dataset.theme = mode;
    root.dir = resolvedDirection;
    root.lang = resolveLocaleLanguageTag(locale);

    return () => {
      root.classList.remove("dark");
      root.classList.remove("light");
      delete root.dataset.theme;
      root.removeAttribute("dir");
      root.removeAttribute("lang");
    };
  }, [directionMode, locale, mode]);

  const dir = directionMode === "auto" ? resolveLocaleDirection(locale) : directionMode;

  return React.createElement(
    UiLocaleProvider,
    { dir, locale },
    children,
  );
}

const preview: Preview = {
  decorators: [
    (Story, context) =>
      React.createElement(
        StorybookCanvasRoot,
        {
          directionMode: context.globals.direction as "auto" | UiDirection,
          locale: context.globals.locale as UiLocaleCode,
          mode: context.globals.theme as "dark" | "light" | "system",
        },
        React.createElement(Story),
      ),
  ],
  globalTypes: {
    direction: {
      name: "Direction",
      description: "Global text direction",
      defaultValue: "auto",
      toolbar: {
        icon: "transfer",
        items: [
          { value: "auto", title: "Auto" },
          { value: "ltr", title: "LTR" },
          { value: "rtl", title: "RTL" },
        ],
      },
    },
    locale: {
      name: "Locale",
      description: "Global story locale",
      defaultValue: "en",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ar", title: "Arabic" },
          { value: "pseudo", title: "Pseudo" },
        ],
      },
    },
    theme: {
      name: "Theme",
      description: "Global app theme",
      defaultValue: "dark",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
          { value: "system", title: "System" },
        ],
      },
    },
  },
  initialGlobals: {
    direction: "auto",
    locale: "en",
    theme: "dark",
  },
  parameters: {
    backgrounds: {
      default: "app-bg",
      values: [
        { name: "app-bg", value: "#222324" },
        { name: "dark", value: "#09090b" },
        { name: "light", value: "#ffffff" },
      ],
    },
    layout: "centered",
    options: {
      storySort: {
        order: ["Pages", "Compositions", "Primitives"],
      },
    },
  },
};

export default preview;
