"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";

import type { SettingsTab } from "../settings-page.types";

export function SettingsTabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
}) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").settings;
  const tabLabels: Record<SettingsTab, string> = {
    profile: copy.profileTab,
    wallet: copy.walletTab,
    preferences: copy.preferencesTab,
    agents: "Agents",
  };

  return (
    <nav aria-label={copy.sectionsLabel} className="overflow-x-auto border-b border-border-soft">
      <div className={cn("flex min-w-max gap-8", isMobile && "gap-5")}>
        {(Object.keys(tabLabels) as SettingsTab[]).map((tab) => (
          <button
            aria-current={tab === activeTab ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent px-0 py-4 text-base font-medium text-muted-foreground transition-colors",
              isMobile && "whitespace-nowrap py-3",
              tab === activeTab && "border-foreground text-foreground",
            )}
            key={tab}
            onClick={() => onTabChange?.(tab)}
            type="button"
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
    </nav>
  );
}
