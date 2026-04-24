"use client";

import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import {
  AgentsTab,
  PreferencesTab,
  ProfileTab,
  SettingsTabNav,
} from "./settings-page.panels";
import type { SettingsPageProps } from "./settings-page.types";

export function SettingsPage({
  activeTab,
  agents,
  onTabChange,
  preferences,
  profile,
  title,
}: SettingsPageProps) {
  const { locale } = useUiLocale();
  const isMobile = useIsMobile();
  const copy = getLocaleMessages(locale, "routes").settings;

  return (
    <div className={isMobile ? "flex w-full flex-col gap-5 px-4 py-5" : "mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"}>
      <div className="space-y-1">
        <Type as="h1" variant={isMobile ? "h1" : "display"}>{title ?? copy.title}</Type>
      </div>

      <SettingsTabNav activeTab={activeTab} onTabChange={onTabChange} />

      <div>
        {activeTab === "profile" ? <ProfileTab profile={profile} /> : null}
        {activeTab === "preferences" ? <PreferencesTab preferences={preferences} /> : null}
        {activeTab === "agents" ? <AgentsTab agents={agents} /> : null}
      </div>
    </div>
  );
}
