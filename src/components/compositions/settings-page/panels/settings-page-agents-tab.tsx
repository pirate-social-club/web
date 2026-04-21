"use client";

import { OwnedAgentsPanel } from "@/components/compositions/owned-agents-panel/owned-agents-panel";

import type { SettingsPageProps } from "../settings-page.types";

export function AgentsTab({
  agents,
}: Pick<SettingsPageProps, "agents">) {
  return (
    <div className="space-y-8">
      <OwnedAgentsPanel
        agents={agents.items}
        canRegister={agents.canRegister}
        loading={agents.loading}
        registrationState={agents.registrationState}
        importValue={agents.importValue}
        onStartPairing={agents.onStartPairing}
        onImportValueChange={agents.onImportValueChange}
        onImportRegistration={agents.onImportRegistration}
        onCheckRegistration={agents.onCheckRegistration}
        onDeregister={agents.onDeregister}
        onUpdateHandle={agents.onUpdateHandle}
        onUpdateName={agents.onUpdateName}
      />
    </div>
  );
}
