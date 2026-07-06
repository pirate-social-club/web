"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";
import type { AssistantProviderKeyStatus } from "../assistant-policy/community-assistant-policy.types";

export function FieldRow({
  children,
  description,
  label,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-3 border-b border-border-soft py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-center">
      <div className="space-y-1">
        <div className="text-base font-medium leading-6">{label}</div>
        {description ? <p className="text-base leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ProviderKeyStatusLine({
  align = "end",
  connectedLabel = "Connected",
  invalidLabel = "Invalid key",
  keyStatus,
  manageHref,
  missingLabel = "Not connected",
}: {
  align?: "end" | "start";
  connectedLabel?: string;
  invalidLabel?: string;
  keyStatus: AssistantProviderKeyStatus;
  manageHref?: string;
  missingLabel?: string;
}) {
  const connected = keyStatus.kind === "connected";
  const invalid = keyStatus.kind === "invalid";

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 text-base leading-6",
      align === "end" ? "justify-end" : "justify-start",
    )}>
      <span
        className={cn(
          "rounded-full border px-2.5 py-1 text-base font-medium",
          connected && "border-primary/30 bg-primary/10 text-primary",
          invalid && "border-destructive/30 bg-destructive/10 text-destructive",
          !connected && !invalid && "border-border-soft bg-muted text-muted-foreground",
        )}
      >
        {connected ? connectedLabel : invalid ? invalidLabel : missingLabel}
      </span>
      {manageHref ? (
        <a className="font-medium underline underline-offset-2" href={manageHref}>
          Manage in Integrations
        </a>
      ) : null}
    </div>
  );
}

export function ProviderKeyField({
  connectedPrefix,
  description,
  disabled = false,
  invalidPrefix,
  keyStatus,
  label,
  saveLabel,
  saveNewLabel,
  onKeyRevoke,
  onKeySave,
  placeholder,
}: {
  connectedPrefix: string;
  description: string;
  disabled?: boolean;
  invalidPrefix: string;
  keyStatus: AssistantProviderKeyStatus;
  label: string;
  saveLabel: string;
  saveNewLabel: string;
  onKeyRevoke: () => void;
  onKeySave: (apiKey: string) => void;
  placeholder: string;
}) {
  const [apiKeyDraft, setApiKeyDraft] = React.useState("");
  const connected = keyStatus.kind === "connected";
  const invalid = keyStatus.kind === "invalid";
  const canSaveKey = apiKeyDraft.trim().length > 0 && !disabled;

  return (
    <FieldRow
      description={invalid ? keyStatus.message : description}
      label={label}
    >
      <div className="space-y-2">
        {connected || invalid ? (
          <div className={cn(
            "text-base leading-6",
            connected ? "text-foreground" : "text-destructive",
          )}>
            {connected
              ? `Current key: ${connectedPrefix}${keyStatus.last4}`
              : `Invalid key: ${invalidPrefix}${keyStatus.last4}`}
          </div>
        ) : null}
        <Input
          autoComplete="off"
          className="h-11 rounded-md font-mono text-base"
          disabled={disabled}
          onChange={(event) => setApiKeyDraft(event.target.value)}
          placeholder={connected || invalid ? "Paste a new key to rotate" : placeholder}
          type="password"
          value={apiKeyDraft}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canSaveKey}
            onClick={() => {
              onKeySave(apiKeyDraft);
              setApiKeyDraft("");
            }}
            size="sm"
            variant="outline"
          >
            {connected || invalid ? saveNewLabel : saveLabel}
          </Button>
          {connected || invalid ? (
            <Button disabled={disabled} onClick={onKeyRevoke} size="sm" variant="ghost">
              Revoke
            </Button>
          ) : null}
        </div>
      </div>
    </FieldRow>
  );
}
