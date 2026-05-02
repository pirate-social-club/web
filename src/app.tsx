"use client";

import { PirateAppShell } from "@/app/shell/app-shell";
import { UiLocaleProvider } from "@/lib/ui-locale";
import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";

export function PirateApp({
  initialDir = "ltr",
  initialHost,
  initialImportedRootCommunityId,
  initialLocale = "en",
  initialPath,
}: {
  initialDir?: UiDirection;
  initialHost?: string;
  initialImportedRootCommunityId?: string | null;
  initialLocale?: UiLocaleCode;
  initialPath?: string;
}) {
  return (
    <UiLocaleProvider dir={initialDir} locale={initialLocale}>
      <PirateAppShell
        initialHost={initialHost}
        initialImportedRootCommunityId={initialImportedRootCommunityId}
        initialPath={initialPath}
      />
    </UiLocaleProvider>
  );
}
