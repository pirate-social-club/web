"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { getLocaleMessages } from "@/locales";
import { StackedSectionNav } from "@/components/compositions/system/stacked-section-nav/stacked-section-nav";
import { Type } from "@/components/primitives/type";

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
    preferences: copy.preferencesTab,
    agents: copy.agentsTab,
    domains: copy.domainsTab,
  };

  const tabs = Object.keys(tabLabels) as SettingsTab[];

  if (isMobile) {
    return (
      <nav aria-label={copy.sectionsLabel}>
        <StackedSectionNav
          mobileLayout
          sections={[{
            label: copy.title,
            items: tabs.map((tab) => ({
              active: tab === activeTab,
              label: tabLabels[tab],
              onSelect: () => onTabChange?.(tab),
            })),
          }]}
        />
      </nav>
    );
  }

  return (
    <nav
      aria-label={copy.sectionsLabel}
      className="overflow-x-auto border-b border-border-soft"
    >
      <div className="flex min-w-max gap-8">
        {tabs.map((tab) => (
          <button
            aria-current={tab === activeTab ? "page" : undefined}
            className={cn(
              "border-b-2 border-transparent px-0 py-4 text-muted-foreground transition-colors",
              tab === activeTab && "border-foreground text-foreground",
            )}
            key={tab}
            onClick={() => onTabChange?.(tab)}
            type="button"
          >
            <Type as="span" variant="label">{tabLabels[tab]}</Type>
          </button>
        ))}
      </div>
    </nav>
  );
}
