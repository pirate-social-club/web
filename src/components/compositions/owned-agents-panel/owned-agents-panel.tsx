"use client";

import * as React from "react";
import { Robot, SealCheck, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import {
  Card,
  CardContent,
} from "@/components/primitives/card";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages, type RoutesMessages } from "@/locales";
import { resolveLocaleLanguageTag } from "@/lib/ui-locale-core";
import { cn } from "@/lib/utils";
import type { OwnedAgentsPanelProps, OwnedAgent } from "./owned-agents-panel.types";

type OwnedAgentsCopy = RoutesMessages["ownedAgents"];

function formatDate(iso: string, localeTag: string): string {
  return new Date(iso).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function providerLabel(provider: string): string {
  return provider;
}

function AgentRow({
  agent,
  copy,
  localeTag,
  onUpdateName,
  onDeregister,
}: {
  agent: OwnedAgent;
  copy: OwnedAgentsCopy;
  localeTag: string;
  onUpdateName?: (agentId: string, displayName: string) => Promise<void> | void;
  onDeregister?: (agentId: string) => void;
}) {
  const isActive = agent.status === "active";
  const ownership = agent.currentOwnership;
  const [draftName, setDraftName] = React.useState(agent.displayName);
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [renameSaving, setRenameSaving] = React.useState(false);
  const ownershipProvider = ownership?.ownershipProvider === "self_agent_id"
    ? copy.providerSelf
    : ownership?.ownershipProvider === "clawkey"
      ? copy.providerClawKey
      : ownership
        ? providerLabel(ownership.ownershipProvider)
        : null;
  const canRename = isActive && Boolean(onUpdateName);
  const nextDisplayName = draftName.trim();
  const renameDisabled = renameSaving || nextDisplayName.length === 0 || nextDisplayName === agent.displayName;

  React.useEffect(() => {
    setDraftName(agent.displayName);
    setRenameError(null);
    setRenameSaving(false);
  }, [agent.agentId, agent.displayName]);

  const handleRename = async () => {
    if (!onUpdateName || renameDisabled) {
      return;
    }

    setRenameSaving(true);
    setRenameError(null);
    try {
      await onUpdateName(agent.agentId, nextDisplayName);
    } catch (error: unknown) {
      setRenameError(error instanceof Error ? error.message : copy.saveNameError);
    } finally {
      setRenameSaving(false);
    }
  };

  return (
    <div className="group flex items-start gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 transition-colors hover:bg-muted/50">
      <div className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full",
        isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}>
        <Robot className="size-5" weight="duotone" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canRename ? (
            <Input
              aria-label={copy.nameLabel}
              className="min-w-0"
              onChange={(event) => {
                setDraftName(event.target.value);
                if (renameError) {
                  setRenameError(null);
                }
              }}
              placeholder={copy.namePlaceholder}
              value={draftName}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-foreground">
                {agent.displayName}
              </span>
              {isActive && ownership ? (
                <SealCheck className="size-4 shrink-0 text-primary" weight="fill" />
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2">
            {canRename ? (
              <Button disabled={renameDisabled} loading={renameSaving} onClick={() => void handleRename()} variant="secondary">
                {copy.saveNameAction}
              </Button>
            ) : null}
            {isActive && ownership && canRename ? (
              <SealCheck className="size-4 shrink-0 text-primary" weight="fill" />
            ) : null}
            {isActive && onDeregister ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDeregister(agent.agentId)}
              >
                <Trash className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
          {ownership ? (
            <span>
              {copy.verifiedAt
                .replace("{provider}", ownershipProvider ?? "")
                .replace("{date}", formatDate(ownership.verifiedAt, localeTag))}
            </span>
          ) : (
            <span>{copy.noActiveOwnership}</span>
          )}
        </div>
        {renameError ? <FormNote tone="destructive">{renameError}</FormNote> : null}
      </div>
    </div>
  );
}

function EmptyState({
  canRegister,
  copy,
  loading,
}: {
  canRegister: boolean;
  copy: OwnedAgentsCopy;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Robot className="size-6" weight="duotone" />
      </div>
      <p className="text-base font-semibold text-foreground">{copy.emptyTitle}</p>
      {loading ? <p className="text-muted-foreground">{copy.loadingLabel}</p> : null}
    </div>
  );
}

function RegistrationCard({
  busy,
  canImport,
  copy,
  importOpen,
  onImportRegistration,
  onShowAdvanced,
  onStartPairing,
}: {
  busy: boolean;
  canImport: boolean;
  copy: OwnedAgentsCopy;
  importOpen: boolean;
  onImportRegistration?: (displayName: string) => void;
  onShowAdvanced?: () => void;
  onStartPairing?: (displayName: string) => void;
}) {
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const requireDisplayName = (): string | null => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError(copy.nameRequired);
      return null;
    }
    return trimmed;
  };

  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <Input
          aria-label={copy.nameLabel}
          onChange={(event) => {
            setDisplayName(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder={copy.namePlaceholder}
          value={displayName}
        />
        {error ? <FormNote tone="destructive">{error}</FormNote> : null}
        <div className="flex flex-wrap gap-3">
          {onStartPairing ? (
            <Button
              loading={busy}
              onClick={() => {
                const nextDisplayName = requireDisplayName();
                if (!nextDisplayName) {
                  return;
                }
                onStartPairing(nextDisplayName);
              }}
            >
              {copy.connectAction}
            </Button>
          ) : null}
          {canImport && !importOpen && onShowAdvanced ? (
            <Button onClick={onShowAdvanced} variant="secondary">
              {copy.advanced}
            </Button>
          ) : null}
          {canImport && importOpen && onImportRegistration ? (
            <Button
              loading={busy}
              onClick={() => {
                const nextDisplayName = requireDisplayName();
                if (!nextDisplayName) {
                  return;
                }
                onImportRegistration(nextDisplayName);
              }}
              variant="secondary"
            >
              {copy.registerAction}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PairingCodeState({
  copy,
  registrationState,
}: {
  copy: OwnedAgentsCopy;
  registrationState: Extract<OwnedAgentsPanelProps["registrationState"], { kind: "pairing_code" }>;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <CopyField value={registrationState.pairingCode} />
        <div className="space-y-2 text-muted-foreground">
          <p>{copy.pairingStepInstall.replace("{code}", registrationState.pairingCode)}</p>
          <p>{copy.pairingStepOpen}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingRegistration({
  copy,
  registrationState,
  onCheckRegistration,
}: {
  copy: OwnedAgentsCopy;
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
              {copy.openClawKey}
            </a>
          </Button>
          {onCheckRegistration ? (
            <Button onClick={onCheckRegistration} variant="secondary">
              {copy.checkStatus}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ImportRegistration({
  copy,
  onImportValueChange,
  value,
}: {
  copy: OwnedAgentsCopy;
  onImportValueChange?: (value: string) => void;
  value?: string;
}) {
  if (!onImportValueChange) {
    return null;
  }

  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <p className="text-muted-foreground">
          {copy.manualFallbackLabel}
          {" "}
          <code>bun run agents:openclaw:challenge --api-url &lt;pirate-api-url&gt; --token &lt;pirate-token&gt;</code>
        </p>
        <Textarea
          onChange={(event) => onImportValueChange(event.target.value)}
          placeholder={copy.pasteChallengePlaceholder}
          rows={7}
          value={value ?? ""}
        />
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
  onUpdateName,
}: OwnedAgentsPanelProps) {
  const { locale } = useUiLocale();
  const copy = React.useMemo(() => getLocaleMessages(locale, "routes").ownedAgents, [locale]);
  const localeTag = React.useMemo(() => resolveLocaleLanguageTag(locale), [locale]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const activeAgents = agents.filter((a) => a.status === "active");
  const inactiveAgents = agents.filter((a) => a.status !== "active");
  const registrationLoading = registrationState.kind === "verifying" || registrationState.kind === "awaiting_owner";
  const canImport = Boolean(onImportRegistration && onImportValueChange);
  const importOpen = showAdvanced || Boolean(importValue?.trim());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.agentsTitle}</h2>
      </div>

      {canRegister && registrationState.kind !== "awaiting_owner" && registrationState.kind !== "pairing_code" ? (
        <RegistrationCard
          busy={registrationLoading}
          canImport={canImport}
          copy={copy}
          importOpen={importOpen}
          onImportRegistration={onImportRegistration}
          onShowAdvanced={() => setShowAdvanced(true)}
          onStartPairing={onStartPairing}
        />
      ) : null}

      {registrationState.kind === "awaiting_owner" ? (
        <PendingRegistration copy={copy} registrationState={registrationState} onCheckRegistration={onCheckRegistration} />
      ) : null}

      {registrationState.kind === "pairing_code" ? (
        <PairingCodeState copy={copy} registrationState={registrationState} />
      ) : null}

      {canRegister && importOpen ? (
        <details className="rounded-[var(--radius-lg)] border border-border-soft bg-card" open={importOpen}>
          <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-foreground">
            {copy.advanced}
          </summary>
          <div className="px-5 pb-5">
            <ImportRegistration
              copy={copy}
              onImportValueChange={onImportValueChange}
              value={importValue}
            />
          </div>
        </details>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground">{copy.loadingLabel}</p>
      ) : agents.length === 0 ? (
        canRegister ? null : <EmptyState canRegister={canRegister} copy={copy} loading={registrationLoading} />
      ) : (
        <div className="space-y-3">
          {activeAgents.map((agent) => (
            <AgentRow
              key={agent.agentId}
              agent={agent}
              copy={copy}
              localeTag={localeTag}
              onDeregister={onDeregister}
              onUpdateName={onUpdateName}
            />
          ))}
          {inactiveAgents.length > 0 ? (
            <div className="space-y-2 pt-4">
              <p className="text-muted-foreground">{copy.inactiveLabel}</p>
              {inactiveAgents.map((agent) => (
                <AgentRow key={agent.agentId} agent={agent} copy={copy} localeTag={localeTag} />
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
