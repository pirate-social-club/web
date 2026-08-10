"use client";

import { PirateAppShell } from "@/app/shell/app-shell";
import { UiLocaleProvider } from "@/lib/ui-locale";
import type { UiDirection, UiLocaleCode } from "@/lib/ui-locale-core";
import type { InitialPublicCommunity } from "@/lib/query/public-community-query";

export function PirateApp({
  initialDir = "ltr",
  initialHost,
  initialImportedRootCommunityId,
  initialImportedRootCommunityRoute,
  initialLocale = "en",
  initialPublicCommunity,
  initialPath,
}: {
  initialDir?: UiDirection;
  initialHost?: string;
  initialImportedRootCommunityId?: string | null;
  initialImportedRootCommunityRoute?: string | null;
  initialLocale?: UiLocaleCode;
  initialPublicCommunity?: InitialPublicCommunity | null;
  initialPath?: string;
}) {
  return (
    <UiLocaleProvider dir={initialDir} locale={initialLocale}>
      <PirateAppShell
        initialHost={initialHost}
        initialImportedRootCommunityId={initialImportedRootCommunityId}
        initialImportedRootCommunityRoute={initialImportedRootCommunityRoute}
        initialPublicCommunity={initialPublicCommunity}
        initialPath={initialPath}
      />
    </UiLocaleProvider>
  );
}
