"use client";

import * as React from "react";
import { Robot, Trash } from "@phosphor-icons/react";
import { Avatar } from "@/components/primitives/avatar";
import { BadgedCircle } from "@/components/primitives/badged-circle";
import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { FormNote } from "@/components/primitives/form-layout";
import { Type } from "@/components/primitives/type";
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

function stripClawitzerSuffix(value: string | null): string {
  return value?.replace(/\.clawitzer$/i, "") ?? "";
}

function AgentAvatar({
  active,
  fallback,
}: {
  active: boolean;
  fallback: string;
}) {
  return (
    <BadgedCircle
      badge={(
        <span
          className={cn(
            "grid size-full place-items-center rounded-full",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Robot className="size-3.5" weight="duotone" />
        </span>
      )}
      badgeLabel="Agent"
      badgeOffsetXPercent={6}
      badgeOffsetYPercent={2}
      badgePadding={1}
      badgeSize={16}
    >
      <Avatar
        className={cn(
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
        fallback={fallback}
        size="md"
      />
    </BadgedCircle>
  );
}

function ClawitzerHandleField({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        aria-label={ariaLabel}
        className="pr-28"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <span className="pointer-events-none absolute inset-y-0 right-0 inline-flex items-center pe-4 text-base font-medium text-muted-foreground">
        .clawitzer
      </span>
    </div>
  );
}

function AgentRow({
  agent,
  copy,
  localeTag,
  onUpdateHandle,
  onUpdateName,
  onDeregister,
}: {
  agent: OwnedAgent;
  copy: OwnedAgentsCopy;
  localeTag: string;
  onUpdateHandle?: (agentId: string, handleLabel: string) => Promise<void> | void;
  onUpdateName?: (agentId: string, displayName: string) => Promise<void> | void;
  onDeregister?: (agentId: string) => void;
}) {
  const isActive = agent.status === "active";
  const ownership = agent.currentOwnership;
  const [draftHandle, setDraftHandle] = React.useState(stripClawitzerSuffix(agent.handleLabel));
  const [handleError, setHandleError] = React.useState<string | null>(null);
  const [handleSaving, setHandleSaving] = React.useState(false);
  const [draftName, setDraftName] = React.useState(agent.displayName ?? "");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [nameSaving, setNameSaving] = React.useState(false);
  const canEditName = isActive && Boolean(onUpdateName);
  const nextName = draftName.trim();
  const currentName = agent.displayName ?? "";
  const nameChanged = canEditName && nextName.length > 0 && nextName !== currentName;
  const ownershipProvider = ownership?.ownershipProvider === "self_agent_id"
    ? copy.providerSelf
    : ownership?.ownershipProvider === "clawkey"
      ? copy.providerClawKey
      : ownership
        ? providerLabel(ownership.ownershipProvider)
        : null;
  const canEditHandle = isActive && Boolean(onUpdateHandle);
  const nextHandle = draftHandle.trim();
  const currentHandle = stripClawitzerSuffix(agent.handleLabel);
  const handleChanged = canEditHandle && nextHandle.length > 0 && nextHandle !== currentHandle;
  const isSaving = nameSaving || handleSaving;
  const saveDisabled = isSaving || (!nameChanged && !handleChanged);

  React.useEffect(() => {
    setDraftHandle(stripClawitzerSuffix(agent.handleLabel));
    setHandleError(null);
    setHandleSaving(false);
  }, [agent.agentId, agent.handleLabel]);

  React.useEffect(() => {
    setDraftName(agent.displayName ?? "");
    setNameError(null);
    setNameSaving(false);
  }, [agent.agentId, agent.displayName]);

  const handleSave = async () => {
    if (saveDisabled) {
      return;
    }

    setHandleError(null);
    setNameError(null);
    let handleSucceeded = !handleChanged;

    if (handleChanged && onUpdateHandle) {
      setHandleSaving(true);
      try {
        await onUpdateHandle(agent.agentId, nextHandle);
        handleSucceeded = true;
      } catch (error: unknown) {
        setHandleError(error instanceof Error ? error.message : copy.saveHandleError);
        handleSucceeded = false;
      } finally {
        setHandleSaving(false);
      }
    }

    if (!handleSucceeded || !nameChanged || !onUpdateName) {
      return;
    }

    setNameSaving(true);
    try {
      await onUpdateName(agent.agentId, nextName);
    } catch (error: unknown) {
      setNameError(error instanceof Error ? error.message : copy.saveNameError);
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <div className="group flex items-start gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 transition-colors hover:bg-muted/50">
      <AgentAvatar active={isActive} fallback={agent.displayName || agent.handleLabel || copy.namePlaceholder} />

      <div className="min-w-0 flex-1 space-y-3">
        {canEditName ? (
          <div className="space-y-2">
            <Input
              aria-label={copy.nameLabel}
              onChange={(event) => {
                setDraftName(event.target.value);
                if (nameError) {
                  setNameError(null);
                }
              }}
              placeholder={copy.namePlaceholder}
              value={draftName}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canEditHandle ? (
            <div className="min-w-0 flex-1 space-y-2">
              <ClawitzerHandleField
                ariaLabel={copy.handleLabel}
                onChange={(value) => {
                  setDraftHandle(value);
                  if (handleError) {
                    setHandleError(null);
                  }
                }}
                placeholder={copy.handlePlaceholder}
                value={draftHandle}
              />
              <FormNote>{copy.premiumNamesComingSoon}</FormNote>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold text-foreground">
                {agent.handleLabel ?? agent.displayName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {canEditHandle || canEditName ? (
              <Button disabled={saveDisabled} loading={isSaving} onClick={() => void handleSave()} variant="secondary">
                {copy.saveChangesAction}
              </Button>
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

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
          {!canEditName && agent.displayName && agent.displayName !== agent.handleLabel ? (
            <span>{agent.displayName}</span>
          ) : null}
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
        {nameError ? <FormNote tone="destructive">{nameError}</FormNote> : null}
        {handleError ? <FormNote tone="destructive">{handleError}</FormNote> : null}
      </div>
    </div>
  );
}

function EmptyState({
  copy,
  loading,
  onStartVerification,
  reason,
}: {
  copy: OwnedAgentsCopy;
  loading?: boolean;
  onStartVerification?: () => void;
  reason?: OwnedAgentsPanelProps["registrationUnavailableReason"];
}) {
  const title = reason === "verification_required"
    ? copy.verificationRequiredTitle
    : reason === "active_agent_exists"
      ? copy.activeAgentExistsTitle
      : copy.emptyTitle;
  const description = reason === "verification_required"
    ? copy.verificationRequiredDescription
    : reason === "active_agent_exists"
      ? copy.activeAgentExistsDescription
      : null;

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground">
        <Robot className="size-10" weight="duotone" />
      </div>
      <div className="max-w-md space-y-2">
        <Type as="p" variant="body-strong">{title}</Type>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {reason === "verification_required" && onStartVerification ? (
        <Button onClick={onStartVerification}>{copy.verificationRequiredAction}</Button>
      ) : null}
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
  onImportRegistration?: (handleLabel: string) => void;
  onShowAdvanced?: () => void;
  onStartPairing?: (handleLabel: string) => void;
}) {
  const [handleLabel, setHandleLabel] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const requireHandle = (): string | null => {
    const trimmed = handleLabel.trim();
    if (!trimmed) {
      setError(copy.handleRequired);
      return null;
    }
    return trimmed;
  };

  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="space-y-4 px-5 py-5">
        <div className="space-y-2">
          <ClawitzerHandleField
            ariaLabel={copy.handleLabel}
            onChange={(value) => {
              setHandleLabel(value);
              if (error) {
                setError(null);
              }
            }}
            placeholder={copy.handlePlaceholder}
            value={handleLabel}
          />
          <FormNote>{copy.premiumNamesComingSoon}</FormNote>
        </div>
        {error ? <FormNote tone="destructive">{error}</FormNote> : null}
        <div className="flex flex-wrap gap-3">
          {onStartPairing ? (
            <Button
              loading={busy}
              onClick={() => {
                const nextHandle = requireHandle();
                if (!nextHandle) {
                  return;
                }
                onStartPairing(nextHandle);
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
                const nextHandle = requireHandle();
                if (!nextHandle) {
                  return;
                }
                onImportRegistration(nextHandle);
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
          <p>
            {copy.pairingStepInstallPlugin}{" "}
            <code>openclaw plugins install @pirate_sc/openclaw-pirate-plugin</code>
          </p>
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
  showTitle = true,
  registrationUnavailableReason,
  registrationState,
  importValue,
  onStartPairing,
  onImportValueChange,
  onImportRegistration,
  onCheckRegistration,
  onDeregister,
  onStartVerification,
  onUpdateHandle,
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
      {showTitle ? (
      <div>
        <Type as="h2" variant="h3">{copy.agentsTitle}</Type>
      </div>
      ) : null}

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
        canRegister ? null : <EmptyState copy={copy} loading={registrationLoading} onStartVerification={onStartVerification} reason={registrationUnavailableReason} />
      ) : (
        <div className="space-y-3">
          {activeAgents.map((agent) => (
            <AgentRow
              key={agent.agentId}
              agent={agent}
              copy={copy}
              localeTag={localeTag}
              onDeregister={onDeregister}
              onUpdateHandle={onUpdateHandle}
              onUpdateName={onUpdateName}
            />
          ))}
          {inactiveAgents.length > 0 ? (
            <div className="space-y-2 pt-4">
              <p className="text-muted-foreground">{copy.inactiveLabel}</p>
              {inactiveAgents.map((agent) => (
                <AgentRow key={agent.agentId} agent={agent} copy={copy} localeTag={localeTag} onUpdateName={onUpdateName} />
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
