"use client";

import {
  PreferencesTab,
  ProfileTab,
  SettingsTabNav,
  WalletTab,
} from "./settings-page.panels";
import type { SettingsPageProps } from "./settings-page.types";

export function SettingsPage({
  activeTab,
  onTabChange,
  preferences,
  profile,
  title = "Settings",
  wallet,
}: SettingsPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <SettingsTabNav activeTab={activeTab} onTabChange={onTabChange} />

      <div>
        {activeTab === "profile" ? <ProfileTab profile={profile} /> : null}
        {activeTab === "wallet" ? <WalletTab wallet={wallet} /> : null}
        {activeTab === "preferences" ? <PreferencesTab preferences={preferences} /> : null}
      </div>
    </div>
  );
}
