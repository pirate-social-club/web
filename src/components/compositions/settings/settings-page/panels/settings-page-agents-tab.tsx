"use client";

import { OwnedAgentsPanel } from "@/components/compositions/settings/owned-agents-panel/owned-agents-panel";

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
        showTitle={agents.showTitle}
        registrationUnavailableReason={agents.registrationUnavailableReason}
        registrationState={agents.registrationState}
        importValue={agents.importValue}
        onStartPairing={agents.onStartPairing}
        onImportValueChange={agents.onImportValueChange}
        onImportRegistration={agents.onImportRegistration}
        onCheckRegistration={agents.onCheckRegistration}
        onDeregister={agents.onDeregister}
        onStartVerification={agents.onStartVerification}
        onUpdateHandle={agents.onUpdateHandle}
        onUpdateName={agents.onUpdateName}
      />
    </div>
  );
}
