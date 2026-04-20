"use client";

import * as React from "react";
import { Robot, SealCheck, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { Textarea } from "@/components/primitives/textarea";
import {
  Card,
  CardContent,
} from "@/components/primitives/card";
import { cn } from "@/lib/utils";
import type { OwnedAgentsPanelProps, OwnedAgent } from "./owned-agents-panel.types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "self_agent_id":
      return "Self";
    case "clawkey":
      return "ClawKey";
    default:
      return provider;
  }
}

function AgentRow({
  agent,
  onDeregister,
}: {
  agent: OwnedAgent;
  onDeregister?: (agentId: string) => void;
}) {
  const isActive = agent.status === "active";
  const ownership = agent.currentOwnership;

  return (
    <div className="group flex items-start gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 transition-colors hover:bg-muted/50">
      <div className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full",
        isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}>
        <Robot className="size-5" weight="duotone" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">
            {agent.displayName}
          </span>
          {isActive && ownership ? (
            <SealCheck className="size-4 shrink-0 text-primary" weight="fill" />
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
          {ownership ? (
            <span>
              {providerLabel(ownership.ownershipProvider)} · verified {formatDate(ownership.verifiedAt)}
            </span>
          ) : (
            <span>No active ownership</span>
          )}
        </div>
      </div>

      {isActive && onDeregister ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          onClick={() => onDeregister(agent.agentId)}
        >
          <Trash className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function EmptyState({
  canRegister,
  loading,
  onStartPairing,
  onShowAdvanced,
}: {
  canRegister: boolean;
  loading?: boolean;
  onStartPairing?: () => void;
  onShowAdvanced?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Robot className="size-6" weight="duotone" />
      </div>
      <p className="text-base font-semibold text-foreground">Connect OpenClaw</p>
      {canRegister && onStartPairing ? (
        <Button onClick={onStartPairing} loading={loading}>
          Connect OpenClaw
        </Button>
      ) : null}
      {canRegister && onShowAdvanced ? <Button variant="secondary" onClick={onShowAdvanced}>Advanced</Button> : null}
    </div>
  );
}

function PairingCodeState({
  registrationState,
}: {
  registrationState: Extract<OwnedAgentsPanelProps["registrationState"], { kind: "pairing_code" }>;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <CopyField value={registrationState.pairingCode} />
        <div className="space-y-2 text-muted-foreground">
          <p>In OpenClaw with Pirate Connector installed, say: connect to Pirate with code {registrationState.pairingCode}</p>
          <p>Then open the ClawKey link OpenClaw sends you.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingRegistration({
  registrationState,
  onCheckRegistration,
}: {
  registrationState: Extract<OwnedAgentsPanelProps["registrationState"], { kind: "awaiting_owner" }>;
  onCheckRegistration?: () => void;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <CopyField value={registrationState.registrationUrl} />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="default">
            <a href={registrationState.registrationUrl} rel="noreferrer" target="_blank">
              Open ClawKey
            </a>
          </Button>
          {onCheckRegistration ? (
            <Button onClick={onCheckRegistration} variant="secondary">
              Check status
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ImportRegistration({
  busy,
  onImportRegistration,
  onImportValueChange,
  value,
}: {
  busy: boolean;
  onImportRegistration?: () => void;
  onImportValueChange?: (value: string) => void;
  value?: string;
}) {
  if (!onImportRegistration || !onImportValueChange) {
    return null;
  }

  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <p className="text-muted-foreground">
          Manual fallback:
          {" "}
          <code>bun run agents:openclaw:challenge --api-url &lt;pirate-api-url&gt; --token &lt;pirate-token&gt;</code>
        </p>
        <Textarea
          onChange={(event) => onImportValueChange(event.target.value)}
          placeholder="Paste OpenClaw challenge JSON"
          rows={7}
          value={value ?? ""}
        />
        <Button loading={busy} onClick={onImportRegistration} variant="default">
          Register with ClawKey
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnedAgentsPanel({
  agents,
  canRegister,
  loading = false,
  registrationState,
  importValue,
  onStartPairing,
  onImportValueChange,
  onImportRegistration,
  onCheckRegistration,
  onDeregister,
}: OwnedAgentsPanelProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const activeAgents = agents.filter((a) => a.status === "active");
  const inactiveAgents = agents.filter((a) => a.status !== "active");
  const registrationLoading = registrationState.kind === "verifying" || registrationState.kind === "awaiting_owner";
  const canImport = Boolean(onImportRegistration && onImportValueChange);
  const importOpen = showAdvanced || Boolean(importValue?.trim());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Agents</h2>
        </div>
        {canRegister && agents.length > 0 ? (
          canImport && !importOpen ? (
            <Button variant="secondary" size="sm" onClick={() => setShowAdvanced(true)} loading={registrationLoading}>
              Advanced
            </Button>
          ) : null
        ) : null}
      </div>

      {registrationState.kind === "awaiting_owner" ? (
        <PendingRegistration registrationState={registrationState} onCheckRegistration={onCheckRegistration} />
      ) : null}

      {registrationState.kind === "pairing_code" ? (
        <PairingCodeState registrationState={registrationState} />
      ) : null}

      {canRegister && importOpen ? (
        <details className="rounded-[var(--radius-lg)] border border-border-soft bg-card" open={importOpen}>
          <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-foreground">
            Advanced
          </summary>
          <div className="px-5 pb-5">
            <ImportRegistration
              busy={registrationLoading}
              onImportRegistration={onImportRegistration}
              onImportValueChange={onImportValueChange}
              value={importValue}
            />
          </div>
        </details>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground">Loading agents…</p>
      ) : agents.length === 0 ? (
        <EmptyState
          canRegister={canRegister}
          loading={registrationLoading}
          onStartPairing={onStartPairing}
          onShowAdvanced={() => setShowAdvanced(true)}
        />
      ) : (
        <div className="space-y-3">
          {activeAgents.map((agent) => (
            <AgentRow key={agent.agentId} agent={agent} onDeregister={onDeregister} />
          ))}
          {inactiveAgents.length > 0 ? (
            <div className="space-y-2 pt-4">
              <p className="text-muted-foreground">Inactive</p>
              {inactiveAgents.map((agent) => (
                <AgentRow key={agent.agentId} agent={agent} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {registrationState.kind === "error" ? (
        <p className="text-destructive">{registrationState.message}</p>
      ) : null}
    </div>
  );
}
