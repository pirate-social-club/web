"use client";

import * as React from "react";

import { ResponsiveOptionSelect } from "@/components/compositions/system/responsive-option-select/responsive-option-select";
import { cn } from "@/lib/utils";
import type { ComposerIdentityState } from "./post-composer.types";
import { Type } from "@/components/primitives/type";

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
      <Type as="span" variant="caption">{postAsLabel}</Type>
      <ResponsiveOptionSelect<IdentityOption>
        ariaLabel={postAsLabel}
        drawerTitle={postAsLabel}
        onValueChange={onChange}
        options={options}
        selectAlign="start"
        triggerClassName={cn("h-auto min-w-0 py-1.5")}
        triggerContent={<span className="truncate">{selected.label}</span>}
        value={selected.value}
      />
    </div>
  );
}
