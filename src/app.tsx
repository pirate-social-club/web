"use client";

import { PirateAppShell } from "@/app/shell/app-shell";
import { UiLocaleProvider } from "@/lib/ui-locale";
import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";

export function PirateApp({
  initialDir = "ltr",
  initialHost,
  initialLocale = "en",
  initialPath,
}: {
  initialDir?: UiDirection;
  initialHost?: string;
  initialLocale?: UiLocaleCode;
  initialPath?: string;
}) {
  return (
    <UiLocaleProvider dir={initialDir} locale={initialLocale}>
      <PirateAppShell initialHost={initialHost} initialPath={initialPath} />
    </UiLocaleProvider>
  );
}
