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

  const tabs = Object.keys(tabLabels) as SettingsTab[];

  return (
    <nav
      aria-label={copy.sectionsLabel}
      className={cn("border-b border-border-soft", isMobile ? "overflow-visible" : "overflow-x-auto")}
    >
      <div className={cn("flex min-w-max gap-8", isMobile && "grid min-w-0 grid-cols-4 gap-0")}>
        {tabs.map((tab) => (
          <button
            aria-current={tab === activeTab ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent px-0 py-4 text-base font-medium text-muted-foreground transition-colors",
              isMobile && "min-w-0 truncate px-1 py-3 text-center",
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
