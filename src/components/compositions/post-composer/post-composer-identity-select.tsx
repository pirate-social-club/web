"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";
import type { ComposerIdentityState } from "./post-composer.types";

export type IdentityOption = "public" | "anonymous" | "agent";

export interface IdentitySelectProps {
  value: IdentityOption;
  onChange: (value: IdentityOption) => void;
  identity: ComposerIdentityState;
  postAsLabel: string;
}

export function IdentitySelect({
  value,
  onChange,
  identity,
  postAsLabel,
}: IdentitySelectProps) {
  const handleLabel = identity.publicHandle ?? "@handle";
  const anonymousLabel = identity.anonymousLabel ?? "anon_club";
  const agentLabel = identity.agentLabel ?? "Agent";

  const options = [
    { value: "public" as const, label: handleLabel, available: true },
    {
      value: "anonymous" as const,
      label: anonymousLabel,
      available: identity.allowAnonymousIdentity === true,
    },
    {
      value: "agent" as const,
      label: agentLabel,
      available: identity.agentLabel != null && identity.agentLabel !== "",
    },
  ].filter((option) => option.available);

  const selected = options.find((option) => option.value === value) ?? options[0];

  React.useEffect(() => {
    if (selected.value !== value) {
      onChange(selected.value);
    }
  }, [selected.value, value, onChange]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-base text-muted-foreground">{postAsLabel}</span>
      <Select
        value={selected.value}
        onValueChange={(v) => onChange(v as IdentityOption)}
      >
        <SelectTrigger
          aria-label={postAsLabel}
          className={cn(
            "h-auto w-auto min-w-0 gap-2 rounded-full border-border-soft bg-card px-3 py-1.5 text-base font-medium shadow-none transition-colors hover:bg-muted",
          )}
        >
          <span className="truncate">{selected.label}</span>
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="py-2.5"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
