"use client";

import { useIsMobile } from "@/hooks/use-mobile";
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
  showSectionNav = true,
}: SettingsPageProps) {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "flex w-full flex-col gap-5 py-5" : "mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8"}>
      {showSectionNav ? <SettingsTabNav activeTab={activeTab} onTabChange={onTabChange} /> : null}

      <div className={isMobile ? "px-4" : undefined}>
        {activeTab === "profile" ? <ProfileTab profile={profile} /> : null}
        {activeTab === "preferences" ? <PreferencesTab preferences={preferences} /> : null}
        {activeTab === "agents" ? <AgentsTab agents={agents} /> : null}
      </div>
    </div>
  );
}
